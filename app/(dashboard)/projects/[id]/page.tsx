import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProjectById } from '@/lib/projects/queries'
import { OverviewTab } from '@/components/app/projects/overview-tab'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return { title: 'Project Overview — GemLancer' }
}

export default async function ProjectOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const tenantId = user?.app_metadata?.tenant_id as string

  const { id } = await params
  const project = await getProjectById(tenantId, id)
  if (!project) notFound()

  return <OverviewTab project={project} />
}
