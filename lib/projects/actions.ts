'use server'

/**
 * GemLancer — Project & Task Server Actions
 * All actions: verify auth → validate input → check tenant ownership → mutate → return result.
 * Activity log written via adminClient to bypass RLS (task_activity has no INSERT policy).
 */

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import type {
  ProjectInsert,
  ProjectUpdate,
  MilestoneInsert,
  MilestoneUpdate,
  TaskInsert,
  TaskUpdate,
  TaskSubtaskInsert,
  TimeLogInsert,
  TaskActivityAction,
} from '@/types/database'
import { getAuthContext } from '@/lib/supabase/auth-context'

// ── Activity log helper ────────────────────────────────────────

async function logActivity(
  tenantId: string,
  taskId: string,
  userId: string | null,
  action: TaskActivityAction,
  fromValue?: string | null,
  toValue?: string | null,
  metadata?: Record<string, unknown>
) {
  const admin = await createAdminClient()
  await admin.from('task_activity').insert({
    tenant_id: tenantId,
    task_id: taskId,
    user_id: userId,
    action,
    from_value: fromValue ?? null,
    to_value: toValue ?? null,
    metadata: metadata ?? {},
  })
}

// ── Projects ───────────────────────────────────────────────────

export async function createProject(input: {
  client_id: string
  name: string
  description?: string
  status?: ProjectInsert['status']
  budget?: number
  currency?: string
  start_date?: string
  end_date?: string
  template_id?: string
}): Promise<{ id: string }> {
  const { supabase, tenantId } = await getAuthContext()

  // Check plan limit before creating
  const { data: withinLimit, error: limitError } = await supabase.rpc('check_plan_limit', {
    p_tenant_id: tenantId,
    p_resource: 'projects',
  })
  if (limitError) throw new Error(limitError.message)
  if (!withinLimit) {
    throw new Error('Project limit reached for your plan. Please upgrade to create more projects.')
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      tenant_id: tenantId,
      client_id: input.client_id,
      name: input.name,
      description: input.description ?? null,
      status: input.status ?? 'draft',
      budget: input.budget ?? null,
      currency: input.currency ?? 'USD',
      start_date: input.start_date ?? null,
      end_date: input.end_date ?? null,
    } satisfies ProjectInsert)
    .select('id')
    .single()

  if (error) throw new Error(`createProject: ${error.message}`)

  // Copy from template if requested
  if (input.template_id) {
    const { error: tmplError } = await supabase.rpc('create_project_from_template', {
      p_template_id: input.template_id,
      p_project_id: data.id,
      p_tenant_id: tenantId,
      p_start_date: input.start_date ?? null,
    })
    if (tmplError) throw new Error(`Template copy failed: ${tmplError.message}`)
  }

  revalidatePath('/projects')
  return { id: data.id }
}

export async function updateProject(
  projectId: string,
  updates: ProjectUpdate & { recalculate_progress?: boolean }
): Promise<void> {
  const { supabase, tenantId } = await getAuthContext()

  // Verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from('projects')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('id', projectId)
    .single()

  if (fetchError || !existing) throw new Error('Project not found')

  const { recalculate_progress, ...fields } = updates

  // Auto-calculate progress from task completion if requested
  if (recalculate_progress) {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('status')
      .eq('tenant_id', tenantId)
      .eq('project_id', projectId)

    if (tasks && tasks.length > 0) {
      const done = tasks.filter((t) => t.status === 'done').length
      fields.progress = Math.round((done / tasks.length) * 100)
    }
  }

  const { error } = await supabase
    .from('projects')
    .update(fields)
    .eq('tenant_id', tenantId)
    .eq('id', projectId)

  if (error) throw new Error(`updateProject: ${error.message}`)

  revalidatePath('/projects')
  revalidatePath(`/projects/${projectId}`)
}

export async function archiveProject(projectId: string): Promise<void> {
  const { supabase, tenantId } = await getAuthContext()

  const { error } = await supabase
    .from('projects')
    .update({ is_archived: true } satisfies ProjectUpdate)
    .eq('tenant_id', tenantId)
    .eq('id', projectId)

  if (error) throw new Error(`archiveProject: ${error.message}`)

  revalidatePath('/projects')
}

// ── Milestones ─────────────────────────────────────────────────

export async function createMilestone(input: {
  project_id: string
  name: string
  description?: string
  due_date?: string
  payment_percent?: number
  sort_order?: number
}): Promise<{ id: string }> {
  const { supabase, tenantId } = await getAuthContext()

  // Verify project belongs to tenant
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('id', input.project_id)
    .single()

  if (!project) throw new Error('Project not found')

  const { data, error } = await supabase
    .from('milestones')
    .insert({
      tenant_id: tenantId,
      project_id: input.project_id,
      name: input.name,
      description: input.description ?? null,
      due_date: input.due_date ?? null,
      payment_percent: input.payment_percent ?? null,
      sort_order: input.sort_order ?? 0,
    } satisfies MilestoneInsert)
    .select('id')
    .single()

  if (error) throw new Error(`createMilestone: ${error.message}`)

  revalidatePath(`/projects/${input.project_id}`)
  return { id: data.id }
}

export async function updateMilestone(
  milestoneId: string,
  projectId: string,
  updates: MilestoneUpdate
): Promise<void> {
  const { supabase, tenantId } = await getAuthContext()

  const { error } = await supabase
    .from('milestones')
    .update(updates)
    .eq('tenant_id', tenantId)
    .eq('id', milestoneId)

  if (error) throw new Error(`updateMilestone: ${error.message}`)

  revalidatePath(`/projects/${projectId}`)
}

export async function approveMilestone(
  milestoneId: string,
  projectId: string
): Promise<{ milestone_name: string; payment_percent: number | null }> {
  const { supabase, user, tenantId } = await getAuthContext()

  // Only owner/admin can approve
  const { data: userRow } = await supabase
    .from('users')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('id', user.id)
    .single()

  if (!userRow || !['owner', 'admin'].includes(userRow.role)) {
    throw new Error('Only owners and admins can approve milestones')
  }

  const { data: milestone, error } = await supabase
    .from('milestones')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: user.id,
    } satisfies MilestoneUpdate)
    .eq('tenant_id', tenantId)
    .eq('id', milestoneId)
    .select('name, payment_percent')
    .single()

  if (error) throw new Error(`approveMilestone: ${error.message}`)

  revalidatePath(`/projects/${projectId}`)

  return {
    milestone_name: milestone.name,
    payment_percent: milestone.payment_percent,
  }
}

export async function rejectMilestone(
  milestoneId: string,
  projectId: string,
  reason?: string
): Promise<void> {
  const { supabase, tenantId } = await getAuthContext()

  const { error } = await supabase
    .from('milestones')
    .update({ status: 'rejected' } satisfies MilestoneUpdate)
    .eq('tenant_id', tenantId)
    .eq('id', milestoneId)

  if (error) throw new Error(`rejectMilestone: ${error.message}`)

  revalidatePath(`/projects/${projectId}`)
}

export async function reorderMilestones(
  projectId: string,
  orderedIds: string[]
): Promise<void> {
  const { supabase, tenantId } = await getAuthContext()

  const updates = orderedIds.map((id, index) =>
    supabase
      .from('milestones')
      .update({ sort_order: index } satisfies MilestoneUpdate)
      .eq('tenant_id', tenantId)
      .eq('project_id', projectId)
      .eq('id', id)
  )

  await Promise.all(updates)
  revalidatePath(`/projects/${projectId}`)
}

// ── Tasks ──────────────────────────────────────────────────────

export async function createTask(input: {
  project_id: string
  title: string
  description?: string
  milestone_id?: string
  assignee_id?: string
  status?: TaskInsert['status']
  priority?: TaskInsert['priority']
  due_date?: string
  estimated_hours?: number
}): Promise<{ id: string }> {
  const { supabase, user, tenantId } = await getAuthContext()

  // Determine max sort_order in the target status column
  const { data: maxSort } = await supabase
    .from('tasks')
    .select('sort_order')
    .eq('tenant_id', tenantId)
    .eq('project_id', input.project_id)
    .eq('status', input.status ?? 'backlog')
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const nextSortOrder = (maxSort?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      tenant_id: tenantId,
      project_id: input.project_id,
      title: input.title,
      description: input.description ?? null,
      milestone_id: input.milestone_id ?? null,
      assignee_id: input.assignee_id ?? null,
      status: input.status ?? 'backlog',
      priority: input.priority ?? 'medium',
      due_date: input.due_date ?? null,
      estimated_hours: input.estimated_hours ?? null,
      sort_order: nextSortOrder,
    } satisfies TaskInsert)
    .select('id')
    .single()

  if (error) throw new Error(`createTask: ${error.message}`)

  await logActivity(tenantId, data.id, user.id, 'created', null, input.title)

  // Recalculate project progress
  await updateProject(input.project_id, { recalculate_progress: true })

  revalidatePath(`/projects/${input.project_id}`)
  return { id: data.id }
}

export async function updateTask(
  taskId: string,
  projectId: string,
  updates: TaskUpdate
): Promise<void> {
  const { supabase, user, tenantId } = await getAuthContext()

  // Fetch current values for activity log
  const { data: current } = await supabase
    .from('tasks')
    .select('status, priority, assignee_id, due_date, title')
    .eq('tenant_id', tenantId)
    .eq('id', taskId)
    .single()

  if (!current) throw new Error('Task not found')

  // Set completed_at when moving to done
  if (updates.status === 'done' && current.status !== 'done') {
    updates.completed_at = new Date().toISOString()
  } else if (updates.status && updates.status !== 'done') {
    updates.completed_at = null
  }

  const { error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('tenant_id', tenantId)
    .eq('id', taskId)

  if (error) throw new Error(`updateTask: ${error.message}`)

  // Write activity entries
  const activityPromises: Promise<void>[] = []

  if (updates.status && updates.status !== current.status) {
    activityPromises.push(
      logActivity(tenantId, taskId, user.id, 'status_changed', current.status, updates.status)
    )
  }
  if (updates.priority && updates.priority !== current.priority) {
    activityPromises.push(
      logActivity(tenantId, taskId, user.id, 'priority_changed', current.priority, updates.priority)
    )
  }
  if ('assignee_id' in updates && updates.assignee_id !== current.assignee_id) {
    activityPromises.push(
      logActivity(
        tenantId,
        taskId,
        user.id,
        updates.assignee_id ? 'assigned' : 'unassigned',
        current.assignee_id,
        updates.assignee_id ?? null
      )
    )
  }
  if (updates.due_date !== undefined && updates.due_date !== current.due_date) {
    activityPromises.push(
      logActivity(tenantId, taskId, user.id, 'due_date_changed', current.due_date, updates.due_date ?? null)
    )
  }

  await Promise.all(activityPromises)

  // Recalculate project progress when task status changes
  if (updates.status) {
    await updateProject(projectId, { recalculate_progress: true })
  }

  revalidatePath(`/projects/${projectId}`)
}

/** Bulk move + reorder tasks within or across kanban columns */
export async function moveTask(input: {
  task_id: string
  project_id: string
  new_status: TaskUpdate['status']
  new_sort_order: number
  /** Other tasks in the destination column that need sort_order updated */
  sibling_updates?: Array<{ id: string; sort_order: number }>
}): Promise<void> {
  const { supabase, user, tenantId } = await getAuthContext()

  const { data: current } = await supabase
    .from('tasks')
    .select('status')
    .eq('tenant_id', tenantId)
    .eq('id', input.task_id)
    .single()

  if (!current) throw new Error('Task not found')

  const updates: TaskUpdate = {
    status: input.new_status,
    sort_order: input.new_sort_order,
  }

  if (input.new_status === 'done' && current.status !== 'done') {
    updates.completed_at = new Date().toISOString()
  } else if (input.new_status !== 'done' && current.status === 'done') {
    updates.completed_at = null
  }

  // Update the moved task
  const { error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('tenant_id', tenantId)
    .eq('id', input.task_id)

  if (error) throw new Error(`moveTask: ${error.message}`)

  // Update sibling sort orders
  if (input.sibling_updates?.length) {
    await Promise.all(
      input.sibling_updates.map((s) =>
        supabase
          .from('tasks')
          .update({ sort_order: s.sort_order } satisfies TaskUpdate)
          .eq('tenant_id', tenantId)
          .eq('id', s.id)
      )
    )
  }

  if (input.new_status !== current.status) {
    await logActivity(tenantId, input.task_id, user.id, 'status_changed', current.status, input.new_status ?? null)
    await updateProject(input.project_id, { recalculate_progress: true })
  }

  revalidatePath(`/projects/${input.project_id}`)
}

// ── Subtasks ───────────────────────────────────────────────────

export async function createSubtask(input: {
  task_id: string
  project_id: string
  title: string
}): Promise<{ id: string }> {
  const { supabase, user, tenantId } = await getAuthContext()

  // Get next sort_order
  const { data: maxSort } = await supabase
    .from('task_subtasks')
    .select('sort_order')
    .eq('tenant_id', tenantId)
    .eq('task_id', input.task_id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const { data, error } = await supabase
    .from('task_subtasks')
    .insert({
      tenant_id: tenantId,
      task_id: input.task_id,
      title: input.title,
      sort_order: (maxSort?.sort_order ?? -1) + 1,
    } satisfies TaskSubtaskInsert)
    .select('id')
    .single()

  if (error) throw new Error(`createSubtask: ${error.message}`)

  await logActivity(tenantId, input.task_id, user.id, 'subtask_added', null, input.title)

  revalidatePath(`/projects/${input.project_id}`)
  return { id: data.id }
}

export async function toggleSubtask(input: {
  subtask_id: string
  task_id: string
  project_id: string
  is_completed: boolean
}): Promise<void> {
  const { supabase, user, tenantId } = await getAuthContext()

  const { error } = await supabase
    .from('task_subtasks')
    .update({
      is_completed: input.is_completed,
      completed_at: input.is_completed ? new Date().toISOString() : null,
      completed_by: input.is_completed ? user.id : null,
    })
    .eq('tenant_id', tenantId)
    .eq('id', input.subtask_id)

  if (error) throw new Error(`toggleSubtask: ${error.message}`)

  if (input.is_completed) {
    await logActivity(tenantId, input.task_id, user.id, 'subtask_completed')
  }

  revalidatePath(`/projects/${input.project_id}`)
}

export async function deleteSubtask(input: {
  subtask_id: string
  task_id: string
  project_id: string
}): Promise<void> {
  const { supabase, tenantId } = await getAuthContext()

  const { error } = await supabase
    .from('task_subtasks')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('id', input.subtask_id)

  if (error) throw new Error(`deleteSubtask: ${error.message}`)

  revalidatePath(`/projects/${input.project_id}`)
}

// ── Comments ───────────────────────────────────────────────────

export async function createComment(input: {
  task_id: string
  project_id: string
  content: string
}): Promise<{ id: string }> {
  const { supabase, user, tenantId } = await getAuthContext()

  const { data, error } = await supabase
    .from('task_comments')
    .insert({
      tenant_id: tenantId,
      task_id: input.task_id,
      user_id: user.id,
      content: input.content.trim(),
    })
    .select('id')
    .single()

  if (error) throw new Error(`createComment: ${error.message}`)

  await logActivity(tenantId, input.task_id, user.id, 'comment_added')

  revalidatePath(`/projects/${input.project_id}`)
  return { id: data.id }
}

export async function editComment(input: {
  comment_id: string
  task_id: string
  project_id: string
  content: string
}): Promise<void> {
  const { supabase, user, tenantId } = await getAuthContext()

  // Only the author can edit
  const { error } = await supabase
    .from('task_comments')
    .update({
      content: input.content.trim(),
      edited_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('id', input.comment_id)
    .eq('user_id', user.id) // ownership check in query

  if (error) throw new Error(`editComment: ${error.message}`)

  revalidatePath(`/projects/${input.project_id}`)
}

export async function deleteComment(input: {
  comment_id: string
  task_id: string
  project_id: string
}): Promise<void> {
  const { supabase, user, tenantId } = await getAuthContext()

  // Soft delete
  const { error } = await supabase
    .from('task_comments')
    .update({ is_deleted: true })
    .eq('tenant_id', tenantId)
    .eq('id', input.comment_id)
    .eq('user_id', user.id)

  if (error) throw new Error(`deleteComment: ${error.message}`)

  revalidatePath(`/projects/${input.project_id}`)
}

// ── Time Logs ──────────────────────────────────────────────────

export async function logTime(input: {
  task_id: string
  project_id: string
  started_at: string
  ended_at: string
  description?: string
  billable?: boolean
}): Promise<{ id: string }> {
  const { supabase, user, tenantId } = await getAuthContext()

  // Verify task belongs to tenant (not just project — task owns the log)
  const { data: task } = await supabase
    .from('tasks')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('id', input.task_id)
    .single()

  if (!task) throw new Error('Task not found')

  const { data, error } = await supabase
    .from('time_logs')
    .insert({
      tenant_id: tenantId,
      task_id: input.task_id,
      user_id: user.id,
      started_at: input.started_at,
      ended_at: input.ended_at,
      description: input.description ?? null,
      billable: input.billable ?? true,
    } satisfies TimeLogInsert)
    .select('id')
    .single()

  if (error) throw new Error(`logTime: ${error.message}`)

  await logActivity(tenantId, input.task_id, user.id, 'time_logged')

  revalidatePath(`/projects/${input.project_id}`)
  return { id: data.id }
}

// ── Templates ──────────────────────────────────────────────────

export async function saveProjectAsTemplate(
  projectId: string,
  templateName: string
): Promise<{ id: string }> {
  const { supabase, user, tenantId } = await getAuthContext()

  // Verify project
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('id', projectId)
    .single()

  if (!project) throw new Error('Project not found')

  // Create template
  const { data: template, error: tmplError } = await supabase
    .from('project_templates')
    .insert({
      tenant_id: tenantId,
      name: templateName,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (tmplError) throw new Error(`saveProjectAsTemplate: ${tmplError.message}`)

  // Copy milestones
  const { data: milestones } = await supabase
    .from('milestones')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  for (const m of milestones ?? []) {
    const { data: tmplMilestone, error: mErr } = await supabase
      .from('project_template_milestones')
      .insert({
        tenant_id: tenantId,
        template_id: template.id,
        name: m.name,
        description: m.description,
        payment_percent: m.payment_percent,
        sort_order: m.sort_order,
      })
      .select('id')
      .single()

    if (mErr) continue

    // Copy tasks for this milestone
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('milestone_id', m.id)
      .order('sort_order', { ascending: true })

    if (tasks?.length) {
      await supabase.from('project_template_tasks').insert(
        tasks.map((t) => ({
          tenant_id: tenantId,
          template_id: template.id,
          template_milestone_id: tmplMilestone.id,
          title: t.title,
          description: t.description,
          priority: t.priority,
          estimated_hours: t.estimated_hours,
          sort_order: t.sort_order,
        }))
      )
    }
  }

  // Copy unassigned tasks (no milestone)
  const { data: unassignedTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('project_id', projectId)
    .is('milestone_id', null)
    .order('sort_order', { ascending: true })

  if (unassignedTasks?.length) {
    await supabase.from('project_template_tasks').insert(
      unassignedTasks.map((t) => ({
        tenant_id: tenantId,
        template_id: template.id,
        template_milestone_id: null,
        title: t.title,
        description: t.description,
        priority: t.priority,
        estimated_hours: t.estimated_hours,
        sort_order: t.sort_order,
      }))
    )
  }

  revalidatePath('/projects')
  return { id: template.id }
}

export async function deleteTemplate(templateId: string): Promise<void> {
  const { supabase, tenantId } = await getAuthContext()

  const { error } = await supabase
    .from('project_templates')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('id', templateId)

  if (error) throw new Error(`deleteTemplate: ${error.message}`)

  revalidatePath('/projects')
}
