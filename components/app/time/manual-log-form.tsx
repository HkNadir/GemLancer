'use client'

import { useState, useTransition, useEffect } from 'react'
import { createManualLog } from '@/lib/time/actions'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Plus } from 'lucide-react'

interface Project {
  id: string
  name: string
}

interface Task {
  id: string
  title: string
}

interface ManualLogFormProps {
  projects: Project[]
}

// Format "YYYY-MM-DDTHH:mm" for datetime-local defaulting to now / 1h ago
function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function getDefaults() {
  const end = new Date()
  end.setSeconds(0, 0)
  const start = new Date(end.getTime() - 60 * 60 * 1000) // 1 hour ago
  return { start: toDatetimeLocal(start), end: toDatetimeLocal(end) }
}

export function ManualLogForm({ projects }: ManualLogFormProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const defaults = getDefaults()
  const [projectId, setProjectId] = useState('')
  const [taskId, setTaskId] = useState('')
  const [startedAt, setStartedAt] = useState(defaults.start)
  const [endedAt, setEndedAt] = useState(defaults.end)
  const [description, setDescription] = useState('')
  const [billable, setBillable] = useState(true)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      const d = getDefaults()
      setProjectId('')
      setTaskId('')
      setStartedAt(d.start)
      setEndedAt(d.end)
      setDescription('')
      setBillable(true)
      setTasks([])
    }
  }, [open])

  // Fetch tasks when project changes
  useEffect(() => {
    if (!projectId) {
      setTasks([])
      setTaskId('')
      return
    }
    setLoadingTasks(true)
    setTaskId('')
    const supabase = createClient()
    supabase
      .from('tasks')
      .select('id, title')
      .eq('project_id', projectId)
      .order('title')
      .then(({ data }) => {
        setTasks(data ?? [])
        setLoadingTasks(false)
      })
  }, [projectId])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!taskId) {
      toast({ title: 'Select a task', variant: 'destructive' })
      return
    }

    startTransition(async () => {
      const result = await createManualLog({
        task_id: taskId,
        started_at: startedAt,
        ended_at: endedAt,
        description,
        billable,
      })

      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Time logged successfully' })
        setOpen(false)
      }
    })
  }

  // Derived duration preview
  const durationMinutes = Math.round(
    (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60_000
  )
  const durationLabel =
    durationMinutes > 0
      ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`
      : null

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2" size="sm">
        <Plus className="h-4 w-4" />
        Log Time
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log Time Manually</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-1">
            {/* Project */}
            <div className="space-y-1.5">
              <Label htmlFor="ml-project">Project</Label>
              <select
                id="ml-project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                required
                className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select a project…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Task */}
            <div className="space-y-1.5">
              <Label htmlFor="ml-task">Task</Label>
              <select
                id="ml-task"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                required
                disabled={!projectId || loadingTasks}
                className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              >
                <option value="">
                  {loadingTasks
                    ? 'Loading tasks…'
                    : !projectId
                    ? 'Select a project first'
                    : tasks.length === 0
                    ? 'No tasks in this project'
                    : 'Select a task…'}
                </option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Start / End */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ml-start">Start</Label>
                <Input
                  id="ml-start"
                  type="datetime-local"
                  value={startedAt}
                  onChange={(e) => setStartedAt(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ml-end">End</Label>
                <Input
                  id="ml-end"
                  type="datetime-local"
                  value={endedAt}
                  onChange={(e) => setEndedAt(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Duration preview */}
            {durationLabel && (
              <p className="text-xs text-muted-foreground -mt-1">
                Duration: <span className="font-medium text-foreground">{durationLabel}</span>
              </p>
            )}

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="ml-desc">Description (optional)</Label>
              <Input
                id="ml-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What were you working on?"
                maxLength={200}
              />
            </div>

            {/* Billable */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="ml-billable"
                checked={billable}
                onCheckedChange={(v) => setBillable(Boolean(v))}
              />
              <Label htmlFor="ml-billable" className="font-normal cursor-pointer">
                Billable
              </Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !taskId}>
                {isPending ? 'Saving…' : 'Save log'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
