'use client'

import { useRef, useState, useTransition } from 'react'
import { Send, Paperclip, X, Loader2 } from 'lucide-react'
import { sendMessage } from '@/lib/messages/actions'
import { uploadFile } from '@/lib/files/actions'
import type { MessageWithSender } from '@/types/database'

interface MessageComposerProps {
  projectId: string
  currentUser: { id: string; full_name: string; avatar_url: string | null; role: string }
  onSent: (msg: MessageWithSender) => void
}

export function MessageComposer({ projectId, currentUser, onSent }: MessageComposerProps) {
  const [content, setContent] = useState('')
  const [attachments, setAttachments] = useState<{ file: File; id?: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  async function handleAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    setUploading(true)
    const uploaded: { file: File; id?: string }[] = []

    for (const f of files) {
      const fd = new FormData()
      fd.append('file', f)
      fd.append('project_id', projectId)
      const result = await uploadFile(fd)
      uploaded.push({ file: f, id: result.id })
      if (result.error) {
        setError(result.error)
        setUploading(false)
        return
      }
    }

    setAttachments((prev) => [...prev, ...uploaded])
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleSend() {
    if (!content.trim() && attachments.length === 0) return
    if (pending || uploading) return
    setError(null)

    const fileIds = attachments.filter((a) => a.id).map((a) => a.id!)

    startTransition(async () => {
      const result = await sendMessage(projectId, content, fileIds)
      if (result.error) {
        setError(result.error)
        return
      }

      // Optimistic: build a fake MessageWithSender to update UI immediately
      const optimistic: MessageWithSender = {
        id: result.id!,
        tenant_id: '',
        project_id: projectId,
        sender_id: currentUser.id,
        sender_type: 'freelancer',
        content: content.trim(),
        file_ids: fileIds,
        read_at: null,
        edited_at: null,
        is_deleted: false,
        created_at: new Date().toISOString(),
        sender: {
          id: currentUser.id,
          full_name: currentUser.full_name,
          avatar_url: currentUser.avatar_url,
          role: currentUser.role as any,
        },
      }
      onSent(optimistic)
      setContent('')
      setAttachments([])
    })
  }

  return (
    <div className="border-t p-4 space-y-2">
      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((a, i) => (
            <div key={i} className="flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs bg-muted">
              <Paperclip className="h-3 w-3 text-muted-foreground" />
              <span className="max-w-[120px] truncate">{a.file.name}</span>
              <button
                onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Input row */}
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-lg border hover:bg-muted transition-colors text-muted-foreground disabled:opacity-50"
          title="Attach file"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
        </button>
        <input ref={fileRef} type="file" multiple className="hidden" onChange={handleAttach} />

        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
          rows={1}
          className="flex-1 resize-none rounded-xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 max-h-32 overflow-y-auto"
          style={{ fieldSizing: 'content' } as React.CSSProperties}
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={(!content.trim() && attachments.length === 0) || pending}
          className="flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}
