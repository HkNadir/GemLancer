'use client'

import { Suspense, useActionState, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, RefreshCw, ArrowLeft, Gem, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { resendVerificationAction } from '@/lib/auth/actions'
import type { AuthActionResult } from '@/lib/auth/actions'

const initialState: AuthActionResult = {}
const RESEND_COOLDOWN_SECONDS = 60

function VerifyForm() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''

  const [state, formAction, isPending] = useActionState(resendVerificationAction, initialState)
  const [cooldown, setCooldown] = useState(0)

  // Start cooldown after successful resend
  useEffect(() => {
    if (state.success) {
      setCooldown(RESEND_COOLDOWN_SECONDS)
    }
  }, [state.success])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const maskedEmail = email
    ? email.replace(/(.{2}).+(@.+)/, '$1***$2')
    : 'your email'

  return (
    <div className="w-full max-w-md text-center">
      {/* Icon */}
      <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gem-50 border border-gem-200">
        <Mail className="h-8 w-8 text-gem-600" />
      </div>

      <h1 className="text-2xl font-bold text-foreground">Verify your email</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We sent a confirmation link to{' '}
        <span className="font-medium text-foreground">{maskedEmail}</span>.
        Click the link to activate your account.
      </p>

      <div className="mt-6 rounded-lg border bg-muted/50 p-4 text-sm text-left space-y-1.5">
        <p className="font-medium text-foreground">What to do next:</p>
        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
          <li>Open your email inbox</li>
          <li>Find the email from GemLancer</li>
          <li>Click <strong className="text-foreground">Confirm your email</strong></li>
        </ol>
        <p className="text-xs text-muted-foreground pt-1">
          Check your spam folder if you don&apos;t see it.
        </p>
      </div>

      {/* Resend form */}
      {state.success && cooldown > 0 ? (
        <div className="mt-6">
          <Alert variant="success" className="text-left">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Email resent! Check your inbox.
            </AlertDescription>
          </Alert>
          <p className="mt-3 text-xs text-muted-foreground">
            Resend available in {cooldown}s
          </p>
        </div>
      ) : (
        <form action={formAction} className="mt-6">
          <input type="hidden" name="email" value={email} />
          <Button
            type="submit"
            variant="outline"
            className="gap-2"
            disabled={isPending || cooldown > 0}
          >
            <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
            {isPending ? 'Resending...' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend confirmation email'}
          </Button>
          {state.error && (
            <p className="mt-2 text-xs text-destructive">{state.error}</p>
          )}
        </form>
      )}

      {/* Open email client shortcut */}
      <a
        href={`mailto:${email}`}
        className="mt-3 inline-block text-sm text-gem-600 hover:text-gem-700 hover:underline"
      >
        Open email app
      </a>

      <div className="mt-6 border-t pt-4">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  )
}
