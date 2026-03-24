'use client'

import { useState, useTransition } from 'react'
import { Pencil, Trash2, Send } from 'lucide-react'
import type { TaskCommentWithUser } from '@/types/database'

interface Props {
  taskId: string
  comments: TaskCommentWithUser[]
  onAdd: (content: string) => Promise<void>
  onEdit: (id: string, content: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function CommentThread({ taskId, comments: initial, onAdd, onEdit, onDelete }: Props) {
  const [comments, setComments] = useState(initial)
  const [newText, setNewText] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [isPending, startTransition] = useTransition()

  const submitNew = () => {
    if (!newText.trim()) return
    const text = newText.trim()
    setNewText('')
    startTransition(() => onAdd(text))
  }

  const submitEdit = (id: string) => {
    if (!editText.trim()) return
    startTransition(async () => {
      await onEdit(id, editText.trim())
      setComments((prev) => prev.map((c) => c.id === id ? { ...c, content: editText.trim() } : c))
      setEditing(null)
    })
  }

  const handleDelete = (id: string) => {
    setComments((prev) => prev.filter((c) => c.id !== id))
    startTransition(() => onDelete(id))
  }

  return (
    <div className="space-y-4">
      {comments.length === 0 && (
        <p className="text-sm text-muted-foreground">No comments yet. Be the first to comment.</p>
      )}

      <div className="space-y-4">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3">
            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0 mt-0.5">
              {c.user?.avatar_url
                ? <img src={c.user.avatar_url} alt={c.user.full_name} className="h-7 w-7 rounded-full object-cover" />
                : (c.user?.full_name?.charAt(0).toUpperCase() ?? '?')}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium">{c.user?.full_name ?? 'Unknown'}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                {c.edited_at && <span className="text-xs text-muted-foreground italic">edited</span>}
              </div>

              {editing === c.id ? (
                <div className="mt-1 space-y-2">
                  <textarea
                    autoFocus
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={3}
                    className="w-full text-sm border rounded px-2 py-1.5 bg-background resize-none outline-none focus:ring-1 focus:ring-ring"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => submitEdit(c.id)} className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground">Save</button>
                    <button onClick={() => setEditing(null)} className="text-xs px-2 py-1 rounded border">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="group relative">
                  <p className="text-sm mt-0.5 whitespace-pre-line">{c.content}</p>
                  <div className="absolute -right-1 top-0 hidden group-hover:flex items-center gap-1">
                    <button
                      onClick={() => { setEditing(c.id); setEditText(c.content) }}
                      className="p-1 rounded hover:bg-muted text-muted-foreground"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="p-1 rounded hover:bg-muted text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* New comment */}
      <div className="flex gap-2 items-end">
        <textarea
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitNew()
          }}
          rows={2}
          placeholder="Write a comment… (Ctrl+Enter to send)"
          className="flex-1 text-sm border rounded-md px-3 py-2 bg-background resize-none outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          onClick={submitNew}
          disabled={isPending || !newText.trim()}
          className="p-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
