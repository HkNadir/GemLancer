/**
 * GemLancer — Project & Task server-side queries
 * All functions must be called from Server Components or Server Actions only.
 * Every query is explicitly scoped to tenant_id (belt + suspenders with RLS).
 */

import { createClient } from '@/lib/supabase/server'
import type {
  ProjectListItem,
  ProjectDetail,
  TaskDetail,
  KanbanBoard,
  TaskWithAssignee,
  ProjectTemplateWithDetails,
  ProjectStatus,
} from '@/types/database'

// ── Projects ─────────────────────────────────────────────────

export type ProjectFilter = 'all' | 'active' | 'completed' | 'on_hold' | 'overdue' | 'draft'

export async function getProjects(
  tenantId: string,
  filter: ProjectFilter = 'all'
): Promise<ProjectListItem[]> {
  if (!tenantId) return []
  const supabase = await createClient()

  let query = supabase
    .from('projects')
    .select(`
      id, name, description, status, budget, currency,
      start_date, end_date, progress, is_archived,
      created_at, updated_at, client_id, tenant_id,
      client:clients!inner ( id, name, company ),
      tasks ( id, status, time_logs ( duration_minutes ) ),
      milestones ( id, status )
    `)
    .eq('tenant_id', tenantId)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false })

  if (filter !== 'all' && filter !== 'overdue') {
    query = query.eq('status', filter as ProjectStatus)
  }

  const { data, error } = await query
  if (error) throw new Error(`getProjects: ${error.message}`)

  const now = new Date()

  return (data ?? [])
    .map((p: any): ProjectListItem => {
      const tasks: Array<{ status: string; time_logs?: Array<{ duration_minutes: number }> }> = p.tasks ?? []
      const milestones: Array<{ status: string }> = p.milestones ?? []
      const timeLogs: Array<{ duration_minutes: number }> = tasks.flatMap((t: any) => t.time_logs ?? [])

      const totalTasks = tasks.length
      const completedTasks = tasks.filter((t) => t.status === 'done').length
      const approvedMilestones = milestones.filter((m) => m.status === 'approved').length
      const totalLoggedMinutes = timeLogs.reduce((sum, l) => sum + (l.duration_minutes ?? 0), 0)

      const isOverdue =
        p.status === 'active' &&
        p.end_date != null &&
        new Date(p.end_date) < now

      const daysUntilEnd = p.end_date
        ? (new Date(p.end_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        : null

      let health: ProjectListItem['health'] = 'on_track'
      if (isOverdue) {
        health = 'overdue'
      } else if (daysUntilEnd !== null && daysUntilEnd < 7 && p.progress < 80) {
        health = 'at_risk'
      }

      return {
        id: p.id,
        tenant_id: p.tenant_id,
        client_id: p.client_id,
        name: p.name,
        description: p.description,
        status: p.status,
        budget: p.budget,
        currency: p.currency,
        start_date: p.start_date,
        end_date: p.end_date,
        progress: p.progress,
        is_archived: p.is_archived,
        created_at: p.created_at,
        updated_at: p.updated_at,
        client: p.client,
        stats: {
          total_tasks: totalTasks,
          completed_tasks: completedTasks,
          total_milestones: milestones.length,
          approved_milestones: approvedMilestones,
          total_logged_minutes: totalLoggedMinutes,
        },
        is_overdue: isOverdue,
        health,
      }
    })
    .filter((p) => {
      if (filter === 'overdue') return p.is_overdue
      return true
    })
}

export async function getProjectById(
  tenantId: string,
  projectId: string
): Promise<ProjectDetail | null> {
  if (!tenantId) return null
  const supabase = await createClient()

  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      *,
      client:clients!inner ( id, name, email, company, currency ),
      milestones (
        *,
        tasks (
          *,
          assignee:users!assignee_id ( id, full_name, avatar_url )
        )
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('id', projectId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`getProjectById: ${error.message}`)
  }

  // Fetch team members who have time logs or assigned tasks on this project
  const { data: assignees } = await supabase
    .from('tasks')
    .select('assignee:users!assignee_id ( id, full_name, avatar_url, role )')
    .eq('tenant_id', tenantId)
    .eq('project_id', projectId)
    .not('assignee_id', 'is', null)

  const seenIds = new Set<string>()
  const teamMembers = (assignees ?? [])
    .map((t: any) => t.assignee)
    .filter((u: any) => {
      if (!u || seenIds.has(u.id)) return false
      seenIds.add(u.id)
      return true
    })

  // Enrich milestones with subtask counts
  const milestones = (project.milestones ?? []).map((m: any) => ({
    ...m,
    tasks: (m.tasks ?? []).map((t: any) => ({
      ...t,
      assignee: t.assignee ?? null,
      subtask_count: 0,
      completed_subtask_count: 0,
    })),
  }))

  return {
    ...project,
    milestones,
    team_members: teamMembers,
  } as ProjectDetail
}

// ── Kanban Board ──────────────────────────────────────────────

export async function getKanbanBoard(
  tenantId: string,
  projectId: string
): Promise<KanbanBoard> {
  if (!tenantId) return { backlog: [], todo: [], in_progress: [], in_review: [], done: [] }
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assignee:users!assignee_id ( id, full_name, avatar_url ),
      task_subtasks ( id, is_completed )
    `)
    .eq('tenant_id', tenantId)
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`getKanbanBoard: ${error.message}`)

  const board: KanbanBoard = {
    backlog: [],
    todo: [],
    in_progress: [],
    in_review: [],
    done: [],
  }

  for (const task of data ?? []) {
    const subtasks: Array<{ is_completed: boolean }> = task.task_subtasks ?? []
    const enriched: TaskWithAssignee = {
      id: task.id,
      tenant_id: task.tenant_id,
      project_id: task.project_id,
      milestone_id: task.milestone_id,
      assignee_id: task.assignee_id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      due_date: task.due_date,
      estimated_hours: task.estimated_hours,
      sort_order: task.sort_order,
      completed_at: task.completed_at,
      created_at: task.created_at,
      updated_at: task.updated_at,
      assignee: task.assignee ?? null,
      subtask_count: subtasks.length,
      completed_subtask_count: subtasks.filter((s) => s.is_completed).length,
    }

    if (task.status in board) {
      ;(board as any)[task.status].push(enriched)
    }
  }

  return board
}

// ── Task Detail ───────────────────────────────────────────────

export async function getTaskById(
  tenantId: string,
  taskId: string
): Promise<TaskDetail | null> {
  if (!tenantId) return null
  const supabase = await createClient()

  const [taskResult, subtasksResult, commentsResult, activityResult, timeLogsResult] =
    await Promise.all([
      supabase
        .from('tasks')
        .select(`
          *,
          assignee:users!assignee_id ( id, full_name, avatar_url ),
          milestone:milestones ( id, name )
        `)
        .eq('tenant_id', tenantId)
        .eq('id', taskId)
        .single(),

      supabase
        .from('task_subtasks')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('task_id', taskId)
        .order('sort_order', { ascending: true }),

      supabase
        .from('task_comments')
        .select(`*, user:users ( id, full_name, avatar_url )`)
        .eq('tenant_id', tenantId)
        .eq('task_id', taskId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true }),

      supabase
        .from('task_activity')
        .select(`*, user:users ( id, full_name, avatar_url )`)
        .eq('tenant_id', tenantId)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
        .limit(50),

      supabase
        .from('time_logs')
        .select(`*, user:users ( id, full_name, avatar_url )`)
        .eq('tenant_id', tenantId)
        .eq('task_id', taskId)
        .order('started_at', { ascending: false }),
    ])

  if (taskResult.error) {
    if (taskResult.error.code === 'PGRST116') return null
    throw new Error(`getTaskById: ${taskResult.error.message}`)
  }

  return {
    ...taskResult.data,
    assignee: taskResult.data.assignee ?? null,
    milestone: taskResult.data.milestone ?? null,
    subtasks: subtasksResult.data ?? [],
    comments: commentsResult.data ?? [],
    activity: activityResult.data ?? [],
    time_logs: timeLogsResult.data ?? [],
  } as TaskDetail
}

// ── Milestones ────────────────────────────────────────────────

export async function getMilestonesForProject(tenantId: string, projectId: string) {
  if (!tenantId) return []
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('milestones')
    .select(`
      *,
      tasks ( id, status, title, priority, assignee_id,
        assignee:users!assignee_id ( id, full_name, avatar_url )
      ),
      approved_by_user:users!approved_by ( id, full_name, avatar_url )
    `)
    .eq('tenant_id', tenantId)
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`getMilestonesForProject: ${error.message}`)
  return data ?? []
}

// ── Time Logs ─────────────────────────────────────────────────

export async function getTimeLogsForProject(tenantId: string, projectId: string) {
  if (!tenantId) return []
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('time_logs')
    .select(`
      *,
      user:users ( id, full_name, avatar_url ),
      task:tasks ( id, title )
    `)
    .eq('tenant_id', tenantId)
    .in(
      'task_id',
      // sub-select tasks for this project
      supabase
        .from('tasks')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('project_id', projectId) as any
    )
    .order('started_at', { ascending: false })

  if (error) throw new Error(`getTimeLogsForProject: ${error.message}`)
  return data ?? []
}

// ── Templates ─────────────────────────────────────────────────

export async function getProjectTemplates(
  tenantId: string
): Promise<ProjectTemplateWithDetails[]> {
  if (!tenantId) return []
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_templates')
    .select(`
      *,
      milestones:project_template_milestones (
        *,
        tasks:project_template_tasks ( * )
      )
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  // project_templates table may not exist if migration 012 hasn't been applied
  if (error) {
    if (error.code === '42P01' || error.message.includes('schema cache')) return []
    throw new Error(`getProjectTemplates: ${error.message}`)
  }

  return (data ?? []).map((t: any) => ({
    ...t,
    task_count: (t.milestones ?? []).reduce(
      (sum: number, m: any) => sum + (m.tasks?.length ?? 0),
      0
    ),
    milestones: (t.milestones ?? []).map((m: any) => ({
      ...m,
      tasks: m.tasks ?? [],
    })),
  }))
}

// ── Clients list (for project create form) ────────────────────

export async function getClientsForSelect(tenantId: string) {
  if (!tenantId) return []
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('clients')
    .select('id, name, company, currency')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) throw new Error(`getClientsForSelect: ${error.message}`)
  return data ?? []
}

// ── Team members (for assignee picker) ───────────────────────

export async function getTeamMembers(tenantId: string) {
  if (!tenantId) return []
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, avatar_url, role')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .neq('role', 'client')
    .order('full_name', { ascending: true })

  if (error) throw new Error(`getTeamMembers: ${error.message}`)
  return data ?? []
}
