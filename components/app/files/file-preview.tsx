'use client'

import { useState } from 'react'
import { X, Download, FileText } from 'lucide-react'
import type { FileWithUploader } from '@/lib/files/queries'

interface FilePreviewProps {
  file: FileWithUploader
  onClose: () => void
}

export function FilePreview({ file, onClose }: FilePreviewProps) {
  const [imgError, setImgError] = useState(false)
  const isImage = file.mime_type.startsWith('image/')
  const isPdf = file.mime_type === 'application/pdf'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] rounded-xl bg-background shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{file.name}</p>
            {file.project && (
              <p className="text-xs text-muted-foreground">{file.project.name}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            {file.signed_url && (
              <a
                href={file.signed_url}
                download={file.name}
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
            )}
            <button
              onClick={onClose}
              className="rounded-md p-1.5 hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Preview area */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-muted/20 min-h-[400px]">
          {isImage && !imgError && file.signed_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={file.signed_url}
              alt={file.name}
              className="max-w-full max-h-[70vh] object-contain"
              onError={() => setImgError(true)}
            />
          ) : isPdf && file.signed_url ? (
            <iframe
              src={file.signed_url}
              title={file.name}
              className="w-full h-[70vh] border-0"
            />
          ) : (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
                <FileText className="h-10 w-10 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground mt-1">{file.mime_type}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Preview not available for this file type
                </p>
              </div>
              {file.signed_url && (
                <a
                  href={file.signed_url}
                  download={file.name}
                  className="mt-2 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download to view
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
