import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveTenantId } from '@/lib/supabase/auth-context'

/**
 * GET /api/time/export
 * Query params: project, billable, from, to (same as time page filters)
 * Returns: CSV file download
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = await resolveTenantId(supabase, user.id, user.app_metadata?.tenant_id)
  if (!tenantId) {
    return NextResponse.json({ error: 'No tenant context' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const projectFilter = searchParams.get('project')
  const billableFilter = searchParams.get('billable')
  const fromFilter = searchParams.get('from')
  const toFilter = searchParams.get('to')

  let query = supabase
    .from('time_logs')
    .select(
      `
      id,
      started_at,
      ended_at,
      duration_minutes,
      description,
      billable,
      user:users ( full_name, email ),
      task:tasks!inner ( title, project_id,
        project:projects ( name )
      )
    `
    )
    .eq('tenant_id', tenantId)
    .order('started_at', { ascending: false })
    .limit(10_000) // reasonable export cap

  if (projectFilter) {
    query = query.eq('task.project_id', projectFilter) as any
  }
  if (billableFilter === 'true') {
    query = query.eq('billable', true) as any
  }
  if (billableFilter === 'false') {
    query = query.eq('billable', false) as any
  }
  if (fromFilter) {
    query = query.gte('started_at', fromFilter) as any
  }
  if (toFilter) {
    query = query.lte('started_at', `${toFilter}T23:59:59`) as any
  }

  const { data: logs, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Build CSV
  const headers = [
    'Date',
    'Start',
    'End',
    'Duration (minutes)',
    'Duration (hours)',
    'Project',
    'Task',
    'Description',
    'Billable',
    'Team Member',
  ]

  function escapeCSV(value: string | null | undefined): string {
    if (value == null) return ''
    const str = String(value)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const rows = (logs ?? []).map((log: any) => {
    const start = new Date(log.started_at)
    const end = new Date(log.ended_at)
    return [
      start.toLocaleDateString('en-US'),
      start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      log.duration_minutes,
      (log.duration_minutes / 60).toFixed(2),
      log.task?.project?.name ?? '',
      log.task?.title ?? '',
      log.description ?? '',
      log.billable ? 'Yes' : 'No',
      log.user?.full_name ?? '',
    ]
      .map(escapeCSV)
      .join(',')
  })

  const csv = [headers.join(','), ...rows].join('\n')
  const filename = `time-logs-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
