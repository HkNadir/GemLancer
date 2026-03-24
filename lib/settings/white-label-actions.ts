'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { resolveTenantId } from '@/lib/supabase/auth-context'

export async function updateWorkspaceName(name: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const tenantId = await resolveTenantId(supabase, user.id, user.app_metadata?.tenant_id)
  if (!tenantId) return { error: 'No tenant context' }

  const callerRole = user.app_metadata?.role as string
  if (!['owner', 'admin'].includes(callerRole)) return { error: 'Insufficient permissions' }

  const trimmed = name.trim()
  if (!trimmed) return { error: 'Name is required' }

  const { error } = await supabase
    .from('tenants')
    .update({ name: trimmed })
    .eq('id', tenantId)

  if (error) return { error: error.message }

  revalidatePath('/settings/workspace')
  return {}
}

export async function updateBrandColor(color: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const tenantId = await resolveTenantId(supabase, user.id, user.app_metadata?.tenant_id)
  if (!tenantId) return { error: 'No tenant context' }

  const callerRole = user.app_metadata?.role as string
  if (!['owner', 'admin'].includes(callerRole)) return { error: 'Insufficient permissions' }

  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return { error: 'Invalid color format' }

  const { error } = await supabase
    .from('tenants')
    .update({ primary_color: color })
    .eq('id', tenantId)

  if (error) return { error: error.message }

  revalidatePath('/settings/workspace')
  return {}
}

export async function uploadLogo(formData: FormData): Promise<{ error?: string; url?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const tenantId = await resolveTenantId(supabase, user.id, user.app_metadata?.tenant_id)
  if (!tenantId) return { error: 'No tenant context' }

  const callerRole = user.app_metadata?.role as string
  if (!['owner', 'admin'].includes(callerRole)) return { error: 'Insufficient permissions' }

  const file = formData.get('logo') as File | null
  if (!file) return { error: 'No file provided' }
  if (file.size > 2 * 1024 * 1024) return { error: 'Logo must be under 2 MB' }
  if (!file.type.startsWith('image/')) return { error: 'File must be an image' }

  const ext = file.name.split('.').pop() ?? 'png'
  const path = `logos/${tenantId}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('logos')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) return { error: uploadError.message }

  const { data: signed } = await supabase.storage
    .from('logos')
    .createSignedUrl(path, 60 * 60 * 24 * 365)

  const url = signed?.signedUrl ?? null
  if (url) {
    await supabase.from('tenants').update({ logo_url: url }).eq('id', tenantId)
  }

  revalidatePath('/settings/workspace')
  return { url: url ?? undefined }
}

export async function updateCustomDomain(domain: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const tenantId = await resolveTenantId(supabase, user.id, user.app_metadata?.tenant_id)
  if (!tenantId) return { error: 'No tenant context' }

  const callerRole = user.app_metadata?.role as string
  if (callerRole !== 'owner') return { error: 'Only the workspace owner can set a custom domain' }

  const { data: tenant } = await supabase.from('tenants').select('plan').eq('id', tenantId).single()
  if (tenant?.plan !== 'agency') return { error: 'Custom domain requires the Agency plan' }

  const trimmed = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')

  const { error } = await supabase
    .from('tenants')
    .update({ custom_domain: trimmed || null })
    .eq('id', tenantId)

  if (error) return { error: error.message }

  revalidatePath('/settings/workspace')
  return {}
}
