'use client'

import { useState } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FileUploader } from './file-uploader'

interface UploadDialogProps {
  projects: { id: string; name: string }[]
  defaultProjectId?: string
}

export function UploadDialog({ projects, defaultProjectId }: UploadDialogProps) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Upload className="h-4 w-4" />
        Upload File
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border bg-background shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Upload Files</h2>
          <button
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            ✕
          </button>
        </div>
        <FileUploader
          projects={projects}
          defaultProjectId={defaultProjectId}
          onSuccess={() => setOpen(false)}
        />
      </div>
    </div>
  )
}
