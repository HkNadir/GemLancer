import Link from 'next/link'
import { Calendar, DollarSign, CheckSquare } from 'lucide-react'
import type { ProjectListItem } from '@/types/database'

// ── Health colours ─────────────────────────────────────────────

const HEALTH = {
  on_track: { border: 'border-green-200 dark:border-green-800/40',  dot: 'bg-green-500',  label: 'On track' },
  at_risk:  { border: 'border-amber-200 dark:border-amber-800/40',  dot: 'bg-amber-500',  label: 'At risk'  },
  overdue:  { border: 'border-red-200   dark:border-red-800/40',    dot: 'bg-red-500',    label: 'Overdue'  },
}

const STATUS_COLOR: Record<string, string> = {
  draft:     'text-gray-500',
  active:    'text-green-600 dark:text-green-400',
  on_hold:   'text-amber-600 dark:text-amber-400',
  completed: 'text-blue-600  dark:text-blue-400',
  cancelled: 'text-red-600   dark:text-red-400',
}

// ── SVG Progress Ring ─────────────────────────────────────────

function ProgressRing({ progress, size = 48 }: { progress: number; size?: number }) {
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (progress / 100) * circ

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={5}
        className="stroke-muted fill-none" />
      <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={5}
        className="stroke-primary fill-none transition-all duration-500"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" />
    </svg>
  )
}

// ── Currency formatter ────────────────────────────────────────

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n)
}

// ── Card ──────────────────────────────────────────────────────

export function ProjectCard({ project }: { project: ProjectListItem }) {
  const health = HEALTH[project.health]
  const statusColor = STATUS_COLOR[project.status] ?? 'text-muted-foreground'

  const taskPct = project.stats.total_tasks > 0
    ? Math.round((project.stats.completed_tasks / project.stats.total_tasks) * 100)
    : 0

  return (
    <Link
      href={`/projects/${project.id}`}
      className={`flex flex-col gap-4 rounded-xl border bg-card p-5 hover:shadow-md transition-all ${health.border}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-medium capitalize ${statusColor}`}>{project.status.replace('_', ' ')}</p>
          <h3 className="text-sm font-semibold mt-0.5 truncate">{project.name}</h3>
          <p className="text-xs text-muted-foreground truncate">{project.client.name}</p>
        </div>
        <div className="flex flex-col items-center shrink-0">
          <div className="relative">
            <ProgressRing progress={project.progress} />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
              {project.progress}%
            </span>
          </div>
        </div>
      </div>

      {/* Health badge */}
      <div className="flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full shrink-0 ${health.dot}`} />
        <span className="text-xs text-muted-foreground">{health.label}</span>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {project.end_date && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(project.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
        {project.stats.total_tasks > 0 && (
          <span className="flex items-center gap-1">
            <CheckSquare className="h-3.5 w-3.5" />
            {project.stats.completed_tasks}/{project.stats.total_tasks}
          </span>
        )}
        {project.budget && (
          <span className="flex items-center gap-1 ml-auto font-medium text-foreground">
            <DollarSign className="h-3.5 w-3.5" />
            {fmt(project.budget, project.currency)}
          </span>
        )}
      </div>
    </Link>
  )
}
