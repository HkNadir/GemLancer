import { createClient } from '@/lib/supabase/server'

// ── Types ──────────────────────────────────────────────────────

export interface InvoiceListItem {
  id: string
  number: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  currency: string
  due_date: string | null
  issue_date: string | null
  total: number
  tax_rate: number
  discount_amount: number
  recurring_interval: string | null
  stripe_payment_link: string | null
  client: { id: string; name: string; company: string | null } | null
  project: { id: string; name: string } | null
}

export interface InvoiceDetail extends InvoiceListItem {
  notes: string | null
  items: {
    id: string
    description: string
    quantity: number
    unit_price: number
  }[]
}

// ── Get invoices list ──────────────────────────────────────────

export async function getInvoices(
  tenantId: string,
  filters?: { status?: string; client_id?: string }
): Promise<InvoiceListItem[]> {
  if (!tenantId) return []
  const supabase = await createClient()

  let query = supabase
    .from('invoices')
    .select(
      `
      id, number, status, currency, due_date, issue_date,
      tax_rate, discount_amount, recurring_interval, stripe_payment_link,
      client:clients ( id, name, company ),
      project:projects ( id, name ),
      invoice_items ( unit_price, quantity )
    `
    )
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }
  if (filters?.client_id) {
    query = query.eq('client_id', filters.client_id)
  }

  const { data, error } = await query

  if (error) throw error

  return (data ?? []).map((inv: any) => {
    const subtotal = (inv.invoice_items ?? []).reduce(
      (s: number, item: any) => s + item.quantity * item.unit_price,
      0
    )
    const taxAmount = subtotal * (inv.tax_rate / 100)
    const total = subtotal + taxAmount - (inv.discount_amount ?? 0)
    return { ...inv, total, invoice_items: undefined }
  })
}

// ── Get single invoice ─────────────────────────────────────────

export async function getInvoiceById(
  id: string,
  tenantId: string
): Promise<InvoiceDetail | null> {
  if (!tenantId) return null
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('invoices')
    .select(
      `
      id, number, status, currency, due_date, issue_date, notes,
      tax_rate, discount_amount, recurring_interval, stripe_payment_link,
      client:clients ( id, name, company ),
      project:projects ( id, name ),
      items:invoice_items ( id, description, quantity, unit_price )
    `
    )
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !data) return null

  const subtotal = (data.items ?? []).reduce(
    (s: number, item: any) => s + item.quantity * item.unit_price,
    0
  )
  const taxAmount = subtotal * ((data.tax_rate ?? 0) / 100)
  const total = subtotal + taxAmount - ((data.discount_amount ?? 0))

  return { ...(data as any), total }
}

// ── Clients for select ─────────────────────────────────────────

export async function getClientsForInvoice(tenantId: string) {
  if (!tenantId) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('clients')
    .select('id, name, company, currency')
    .eq('tenant_id', tenantId)
    .order('name')
  return data ?? []
}

// ── Projects for a client ──────────────────────────────────────

export async function getProjectsForClient(tenantId: string, clientId: string) {
  if (!tenantId) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('projects')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .order('name')
  return data ?? []
}

// ── Next invoice number ────────────────────────────────────────

export async function getNextInvoiceNumber(tenantId: string): Promise<string> {
  if (!tenantId) return 'INV-0001'
  const supabase = await createClient()
  const { count } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
  const num = (count ?? 0) + 1
  return `INV-${String(num).padStart(4, '0')}`
}

// ── Invoice stats ──────────────────────────────────────────────

export async function getInvoiceStats(tenantId: string) {
  if (!tenantId) return { draft: 0, sent: 0, paid: 0, overdue: 0, totalRevenue: 0 }
  const supabase = await createClient()
  const { data } = await supabase
    .from('invoices')
    .select(
      `
      status,
      tax_rate, discount_amount,
      invoice_items ( unit_price, quantity )
    `
    )
    .eq('tenant_id', tenantId)
    .neq('status', 'cancelled')

  const stats = { draft: 0, sent: 0, paid: 0, overdue: 0, totalRevenue: 0 }

  for (const inv of data ?? []) {
    const subtotal = ((inv as any).invoice_items ?? []).reduce(
      (s: number, item: any) => s + item.quantity * item.unit_price,
      0
    )
    const total = subtotal * (1 + (inv.tax_rate ?? 0) / 100) - (inv.discount_amount ?? 0)
    const status = inv.status as keyof typeof stats
    if (status in stats) (stats as any)[status] += total
    if (inv.status === 'paid') stats.totalRevenue += total
  }

  return stats
}
