import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, CheckCircle2, Circle, XCircle, Clock } from 'lucide-react'
import { validatePortalToken, getPortalProject } from '@/lib/portal/queries'

export default async function PortalProjectDetailPage({
  params,
}: {
  params: Promise<{ token: string; id: string }>
}) {
  const { token, id: projectId } = await params
  const session = await validatePortalToken(token)
  if (!session) notFound()

  const project = await getPortalProject(session.tenantId, session.clientId, projectId)
  if (!project) notFound()

  const milestoneIcon = {
    pending: <Circle className="h-4 w-4 text-muted-foreground" />,
    submitted: <Clock className="h-4 w-4 text-yellow-500" />,
    approved: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    rejected: <XCircle className="h-4 w-4 text-red-500" />,
  } as Record<string, React.ReactNode>

  const milestoneLabel = {
    pending: 'Pending',
    submitted: 'Submitted for review',
    approved: 'Approved',
    rejected: 'Changes requested',
  } as Record<string, string>

  const milestones = (project as any).milestones ?? []
  const completedCount = milestones.filter((m: any) => m.status === 'approved').length

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/portal/${token}/projects`} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Projects
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{(project as any).name}</h1>
        {(project as any).description && (
          <p className="text-sm text-muted-foreground mt-2">{(project as any).description}</p>
        )}
      </div>

      {/* Progress */}
      {milestones.length > 0 && (
        <div className="rounded-xl border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Milestones</h2>
            <span className="text-xs text-muted-foreground">
              {completedCount} / {milestones.length} complete
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${milestones.length > 0 ? (completedCount / milestones.length) * 100 : 0}%` }}
            />
          </div>

          <div className="space-y-3">
            {milestones.map((m: any) => (
              <div key={m.id} className="flex items-start gap-3">
                <div className="mt-0.5">{milestoneIcon[m.status] ?? milestoneIcon.pending}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{m.title}</p>
                  <p className="text-xs text-muted-foreground">{milestoneLabel[m.status] ?? m.status}</p>
                </div>
                {m.due_date && (
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {new Date(m.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href={`/portal/${token}/invoices`}
          className="rounded-xl border p-4 hover:bg-muted/50 transition-colors text-sm font-medium"
        >
          View Invoices →
        </Link>
        <Link
          href={`/portal/${token}/messages`}
          className="rounded-xl border p-4 hover:bg-muted/50 transition-colors text-sm font-medium"
        >
          Send a Message →
        </Link>
      </div>
    </div>
  )
}
