import { createClient } from '@/lib/supabase/server'
import { getMessages, markMessagesRead } from '@/lib/messages/queries'
import { MessageThread } from '@/components/app/messages/message-thread'

export const metadata = { title: 'Messages — GemLancer' }

export default async function ProjectMessagesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const tenantId = user?.app_metadata?.tenant_id as string

  const { id: projectId } = await params

  const { data: project } = await supabase
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .eq('tenant_id', tenantId)
    .single()

  const messages = await getMessages(tenantId, projectId)

  if (user) {
    await markMessagesRead(tenantId, projectId, user.id)
  }

  const currentUser = {
    id: user?.id ?? '',
    full_name: user?.user_metadata?.full_name ?? user?.email ?? 'You',
    avatar_url: user?.user_metadata?.avatar_url ?? null,
    role: user?.app_metadata?.role ?? 'member',
  }

  return (
    <div className="h-[calc(100vh-8rem)] overflow-hidden">
      <MessageThread
        projectId={projectId}
        projectName={project?.name ?? 'Project'}
        initialMessages={messages}
        currentUser={currentUser}
      />
    </div>
  )
}
