/**
 * Dashboard data queries — all server-side, all tenant-scoped.
 * Called from the dashboard Server Component page.
 */

import { createClient } from '@/lib/supabase/server'

// ── Revenue chart (last 12 months, grouped by month) ─────────
export interface RevenueDataPoint {
  month: string   // e.g. "Jan 25"
  invoiced: number
  paid: number
}

export async function getRevenueChart(
  tenantId: string
): Promise<RevenueDataPoint[]> {
  if (!tenantId) return []
  const supabase = await createClient()

  const fromDate = new Date()
  fromDate.setMonth(fromDate.getMonth() - 11)
  fromDate.setDate(1)
  fromDate.setHours(0, 0, 0, 0)

  const { data } = await supabase
    .from('invoices')
    .select('issue_date, subtotal, tax_amount, discount_amount, status, total')
    .eq('tenant_id', tenantId)
    .not('status', 'eq', 'cancelled')
    .gte('issue_date', fromDate.toISOString().split('T')[0])
    .order('issue_date', { ascending: true })

  // Build a map of year-month → { invoiced, paid }
  const map = new Map<string, { invoiced: number; paid: number }>()

  // Pre-fill all 12 months (even if empty)
  for (let i = 11; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    map.set(key, { invoiced: 0, paid: 0 })
  }

  for (const row of data ?? []) {
    const [year, month] = row.issue_date.split('-')
    const key = `${year}-${month}`
    const entry = map.get(key)
    if (!entry) continue
    entry.invoiced += row.total ?? 0
    if (row.status === 'paid') entry.paid += row.total ?? 0
  }

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return Array.from(map.entries()).map(([key, val]) => {
    const [year, month] = key.split('-')
    return {
      month: `${MONTHS[parseInt(month) - 1]} ${year.slice(2)}`,
      invoiced: Math.round(val.invoiced * 100) / 100,
      paid: Math.round(val.paid * 100) / 100,
    }
  })
}

// ── Active projects stats ─────────────────────────────────────
export interface ProjectsStats {
  total: number
  active: number
  onHold: number
  completed: number
  draft: number
}

export async function getProjectsStats(tenantId: string): Promise<ProjectsStats> {
  if (!tenantId) return { total: 0, active: 0, onHold: 0, completed: 0, draft: 0 }
  const supabase = await createClient()

  const { data } = await supabase
    .from('projects')
    .select('status')
    .eq('tenant_id', tenantId)
    .eq('is_archived', false)

  const stats: ProjectsStats = { total: 0, active: 0, onHold: 0, completed: 0, draft: 0 }

  for (const row of data ?? []) {
    stats.total++
    if (row.status === 'active')    stats.active++
    if (row.status === 'on_hold')   stats.onHold++
    if (row.status === 'completed') stats.completed++
    if (row.status === 'draft')     stats.draft++
  }

  return stats
}

// ── Today's top 5 tasks ───────────────────────────────────────
export interface TaskPreview {
  id: string
  title: string
  status: string
  priority: string
  due_date: string | null
  project_name: string | null
}

export async function getTodaysTasks(tenantId: string): Promise<TaskPreview[]> {
  if (!tenantId) return []
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]

  const { data } = await supabase
    .from('tasks')
    .select('id, title, status, priority, due_date, projects(name)')
    .eq('tenant_id', tenantId)
    .not('status', 'in', '("done")')
    .or(`due_date.lte.${today},priority.in.("urgent","high")`)
    .order('priority', { ascending: false })
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(5)

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    priority: row.priority,
    due_date: row.due_date,
    project_name: (row.projects as { name?: string } | null)?.name ?? null,
  }))
}

// ── Hours this week vs last week ──────────────────────────────
export interface HoursStats {
  thisWeekMinutes: number
  lastWeekMinutes: number
  percentChange: number | null
  billableMinutes: number
}

export async function getHoursStats(
  tenantId: string,
  userId: string
): Promise<HoursStats> {
  if (!tenantId || !userId) return { thisWeekMinutes: 0, lastWeekMinutes: 0, percentChange: null, billableMinutes: 0 }
  const supabase = await createClient()

  const now = new Date()
  const dayOfWeek = now.getDay()
  const startOfThisWeek = new Date(now)
  startOfThisWeek.setDate(now.getDate() - dayOfWeek)
  startOfThisWeek.setHours(0, 0, 0, 0)

  const startOfLastWeek = new Date(startOfThisWeek)
  startOfLastWeek.setDate(startOfThisWeek.getDate() - 7)

  const { data } = await supabase
    .from('time_logs')
    .select('started_at, duration_minutes, billable')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .gte('started_at', startOfLastWeek.toISOString())

  let thisWeekMinutes = 0
  let lastWeekMinutes = 0
  let billableMinutes = 0

  for (const row of data ?? []) {
    const logDate = new Date(row.started_at)
    if (logDate >= startOfThisWeek) {
      thisWeekMinutes += row.duration_minutes
      if (row.billable) billableMinutes += row.duration_minutes
    } else {
      lastWeekMinutes += row.duration_minutes
    }
  }

  const percentChange =
    lastWeekMinutes > 0
      ? Math.round(((thisWeekMinutes - lastWeekMinutes) / lastWeekMinutes) * 100)
      : null

  return { thisWeekMinutes, lastWeekMinutes, percentChange, billableMinutes }
}

// ── Cash flow forecast (next 30 days from open invoices) ──────
export interface CashFlowItem {
  id: string
  number: string
  client_name: string
  total: number
  currency: string
  due_date: string
  status: string
  daysUntilDue: number
}

export async function getCashFlowForecast(tenantId: string): Promise<CashFlowItem[]> {
  if (!tenantId) return []
  const supabase = await createClient()

  const today = new Date()
  const in30Days = new Date(today)
  in30Days.setDate(today.getDate() + 30)

  const { data } = await supabase
    .from('invoices')
    .select('id, number, total, currency, due_date, status, clients(name)')
    .eq('tenant_id', tenantId)
    .in('status', ['sent', 'overdue', 'viewed'])
    .lte('due_date', in30Days.toISOString().split('T')[0])
    .order('due_date', { ascending: true })
    .limit(10)

  const todayStr = today.toISOString().split('T')[0]

  return (data ?? []).map((row) => {
    const due = new Date(row.due_date)
    const daysUntilDue = Math.round((due.getTime() - today.getTime()) / 86_400_000)

    return {
      id: row.id,
      number: row.number,
      client_name: (row.clients as { name?: string } | null)?.name ?? 'Unknown',
      total: row.total,
      currency: row.currency,
      due_date: row.due_date,
      status: row.status,
      daysUntilDue,
    }
  })
}

// ── Smart alerts ──────────────────────────────────────────────
export interface SmartAlert {
  type: 'overdue_invoice' | 'task_due_soon' | 'milestone_approaching'
  title: string
  description: string
  href: string
  urgency: 'high' | 'medium'
}

export async function getSmartAlerts(tenantId: string): Promise<SmartAlert[]> {
  if (!tenantId) return []
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]
  const in3Days = new Date()
  in3Days.setDate(in3Days.getDate() + 3)
  const in3DaysStr = in3Days.toISOString().split('T')[0]

  const [overdueInvoices, dueSoonTasks, upcomingMilestones] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, number, total, currency, due_date, clients(name)')
      .eq('tenant_id', tenantId)
      .in('status', ['overdue'])
      .order('due_date', { ascending: true })
      .limit(3),

    supabase
      .from('tasks')
      .select('id, title, due_date, projects(name)')
      .eq('tenant_id', tenantId)
      .lte('due_date', in3DaysStr)
      .not('status', 'in', '("done")')
      .order('due_date', { ascending: true })
      .limit(3),

    supabase
      .from('milestones')
      .select('id, name, due_date, projects(name)')
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .lte('due_date', in3DaysStr)
      .order('due_date', { ascending: true })
      .limit(2),
  ])

  const alerts: SmartAlert[] = []

  for (const inv of overdueInvoices.data ?? []) {
    const client = (inv.clients as { name?: string } | null)?.name ?? 'a client'
    alerts.push({
      type: 'overdue_invoice',
      title: `Invoice ${inv.number} is overdue`,
      description: `${client} owes ${inv.currency} ${inv.total.toLocaleString()}`,
      href: `/invoices/${inv.id}`,
      urgency: 'high',
    })
  }

  for (const task of dueSoonTasks.data ?? []) {
    const project = (task.projects as { name?: string } | null)?.name ?? ''
    const isToday = task.due_date === today
    alerts.push({
      type: 'task_due_soon',
      title: `"${task.title}" ${isToday ? 'is due today' : 'due in 3 days'}`,
      description: project ? `In project: ${project}` : 'No project assigned',
      href: `/tasks?highlight=${task.id}`,
      urgency: isToday ? 'high' : 'medium',
    })
  }

  for (const ms of upcomingMilestones.data ?? []) {
    const project = (ms.projects as { name?: string } | null)?.name ?? ''
    alerts.push({
      type: 'milestone_approaching',
      title: `Milestone "${ms.name}" approaching`,
      description: project ? `Project: ${project}` : '',
      href: `/projects?milestone=${ms.id}`,
      urgency: 'medium',
    })
  }

  return alerts
}
