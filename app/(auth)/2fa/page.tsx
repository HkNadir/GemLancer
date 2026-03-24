'use client'

import { Suspense, useState, useRef, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ShieldCheck, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

function TwoFactorForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? '/dashboard'

  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const newCode = [...code]
    newCode[index] = digit
    setCode(newCode)
    setError(null)

    if (digit && index < 5) {
      inputs.current[index + 1]?.focus()
    }

    if (digit && index === 5) {
      const full = [...newCode.slice(0, 5), digit].join('')
      if (full.length === 6) submit(full)
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (!code[index] && index > 0) {
        inputs.current[index - 1]?.focus()
      }
      const newCode = [...code]
      newCode[index] = ''
      setCode(newCode)
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputs.current[index + 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setCode(pasted.split(''))
      submit(pasted)
    }
  }

  function submit(fullCode: string) {
    setError(null)
    startTransition(async () => {
      const res = await fetch('/api/auth/totp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: fullCode }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Invalid code. Please try again.')
        setCode(['', '', '', '', '', ''])
        inputs.current[0]?.focus()
        return
      }

      router.push(redirectTo)
      router.refresh()
    })
  }

  const currentCode = code.join('')

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">

        <div className="flex flex-col items-center text-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Two-Factor Authentication</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter the 6-digit code from your authenticator app.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          {code.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputs.current[i] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              autoFocus={i === 0}
              className={`h-12 w-10 rounded-md border text-center text-lg font-semibold tracking-widest bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
                error ? 'border-destructive focus:ring-destructive' : 'border-input'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-sm text-destructive">{error}</p>
        )}

        <Button
          className="w-full"
          disabled={currentCode.length < 6 || isPending}
          onClick={() => submit(currentCode)}
        >
          {isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying…</>
          ) : (
            'Verify'
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Code not working?{' '}
          <a
            href="https://support.google.com/accounts/answer/1066447"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            Sync your authenticator clock
          </a>
          .
        </p>

      </div>
    </div>
  )
}

export default function TwoFactorPage() {
  return (
    <Suspense>
      <TwoFactorForm />
    </Suspense>
  )
}
