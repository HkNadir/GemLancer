import { CheckSquare, Plus } from 'lucide-react'

export const metadata = { title: 'Tasks — GemLancer' }

export default function TasksPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage all tasks across your projects.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" />
          New Task
        </button>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
          <CheckSquare className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold">No tasks yet</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-xs">
          Tasks are created within projects. Start a project to begin adding and tracking work.
        </p>
      </div>
    </div>
  )
}
