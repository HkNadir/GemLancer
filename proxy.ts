import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * GemLancer — Next.js 16 Proxy (replaces middleware.ts)
 *
 * Responsibilities:
 *  1. Refresh Supabase auth session on every request
 *  2. Protect all dashboard routes — redirect unauthenticated users to /login
 *  3. Redirect authenticated users away from auth pages (login/signup)
 *  4. Gate TOTP 2FA — if user has totp_enabled, must verify before entering protected routes
 *  5. Gate onboarding — if tenant exists but onboarding not completed, force /onboarding
 *  6. Allow public routes (portal, webhooks, OAuth callback) unconditionally
 */

// ── Route groups ────────────────────────────────────────────────

/** Routes that require a fully-authenticated session */
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/clients',
  '/projects',
  '/invoices',
  '/tasks',
  '/time',
  '/files',
  '/messages',
  '/reports',
  '/settings',
  '/onboarding',
]

/** Auth routes — redirect away if the user is already logged in */
const AUTH_PREFIXES = ['/login', '/signup', '/forgot-password', '/verify', '/reset-password']

/** Always public — skip all auth checks */
const ALWAYS_PUBLIC_PREFIXES = [
  '/api/webhooks',       // Stripe + Supabase webhooks
  '/portal',             // Client portal uses token-based auth, no session required
  '/api/auth/callback',  // Supabase PKCE / OAuth callback
  '/api/portal',         // Portal API routes (token-authenticated)
]

// ── Proxy handler ────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Always-public routes — pass through immediately, no session needed
  if (ALWAYS_PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // 2. Refresh Supabase session cookies and get current user
  const { supabaseResponse, user } = await updateSession(request)

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  const isAuthRoute = AUTH_PREFIXES.some((p) => pathname.startsWith(p))
  const is2FARoute = pathname.startsWith('/2fa')

  // 3. Unauthenticated user hitting a protected route → /login
  if (!user && isProtected) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 4. Authenticated user hitting an auth route (login/signup) → /dashboard
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // 5. Root path → redirect based on auth state
  if (pathname === '/') {
    return NextResponse.redirect(
      new URL(user ? '/dashboard' : '/login', request.url)
    )
  }

  // ── From here on, user is authenticated ─────────────────────

  if (user) {
    // 6. TOTP 2FA gate
    const totpEnabled = user.app_metadata?.totp_enabled === true

    if (totpEnabled) {
      const verified2FA = request.cookies.get('gl_2fa_verified')?.value === user.id

      // On a protected route but 2FA not verified → redirect to /2fa
      if (isProtected && !verified2FA) {
        const twoFAUrl = new URL('/2fa', request.url)
        twoFAUrl.searchParams.set('redirectTo', pathname)
        return NextResponse.redirect(twoFAUrl)
      }

      // Already on /2fa but 2FA already verified → skip it
      if (is2FARoute && verified2FA) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    } else {
      // TOTP not enabled — /2fa makes no sense, bounce to dashboard
      if (is2FARoute) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    // 7. Onboarding gate — force wizard when onboarding not complete
    if (isProtected && !pathname.startsWith('/onboarding')) {
      const onboardingDone = user.app_metadata?.onboarding_completed === true
      const hasTenant = Boolean(user.app_metadata?.tenant_id)

      if (hasTenant && !onboardingDone) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (Next.js static files)
     * - _next/image  (Next.js image optimisation)
     * - favicon.ico, robots.txt, sitemap.xml
     * - Static image files
     */
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
