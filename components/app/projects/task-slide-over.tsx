'use client'

import { useState, useEffect, useTransition } from 'react'
import { X, Loader2, Play, Calendar, Clock, User, Tag } from 'lucide-react'
import type { TaskDetail, TaskStatus, TaskPriority } from '@/types/database'
import {
  updateTask, createSubtask, toggleSubtask, deleteSubtask,
  createComment, editComment, deleteComment, logTime,
} from '@/lib/projects/actions'
import { useTimerStore } from '@/stores/timer-store'
import { SubtaskList } from './subtask-list'
import { CommentThread } from './comment-thread'
import { ActivityFeed } from './activity-feed'

const STATUS_OPTS: { value: TaskStatus; label: string }[] = [
  { value: 'backlog',     label: 'Backlog'     },
  { value: 'todo',        label: 'To Do'       },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_review',   label: 'In Review'   },
  { value: 'done',        label: 'Done'        },
]

const PRIORITY_OPTS: { value: TaskPriority; label: string }[] = [
  { value: 'low',    label: 'Low'    },
  { value: 'medium', label: 'Medium' },
  { value: 'high',   label: 'High'   },
  { value: 'urgent', label: 'Urgent' },
]

interface Props {
  taskId: string
  projectId: string
  teamMembers: { id: string; full_name: string; avatar_url: string | null }[]
  onClose: () => void
}

export function TaskSlideOver({ taskId, projectId, teamMembers, onClose }: Props) {
  const [task, setTask] = useState<TaskDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'details' | 'comments' | 'activity' | 'time'>('details')
  const [isPending, startTransition] = useTransition()
  const timerStart = useTimerStore((s) => s.start)
  const isTimerRunning = useTimerStore((s) => s.isRunning)
  const timerTask = useTimerStore((s) => s.task)

  useEffect(() => {
    let mounted = true
    fetch(`/api/tasks/${taskId}`)
      .then((r) => r.json())
      .then((data) => { if (mounted) { setTask(data); setLoading(false) } })
      .catch(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [taskId])

  const update = (field: string, value: unknown) => {
    startTransition(async () => {
      await updateTask(taskId, projectId, { [field]: value } as any)
      setTask((prev) => prev ? { ...prev, [field]: value } : prev)
    })
  }

  const isTimerActiveForThis = isTimerRunning && timerTask?.id === taskId

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-end">
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-xl h-full bg-background border-l shadow-xl flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!task) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-xl h-full bg-background border-l shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b">
          <div className="flex-1 min-w-0">
            <input
              defaultValue={task.title}
              onBlur={(e) => {
                if (e.target.value !== task.title) update('title', e.target.value)
              }}
              className="w-full text-base font-semibold bg-transparent outline-none hover:bg-muted/40 focus:bg-muted/40 rounded px-1 -ml-1 py-0.5"
            />
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-muted text-muted-foreground mt-0.5">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab nav */}
        <div className="flex border-b">
          {(['details', 'comments', 'activity', 'time'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${
                tab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {tab === 'details' && (
            <>
              {/* Quick fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Tag className="h-3 w-3" />Status</label>
                  <select
                    value={task.status}
                    onChange={(e) => update('status', e.target.value)}
                    className="w-full text-sm border rounded-md px-2 py-1.5 bg-background"
                  >
                    {STATUS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Tag className="h-3 w-3" />Priority</label>
                  <select
                    value={task.priority}
                    onChange={(e) => update('priority', e.target.value)}
                    className="w-full text-sm border rounded-md px-2 py-1.5 bg-background"
                  >
                    {PRIORITY_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" />Assignee</label>
                  <select
                    value={task.assignee_id ?? ''}
                    onChange={(e) => update('assignee_id', e.target.value || null)}
                    className="w-full text-sm border rounded-md px-2 py-1.5 bg-background"
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Due Date</label>
                  <input
                    type="date"
                    defaultValue={task.due_date?.slice(0, 10) ?? ''}
                    onBlur={(e) => update('due_date', e.target.value || null)}
                    className="w-full text-sm border rounded-md px-2 py-1.5 bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Estimated Hours</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    defaultValue={task.estimated_hours ?? ''}
                    onBlur={(e) => update('estimated_hours', e.target.value ? parseFloat(e.target.value) : null)}
                    className="w-full text-sm border rounded-md px-2 py-1.5 bg-background"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <textarea
                  defaultValue={task.description ?? ''}
                  onBlur={(e) => {
                    if (e.target.value !== (task.description ?? '')) update('description', e.target.value || null)
                  }}
                  rows={4}
                  placeholder="Add a description…"
                  className="w-full text-sm border rounded-md px-3 py-2 bg-background resize-none outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {/* Subtasks */}
              <SubtaskList
                taskId={taskId}
                subtasks={task.subtasks}
                onAdd={(title) => createSubtask({ task_id: taskId, project_id: projectId, title })}
                onToggle={(id, newVal) => toggleSubtask({ subtask_id: id, task_id: taskId, project_id: projectId, is_completed: newVal })}
                onDelete={(id) => deleteSubtask({ subtask_id: id, task_id: taskId, project_id: projectId })}
              />

              {/* Timer */}
              <div className="rounded-lg border p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Timer</p>
                  <p className="text-xs text-muted-foreground">Track time on this task</p>
                </div>
                <button
                  onClick={() => timerStart({ id: taskId, title: task.title, project_id: projectId, project_name: '' })}
                  disabled={isTimerActiveForThis}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  <Play className="h-3.5 w-3.5" />
                  {isTimerActiveForThis ? 'Running…' : 'Start Timer'}
                </button>
              </div>
            </>
          )}

          {tab === 'comments' && (
            <CommentThread
              taskId={taskId}
              comments={task.comments}
              onAdd={(content) => createComment({ task_id: taskId, project_id: projectId, content })}
              onEdit={(id, content) => editComment({ comment_id: id, task_id: taskId, project_id: projectId, content })}
              onDelete={(id) => deleteComment({ comment_id: id, task_id: taskId, project_id: projectId })}
            />
          )}

          {tab === 'activity' && (
            <ActivityFeed activity={task.activity} />
          )}

          {tab === 'time' && (
            <TimeLogList timeLogs={task.time_logs} taskId={taskId} projectId={projectId} />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Inline time log list ───────────────────────────────────────

function TimeLogList({
  timeLogs,
  taskId,
  projectId,
}: {
  timeLogs: TaskDetail['time_logs']
  taskId: string
  projectId: string
}) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ date: '', hours: '', description: '', billable: true })
  const [isPending, startTransition] = useTransition()

  const submit = () => {
    if (!form.date || !form.hours) return
    startTransition(async () => {
      const started = new Date(form.date)
      const ended = new Date(started.getTime() + parseFloat(form.hours) * 3600000)
      await logTime({
        task_id: taskId,
        project_id: projectId,
        started_at: started.toISOString(),
        ended_at: ended.toISOString(),
        description: form.description || undefined,
        billable: form.billable,
      })
      setAdding(false)
      setForm({ date: '', hours: '', description: '', billable: true })
    })
  }

  const totalH = timeLogs.reduce((s, l) => s + l.duration_minutes, 0) / 60

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Time Logs</p>
          <p className="text-xs text-muted-foreground">{totalH.toFixed(1)}h total</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="text-xs px-2 py-1 rounded border hover:bg-muted transition-colors"
        >
          Log time
        </button>
      </div>

      {adding && (
        <div className="rounded-lg border p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="text-sm border rounded px-2 py-1.5 bg-background" />
            <input type="number" min={0} step={0.25} placeholder="Hours" value={form.hours}
              onChange={(e) => setForm({ ...form, hours: e.target.value })}
              className="text-sm border rounded px-2 py-1.5 bg-background" />
          </div>
          <input type="text" placeholder="Description (optional)" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full text-sm border rounded px-2 py-1.5 bg-background" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.billable} onChange={(e) => setForm({ ...form, billable: e.target.checked })} />
            Billable
          </label>
          <div className="flex gap-2">
            <button onClick={submit} disabled={isPending || !form.date || !form.hours}
              className="text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground disabled:opacity-50">Save</button>
            <button onClick={() => setAdding(false)} className="text-xs px-3 py-1.5 rounded border">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {timeLogs.length === 0 && <p className="text-sm text-muted-foreground">No time logged yet.</p>}
        {timeLogs.map((l) => (
          <div key={l.id} className="flex items-center gap-3 py-2 border-b last:border-0">
            <div className="flex-1 min-w-0">
              <p className="text-sm">{l.description ?? <span className="text-muted-foreground italic">No description</span>}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(l.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {' · '}{(l.duration_minutes / 60).toFixed(1)}h
                {l.billable && <span className="ml-1 text-green-600">billable</span>}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
