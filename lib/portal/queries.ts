/**
 * Portal queries — run with admin client (bypass RLS) but manually scope to the client's tenant.
 * Called only from /portal/* routes after token validation.
 */
import { createAdminClient } from '@/lib/supabase/server'

export interface PortalSession {
  userId: string
  tenantId: string
  clientId: string
  clientName: string
}

/** Validate a portal token and return the session, or null if invalid/expired. */
export async function validatePortalToken(token: string): Promise<PortalSession | null> {
  const supabase = await createAdminClient()

  const { data: user, error } = await supabase
    .from('users')
    .select('id, tenant_id, portal_token_expires_at')
    .eq('portal_token', token)
    .eq('role', 'client')
    .eq('is_active', true)
    .single()

  if (error || !user) return null

  // Check expiry
  if (user.portal_token_expires_at) {
    const expires = new Date(user.portal_token_expires_at)
    if (expires < new Date()) return null
  }

  // Find the client record linked to this user (by email match or by user.id)
  const { data: clientRow } = await supabase
    .from('clients')
    .select('id, name')
    .eq('tenant_id', user.tenant_id)
    .or(`portal_user_id.eq.${user.id},contact_user_id.eq.${user.id}`)
    .limit(1)
    .maybeSingle()

  // Fallback: use user's own name if no client row found
  const clientId = clientRow?.id ?? user.id
  const clientName = clientRow?.name ?? 'Client'

  return {
    userId: user.id,
    tenantId: user.tenant_id,
    clientId,
    clientName,
  }
}

export async function getPortalTenant(tenantId: string) {
  const supabase = await createAdminClient()
  const { data } = await supabase
    .from('tenants')
    .select('name, logo_url, primary_color')
    .eq('id', tenantId)
    .single()
  return data
}

export async function getPortalProjects(tenantId: string, clientId: string) {
  const supabase = await createAdminClient()
  const { data } = await supabase
    .from('projects')
    .select('id, name, status, description, created_at')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function getPortalProject(tenantId: string, clientId: string, projectId: string) {
  const supabase = await createAdminClient()
  const { data } = await supabase
    .from('projects')
    .select('id, name, status, description, created_at, milestones ( id, title, status, due_date )')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .eq('id', projectId)
    .single()
  return data
}

export async function getPortalInvoices(tenantId: string, clientId: string) {
  const supabase = await createAdminClient()
  const { data } = await supabase
    .from('invoices')
    .select('id, number, status, issue_date, due_date, total, currency')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function getPortalInvoice(tenantId: string, clientId: string, invoiceId: string) {
  const supabase = await createAdminClient()
  const { data } = await supabase
    .from('invoices')
    .select('*, invoice_items ( * )')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .eq('id', invoiceId)
    .single()
  return data
}

export async function getPortalFiles(tenantId: string, clientId: string) {
  const supabase = await createAdminClient()
  const { data } = await supabase
    .from('files')
    .select('id, name, size_bytes, mime_type, bucket_path, created_at, project_id, projects ( name )')
    .eq('tenant_id', tenantId)
    .eq('is_client_visible', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (!data) return []

  // Generate signed URLs
  const withUrls = await Promise.all(
    data.map(async (file: any) => {
      const { data: signed } = await supabase.storage
        .from('files')
        .createSignedUrl(file.bucket_path, 3600)
      return { ...file, signed_url: signed?.signedUrl ?? null }
    })
  )
  return withUrls
}

export async function getPortalMessages(tenantId: string, projectId: string) {
  const supabase = await createAdminClient()
  const { data } = await supabase
    .from('messages')
    .select('id, content, sender_type, created_at, edited_at, sender:users!sender_id ( full_name )')
    .eq('tenant_id', tenantId)
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
  return data ?? []
}

export async function sendPortalMessage(
  tenantId: string,
  projectId: string,
  senderId: string,
  content: string
) {
  const supabase = await createAdminClient()
  const { error } = await supabase.from('messages').insert({
    tenant_id: tenantId,
    project_id: projectId,
    sender_id: senderId,
    sender_type: 'client',
    content: content.trim(),
    file_ids: [],
  })
  return error ? { error: error.message } : {}
}
