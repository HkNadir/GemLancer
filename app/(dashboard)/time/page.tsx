import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Clock, Download } from 'lucide-react'
import { TimeLogTable, type GroupedLogs } from '@/components/app/time/time-log-table'
import { ManualLogForm } from '@/components/app/time/manual-log-form'
import { WeeklySummary, type WeeklyDay } from '@/components/app/time/weekly-summary'

export const metadata = { title: 'Time Tracking — GemLancer' }

function fmtHours(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

/** Build Mon–Sun boundaries for the current week */
function getCurrentWeekBounds() {
  const now = new Date()
  const day = now.getDay() // 0=Sun … 6=Sat
  const diffToMon = (day === 0 ? -6 : 1 - day)
  const mon = new Date(now)
  mon.setDate(now.getDate() + diffToMon)
  mon.setHours(0, 0, 0, 0)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  sun.setHours(23, 59, 59, 999)
  return { mon, sun }
}

function buildWeekLabel(mon: Date, sun: Date) {
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(mon)} – ${fmt(sun)}, ${sun.getFullYear()}`
}

export default async function TimePage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; billable?: string; from?: string; to?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const tenantId = user?.app_metadata?.tenant_id as string
  if (!tenantId) return <div className="p-6 text-muted-foreground">Session not ready. Please refresh.</div>

  const searchParamsResolved = await searchParams

  // ── Filtered log query ───────────────────────────────────────
  let query = supabase
    .from('time_logs')
    .select(
      `
      id, started_at, ended_at, duration_minutes, description, billable,
      user:users ( id, full_name, avatar_url ),
      task:tasks!inner ( id, title, project_id,
        project:projects ( id, name )
      )
    `
    )
    .eq('tenant_id', tenantId)
    .order('started_at', { ascending: false })
    .limit(200)

  if (searchParamsResolved.project) query = query.eq('task.project_id', searchParamsResolved.project) as any
  if (searchParamsResolved.billable === 'true') query = query.eq('billable', true) as any
  if (searchParamsResolved.billable === 'false') query = query.eq('billable', false) as any
  if (searchParamsResolved.from) query = query.gte('started_at', searchParamsResolved.from) as any
  if (searchParamsResolved.to) query = query.lte('started_at', `${searchParamsResolved.to}T23:59:59`) as any

  const { data: logs } = await query

  // ── Projects for filter + manual log form ────────────────────
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .eq('is_archived', false)
    .order('name')

  // ── Weekly summary (always current week, ignores filters) ────
  const { mon, sun } = getCurrentWeekBounds()
  const { data: weekLogs } = await supabase
    .from('time_logs')
    .select('started_at, duration_minutes, billable')
    .eq('tenant_id', tenantId)
    .gte('started_at', mon.toISOString())
    .lte('started_at', sun.toISOString())

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const weekData: WeeklyDay[] = dayNames.map((day, i) => {
    const dayDate = new Date(mon)
    dayDate.setDate(mon.getDate() + i)
    const dayStart = dayDate.toDateString()
    const dayLogs = (weekLogs ?? []).filter(
      (l: any) => new Date(l.started_at).toDateString() === dayStart
    )
    const billableMin = dayLogs.filter((l: any) => l.billable).reduce((s: number, l: any) => s + l.duration_minutes, 0)
    const nonBillableMin = dayLogs.filter((l: any) => !l.billable).reduce((s: number, l: any) => s + l.duration_minutes, 0)
    return {
      day,
      billable: Math.round((billableMin / 60) * 10) / 10,
      nonBillable: Math.round((nonBillableMin / 60) * 10) / 10,
    }
  })

  const weekTotalMin = (weekLogs ?? []).reduce((s: number, l: any) => s + l.duration_minutes, 0)
  const weekBillableMin = (weekLogs ?? []).filter((l: any) => l.billable).reduce((s: number, l: any) => s + l.duration_minutes, 0)

  // ── Stat totals for filtered view ────────────────────────────
  const totalMinutes = (logs ?? []).reduce((s: number, l: any) => s + l.duration_minutes, 0)
  const billableMinutes = (logs ?? [])
    .filter((l: any) => l.billable)
    .reduce((s: number, l: any) => s + l.duration_minutes, 0)

  // ── Group logs by date label ─────────────────────────────────
  const grouped: GroupedLogs = {}
  for (const log of logs ?? []) {
    const date = new Date(log.started_at).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    if (!grouped[date]) grouped[date] = []
    grouped[date].push(log as any)
  }

  // ── CSV export URL (carry current filters) ───────────────────
  const exportParams = new URLSearchParams()
  if (searchParamsResolved.project) exportParams.set('project', searchParamsResolved.project)
  if (searchParamsResolved.billable) exportParams.set('billable', searchParamsResolved.billable)
  if (searchParamsResolved.from) exportParams.set('from', searchParamsResolved.from)
  if (searchParamsResolved.to) exportParams.set('to', searchParamsResolved.to)
  const exportUrl = `/api/time/export${exportParams.toString() ? `?${exportParams}` : ''}`

  const hasFilters = !!(searchParamsResolved.project || searchParamsResolved.billable || searchParamsResolved.from || searchParamsResolved.to)

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Time Tracking</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Log billable hours across projects and tasks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={exportUrl}
            className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border hover:bg-muted transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </a>
          <ManualLogForm projects={projects ?? []} />
        </div>
      </div>

      {/* Weekly Summary */}
      <WeeklySummary
        data={weekData}
        totalHours={Math.round((weekTotalMin / 60) * 10) / 10}
        billableHours={Math.round((weekBillableMin / 60) * 10) / 10}
        weekLabel={buildWeekLabel(mon, sun)}
      />

      {/* Filtered stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: hasFilters ? 'Total (filtered)' : 'Total logged', value: fmtHours(totalMinutes) },
          { label: 'Billable', value: fmtHours(billableMinutes) },
          { label: 'Entries', value: String((logs ?? []).length) },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-semibold mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form method="GET" className="flex flex-wrap gap-2">
          <select
            name="project"
            defaultValue={searchParamsResolved.project ?? ''}
            className="text-sm border rounded-md px-2 py-1.5 bg-background"
          >
            <option value="">All projects</option>
            {(projects ?? []).map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            name="billable"
            defaultValue={searchParamsResolved.billable ?? ''}
            className="text-sm border rounded-md px-2 py-1.5 bg-background"
          >
            <option value="">Billable &amp; non-billable</option>
            <option value="true">Billable only</option>
            <option value="false">Non-billable only</option>
          </select>
          <input
            type="date"
            name="from"
            defaultValue={searchParamsResolved.from ?? ''}
            className="text-sm border rounded-md px-2 py-1.5 bg-background"
          />
          <input
            type="date"
            name="to"
            defaultValue={searchParamsResolved.to ?? ''}
            className="text-sm border rounded-md px-2 py-1.5 bg-background"
          />
          <button
            type="submit"
            className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Filter
          </button>
          {hasFilters && (
            <Link
              href="/time"
              className="text-sm px-3 py-1.5 rounded-md border hover:bg-muted transition-colors"
            >
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* Log list */}
      {Object.keys(grouped).length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
            <Clock className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold">No time logs found</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-xs">
            {hasFilters
              ? 'No entries match your current filters.'
              : 'Start a timer on any task or use "Log Time" to add entries.'}
          </p>
        </div>
      ) : (
        <TimeLogTable grouped={grouped} />
      )}
    </div>
  )
}
