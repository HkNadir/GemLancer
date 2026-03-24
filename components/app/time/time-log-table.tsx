'use client'

import { useState, useTransition } from 'react'
import { deleteTimeLog, updateTimeLog } from '@/lib/time/actions'
import { BillableToggle } from './billable-toggle'
import { useToast } from '@/hooks/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────

export interface TimeLogRow {
  id: string
  started_at: string
  ended_at: string
  duration_minutes: number
  description: string | null
  billable: boolean
  user: { id: string; full_name: string; avatar_url: string | null } | null
  task: {
    id: string
    title: string
    project_id: string
    project: { id: string; name: string } | null
  } | null
}

export type GroupedLogs = Record<string, TimeLogRow[]>

// ── Helpers ────────────────────────────────────────────────────

function fmtHours(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function toLocalDatetimeValue(iso: string) {
  // Convert ISO to "YYYY-MM-DDTHH:mm" for <input type="datetime-local">
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function isOlderThan30Days(startedAt: string) {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  return new Date(startedAt) < thirtyDaysAgo
}

// ── Edit Dialog ────────────────────────────────────────────────

function EditDialog({
  log,
  open,
  onClose,
}: {
  log: TimeLogRow
  open: boolean
  onClose: () => void
}) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const [startedAt, setStartedAt] = useState(toLocalDatetimeValue(log.started_at))
  const [endedAt, setEndedAt] = useState(toLocalDatetimeValue(log.ended_at))
  const [description, setDescription] = useState(log.description ?? '')

  function handleSave() {
    startTransition(async () => {
      const result = await updateTimeLog(log.id, {
        started_at: startedAt,
        ended_at: endedAt,
        description,
      })
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Time log updated' })
        onClose()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Time Log</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{log.task?.title ?? 'Unknown task'}</span>
            {log.task?.project && (
              <span> · {log.task.project.name}</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-start">Start</Label>
              <Input
                id="edit-start"
                type="datetime-local"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-end">End</Label>
              <Input
                id="edit-end"
                type="datetime-local"
                value={endedAt}
                onChange={(e) => setEndedAt(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-desc">Description</Label>
            <Input
              id="edit-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What were you working on?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Log Row ────────────────────────────────────────────────────

function LogRow({ log }: { log: TimeLogRow }) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [editOpen, setEditOpen] = useState(false)
  const immutable = isOlderThan30Days(log.started_at)

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteTimeLog(log.id)
      if (result.error) {
        toast({ title: 'Cannot delete', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Time log deleted' })
      }
    })
  }

  const startTime = new Date(log.started_at).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const endTime = new Date(log.ended_at).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/30',
          isPending && 'opacity-50'
        )}
      >
        {/* Time range */}
        <span className="text-xs text-muted-foreground tabular-nums w-24 shrink-0">
          {startTime} – {endTime}
        </span>

        {/* Task + project */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{log.task?.title ?? '—'}</p>
          <p className="text-xs text-muted-foreground truncate">
            {log.task?.project?.name ?? ''}
            {log.description ? ` · ${log.description}` : ''}
          </p>
        </div>

        {/* Billable toggle */}
        <BillableToggle
          logId={log.id}
          initialBillable={log.billable}
          disabled={immutable}
        />

        {/* Duration */}
        <span className="text-sm font-semibold tabular-nums w-16 text-right shrink-0">
          {fmtHours(log.duration_minutes)}
        </span>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted transition-colors"
              disabled={isPending}
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Log actions</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onClick={() => setEditOpen(true)}
              disabled={immutable}
              className="gap-2"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              disabled={immutable || isPending}
              className="gap-2 text-destructive focus:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {editOpen && (
        <EditDialog log={log} open={editOpen} onClose={() => setEditOpen(false)} />
      )}
    </>
  )
}

// ── Main component ─────────────────────────────────────────────

interface TimeLogTableProps {
  grouped: GroupedLogs
}

export function TimeLogTable({ grouped }: TimeLogTableProps) {
  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([date, dayLogs]) => {
        const dayMinutes = dayLogs.reduce((s, l) => s + l.duration_minutes, 0)
        return (
          <div key={date}>
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b">
              <p className="text-sm font-semibold">{date}</p>
              <p className="text-sm text-muted-foreground">{fmtHours(dayMinutes)}</p>
            </div>
            <div className="space-y-0.5">
              {dayLogs.map((log) => (
                <LogRow key={log.id} log={log} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
