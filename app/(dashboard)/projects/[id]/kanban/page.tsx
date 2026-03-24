import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getKanbanBoard, getTeamMembers } from '@/lib/projects/queries'
import { KanbanBoardClient } from '@/components/app/projects/kanban-board'

export const metadata = { title: 'Board — GemLancer' }

export default async function KanbanPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const tenantId = user?.app_metadata?.tenant_id as string

  const { id } = await params
  const [board, teamMembers] = await Promise.all([
    getKanbanBoard(tenantId, id),
    getTeamMembers(tenantId),
  ])

  return (
    <div className="h-[calc(100vh-140px)] overflow-hidden">
      <KanbanBoardClient
        projectId={id}
        initialBoard={board}
        teamMembers={teamMembers}
      />
    </div>
  )
}
