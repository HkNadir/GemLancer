'use client'

import { useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { uploadLogo } from '@/lib/settings/white-label-actions'

interface LogoUploadProps {
  currentUrl: string | null
  workspaceName: string
  onUploaded: (url: string) => void
}

export function LogoUpload({ currentUrl, workspaceName, onUploaded }: LogoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    const fd = new FormData()
    fd.append('logo', file)
    const result = await uploadLogo(fd)
    setUploading(false)
    if (result.error) { setError(result.error); return }
    if (result.url) onUploaded(result.url)
  }

  return (
    <div className="flex items-center gap-4">
      <div
        className="relative h-16 w-16 rounded-xl border flex items-center justify-center overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => fileRef.current?.click()}
      >
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentUrl} alt={workspaceName} className="h-full w-full object-contain p-1" />
        ) : (
          <span className="text-xl font-bold text-muted-foreground">
            {workspaceName.slice(0, 2).toUpperCase()}
          </span>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-xl">
          {uploading ? (
            <Loader2 className="h-5 w-5 text-white animate-spin" />
          ) : (
            <Camera className="h-5 w-5 text-white" />
          )}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium">Workspace Logo</p>
        <p className="text-xs text-muted-foreground">PNG, SVG, or JPG · Max 2 MB</p>
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
    </div>
  )
}
