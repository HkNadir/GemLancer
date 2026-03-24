'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/types/database'

export interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
}

export function useNotifications(
  userId: string,
  tenantId: string
): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId || !tenantId) {
      setLoading(false)
      return
    }

    const supabase = createClient()

    // ── Initial fetch ────────────────────────────────────────
    async function fetchNotifications() {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (data) {
        setNotifications(data)
        setUnreadCount(data.filter((n) => !n.read_at).length)
      }
      setLoading(false)
    }

    fetchNotifications()

    // ── Realtime: subscribe to new notifications ─────────────
    const channel = supabase
      .channel(`notifications:user:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const incoming = payload.new as Notification
          setNotifications((prev) => [incoming, ...prev].slice(0, 20))
          if (!incoming.read_at) {
            setUnreadCount((prev) => prev + 1)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, tenantId])

  // ── Mark single notification as read ─────────────────────
  const markAsRead = useCallback(
    async (id: string) => {
      const now = new Date().toISOString()
      const supabase = createClient()

      await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('id', id)
        .eq('user_id', userId)

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: now } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    },
    [userId]
  )

  // ── Mark all notifications as read ───────────────────────
  const markAllAsRead = useCallback(async () => {
    const now = new Date().toISOString()
    const supabase = createClient()

    await supabase
      .from('notifications')
      .update({ read_at: now })
      .eq('user_id', userId)
      .is('read_at', null)

    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })))
    setUnreadCount(0)
  }, [userId])

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead }
}
