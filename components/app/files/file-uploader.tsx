'use client'

import { useRef, useState, useTransition } from 'react'
import { Upload, X, Loader2 } from 'lucide-react'
import { uploadFile } from '@/lib/files/actions'
import { Button } from '@/components/ui/button'

interface FileUploaderProps {
  projects: { id: string; name: string }[]
  defaultProjectId?: string
  onSuccess?: () => void
}

const MAX_SIZE_BYTES = 100 * 1024 * 1024 // 100 MB client-side guard

export function FileUploader({ projects, defaultProjectId, onSuccess }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<globalThis.File[]>([])
  const [projectId, setProjectId] = useState(defaultProjectId ?? '')
  const [clientVisible, setClientVisible] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const oversized = files.filter((f) => f.size > MAX_SIZE_BYTES)
    if (oversized.length) {
      setError(`${oversized[0].name} exceeds the 100 MB per-file limit.`)
      return
    }
    setError(null)
    setSelected(files)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    const oversized = files.filter((f) => f.size > MAX_SIZE_BYTES)
    if (oversized.length) {
      setError(`${oversized[0].name} exceeds the 100 MB per-file limit.`)
      return
    }
    setError(null)
    setSelected(files)
  }

  function handleSubmit() {
    if (!selected.length) return
    setError(null)

    startTransition(async () => {
      for (const file of selected) {
        const fd = new FormData()
        fd.append('file', file)
        if (projectId) fd.append('project_id', projectId)
        fd.append('is_client_visible', clientVisible ? 'true' : 'false')
        const result = await uploadFile(fd)
        if (result.error) {
          setError(result.error)
          return
        }
      }
      setSelected([])
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      onSuccess?.()
    })
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className="rounded-xl border-2 border-dashed border-muted-foreground/25 p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-sm font-medium">Drop files here or click to browse</p>
        <p className="text-xs text-muted-foreground mt-1">Any file type · Max 100 MB per file</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handlePick}
        />
      </div>

      {/* Selected files */}
      {selected.length > 0 && (
        <div className="space-y-1">
          {selected.map((f, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
              <span className="truncate max-w-[200px]">{f.name}</span>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-xs">{(f.size / 1024).toFixed(0)} KB</span>
                <button
                  onClick={() => setSelected((s) => s.filter((_, j) => j !== i))}
                  className="hover:text-destructive transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Options */}
      {selected.length > 0 && (
        <div className="space-y-3">
          {projects.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Project (optional)
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
              >
                <option value="">No project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={clientVisible}
              onChange={(e) => setClientVisible(e.target.checked)}
              className="rounded"
            />
            Visible to client in portal
          </label>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {success && (
        <p className="text-sm text-green-600 dark:text-green-400">Files uploaded successfully!</p>
      )}

      {selected.length > 0 && (
        <Button onClick={handleSubmit} disabled={pending} className="w-full">
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload {selected.length === 1 ? selected[0].name : `${selected.length} files`}
            </>
          )}
        </Button>
      )}
    </div>
  )
}
