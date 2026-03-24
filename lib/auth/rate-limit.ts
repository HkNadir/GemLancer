/**
 * Database-backed rate limiter for login attempts.
 *
 * Uses the `login_attempts` table (no RLS, service-role only).
 * Stateless — safe for Vercel serverless / Edge deployments.
 *
 * Policy: 5 failed attempts per email within 15 minutes → lockout.
 */

import { createAdminClient } from '@/lib/supabase/server'

const MAX_FAILURES = 5
const WINDOW_MINUTES = 15

export interface RateLimitResult {
  allowed: boolean
  attemptsRemaining: number
  /** Only set when allowed=false */
  retryAfterMinutes?: number
}

/**
 * Checks whether the given email (identifier) is currently rate-limited.
 * Call this BEFORE validating credentials.
 */
export async function checkRateLimit(email: string, ip: string): Promise<RateLimitResult> {
  const admin = await createAdminClient()
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString()

  const { count } = await admin
    .from('login_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('identifier', email.toLowerCase().trim())
    .eq('success', false)
    .gte('created_at', windowStart)

  const failures = count ?? 0

  if (failures >= MAX_FAILURES) {
    // Find the oldest failure in the window to calculate unlock time
    const { data: oldest } = await admin
      .from('login_attempts')
      .select('created_at')
      .eq('identifier', email.toLowerCase().trim())
      .eq('success', false)
      .gte('created_at', windowStart)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    const unlockAt = oldest
      ? new Date(new Date(oldest.created_at).getTime() + WINDOW_MINUTES * 60 * 1000)
      : new Date(Date.now() + WINDOW_MINUTES * 60 * 1000)

    const retryAfterMinutes = Math.max(1, Math.ceil((unlockAt.getTime() - Date.now()) / 60_000))

    return { allowed: false, attemptsRemaining: 0, retryAfterMinutes }
  }

  return { allowed: true, attemptsRemaining: MAX_FAILURES - failures }
}

/**
 * Records a login attempt (success or failure).
 * Call this AFTER the auth result is known.
 */
export async function recordLoginAttempt(
  email: string,
  ip: string,
  success: boolean,
  userAgent?: string
): Promise<void> {
  const admin = await createAdminClient()

  await admin.from('login_attempts').insert({
    identifier: email.toLowerCase().trim(),
    ip_address: ip,
    success,
    user_agent: userAgent ?? null,
  })
}

/**
 * Clears all failed attempts for an email on successful login.
 * Prevents accumulation of stale failures after a successful auth.
 */
export async function clearFailedAttempts(email: string): Promise<void> {
  const admin = await createAdminClient()

  await admin
    .from('login_attempts')
    .delete()
    .eq('identifier', email.toLowerCase().trim())
    .eq('success', false)
}
