import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProjectById } from '@/lib/projects/queries'
import { ProjectForm } from '@/components/app/projects/project-form'

export const metadata = { title: 'Edit Project — GemLancer' }

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const tenantId = user?.app_metadata?.tenant_id as string

  const { id } = await params
  const project = await getProjectById(tenantId, id)
  if (!project) notFound()

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Project</h1>
        <p className="text-sm text-muted-foreground mt-1">{project.name}</p>
      </div>
      <ProjectForm project={project} clients={[project.client as any]} />
    </div>
  )
}
