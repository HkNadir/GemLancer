/**
 * POST /api/auth/totp/disable
 * Body: { code: string }
 *
 * Requires a valid TOTP code before disabling 2FA —
 * prevents a stolen session from silently disabling it.
 * Clears totp_secret + sets totp_enabled = false.
 * Also clears the gl_2fa_verified cookie.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
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
    return NextResponse.json({ error: 'Code is required to disable 2FA' }, { status: 400 })
  }

  // Fetch current secret
  const admin = await createAdminClient()
  const { data: userRow } = await admin
    .from('users')
    .select('totp_secret, totp_enabled')
    .eq('id', user.id)
    .single()

  if (!userRow?.totp_enabled || !userRow.totp_secret) {
    return NextResponse.json({ error: '2FA is not enabled' }, { status: 400 })
  }

  const isValid = verifyTOTPCode(userRow.totp_secret, code)
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid code. Please try again.' }, { status: 400 })
  }

  // Clear 2FA from DB
  const { error: updateError } = await admin
    .from('users')
    .update({ totp_secret: null, totp_enabled: false })
    .eq('id', user.id)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to disable 2FA' }, { status: 500 })
  }

  // Refresh session token so app_metadata reflects the change
  await supabase.auth.refreshSession()

  const response = NextResponse.json({ success: true })
  response.cookies.delete('gl_2fa_verified')

  return response
}
