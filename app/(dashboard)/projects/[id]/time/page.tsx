import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTimeLogsForProject } from '@/lib/projects/queries'

export const metadata = { title: 'Time — GemLancer' }

export default async function ProjectTimePage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const tenantId = user?.app_metadata?.tenant_id as string

  const { id } = await params
  const logs = await getTimeLogsForProject(tenantId, id)

  const totalMinutes = logs.reduce((s, l) => s + l.duration_minutes, 0)
  const totalH = (totalMinutes / 60).toFixed(1)
  const billableH = (logs.filter((l) => l.billable).reduce((s, l) => s + l.duration_minutes, 0) / 60).toFixed(1)

  return (
    <div className="p-6 space-y-4">
      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Total logged', value: `${totalH}h` },
          { label: 'Billable', value: `${billableH}h` },
          { label: 'Entries', value: String(logs.length) },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-semibold mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Log table */}
      <div className="rounded-xl border overflow-hidden">
        {logs.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-medium">No time logged yet</p>
            <p className="text-xs text-muted-foreground mt-1">Start the timer from a task to begin tracking.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Task</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Team Member</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Date</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Duration</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Billable</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((l: any) => (
                <tr key={l.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium">{l.task?.title ?? '—'}</p>
                    {l.description && <p className="text-xs text-muted-foreground">{l.description}</p>}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                    {l.user?.full_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">
                    {new Date(l.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {(l.duration_minutes / 60).toFixed(1)}h
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    {l.billable
                      ? <span className="text-xs text-green-600 font-medium">Yes</span>
                      : <span className="text-xs text-muted-foreground">No</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
