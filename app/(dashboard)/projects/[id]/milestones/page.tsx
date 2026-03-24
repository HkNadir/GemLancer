import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMilestonesForProject } from '@/lib/projects/queries'
import { MilestonesTab } from '@/components/app/projects/milestones-tab'

export const metadata = { title: 'Milestones — GemLancer' }

export default async function MilestonesPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const tenantId = user?.app_metadata?.tenant_id as string

  const { id } = await params
  const milestones = await getMilestonesForProject(tenantId, id)

  return <MilestonesTab projectId={id} milestones={milestones as any} />
}
