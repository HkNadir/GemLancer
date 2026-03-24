import { createClient } from '@/lib/supabase/server'
import { getConversations, getMessages, markMessagesRead } from '@/lib/messages/queries'
import { ConversationList } from '@/components/app/messages/conversation-list'
import { MessageThread } from '@/components/app/messages/message-thread'
import { MessageSquare } from 'lucide-react'

export const metadata = { title: 'Messages — GemLancer' }

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const tenantId = user?.app_metadata?.tenant_id as string

  const { project: projectId } = await searchParams

  const [conversations, messages] = await Promise.all([
    getConversations(tenantId),
    projectId ? getMessages(tenantId, projectId) : Promise.resolve([]),
  ])

  // Fetch active project name
  let projectName = ''
  if (projectId) {
    const { data } = await supabase
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .eq('tenant_id', tenantId)
      .single()
    projectName = data?.name ?? 'Unknown Project'

    // Mark as read
    if (user) await markMessagesRead(tenantId, projectId, user.id)
  }

  // Build current user object for thread
  const currentUser = {
    id: user?.id ?? '',
    full_name: user?.user_metadata?.full_name ?? user?.email ?? 'You',
    avatar_url: user?.user_metadata?.avatar_url ?? null,
    role: user?.app_metadata?.role ?? 'member',
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar: conversation list */}
      <div className="w-72 flex-shrink-0 border-r flex flex-col overflow-y-auto">
        <div className="px-4 py-3 border-b">
          <h1 className="text-base font-semibold">Messages</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Project conversations</p>
        </div>
        <ConversationList
          conversations={conversations}
          activeProjectId={projectId}
        />
      </div>

      {/* Main: thread or empty state */}
      <div className="flex-1 overflow-hidden">
        {projectId ? (
          <MessageThread
            projectId={projectId}
            projectName={projectName}
            initialMessages={messages}
            currentUser={currentUser}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="h-16 w-16 flex items-center justify-center rounded-full bg-muted mb-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-base font-semibold">Select a conversation</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              {conversations.length > 0
                ? 'Choose a project conversation from the sidebar.'
                : 'Conversations start automatically when you send a message from within a project.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
