import { NextRequest, NextResponse } from 'next/server'
import { validatePortalToken } from '@/lib/portal/queries'

/**
 * GET /api/portal/auth?token=<portal_token>
 *
 * Validates a portal token and sets a session cookie.
 * Used as the landing page for magic link emails.
 * Redirect: /portal/[token]
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.redirect(new URL('/portal/invalid', req.url))
  }

  const session = await validatePortalToken(token)
  if (!session) {
    return NextResponse.redirect(new URL('/portal/invalid', req.url))
  }

  // Redirect to the portal with the token in the URL (token IS the session)
  const res = NextResponse.redirect(new URL(`/portal/${token}`, req.url))

  // Set a cookie so the portal layout can quickly identify the session
  res.cookies.set('gl_portal_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })

  return res
}
