'use client'

import { useState, useTransition } from 'react'
import {
  FileText, Image, Film, Archive, Code, Table,
  Download, Trash2, Eye, EyeOff, MoreHorizontal, FolderOpen,
} from 'lucide-react'
import { deleteFile, toggleClientVisibility } from '@/lib/files/actions'
import type { FileWithUploader } from '@/lib/files/queries'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

interface FileGridProps {
  files: FileWithUploader[]
}

function fileIcon(mime: string) {
  if (mime.startsWith('image/')) return <Image className="h-8 w-8 text-blue-500" />
  if (mime.startsWith('video/')) return <Film className="h-8 w-8 text-purple-500" />
  if (mime.includes('zip') || mime.includes('tar') || mime.includes('gz')) return <Archive className="h-8 w-8 text-yellow-500" />
  if (mime.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />
  if (mime.includes('sheet') || mime.includes('csv') || mime.includes('excel')) return <Table className="h-8 w-8 text-green-500" />
  if (mime.includes('html') || mime.includes('json') || mime.includes('javascript') || mime.includes('typescript')) return <Code className="h-8 w-8 text-orange-500" />
  return <FileText className="h-8 w-8 text-muted-foreground" />
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function FileCard({ file, onDeleted }: { file: FileWithUploader; onDeleted: (id: string) => void }) {
  const [, startTransition] = useTransition()
  const [visible, setVisible] = useState(file.is_client_visible)

  function handleDelete() {
    if (!confirm(`Delete "${file.name}"? This cannot be undone.`)) return
    startTransition(async () => {
      await deleteFile(file.id)
      onDeleted(file.id)
    })
  }

  function handleToggleVisibility() {
    const next = !visible
    setVisible(next)
    startTransition(async () => {
      await toggleClientVisibility(file.id, next)
    })
  }

  return (
    <div className="group relative flex flex-col rounded-xl border bg-card p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3">
        {fileIcon(file.mime_type)}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {file.signed_url && (
              <DropdownMenuItem asChild>
                <a href={file.signed_url} download={file.name} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Download
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleToggleVisibility} className="gap-2">
              {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {visible ? 'Hide from client' : 'Show to client'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              className="gap-2 text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" title={file.name}>{file.name}</p>
        {file.project && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{file.project.name}</p>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{fmtSize(file.size_bytes)}</span>
        <span>{fmtDate(file.created_at)}</span>
      </div>

      {visible && (
        <div className="mt-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-2 py-0.5 text-xs font-medium">
            <Eye className="h-3 w-3" />
            Client visible
          </span>
        </div>
      )}

      {file.signed_url && (
        <a
          href={file.signed_url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 rounded-xl"
          aria-label={`Open ${file.name}`}
          onClick={(e) => {
            // Don't navigate when clicking dropdown trigger area
            const target = e.target as HTMLElement
            if (target.closest('[data-radix-dropdown-menu-trigger]')) e.preventDefault()
          }}
        />
      )}
    </div>
  )
}

export function FileGrid({ files: initialFiles }: FileGridProps) {
  const [files, setFiles] = useState(initialFiles)

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
          <FolderOpen className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">No files yet</p>
        <p className="text-xs text-muted-foreground mt-1">Upload your first file using the button above.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {files.map((file) => (
        <FileCard
          key={file.id}
          file={file}
          onDeleted={(id) => setFiles((prev) => prev.filter((f) => f.id !== id))}
        />
      ))}
    </div>
  )
}
