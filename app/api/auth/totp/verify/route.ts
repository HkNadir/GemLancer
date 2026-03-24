/**
 * POST /api/auth/totp/verify
 * Body: { code: string }
 *
 * Called from the /2fa page during login.
 * Verifies the 6-digit code against the user's saved TOTP secret.
 * On success, sets the gl_2fa_verified session cookie so middleware
 * allows the user through to protected routes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { verifyTOTPCode } from '@/lib/auth/totp'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const code: string = body.code ?? ''

  if (!code) {
    return NextResponse.json({ error: 'Code is required' }, { status: 400 })
  }

  // Fetch secret via admin client (totp_secret is sensitive — skip RLS)
  const admin = await createAdminClient()
  const { data: userRow, error: fetchError } = await admin
    .from('users')
    .select('totp_secret, totp_enabled')
    .eq('id', user.id)
    .single()

  if (fetchError || !userRow) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (!userRow.totp_enabled || !userRow.totp_secret) {
    return NextResponse.json({ error: '2FA is not enabled for this account' }, { status: 400 })
  }

  const isValid = verifyTOTPCode(userRow.totp_secret, code)
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid code. Please try again.' }, { status: 400 })
  }

  const response = NextResponse.json({ success: true })

  // Set the 2FA verified cookie — middleware checks this on every protected request.
  // Value = user.id so middleware can verify it belongs to the current session.
  response.cookies.set('gl_2fa_verified', user.id, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    // Session cookie (no maxAge) — cleared when browser closes.
    // For "remember this device" feature, set maxAge: 30 * 24 * 60 * 60
    path: '/',
  })

  return response
}
