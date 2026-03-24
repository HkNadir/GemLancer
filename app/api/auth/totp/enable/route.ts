/**
 * POST /api/auth/totp/enable
 * Body: { code: string }
 *
 * Verifies the 6-digit code against the pending secret (from cookie),
 * then saves it to the database and sets totp_enabled = true.
 * Clears the gl_totp_pending cookie on success.
 */

import { NextRequest, NextResponse } from 'next/server'
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

  // Retrieve pending secret from cookie
  const pendingSecret = request.cookies.get('gl_totp_pending')?.value
  if (!pendingSecret) {
    return NextResponse.json(
      { error: 'Setup session expired. Please start the setup process again.' },
      { status: 400 }
    )
  }

  // Verify code against the pending secret
  const isValid = verifyTOTPCode(pendingSecret, code)
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid code. Please try again.' }, { status: 400 })
  }

  // Save secret to DB + enable TOTP
  const { error: updateError } = await supabase
    .from('users')
    .update({ totp_secret: pendingSecret, totp_enabled: true })
    .eq('id', user.id)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to enable 2FA. Please try again.' }, { status: 500 })
  }

  // Force a session token refresh so app_metadata.totp_enabled reflects the change
  await supabase.auth.refreshSession()

  const response = NextResponse.json({ success: true })

  // Clear pending secret cookie
  response.cookies.delete('gl_totp_pending')

  return response
}
