import { createClient } from '@/lib/supabase/server'
import type { File } from '@/types/database'

export interface FileWithUploader extends File {
  uploader: { id: string; full_name: string } | null
  project: { id: string; name: string } | null
  signed_url: string | null
}

export async function getFiles(
  tenantId: string,
  opts: { projectId?: string; search?: string } = {}
): Promise<FileWithUploader[]> {
  if (!tenantId) return []
  const supabase = await createClient()

  let q = supabase
    .from('files')
    .select('*, uploader:users!uploader_id ( id, full_name ), project:projects ( id, name )')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (opts.projectId) q = q.eq('project_id', opts.projectId)
  if (opts.search) q = q.ilike('name', `%${opts.search}%`)

  const { data, error } = await q
  if (error) {
    console.error('getFiles:', error.message)
    return []
  }

  // Generate 1-hour signed URLs
  const withUrls = await Promise.all(
    (data ?? []).map(async (file: any) => {
      const { data: signed } = await supabase.storage
        .from('files')
        .createSignedUrl(file.bucket_path, 3600)
      return { ...file, signed_url: signed?.signedUrl ?? null }
    })
  )

  return withUrls
}

export async function getFileById(
  tenantId: string,
  fileId: string
): Promise<FileWithUploader | null> {
  if (!tenantId) return null
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('files')
    .select('*, uploader:users!uploader_id ( id, full_name ), project:projects ( id, name )')
    .eq('tenant_id', tenantId)
    .eq('id', fileId)
    .is('deleted_at', null)
    .single()

  if (error || !data) return null

  const { data: signed } = await supabase.storage
    .from('files')
    .createSignedUrl((data as any).bucket_path, 3600)

  return { ...(data as any), signed_url: signed?.signedUrl ?? null }
}

export async function getStorageUsageBytes(tenantId: string): Promise<number> {
  if (!tenantId) return 0
  const supabase = await createClient()

  const { data } = await supabase
    .from('files')
    .select('size_bytes')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)

  return (data ?? []).reduce((sum: number, f: any) => sum + (f.size_bytes ?? 0), 0)
}

export async function getProjectsForFiles(
  tenantId: string
): Promise<{ id: string; name: string }[]> {
  if (!tenantId) return []
  const supabase = await createClient()

  const { data } = await supabase
    .from('projects')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .order('name')

  return data ?? []
}
