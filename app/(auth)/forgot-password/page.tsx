'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Gem, Loader2, AlertCircle, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { forgotPasswordAction } from '@/lib/auth/actions'
import type { AuthActionResult } from '@/lib/auth/actions'

const initialState: AuthActionResult = {}

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(forgotPasswordAction, initialState)

  if (state.success) {
    return (
      <div className="w-full max-w-md text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gem-100 mb-4">
          <Mail className="h-6 w-6 text-gem-600" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Check your email</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          If an account exists for that email, we&apos;ve sent a password reset link. It expires in 1 hour.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          Didn&apos;t receive it? Check your spam folder or{' '}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-gem-600 hover:underline"
          >
            try again
          </button>
          .
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-gem-600 hover:text-gem-700 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      {/* Brand */}
      <div className="mb-8 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gem-600 shadow-lg mb-4">
          <Gem className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Forgot your password?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your email and we&apos;ll send a reset link.
        </p>
      </div>

      {state.error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            autoFocus
            disabled={isPending}
            aria-invalid={state.field === 'email'}
            className={state.field === 'email' ? 'border-destructive' : ''}
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-gem-600 hover:bg-gem-700"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending reset link...
            </>
          ) : (
            'Send reset link'
          )}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gem-600 hover:text-gem-700 hover:underline transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
