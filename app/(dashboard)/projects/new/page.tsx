import { createClient } from '@/lib/supabase/server'
import { getClientsForSelect, getProjectTemplates } from '@/lib/projects/queries'
import { ProjectForm } from '@/components/app/projects/project-form'

export const metadata = { title: 'New Project — GemLancer' }

export default async function NewProjectPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const tenantId = user?.app_metadata?.tenant_id as string

  const [clients, templates] = await Promise.all([
    getClientsForSelect(tenantId),
    getProjectTemplates(tenantId),
  ])

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Project</h1>
        <p className="text-sm text-muted-foreground mt-1">Set up a new project for a client.</p>
      </div>
      <ProjectForm clients={clients} templates={templates} />
    </div>
  )
}
