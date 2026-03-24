'use client'

/**
 * Auto-logout after 30 minutes of user inactivity.
 *
 * Tracks: mouse movement, keyboard input, scroll, touch, click.
 * On timeout: signs out via Supabase and redirects to /login.
 *
 * Usage: call this hook once in the dashboard layout's client wrapper.
 */

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes
const WARNING_BEFORE_MS = 2 * 60 * 1000       // Warn 2 min before logout

const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click',
  'pointerdown',
] as const

interface UseInactivityLogoutOptions {
  /** Override timeout in milliseconds (defaults to 30 min) */
  timeoutMs?: number
  /** Called 2 minutes before logout — use to show a warning modal */
  onWarning?: () => void
  /** Called when logout fires */
  onLogout?: () => void
}

export function useInactivityLogout({
  timeoutMs = INACTIVITY_TIMEOUT_MS,
  onWarning,
  onLogout,
}: UseInactivityLogoutOptions = {}) {
  const router = useRouter()
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimers = useCallback(() => {
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current)
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
  }, [])

  const performLogout = useCallback(async () => {
    onLogout?.()
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login?reason=inactivity')
  }, [router, onLogout])

  const resetTimers = useCallback(() => {
    clearTimers()

    // Schedule warning
    if (onWarning && timeoutMs > WARNING_BEFORE_MS) {
      warningTimerRef.current = setTimeout(() => {
        onWarning()
      }, timeoutMs - WARNING_BEFORE_MS)
    }

    // Schedule logout
    logoutTimerRef.current = setTimeout(performLogout, timeoutMs)
  }, [clearTimers, performLogout, timeoutMs, onWarning])

  useEffect(() => {
    // Set up activity listeners
    const handleActivity = () => resetTimers()

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    // Start the initial timer
    resetTimers()

    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity)
      })
      clearTimers()
    }
  }, [resetTimers, clearTimers])
}
