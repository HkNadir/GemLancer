'use client'

import { Suspense, useEffect, useRef, useState, useActionState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Gem, Loader2, AlertCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { signInAction, googleSignInAction } from '@/lib/auth/actions'
import type { AuthActionResult } from '@/lib/auth/actions'

const initialState: AuthActionResult = {}

// ── Google SVG Icon ───────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

function LoginForm() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? '/dashboard'
  const message = searchParams.get('message')
  const errorParam = searchParams.get('error')

  const [state, formAction, isPending] = useActionState(signInAction, initialState)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [googlePending, setGooglePending] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const emailRef = useRef<HTMLInputElement>(null)

  // Focus email on mount
  useEffect(() => {
    emailRef.current?.focus()
  }, [])

  // Countdown timer for rate-limited state
  useEffect(() => {
    if (state.rateLimited && state.retryAfterMinutes) {
      setCountdown(state.retryAfterMinutes * 60)
    }
  }, [state.rateLimited, state.retryAfterMinutes])

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  function formatCountdown(seconds: number) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  async function handleGoogleSignIn() {
    setGooglePending(true)
    await googleSignInAction()
    setGooglePending(false)
  }

  const successMessage =
    message === 'password_reset'
      ? 'Password reset successfully. Please sign in.'
      : null

  const oauthError =
    errorParam === 'auth_failed'
      ? 'Authentication failed. Please try again.'
      : errorParam === 'setup_failed'
        ? 'Account setup failed. Please contact support.'
        : null

  return (
    <div className="w-full max-w-md">
      {/* Brand */}
      <div className="mb-8 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gem-600 shadow-lg mb-4">
          <Gem className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to your GemLancer account
        </p>
      </div>

      {/* Success message (e.g., after password reset) */}
      {successMessage && (
        <Alert variant="success" className="mb-4">
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* OAuth error */}
      {oauthError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{oauthError}</AlertDescription>
        </Alert>
      )}

      {/* Server action error */}
      {state.error && (
        <Alert variant={state.rateLimited ? 'warning' : 'destructive'} className="mb-4">
          {state.rateLimited ? (
            <Clock className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>
            {state.error}
            {state.rateLimited && countdown > 0 && (
              <span className="ml-1 font-mono font-semibold">
                ({formatCountdown(countdown)})
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Google OAuth */}
      <Button
        type="button"
        variant="outline"
        className="w-full mb-4 gap-2"
        onClick={handleGoogleSignIn}
        disabled={googlePending || isPending}
      >
        {googlePending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <GoogleIcon />
        )}
        Continue with Google
      </Button>

      <div className="relative mb-4">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
          or sign in with email
        </span>
      </div>

      {/* Sign-in form */}
      <form action={formAction} className="space-y-4">
        {/* Hidden field for redirectTo (used post-login) */}
        <input type="hidden" name="redirectTo" value={redirectTo} />

        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            ref={emailRef}
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            disabled={isPending || (state.rateLimited && countdown > 0)}
            aria-invalid={state.field === 'email'}
            className={state.field === 'email' ? 'border-destructive' : ''}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              className={`pr-10 ${state.field === 'password' ? 'border-destructive' : ''}`}
              disabled={isPending || (state.rateLimited && countdown > 0)}
              aria-invalid={state.field === 'password'}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="rememberMe"
              name="rememberMe"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
            />
            <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer">
              Remember this device
            </Label>
          </div>
          <Link
            href="/forgot-password"
            className="text-sm text-gem-600 hover:text-gem-700 hover:underline transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          className="w-full bg-gem-600 hover:bg-gem-700"
          disabled={isPending || (state.rateLimited && countdown > 0)}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign in'
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link
          href="/signup"
          className="font-medium text-gem-600 hover:text-gem-700 hover:underline transition-colors"
        >
          Start free trial
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
