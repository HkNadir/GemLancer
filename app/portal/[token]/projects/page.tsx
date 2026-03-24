import { notFound } from 'next/navigation'
import Link from 'next/link'
import { validatePortalToken, getPortalProjects } from '@/lib/portal/queries'

export default async function PortalProjectsPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const session = await validatePortalToken(token)
  if (!session) notFound()

  const projects = await getPortalProjects(session.tenantId, session.clientId)

  const statusLabel: Record<string, { label: string; class: string }> = {
    draft: { label: 'Draft', class: 'bg-muted text-muted-foreground' },
    active: { label: 'Active', class: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' },
    on_hold: { label: 'On Hold', class: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' },
    completed: { label: 'Completed', class: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' },
    cancelled: { label: 'Cancelled', class: 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400' },
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 py-16 text-center">
          <p className="text-sm font-medium">No projects yet</p>
          <p className="text-xs text-muted-foreground mt-1">Projects will appear here once created.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p: any) => {
            const badge = statusLabel[p.status] ?? statusLabel.draft
            return (
              <Link
                key={p.id}
                href={`/portal/${token}/projects/${p.id}`}
                className="flex items-start justify-between rounded-xl border p-5 hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-semibold">{p.name}</p>
                  {p.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Started {new Date(p.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <span className={`flex-shrink-0 ml-4 text-xs rounded-full px-2.5 py-1 font-medium ${badge.class}`}>
                  {badge.label}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
