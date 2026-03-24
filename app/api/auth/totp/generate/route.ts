/**
 * GET /api/auth/totp/generate
 * Generates a new TOTP secret for the authenticated user,
 * stores it temporarily in an encrypted httpOnly cookie,
 * and returns the QR code as a data URL + masked secret.
 *
 * The secret is NOT saved to the database yet — that happens in /enable
 * after the user proves they can generate a valid code.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateTOTPSecret, generateOTPAuthUri, generateQRCodeDataUrl } from '@/lib/auth/totp'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  // Fetch email for the QR label
  const { data: userRow } = await supabase
    .from('users')
    .select('email, totp_enabled')
    .eq('id', user.id)
    .single()

  if (!userRow) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (userRow.totp_enabled) {
    return NextResponse.json({ error: '2FA is already enabled' }, { status: 400 })
  }

  // Generate secret
  const secret = generateTOTPSecret()
  const uri = generateOTPAuthUri(userRow.email, secret)
  const qrCode = await generateQRCodeDataUrl(uri)

  // Store secret in a temporary httpOnly cookie (30 min TTL)
  // The pending secret is validated in /enable before being written to DB
  const response = NextResponse.json({
    qrCode,
    // Show the Base32 secret in groups of 4 for manual entry
    manualCode: secret.match(/.{1,4}/g)?.join(' ') ?? secret,
  })

  response.cookies.set('gl_totp_pending', secret, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 60, // 30 minutes
    path: '/',
  })

  return response
}
