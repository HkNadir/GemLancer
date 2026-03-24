'use client'

import { useEffect } from 'react'

const isDebug = process.env.NEXT_PUBLIC_DEBUG === 'true'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GemLancer Fatal Error]', error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#09090b', color: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ maxWidth: 480, width: '100%', padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 8 }}>Application error</h1>
          <p style={{ fontSize: '0.875rem', color: '#a1a1aa', marginBottom: 24 }}>
            A critical error occurred. Please refresh the page.
          </p>

          {isDebug && (
            <div style={{ textAlign: 'left', background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, padding: '1rem', marginBottom: 24 }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Debug info (NEXT_PUBLIC_DEBUG=true)
              </p>
              {error.message && (
                <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', wordBreak: 'break-all', marginBottom: 4 }}>
                  <span style={{ color: '#71717a' }}>message: </span>{error.message}
                </p>
              )}
              {error.digest && (
                <p style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                  <span style={{ color: '#71717a' }}>digest: </span>{error.digest}
                </p>
              )}
            </div>
          )}

          {!isDebug && error.digest && (
            <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#71717a', marginBottom: 24 }}>
              Error ID: {error.digest}
            </p>
          )}

          <button
            onClick={reset}
            style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            Refresh
          </button>
        </div>
      </body>
    </html>
  )
}
