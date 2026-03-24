'use client'

import { useEffect, useState, useTransition } from 'react'
import { Play, Pause, Square, X, Clock, ChevronUp, ChevronDown } from 'lucide-react'
import { useTimerStore, formatElapsed } from '@/stores/timer-store'
import { logTime } from '@/lib/projects/actions'

export function FloatingTimer() {
  const isRunning = useTimerStore((s) => s.isRunning)
  const task = useTimerStore((s) => s.task)
  const isExpanded = useTimerStore((s) => s.isExpanded)
  const isVisible = useTimerStore((s) => s.isVisible)
  const billable = useTimerStore((s) => s.billable)
  const description = useTimerStore((s) => s.description)
  const pause = useTimerStore((s) => s.pause)
  const resume = useTimerStore((s) => s.resume)
  const stop = useTimerStore((s) => s.stop)
  const discard = useTimerStore((s) => s.discard)
  const setDescription = useTimerStore((s) => s.setDescription)
  const setBillable = useTimerStore((s) => s.setBillable)
  const setExpanded = useTimerStore((s) => s.setExpanded)
  const getElapsedMs = useTimerStore((s) => s.getElapsedMs)

  const [elapsed, setElapsed] = useState(0)
  const [isPending, startTransition] = useTransition()

  // Tick every second
  useEffect(() => {
    const id = setInterval(() => setElapsed(getElapsedMs()), 1000)
    return () => clearInterval(id)
  }, [getElapsedMs])

  // Not visible if no task
  if (!task) return null

  const handleStop = () => {
    const result = stop()
    if (!result) return
    startTransition(async () => {
      try {
        await logTime({
          task_id: result.taskId,
          project_id: result.projectId,
          started_at: result.startedAt,
          ended_at: result.endedAt,
          description: result.description || undefined,
          billable: result.billable,
        })
      } catch { /* swallow */ }
    })
  }

  const isOverdue = elapsed > 2 * 60 * 60 * 1000

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2 animate-in slide-in-from-bottom-2 duration-200">
      <div className={`rounded-2xl border shadow-lg bg-card transition-all ${
        isOverdue ? 'border-amber-300 dark:border-amber-600' : 'border-border'
      } ${isExpanded ? 'w-72' : 'w-auto'}`}>
        {/* Compact bar */}
        <div className="flex items-center gap-2 px-3 py-2.5">
          {/* Pulsing dot */}
          <span className={`h-2 w-2 rounded-full shrink-0 ${isRunning ? 'bg-red-500 animate-pulse' : 'bg-amber-400'}`} />

          {/* Task name */}
          <p className="text-xs font-medium truncate max-w-[100px]" title={task.title}>
            {task.title}
          </p>

          {/* Elapsed */}
          <span className={`text-xs font-mono tabular-nums font-semibold ${isOverdue ? 'text-amber-500' : 'text-foreground'}`}>
            {formatElapsed(elapsed)}
          </span>

          {/* Controls */}
          <div className="flex items-center gap-1 ml-1">
            {isRunning ? (
              <button onClick={pause} className="p-1 rounded hover:bg-muted text-muted-foreground" title="Pause">
                <Pause className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button onClick={resume} className="p-1 rounded hover:bg-muted text-muted-foreground" title="Resume">
                <Play className="h-3.5 w-3.5" />
              </button>
            )}
            <button onClick={handleStop} disabled={isPending}
              className="p-1 rounded hover:bg-muted text-green-600 hover:text-green-700" title="Stop & save">
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
            <button onClick={() => setExpanded(!isExpanded)}
              className="p-1 rounded hover:bg-muted text-muted-foreground">
              {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Expanded panel */}
        {isExpanded && (
          <div className="border-t px-3 pb-3 pt-2 space-y-3">
            {isOverdue && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Timer running over 2 hours — remember to stop it!
              </p>
            )}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What are you working on?"
                className="w-full text-xs border rounded px-2 py-1.5 bg-background outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={billable} onChange={(e) => setBillable(e.target.checked)}
                className="rounded" />
              Billable
            </label>
            <div className="flex gap-2">
              <button onClick={handleStop} disabled={isPending}
                className="flex-1 text-xs py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                Stop & Save
              </button>
              <button onClick={discard}
                className="flex-1 text-xs py-1.5 rounded-md border text-muted-foreground hover:bg-muted hover:text-destructive transition-colors">
                Discard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
