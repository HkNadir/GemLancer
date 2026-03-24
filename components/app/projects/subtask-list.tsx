'use client'

import { useState, useTransition } from 'react'
import { Plus, X, CheckSquare, Square } from 'lucide-react'
import type { TaskSubtask } from '@/types/database'

interface Props {
  taskId: string
  subtasks: TaskSubtask[]
  onAdd: (title: string) => Promise<void>
  onToggle: (id: string, newValue: boolean) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function SubtaskList({ taskId, subtasks: initial, onAdd, onToggle, onDelete }: Props) {
  const [subtasks, setSubtasks] = useState(initial)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [isPending, startTransition] = useTransition()

  const completed = subtasks.filter((s) => s.is_completed).length

  const handleAdd = () => {
    if (!newTitle.trim()) { setAdding(false); return }
    const title = newTitle.trim()
    setNewTitle('')
    setAdding(false)
    startTransition(async () => {
      await onAdd(title)
      // optimistic — full refresh happens via revalidation
    })
  }

  const handleToggle = (id: string) => {
    const current = subtasks.find((s) => s.id === id)
    const newVal = !(current?.is_completed ?? false)
    setSubtasks((prev) =>
      prev.map((s) => s.id === id ? { ...s, is_completed: newVal } : s)
    )
    startTransition(() => onToggle(id, newVal))
  }

  const handleDelete = (id: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id))
    startTransition(() => onDelete(id))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Subtasks {subtasks.length > 0 && `(${completed}/${subtasks.length})`}
        </span>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>

      {subtasks.length > 0 && (
        <div className="space-y-1">
          {subtasks.map((s) => (
            <div key={s.id} className="flex items-center gap-2 group">
              <button onClick={() => handleToggle(s.id)} className="shrink-0 text-muted-foreground hover:text-foreground">
                {s.is_completed
                  ? <CheckSquare className="h-4 w-4 text-primary" />
                  : <Square className="h-4 w-4" />}
              </button>
              <span className={`text-sm flex-1 ${s.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                {s.title}
              </span>
              <button
                onClick={() => handleDelete(s.id)}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-foreground hover:text-destructive transition-all"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
              if (e.key === 'Escape') { setAdding(false); setNewTitle('') }
            }}
            placeholder="Subtask title…"
            className="flex-1 text-sm border rounded px-2 py-1 bg-background outline-none focus:ring-1 focus:ring-ring"
          />
          <button onClick={handleAdd} className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground">Add</button>
          <button onClick={() => { setAdding(false); setNewTitle('') }} className="p-1 rounded hover:bg-muted text-muted-foreground">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}
