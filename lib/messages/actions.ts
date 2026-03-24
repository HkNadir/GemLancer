'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { resolveTenantId } from '@/lib/supabase/auth-context'

export async function sendMessage(
  projectId: string,
  content: string,
  fileIds: string[] = []
): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const tenantId = await resolveTenantId(supabase, user.id, user.app_metadata?.tenant_id)
  if (!tenantId) return { error: 'No tenant context' }

  const trimmed = content.trim()
  if (!trimmed) return { error: 'Message cannot be empty' }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      tenant_id: tenantId,
      project_id: projectId,
      sender_id: user.id,
      sender_type: 'freelancer',
      content: trimmed,
      file_ids: fileIds,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/messages`)
  revalidatePath(`/projects/${projectId}/messages`)

  return { id: data.id }
}

export async function editMessage(
  messageId: string,
  content: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const tenantId = await resolveTenantId(supabase, user.id, user.app_metadata?.tenant_id)
  if (!tenantId) return { error: 'No tenant context' }

  const trimmed = content.trim()
  if (!trimmed) return { error: 'Message cannot be empty' }

  const { error } = await supabase
    .from('messages')
    .update({ content: trimmed, edited_at: new Date().toISOString() })
    .eq('id', messageId)
    .eq('tenant_id', tenantId)
    .eq('sender_id', user.id) // only own messages

  if (error) return { error: error.message }

  revalidatePath('/messages')
  return {}
}

export async function deleteMessage(messageId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const tenantId = await resolveTenantId(supabase, user.id, user.app_metadata?.tenant_id)
  if (!tenantId) return { error: 'No tenant context' }

  const { error } = await supabase
    .from('messages')
    .update({ is_deleted: true })
    .eq('id', messageId)
    .eq('tenant_id', tenantId)
    .eq('sender_id', user.id) // only own messages

  if (error) return { error: error.message }

  revalidatePath('/messages')
  return {}
}
