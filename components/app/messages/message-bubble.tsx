'use client'

import { useState, useTransition } from 'react'
import { Pencil, Trash2, MoreHorizontal } from 'lucide-react'
import { editMessage, deleteMessage } from '@/lib/messages/actions'
import type { MessageWithSender } from '@/types/database'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface MessageBubbleProps {
  message: MessageWithSender
  currentUserId: string
  onDeleted: (id: string) => void
  onEdited: (id: string, content: string) => void
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function MessageBubble({ message, currentUserId, onDeleted, onEdited }: MessageBubbleProps) {
  const isOwn = message.sender_id === currentUserId
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [, startTransition] = useTransition()

  function handleEdit() {
    if (!editContent.trim() || editContent.trim() === message.content) {
      setEditing(false)
      return
    }
    startTransition(async () => {
      const result = await editMessage(message.id, editContent)
      if (!result.error) {
        onEdited(message.id, editContent.trim())
        setEditing(false)
      }
    })
  }

  function handleDelete() {
    if (!confirm('Delete this message?')) return
    startTransition(async () => {
      await deleteMessage(message.id)
      onDeleted(message.id)
    })
  }

  const initials = message.sender.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className={`group flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      {!isOwn && (
        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
          {initials}
        </div>
      )}

      <div className={`flex flex-col max-w-[72%] gap-1 ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Sender name */}
        {!isOwn && (
          <span className="text-xs text-muted-foreground font-medium px-1">
            {message.sender.full_name}
          </span>
        )}

        {/* Bubble */}
        <div className="relative">
          {editing ? (
            <div className="flex flex-col gap-2 min-w-[240px]">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="rounded-xl border px-3 py-2 text-sm resize-none bg-background w-full"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEdit() }
                  if (e.key === 'Escape') setEditing(false)
                }}
                autoFocus
              />
              <div className="flex gap-2 justify-end text-xs">
                <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground">
                  Cancel
                </button>
                <button onClick={handleEdit} className="text-primary font-medium">
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div
              className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                isOwn
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-muted rounded-bl-sm'
              }`}
            >
              {message.content}
              {message.edited_at && (
                <span className="ml-2 text-xs opacity-60">(edited)</span>
              )}
            </div>
          )}

          {/* Actions — show on hover for own messages */}
          {isOwn && !editing && (
            <div className="absolute -left-8 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors">
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditing(true)} className="gap-2">
                    <Pencil className="h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="gap-2 text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-xs text-muted-foreground px-1">
          {fmtTime(message.created_at)}
        </span>
      </div>
    </div>
  )
}

export { fmtDate }
