'use client'

import Link from 'next/link'
import { ArrowRight, AlertCircle, Clock, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { TaskPreview } from '@/lib/dashboard/queries'

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', className: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' },
  high:   { label: 'High',   className: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400' },
  medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400' },
  low:    { label: 'Low',    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
}

const STATUS_CONFIG = {
  backlog:     { dot: 'bg-gray-400',   label: 'Backlog' },
  todo:        { dot: 'bg-blue-400',   label: 'To Do' },
  in_progress: { dot: 'bg-gem-500',    label: 'In Progress' },
  in_review:   { dot: 'bg-yellow-500', label: 'In Review' },
  done:        { dot: 'bg-green-500',  label: 'Done' },
}

function isOverdue(dateStr: string | null) {
  if (!dateStr) return false
  return new Date(dateStr) < new Date(new Date().toDateString())
}

function formatDueDate(dateStr: string | null) {
  if (!dateStr) return null
  const date = new Date(dateStr)
  const today = new Date(new Date().toDateString())
  const diff = Math.round((date.getTime() - today.getTime()) / 86_400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  return `${diff}d left`
}

interface TasksPreviewProps {
  tasks: TaskPreview[]
}

export function TasksPreview({ tasks }: TasksPreviewProps) {
  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Today&apos;s Tasks</CardTitle>
          <Link
            href="/tasks"
            className="flex items-center gap-1 text-xs text-gem-600 hover:text-gem-700 hover:underline"
          >
            All tasks <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-1 p-2 pt-0">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-2 h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-lg">✓</span>
            </div>
            <p className="text-sm font-medium text-muted-foreground">All caught up!</p>
            <p className="text-xs text-muted-foreground/70">No urgent tasks today</p>
          </div>
        ) : (
          tasks.map((task) => {
            const priority = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG]
            const status = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG]
            const overdue = isOverdue(task.due_date)
            const dueDateLabel = formatDueDate(task.due_date)

            return (
              <Link
                key={task.id}
                href={`/tasks?highlight=${task.id}`}
                className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted group"
              >
                <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', status?.dot ?? 'bg-gray-400')} />
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-medium leading-snug truncate',
                    overdue ? 'text-red-600 dark:text-red-400' : 'text-foreground'
                  )}>
                    {overdue && <AlertCircle className="inline h-3 w-3 mr-1 -mt-0.5" />}
                    {task.title}
                  </p>
                  {task.project_name && (
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">{task.project_name}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {priority && (
                    <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', priority.className)}>
                      {priority.label}
                    </span>
                  )}
                  {dueDateLabel && (
                    <span className={cn(
                      'flex items-center gap-0.5 text-[10px]',
                      overdue ? 'text-red-500' : 'text-muted-foreground'
                    )}>
                      <Clock className="h-2.5 w-2.5" />
                      {dueDateLabel}
                    </span>
                  )}
                </div>
              </Link>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

export function TasksPreviewSkeleton() {
  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-28" />
      </CardHeader>
      <CardContent className="space-y-1 p-2 pt-0">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5">
            <Skeleton className="h-2 w-2 rounded-full shrink-0" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-4 w-12 rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
