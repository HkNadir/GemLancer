'use client'

import { useState, useTransition } from 'react'
import { Plus, ChevronDown, ChevronRight, CheckCircle, Clock, XCircle, Circle, Send } from 'lucide-react'
import type { MilestoneWithTasks, TaskWithAssignee } from '@/types/database'
import { createMilestone, approveMilestone, rejectMilestone } from '@/lib/projects/actions'
import { MilestoneForm } from './milestone-form'

const MS_ICON = {
  pending:   <Circle className="h-4 w-4 text-gray-400" />,
  submitted: <Send className="h-4 w-4 text-amber-500" />,
  approved:  <CheckCircle className="h-4 w-4 text-green-500" />,
  rejected:  <XCircle className="h-4 w-4 text-red-500" />,
}

const PRIORITY_COLOR: Record<string, string> = {
  low:    'bg-gray-200 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high:   'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-700',
}

interface Props {
  projectId: string
  milestones: MilestoneWithTasks[]
}

export function MilestonesTab({ projectId, milestones: initial }: Props) {
  const [milestones, setMilestones] = useState(initial)
  const [expanded, setExpanded] = useState<Set<string>>(new Set(initial.map((m) => m.id)))
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleApprove = (id: string) => {
    startTransition(async () => {
      await approveMilestone(id, projectId)
      setMilestones((prev) =>
        prev.map((m) => m.id === id ? { ...m, status: 'approved' as const } : m)
      )
    })
  }

  const handleReject = (id: string) => {
    startTransition(async () => {
      await rejectMilestone(id, projectId)
      setMilestones((prev) =>
        prev.map((m) => m.id === id ? { ...m, status: 'rejected' as const } : m)
      )
    })
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Milestones</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border hover:bg-muted transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add Milestone
        </button>
      </div>

      {showForm && (
        <MilestoneForm
          projectId={projectId}
          onCancel={() => setShowForm(false)}
          onSaved={() => setShowForm(false)}
        />
      )}

      {milestones.length === 0 && (
        <div className="rounded-xl border border-dashed bg-muted/20 py-12 text-center">
          <p className="text-sm font-medium">No milestones yet</p>
          <p className="text-xs text-muted-foreground mt-1">Break your project into deliverable phases</p>
        </div>
      )}

      <div className="space-y-3">
        {milestones.map((m) => {
          const total = m.tasks.length
          const done = m.tasks.filter((t) => t.status === 'done').length
          const pct = total > 0 ? Math.round((done / total) * 100) : 0

          return (
            <div key={m.id} className="rounded-xl border bg-card overflow-hidden">
              {/* Milestone header */}
              <div className="flex items-center gap-3 px-4 py-3">
                <button onClick={() => toggle(m.id)} className="text-muted-foreground">
                  {expanded.has(m.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                {MS_ICON[m.status]}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{m.name}</p>
                  {m.due_date && (
                    <p className="text-xs text-muted-foreground">
                      Due {new Date(m.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>

                {/* Progress */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span>{done}/{total}</span>
                </div>

                {/* Actions */}
                {m.status === 'submitted' && (
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => handleApprove(m.id)}
                      disabled={isPending}
                      className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(m.id)}
                      disabled={isPending}
                      className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                )}

                {m.payment_percent != null && (
                  <span className="text-xs font-medium text-muted-foreground ml-2">
                    {m.payment_percent}%
                  </span>
                )}
              </div>

              {/* Task list */}
              {expanded.has(m.id) && m.tasks.length > 0 && (
                <div className="border-t divide-y">
                  {m.tasks.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                      <div className={`h-1.5 w-1.5 rounded-full ${t.status === 'done' ? 'bg-green-500' : t.status === 'in_progress' ? 'bg-amber-500' : 'bg-gray-300'}`} />
                      <p className={`text-sm flex-1 ${t.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                        {t.title}
                      </p>
                      {t.priority && (
                        <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${PRIORITY_COLOR[t.priority]}`}>
                          {t.priority}
                        </span>
                      )}
                      {t.assignee && (
                        <span className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium"
                          title={t.assignee.full_name}>
                          {t.assignee.avatar_url
                            ? <img src={t.assignee.avatar_url} alt={t.assignee.full_name} className="h-5 w-5 rounded-full object-cover" />
                            : t.assignee.full_name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {expanded.has(m.id) && m.tasks.length === 0 && (
                <div className="border-t px-4 py-3">
                  <p className="text-xs text-muted-foreground">No tasks in this milestone. Add tasks from the Board view.</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
