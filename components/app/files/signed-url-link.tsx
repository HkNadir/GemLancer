'use client'

import { useState } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'

interface SignedUrlLinkProps {
  fileId: string
  fileName: string
  initialUrl: string | null
  className?: string
  children?: React.ReactNode
}

/**
 * Renders a link that uses the initial signed URL.
 * If expired (403), re-fetches a fresh URL via /api/files/[id]/signed-url before navigating.
 */
export function SignedUrlLink({
  fileId,
  fileName,
  initialUrl,
  className,
  children,
}: SignedUrlLinkProps) {
  const [url, setUrl] = useState(initialUrl)
  const [loading, setLoading] = useState(false)

  async function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!url) {
      e.preventDefault()
      return
    }

    // Attempt to detect expired URL by checking the URL timestamp (Supabase signed URLs contain exp param)
    // If the URL has an exp parameter and it's in the past, refresh it
    try {
      const parsed = new URL(url)
      const exp = parsed.searchParams.get('exp')
      if (exp && parseInt(exp) < Date.now() / 1000) {
        e.preventDefault()
        setLoading(true)
        try {
          const res = await fetch(`/api/files/${fileId}/signed-url`)
          if (res.ok) {
            const { url: fresh } = await res.json()
            setUrl(fresh)
            window.open(fresh, '_blank', 'noopener,noreferrer')
          }
        } finally {
          setLoading(false)
        }
      }
    } catch {
      // URL parse failed or no exp param — let the browser handle it
    }
  }

  if (!url) {
    return <span className={className}>{children ?? fileName}</span>
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      download={fileName}
      onClick={handleClick}
      className={className}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin inline mr-1" />
      ) : (
        children ?? (
          <>
            {fileName}
            <ExternalLink className="h-3 w-3 inline ml-1 opacity-50" />
          </>
        )
      )}
    </a>
  )
}
