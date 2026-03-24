'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, Loader2 } from 'lucide-react'

interface Message {
  id: string
  content: string
  sender_type: 'freelancer' | 'client'
  created_at: string
  sender: { full_name: string } | null
}

interface MessagesClientProps {
  projectId: string
  senderId: string
  portalToken: string
  initialMessages: Message[]
  providerName: string
}

export function MessagesClient({
  projectId,
  senderId,
  portalToken,
  initialMessages,
  providerName,
}: MessagesClientProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!content.trim() || sending) return
    setSending(true)
    setError(null)

    try {
      const res = await fetch('/api/portal/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          sender_id: senderId,
          content: content.trim(),
          portal_token: portalToken,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to send')

      const optimistic: Message = {
        id: data.id ?? crypto.randomUUID(),
        content: content.trim(),
        sender_type: 'client',
        created_at: new Date().toISOString(),
        sender: { full_name: 'You' },
      }
      setMessages((prev) => [...prev, optimistic])
      setContent('')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSending(false)
    }
  }

  function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-14rem)]">
      <div className="flex-1 overflow-y-auto rounded-xl border p-4 space-y-4 bg-muted/5">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-center">
            <p className="text-sm text-muted-foreground">No messages yet. Say hello below!</p>
          </div>
        )}
        {messages.map((msg) => {
          const isClient = msg.sender_type === 'client'
          return (
            <div key={msg.id} className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                isClient
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-muted rounded-bl-sm'
              }`}>
                {!isClient && (
                  <p className="text-xs font-medium mb-1 opacity-70">
                    {msg.sender?.full_name ?? providerName}
                  </p>
                )}
                <p className="leading-relaxed">{msg.content}</p>
                <p className="text-xs mt-1 opacity-60 text-right">{fmtTime(msg.created_at)}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {error && <p className="text-sm text-destructive mt-2">{error}</p>}

      <div className="flex items-center gap-2 mt-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
          }}
          placeholder="Type a message… (Enter to send)"
          rows={1}
          className="flex-1 resize-none rounded-xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <button
          onClick={handleSend}
          disabled={!content.trim() || sending}
          className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}
