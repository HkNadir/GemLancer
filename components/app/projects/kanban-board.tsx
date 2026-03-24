'use client'

import { useState, useCallback, useTransition } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import type { KanbanBoard, TaskWithAssignee, TaskStatus } from '@/types/database'
import { moveTask } from '@/lib/projects/actions'
import { KanbanColumn } from './kanban-column'
import { TaskCard } from './task-card'

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'backlog',     label: 'Backlog',     color: 'bg-gray-400' },
  { id: 'todo',        label: 'To Do',       color: 'bg-blue-400' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-amber-400' },
  { id: 'in_review',   label: 'In Review',   color: 'bg-purple-400' },
  { id: 'done',        label: 'Done',        color: 'bg-green-400' },
]

interface Props {
  projectId: string
  initialBoard: KanbanBoard
  teamMembers: { id: string; full_name: string; avatar_url: string | null }[]
}

export function KanbanBoardClient({ projectId, initialBoard, teamMembers }: Props) {
  const [board, setBoard] = useState<KanbanBoard>(initialBoard)
  const [activeTask, setActiveTask] = useState<TaskWithAssignee | null>(null)
  const [isPending, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // Find which column a task is in
  const findColumn = useCallback((taskId: string): TaskStatus | null => {
    for (const col of COLUMNS) {
      if (board[col.id].some((t) => t.id === taskId)) return col.id
    }
    return null
  }, [board])

  const onDragStart = (e: DragStartEvent) => {
    const col = findColumn(e.active.id as string)
    if (!col) return
    const task = board[col].find((t) => t.id === e.active.id)
    setActiveTask(task ?? null)
  }

  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeCol = findColumn(activeId)
    // over could be a column id or a task id
    const overCol = (COLUMNS.some((c) => c.id === overId)
      ? overId
      : findColumn(overId)) as TaskStatus | null

    if (!activeCol || !overCol || activeCol === overCol) return

    setBoard((prev) => {
      const task = prev[activeCol].find((t) => t.id === activeId)
      if (!task) return prev

      const overIndex = prev[overCol].findIndex((t) => t.id === overId)
      const insertAt = overIndex >= 0 ? overIndex : prev[overCol].length

      return {
        ...prev,
        [activeCol]: prev[activeCol].filter((t) => t.id !== activeId),
        [overCol]: [
          ...prev[overCol].slice(0, insertAt),
          { ...task, status: overCol },
          ...prev[overCol].slice(insertAt),
        ],
      }
    })
  }

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    setActiveTask(null)
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const col = findColumn(activeId)
    if (!col) return

    // Same column reorder
    const overIndex = board[col].findIndex((t) => t.id === overId)
    const activeIndex = board[col].findIndex((t) => t.id === activeId)

    if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
      setBoard((prev) => ({
        ...prev,
        [col]: arrayMove(prev[col], activeIndex, overIndex),
      }))
    }

    // Persist
    startTransition(async () => {
      try {
        const newCol = findColumn(activeId)
        if (!newCol) return
        const newIndex = board[newCol].findIndex((t) => t.id === activeId)
        await moveTask({
          task_id: activeId,
          project_id: projectId,
          new_status: newCol,
          new_sort_order: newIndex,
        })
      } catch {
        // revert on error
        setBoard(initialBoard)
      }
    })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-6 px-6 pt-5 h-full">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            label={col.label}
            color={col.color}
            tasks={board[col.id]}
            projectId={projectId}
            teamMembers={teamMembers}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <TaskCard task={activeTask} isDragging projectId={projectId} teamMembers={teamMembers} />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
