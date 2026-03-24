'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { planLimits } from '@/lib/config'
import { resolveTenantId } from '@/lib/supabase/auth-context'

export async function uploadFile(formData: FormData): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const tenantId = await resolveTenantId(supabase, user.id, user.app_metadata?.tenant_id)
  if (!tenantId) return { error: 'No tenant context' }

  const file = formData.get('file') as File | null
  const projectId = (formData.get('project_id') as string) || null
  const isClientVisible = formData.get('is_client_visible') === 'true'

  if (!file) return { error: 'No file provided' }

  // Check storage quota
  const { data: tenantRow } = await supabase
    .from('tenants')
    .select('plan, storage_limit_gb')
    .eq('id', tenantId)
    .single()

  if (tenantRow) {
    const { data: usageRows } = await supabase
      .from('files')
      .select('size_bytes')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    const usedBytes = (usageRows ?? []).reduce((s: number, f: any) => s + (f.size_bytes ?? 0), 0)
    const limitBytes = (tenantRow.storage_limit_gb ?? planLimits[tenantRow.plan as keyof typeof planLimits]?.storageGb ?? 5) * 1024 * 1024 * 1024

    if (usedBytes + file.size > limitBytes) {
      return { error: 'Storage limit reached. Upgrade your plan to upload more files.' }
    }
  }

  // Build a unique bucket path: tenant/year-month/timestamp-filename
  const date = new Date()
  const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const bucketPath = `${tenantId}/${month}/${Date.now()}-${safe}`

  const { error: uploadError } = await supabase.storage
    .from('files')
    .upload(bucketPath, file, { contentType: file.type, upsert: false })

  if (uploadError) return { error: uploadError.message }

  const { data: row, error: dbError } = await supabase
    .from('files')
    .insert({
      tenant_id: tenantId,
      project_id: projectId,
      uploader_id: user.id,
      name: file.name,
      bucket_path: bucketPath,
      size_bytes: file.size,
      mime_type: file.type || 'application/octet-stream',
      is_client_visible: isClientVisible,
    })
    .select('id')
    .single()

  if (dbError) {
    // Rollback storage upload
    await supabase.storage.from('files').remove([bucketPath])
    return { error: dbError.message }
  }

  revalidatePath('/files')
  if (projectId) revalidatePath(`/projects/${projectId}/files`)

  return { id: row.id }
}

export async function deleteFile(fileId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const tenantId = await resolveTenantId(supabase, user.id, user.app_metadata?.tenant_id)
  if (!tenantId) return { error: 'No tenant context' }

  const { error } = await supabase
    .from('files')
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
    .eq('id', fileId)
    .eq('tenant_id', tenantId)

  if (error) return { error: error.message }

  revalidatePath('/files')
  return {}
}

export async function toggleClientVisibility(
  fileId: string,
  visible: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const tenantId = await resolveTenantId(supabase, user.id, user.app_metadata?.tenant_id)
  if (!tenantId) return { error: 'No tenant context' }

  const { error } = await supabase
    .from('files')
    .update({ is_client_visible: visible })
    .eq('id', fileId)
    .eq('tenant_id', tenantId)

  if (error) return { error: error.message }

  revalidatePath('/files')
  return {}
}
