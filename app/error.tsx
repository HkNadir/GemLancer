'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

const isDebug = process.env.NEXT_PUBLIC_DEBUG === 'true'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GemLancer Error]', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 mx-auto">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            An unexpected error occurred. You can try refreshing the page.
          </p>
        </div>

        {isDebug && (
          <div className="text-left rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
            <p className="text-xs font-semibold text-destructive uppercase tracking-wide">
              Debug info (NEXT_PUBLIC_DEBUG=true)
            </p>
            {error.message && (
              <p className="text-xs font-mono text-foreground break-all">
                <span className="text-muted-foreground">message: </span>{error.message}
              </p>
            )}
            {error.digest && (
              <p className="text-xs font-mono text-foreground">
                <span className="text-muted-foreground">digest: </span>{error.digest}
              </p>
            )}
            {error.stack && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Stack trace
                </summary>
                <pre className="mt-2 whitespace-pre-wrap font-mono text-[10px] text-foreground opacity-70 overflow-auto max-h-48">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        )}

        {!isDebug && error.digest && (
          <p className="text-xs text-muted-foreground font-mono">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex gap-3 justify-center">
          <Button onClick={reset} variant="outline" size="sm">
            <RefreshCw className="h-3.5 w-3.5 mr-2" />
            Try again
          </Button>
          <Button onClick={() => window.location.href = '/'} size="sm">
            Go home
          </Button>
        </div>
      </div>
    </div>
  )
}
