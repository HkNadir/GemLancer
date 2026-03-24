'use client'

import Link from 'next/link'
import { MessageSquare } from 'lucide-react'
import type { ConversationSummary } from '@/lib/messages/queries'

interface ConversationListProps {
  conversations: ConversationSummary[]
  activeProjectId?: string
}

function timeAgo(iso: string | null) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export function ConversationList({ conversations, activeProjectId }: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
        <div className="h-12 w-12 flex items-center justify-center rounded-full bg-muted mb-3">
          <MessageSquare className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">No conversations yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Messages will appear here when project conversations start.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col divide-y">
      {conversations.map((conv) => {
        const isActive = conv.project_id === activeProjectId
        return (
          <Link
            key={conv.project_id}
            href={`/messages?project=${conv.project_id}`}
            className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors ${
              isActive ? 'bg-muted' : ''
            }`}
          >
            <div className="flex-shrink-0 h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary mt-0.5">
              {conv.project_name.slice(0, 2).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium truncate">{conv.project_name}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {timeAgo(conv.last_message_at)}
                </span>
              </div>
              {conv.last_message && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {conv.last_message}
                </p>
              )}
            </div>

            {conv.unread_count > 0 && (
              <div className="flex-shrink-0 h-5 min-w-5 rounded-full bg-primary flex items-center justify-center text-xs text-primary-foreground font-medium px-1.5 mt-0.5">
                {conv.unread_count > 99 ? '99+' : conv.unread_count}
              </div>
            )}
          </Link>
        )
      })}
    </div>
  )
}
