/**
 * GemLancer — Client server-side queries
 * Server Components / Server Actions only.
 */

import { createClient } from '@/lib/supabase/server'
import type { Client, ClientTag } from '@/types/database'

export type ClientFilter = 'all' | ClientTag

export interface ClientListItem extends Client {
  project_count: number
  open_invoice_count: number
  total_invoiced: number
}

export interface ClientStats {
  total_projects: number
  active_projects: number
  total_invoiced: number
  total_paid: number
  total_outstanding: number
  total_logged_minutes: number
}

// ── List ──────────────────────────────────────────────────────

export async function getClients(
  tenantId: string,
  filter: ClientFilter = 'all',
  search?: string
): Promise<ClientListItem[]> {
  if (!tenantId) return []
  const supabase = await createClient()

  let query = supabase
    .from('clients')
    .select(`
      *,
      projects ( id, status ),
      invoices ( id, status, total )
    `)
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true })

  if (filter !== 'all') {
    query = query.eq('tag', filter)
  }

  if (search?.trim()) {
    query = query.or(
      `name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%,company.ilike.%${search.trim()}%`
    )
  }

  const { data, error } = await query
  if (error) throw new Error(`getClients: ${error.message}`)

  return (data ?? []).map((c: any): ClientListItem => {
    const projects: Array<{ status: string }> = c.projects ?? []
    const invoices: Array<{ status: string; total: number }> = c.invoices ?? []

    const openInvoices = invoices.filter(
      (i) => i.status === 'sent' || i.status === 'overdue'
    )
    const totalInvoiced = invoices
      .filter((i) => i.status !== 'cancelled')
      .reduce((sum, i) => sum + (i.total ?? 0), 0)

    return {
      id: c.id,
      tenant_id: c.tenant_id,
      user_id: c.user_id,
      name: c.name,
      email: c.email,
      company: c.company,
      phone: c.phone,
      address: c.address,
      city: c.city,
      country: c.country,
      currency: c.currency,
      tag: c.tag,
      notes: c.notes,
      is_active: c.is_active,
      created_at: c.created_at,
      updated_at: c.updated_at,
      project_count: projects.length,
      open_invoice_count: openInvoices.length,
      total_invoiced: totalInvoiced,
    }
  })
}

// ── Detail ────────────────────────────────────────────────────

export async function getClientById(
  tenantId: string,
  clientId: string
): Promise<Client | null> {
  if (!tenantId) return null
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', clientId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`getClientById: ${error.message}`)
  }

  return data
}

// ── Stats ─────────────────────────────────────────────────────

export async function getClientStats(
  tenantId: string,
  clientId: string
): Promise<ClientStats> {
  if (!tenantId) return { total_projects: 0, active_projects: 0, total_invoiced: 0, total_paid: 0, total_outstanding: 0, total_logged_minutes: 0 }
  const supabase = await createClient()

  const [projectsResult, invoicesResult] = await Promise.all([
    supabase
      .from('projects')
      .select('id, status')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId),

    supabase
      .from('invoices')
      .select('id, status, total')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .neq('status', 'cancelled'),
  ])

  const projects = projectsResult.data ?? []
  const invoices = invoicesResult.data ?? []

  const totalInvoiced = invoices.reduce((s, i) => s + (i.total ?? 0), 0)
  const totalPaid = invoices
    .filter((i) => i.status === 'paid')
    .reduce((s, i) => s + (i.total ?? 0), 0)
  const totalOutstanding = invoices
    .filter((i) => i.status === 'sent' || i.status === 'overdue')
    .reduce((s, i) => s + (i.total ?? 0), 0)

  // Time logs via tasks → projects
  const projectIds = projects.map((p) => p.id)
  let totalLoggedMinutes = 0

  if (projectIds.length > 0) {
    const { data: taskIds } = await supabase
      .from('tasks')
      .select('id')
      .eq('tenant_id', tenantId)
      .in('project_id', projectIds)

    if (taskIds?.length) {
      const { data: timeLogs } = await supabase
        .from('time_logs')
        .select('duration_minutes')
        .eq('tenant_id', tenantId)
        .in('task_id', taskIds.map((t) => t.id))

      totalLoggedMinutes = (timeLogs ?? []).reduce(
        (s, l) => s + (l.duration_minutes ?? 0),
        0
      )
    }
  }

  return {
    total_projects: projects.length,
    active_projects: projects.filter((p) => p.status === 'active').length,
    total_invoiced: totalInvoiced,
    total_paid: totalPaid,
    total_outstanding: totalOutstanding,
    total_logged_minutes: totalLoggedMinutes,
  }
}

// ── Projects for client detail ────────────────────────────────

export async function getClientProjects(tenantId: string, clientId: string) {
  if (!tenantId) return []
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('projects')
    .select('id, name, status, progress, budget, currency, start_date, end_date')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`getClientProjects: ${error.message}`)
  return data ?? []
}

// ── Invoices for client detail ────────────────────────────────

export async function getClientInvoices(tenantId: string, clientId: string) {
  if (!tenantId) return []
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('invoices')
    .select('id, number, status, total, currency, due_date, issue_date, paid_at')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`getClientInvoices: ${error.message}`)
  return data ?? []
}
