import { createClient } from '@/lib/supabase/server'
import { getFiles } from '@/lib/files/queries'
import { FileGrid } from '@/components/app/files/file-grid'
import { UploadDialog } from '@/components/app/files/upload-dialog'

export const metadata = { title: 'Files — GemLancer' }

export default async function ProjectFilesPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const tenantId = user?.app_metadata?.tenant_id as string

  const { id } = await params

  // Minimal project list for upload dialog (just this project)
  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  const files = await getFiles(tenantId, { projectId: id })

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Files</h2>
        {project && (
          <UploadDialog
            projects={[project]}
            defaultProjectId={id}
          />
        )}
      </div>

      <FileGrid files={files} />
    </div>
  )
}
