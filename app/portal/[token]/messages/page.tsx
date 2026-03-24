import { notFound } from 'next/navigation'
import { validatePortalToken, getPortalProjects, getPortalMessages, getPortalTenant } from '@/lib/portal/queries'
import { MessagesClient } from './messages-client'

export default async function PortalMessagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ project?: string }>
}) {
  const { token } = await params
  const { project: projectId } = await searchParams

  const session = await validatePortalToken(token)
  if (!session) notFound()

  const [projects, tenant] = await Promise.all([
    getPortalProjects(session.tenantId, session.clientId),
    getPortalTenant(session.tenantId),
  ])

  const activeProjectId = projectId ?? (projects[0] as any)?.id ?? null

  const messages = activeProjectId
    ? await getPortalMessages(session.tenantId, activeProjectId)
    : []

  const activeProject = projects.find((p: any) => p.id === activeProjectId)

  if (!activeProjectId || !activeProject) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
        <div className="rounded-xl border border-dashed bg-muted/20 py-16 text-center">
          <p className="text-sm font-medium">No projects to message about</p>
          <p className="text-xs text-muted-foreground mt-1">
            Messages are linked to projects. You&apos;ll see a conversation here once your project is active.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>

        {/* Project switcher */}
        {projects.length > 1 && (
          <form>
            <input type="hidden" name="token" value={token} />
            <select
              name="project"
              defaultValue={activeProjectId}
              className="rounded-md border bg-background px-3 py-1.5 text-sm"
              onChange={(e) => {
                window.location.href = `/portal/${token}/messages?project=${e.target.value}`
              }}
            >
              {projects.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </form>
        )}
      </div>

      <p className="text-sm text-muted-foreground -mt-2">
        Conversation about: <strong>{(activeProject as any).name}</strong>
      </p>

      <MessagesClient
        projectId={activeProjectId}
        senderId={session.userId}
        portalToken={token}
        initialMessages={messages as any}
        providerName={tenant?.name ?? 'Your provider'}
      />
    </div>
  )
}
