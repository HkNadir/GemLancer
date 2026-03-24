import Link from 'next/link'
import { Calendar, Clock, DollarSign, CheckSquare, Users, TrendingUp, AlertCircle } from 'lucide-react'
import type { ProjectDetail } from '@/types/database'

// ── Helpers ────────────────────────────────────────────────────

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n)
}

function fmtHours(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Stat Card ─────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'text-primary',
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  color?: string
}) {
  return (
    <div className="rounded-xl border bg-card p-4 flex items-start gap-3">
      <div className={`mt-0.5 ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold tabular-nums leading-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Progress Bar ──────────────────────────────────────────────

function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  return (
    <div className={`h-2 w-full rounded-full bg-muted overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full bg-primary transition-all duration-500"
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  )
}

// ── Milestone Status Badge ─────────────────────────────────────

const MS_BADGE: Record<string, string> = {
  pending:   'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  submitted: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  approved:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  rejected:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

// ── Main Component ─────────────────────────────────────────────

export function OverviewTab({ project }: { project: ProjectDetail }) {
  const totalTasks = project.milestones.reduce((s, m) => s + m.tasks.length, 0)
  const completedTasks = project.milestones.reduce(
    (s, m) => s + m.tasks.filter((t) => t.status === 'done').length, 0
  )
  const approvedMs = project.milestones.filter((m) => m.status === 'approved').length
  const currency = project.currency ?? project.client.currency ?? 'USD'

  const now = new Date()
  const isOverdue =
    project.status === 'active' &&
    project.end_date != null &&
    new Date(project.end_date) < now

  const daysLeft = project.end_date
    ? Math.ceil((new Date(project.end_date).getTime() - now.getTime()) / 86400000)
    : null

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Overdue banner */}
      {isOverdue && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          This project is overdue. Update the end date or mark it as completed.
        </div>
      )}

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={TrendingUp}
          label="Progress"
          value={`${project.progress}%`}
          sub={totalTasks > 0 ? `${completedTasks}/${totalTasks} tasks done` : 'No tasks yet'}
        />
        <StatCard
          icon={CheckSquare}
          label="Milestones"
          value={`${approvedMs}/${project.milestones.length}`}
          sub="approved"
          color="text-blue-500"
        />
        {project.budget ? (
          <StatCard
            icon={DollarSign}
            label="Budget"
            value={fmt(project.budget, currency)}
            sub={project.currency}
            color="text-green-500"
          />
        ) : (
          <StatCard icon={DollarSign} label="Budget" value="—" sub="Not set" color="text-muted-foreground" />
        )}
        <StatCard
          icon={Calendar}
          label={isOverdue ? 'Was due' : daysLeft === null ? 'Due date' : daysLeft <= 0 ? 'Due today' : `${daysLeft}d left`}
          value={project.end_date ? fmtDate(project.end_date) : '—'}
          sub={project.start_date ? `Started ${fmtDate(project.start_date)}` : undefined}
          color={isOverdue ? 'text-red-500' : daysLeft !== null && daysLeft < 7 ? 'text-amber-500' : undefined}
        />
      </div>

      {/* Progress bar */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Overall Progress</h2>
          <span className="text-sm font-semibold tabular-nums">{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} />
        {totalTasks > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            {completedTasks} of {totalTasks} tasks completed
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Milestones */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Milestones</h2>
            <Link href={`/projects/${project.id}/milestones`} className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>
          {project.milestones.length === 0 ? (
            <p className="text-sm text-muted-foreground">No milestones yet.</p>
          ) : (
            <div className="space-y-3">
              {project.milestones.slice(0, 5).map((m) => {
                const total = m.tasks.length
                const done = m.tasks.filter((t) => t.status === 'done').length
                const pct = total > 0 ? Math.round((done / total) * 100) : 0
                return (
                  <div key={m.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate flex-1">{m.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-md capitalize ml-2 ${MS_BADGE[m.status] ?? ''}`}>
                        {m.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ProgressBar value={pct} className="flex-1" />
                      <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">{pct}%</span>
                    </div>
                    {m.due_date && (
                      <p className="text-xs text-muted-foreground mt-0.5">Due {fmtDate(m.due_date)}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Team */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Team</h2>
            <span className="text-xs text-muted-foreground">{project.team_members.length} member{project.team_members.length !== 1 ? 's' : ''}</span>
          </div>
          {project.team_members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No team members assigned yet.</p>
          ) : (
            <div className="space-y-2">
              {project.team_members.map((u) => (
                <div key={u.id} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-medium">
                    {u.avatar_url
                      ? <img src={u.avatar_url} alt={u.full_name} className="h-8 w-8 rounded-full object-cover" />
                      : u.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{u.full_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{u.role}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-sm font-semibold mb-2">Description</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-line">{project.description}</p>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href={`/projects/${project.id}/kanban`}
          className="text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          Open Board
        </Link>
        <Link href={`/projects/${project.id}/milestones`}
          className="text-sm px-4 py-2 rounded-md border hover:bg-muted transition-colors">
          Manage Milestones
        </Link>
        <Link href={`/projects/${project.id}/timeline`}
          className="text-sm px-4 py-2 rounded-md border hover:bg-muted transition-colors">
          View Timeline
        </Link>
      </div>
    </div>
  )
}
