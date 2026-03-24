'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Gem, Loader2, AlertCircle, CheckCircle2, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { signUpAction, googleSignInAction } from '@/lib/auth/actions'
import type { AuthActionResult } from '@/lib/auth/actions'

const initialState: AuthActionResult = {}

// ── Password strength rules ────────────────────────────────────
const strengthRules = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'One special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null
  const passed = strengthRules.filter((r) => r.test(password)).length
  const strengthLabel = ['Weak', 'Fair', 'Good', 'Strong'][Math.max(0, passed - 1)]
  const barColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500']

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i < passed ? barColors[passed - 1] : 'bg-muted'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Strength:{' '}
        <span className={`font-medium ${passed >= 4 ? 'text-green-600' : passed >= 3 ? 'text-yellow-600' : 'text-red-600'}`}>
          {strengthLabel}
        </span>
      </p>
      <ul className="space-y-1">
        {strengthRules.map((rule) => {
          const ok = rule.test(password)
          return (
            <li key={rule.label} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-600' : 'text-muted-foreground'}`}>
              {ok ? (
                <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
              ) : (
                <Circle className="h-3 w-3 flex-shrink-0" />
              )}
              {rule.label}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ── Google SVG Icon ────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState(signUpAction, initialState)
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [googlePending, setGooglePending] = useState(false)

  async function handleGoogleSignIn() {
    setGooglePending(true)
    await googleSignInAction()
    setGooglePending(false)
  }

  return (
    <div className="w-full max-w-md">
      {/* Brand */}
      <div className="mb-8 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gem-600 shadow-lg mb-4">
          <Gem className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Start your free trial</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          14 days free. No credit card required.
        </p>
      </div>

      {/* Server error */}
      {state.error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.error}</AlertDescription>
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
        {googlePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
        Continue with Google
      </Button>

      <div className="relative mb-4">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
          or create account with email
        </span>
      </div>

      <form action={formAction} className="space-y-4">
        {/* Full name */}
        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            placeholder="Jane Smith"
            disabled={isPending}
            aria-invalid={state.field === 'fullName'}
            className={state.field === 'fullName' ? 'border-destructive' : ''}
          />
        </div>

        {/* Work email */}
        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            disabled={isPending}
            aria-invalid={state.field === 'email'}
            className={state.field === 'email' ? 'border-destructive' : ''}
          />
        </div>

        {/* Company name */}
        <div className="space-y-2">
          <Label htmlFor="companyName">Company / Agency name</Label>
          <Input
            id="companyName"
            name="companyName"
            type="text"
            autoComplete="organization"
            placeholder="Acme Design Studio"
            disabled={isPending}
            aria-invalid={state.field === 'companyName'}
            className={state.field === 'companyName' ? 'border-destructive' : ''}
          />
        </div>

        {/* Password + strength */}
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              className={`pr-10 ${state.field === 'password' ? 'border-destructive' : ''}`}
              disabled={isPending}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
          <PasswordStrength password={password} />
        </div>

        {/* Terms */}
        <div className="flex items-start gap-2">
          <Checkbox
            id="termsAccepted"
            name="termsAccepted"
            checked={termsAccepted}
            onCheckedChange={(checked) => setTermsAccepted(checked === true)}
            className="mt-0.5"
            aria-invalid={state.field === 'termsAccepted'}
          />
          <Label htmlFor="termsAccepted" className="text-sm font-normal leading-relaxed cursor-pointer">
            I agree to the{' '}
            <Link href="/terms" className="text-gem-600 hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-gem-600 hover:underline">
              Privacy Policy
            </Link>
          </Label>
        </div>

        <Button
          type="submit"
          className="w-full bg-gem-600 hover:bg-gem-700"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            'Create account'
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-medium text-gem-600 hover:text-gem-700 hover:underline transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
