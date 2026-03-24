'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageBubble, fmtDate } from './message-bubble'
import { MessageComposer } from './message-composer'
import type { MessageWithSender } from '@/types/database'

interface MessageThreadProps {
  projectId: string
  projectName: string
  initialMessages: MessageWithSender[]
  currentUser: { id: string; full_name: string; avatar_url: string | null; role: string }
}

export function MessageThread({
  projectId,
  projectName,
  initialMessages,
  currentUser,
}: MessageThreadProps) {
  const [messages, setMessages] = useState<MessageWithSender[]>(initialMessages)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `project_id=eq.${projectId}`,
        },
        async (payload) => {
          const msg = payload.new as any
          // Fetch sender info
          const { data: senderData } = await supabase
            .from('users')
            .select('id, full_name, avatar_url, role')
            .eq('id', msg.sender_id)
            .single()

          const withSender: MessageWithSender = {
            ...msg,
            sender: senderData ?? {
              id: msg.sender_id,
              full_name: 'Unknown',
              avatar_url: null,
              role: 'member',
            },
          }

          setMessages((prev) => {
            // Avoid duplicates (optimistic update already added it)
            if (prev.some((m) => m.id === msg.id)) return prev
            return [...prev, withSender]
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [projectId, supabase])

  function handleSent(msg: MessageWithSender) {
    setMessages((prev) => [...prev, msg])
  }

  function handleDeleted(id: string) {
    setMessages((prev) => prev.filter((m) => m.id !== id))
  }

  function handleEdited(id: string, content: string) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, content, edited_at: new Date().toISOString() } : m
      )
    )
  }

  // Group messages by day
  const groups: { date: string; messages: MessageWithSender[] }[] = []
  for (const msg of messages) {
    const day = msg.created_at.slice(0, 10)
    const last = groups[groups.length - 1]
    if (last?.date === day) {
      last.messages.push(msg)
    } else {
      groups.push({ date: day, messages: [msg] })
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Thread header */}
      <div className="border-b px-4 py-3">
        <h2 className="font-semibold text-sm">{projectName}</h2>
        <p className="text-xs text-muted-foreground">Project conversation</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">No messages yet</p>
              <p className="text-xs text-muted-foreground mt-1">Send the first message below.</p>
            </div>
          </div>
        )}

        {groups.map((group) => (
          <div key={group.date} className="space-y-3">
            {/* Day separator */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground font-medium px-2">
                {fmtDate(group.date)}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {group.messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                currentUserId={currentUser.id}
                onDeleted={handleDeleted}
                onEdited={handleEdited}
              />
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <MessageComposer
        projectId={projectId}
        currentUser={currentUser}
        onSent={handleSent}
      />
    </div>
  )
}
