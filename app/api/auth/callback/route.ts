/**
 * Supabase Auth callback handler.
 *
 * Handles:
 *  - Email confirmation (signup flow)
 *  - Google OAuth first login (auto-creates tenant)
 *  - Password reset redirect
 *
 * Supabase sends the user here with a `code` query param (PKCE flow).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { appConfig } from '@/lib/config'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const type = searchParams.get('type') // 'recovery' for password reset

  // Guard: code must be present
  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', appConfig.url))
  }

  const supabase = await createClient()

  // Exchange the authorization code for a session
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    console.error('[AuthCallback] Code exchange failed:', error?.message)
    return NextResponse.redirect(new URL('/login?error=auth_failed', appConfig.url))
  }

  const user = data.user

  // ── Password reset flow ──────────────────────────────────────
  if (type === 'recovery') {
    return NextResponse.redirect(new URL('/reset-password', appConfig.url))
  }

  // ── Check if this user already has a GemLancer user row ─────
  const admin = await createAdminClient()
  const { data: existingUser } = await admin
    .from('users')
    .select('id, tenant_id')
    .eq('id', user.id)
    .maybeSingle()

  // ── Existing user: go to dashboard ──────────────────────────
  if (existingUser) {
    return NextResponse.redirect(new URL(next, appConfig.url))
  }

  // ── New OAuth user: auto-create tenant + user row ────────────
  // Derive tenant name from Google profile data
  const fullName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split('@')[0] ??
    'User'

  const email = user.email ?? ''
  const emailDomain = email.split('@')[1] ?? 'workspace'
  const companyName = emailDomain === 'gmail.com' ? `${fullName}'s Workspace` : emailDomain

  let slug = generateSlug(companyName)
  const { data: slugConflict } = await admin
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (slugConflict) {
    slug = `${slug}-${Date.now().toString(36)}`
  }

  const { error: tenantError } = await admin.rpc('create_tenant_with_owner', {
    p_tenant_name: companyName,
    p_tenant_slug: slug,
    p_user_id: user.id,
    p_user_email: email,
    p_user_name: fullName,
  })

  if (tenantError) {
    console.error('[AuthCallback] Tenant creation failed:', tenantError.message)
    return NextResponse.redirect(new URL('/login?error=setup_failed', appConfig.url))
  }

  // New user → send to onboarding
  return NextResponse.redirect(new URL('/onboarding', appConfig.url))
}
