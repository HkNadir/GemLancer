import { createClient } from '@/lib/supabase/server'
import type { MessageWithSender } from '@/types/database'

export interface ConversationSummary {
  project_id: string
  project_name: string
  last_message: string | null
  last_message_at: string | null
  unread_count: number
}

export async function getConversations(tenantId: string): Promise<ConversationSummary[]> {
  if (!tenantId) return []
  const supabase = await createClient()

  // Get all projects that have at least one message
  const { data, error } = await supabase
    .from('messages')
    .select('project_id, content, created_at, read_at, projects!inner ( name )')
    .eq('tenant_id', tenantId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getConversations:', error.message)
    return []
  }

  // Group by project
  const map = new Map<string, ConversationSummary>()
  for (const row of data ?? []) {
    const pid = row.project_id
    if (!map.has(pid)) {
      map.set(pid, {
        project_id: pid,
        project_name: (row as any).projects?.name ?? 'Unknown Project',
        last_message: row.content,
        last_message_at: row.created_at,
        unread_count: 0,
      })
    }
    if (!row.read_at) {
      const entry = map.get(pid)!
      entry.unread_count++
    }
  }

  return Array.from(map.values())
}

export async function getMessages(
  tenantId: string,
  projectId: string
): Promise<MessageWithSender[]> {
  if (!tenantId) return []
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('messages')
    .select('*, sender:users!sender_id ( id, full_name, avatar_url, role )')
    .eq('tenant_id', tenantId)
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('getMessages:', error.message)
    return []
  }

  return (data ?? []) as MessageWithSender[]
}

export async function getUnreadCount(tenantId: string, userId: string): Promise<number> {
  if (!tenantId || !userId) return 0
  const supabase = await createClient()

  const { count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .neq('sender_id', userId)
    .is('read_at', null)
    .eq('is_deleted', false)

  return count ?? 0
}

export async function markMessagesRead(tenantId: string, projectId: string, userId: string) {
  const supabase = await createClient()

  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .eq('project_id', projectId)
    .neq('sender_id', userId)
    .is('read_at', null)
}
