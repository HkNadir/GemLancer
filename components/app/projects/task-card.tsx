'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Calendar, CheckSquare, GripVertical, Clock } from 'lucide-react'
import type { TaskWithAssignee } from '@/types/database'
import { TaskSlideOver } from './task-slide-over'

const PRIORITY_DOT: Record<string, string> = {
  low:    'bg-gray-400',
  medium: 'bg-blue-400',
  high:   'bg-amber-400',
  urgent: 'bg-red-500',
}

interface Props {
  task: TaskWithAssignee
  projectId: string
  teamMembers: { id: string; full_name: string; avatar_url: string | null }[]
  isDragging?: boolean
}

export function TaskCard({ task, projectId, teamMembers, isDragging = false }: Props) {
  const [open, setOpen] = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSorting } =
    useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isOverdue =
    task.due_date != null &&
    task.status !== 'done' &&
    new Date(task.due_date) < new Date()

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        className={`group relative rounded-lg border bg-card p-3 cursor-pointer transition-all select-none ${
          isSorting || isDragging ? 'opacity-50 shadow-lg scale-[1.02]' : 'hover:shadow-sm'
        }`}
        onClick={() => setOpen(true)}
      >
        {/* Drag handle */}
        <button
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground transition-opacity cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        {/* Priority dot + title */}
        <div className="flex items-start gap-2 pr-5">
          <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${PRIORITY_DOT[task.priority] ?? 'bg-gray-400'}`} />
          <p className="text-sm font-medium leading-snug line-clamp-2">{task.title}</p>
        </div>

        {/* Metadata row */}
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          {task.due_date && (
            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : ''}`}>
              <Calendar className="h-3 w-3" />
              {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
          {task.subtask_count > 0 && (
            <span className="flex items-center gap-1">
              <CheckSquare className="h-3 w-3" />
              {task.completed_subtask_count}/{task.subtask_count}
            </span>
          )}
          {task.estimated_hours && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {task.estimated_hours}h
            </span>
          )}

          {/* Assignee avatar */}
          {task.assignee && (
            <span
              className="ml-auto h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium shrink-0"
              title={task.assignee.full_name}
            >
              {task.assignee.avatar_url
                ? <img src={task.assignee.avatar_url} alt={task.assignee.full_name} className="h-5 w-5 rounded-full object-cover" />
                : task.assignee.full_name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {open && (
        <TaskSlideOver
          taskId={task.id}
          projectId={projectId}
          teamMembers={teamMembers}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
