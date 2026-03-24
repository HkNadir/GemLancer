import type { TaskDetail, TaskActivityAction } from '@/types/database'

const ACTION_LABEL: Record<TaskActivityAction, string> = {
  created:             'created this task',
  status_changed:      'changed status',
  priority_changed:    'changed priority',
  assigned:            'assigned',
  unassigned:          'unassigned',
  due_date_changed:    'changed due date',
  title_changed:       'renamed task',
  description_changed: 'updated description',
  subtask_added:       'added subtask',
  subtask_completed:   'completed subtask',
  comment_added:       'commented',
  time_logged:         'logged time',
  milestone_changed:   'changed milestone',
}

type Activity = TaskDetail['activity'][number]

export function ActivityFeed({ activity }: { activity: Activity[] }) {
  if (activity.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>
  }

  return (
    <div className="space-y-3">
      {activity.map((a) => (
        <div key={a.id} className="flex gap-3 items-start">
          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0 mt-0.5">
            {(a as any).user?.full_name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <span className="font-medium">{(a as any).user?.full_name ?? 'System'}</span>
              {' '}
              <span className="text-muted-foreground">{ACTION_LABEL[a.action] ?? a.action}</span>
              {a.to_value && (
                <>
                  {' '}
                  <span className="font-medium">{a.to_value}</span>
                </>
              )}
              {a.from_value && (
                <span className="text-muted-foreground"> (was {a.from_value})</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(a.created_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
