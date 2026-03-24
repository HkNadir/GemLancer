/**
 * Shared auth context helper for Server Actions.
 *
 * Reads tenant_id from the JWT app_metadata first (fast path).
 * Falls back to a DB lookup on the `users` table when the claim is absent —
 * this handles the common case where the `inject_tenant_claims` hook is not yet
 * configured, or the user's session pre-dates when the hook was added.
 */

import { createClient } from '@/lib/supabase/server'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export interface AuthContext {
  supabase: Awaited<ReturnType<typeof createClient>>
  user: SupabaseUser
  tenantId: string
}

export async function getAuthContext(): Promise<AuthContext> {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) throw new Error('Unauthenticated')

  // Fast path: tenant_id is in the JWT (inject_tenant_claims hook is active)
  let tenantId = user.app_metadata?.tenant_id as string | undefined

  // Slow path: hook not configured — look it up from the users table
  if (!tenantId) {
    const { data: profile } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    tenantId = profile?.tenant_id ?? undefined
  }

  if (!tenantId) throw new Error('No tenant context')

  return { supabase, user, tenantId }
}

/**
 * Resolves tenant_id for a known auth user.
 * JWT claim first, then DB fallback. Returns null if not found.
 * Use this in actions that return { error } instead of throwing.
 */
export async function resolveTenantId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  jwtTenantId?: string
): Promise<string | null> {
  if (jwtTenantId) return jwtTenantId

  const { data } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', userId)
    .single()

  return data?.tenant_id ?? null
}
