'use client'

import { useState, useTransition } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, X } from 'lucide-react'
import type { TaskStatus, TaskWithAssignee } from '@/types/database'
import { createTask } from '@/lib/projects/actions'
import { TaskCard } from './task-card'

interface Props {
  id: TaskStatus
  label: string
  color: string
  tasks: TaskWithAssignee[]
  projectId: string
  teamMembers: { id: string; full_name: string; avatar_url: string | null }[]
}

export function KanbanColumn({ id, label, color, tasks, projectId, teamMembers }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleAdd = () => {
    if (!title.trim()) { setAdding(false); return }
    startTransition(async () => {
      try {
        await createTask({ title: title.trim(), project_id: projectId, status: id })
        setTitle('')
        setAdding(false)
      } catch { /* ignore */ }
    })
  }

  return (
    <div className="flex flex-col w-64 shrink-0">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className={`h-2 w-2 rounded-full ${color}`} />
        <span className="text-sm font-semibold">{label}</span>
        <span className="ml-auto text-xs text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
          {tasks.length}
        </span>
        <button
          onClick={() => setAdding(true)}
          className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Add task"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 flex flex-col gap-2 rounded-xl p-2 min-h-[120px] transition-colors ${
          isOver ? 'bg-muted/60 ring-1 ring-border' : 'bg-muted/20'
        }`}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} projectId={projectId} teamMembers={teamMembers} />
          ))}
        </SortableContext>

        {/* Quick add form */}
        {adding && (
          <div className="rounded-lg border bg-card p-2 space-y-2">
            <textarea
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd() }
                if (e.key === 'Escape') { setAdding(false); setTitle('') }
              }}
              placeholder="Task title..."
              rows={2}
              className="w-full resize-none text-sm bg-transparent outline-none placeholder:text-muted-foreground"
            />
            <div className="flex items-center gap-1">
              <button
                onClick={handleAdd}
                disabled={isPending || !title.trim()}
                className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground disabled:opacity-50"
              >
                Add
              </button>
              <button
                onClick={() => { setAdding(false); setTitle('') }}
                className="p-1 rounded hover:bg-muted text-muted-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
