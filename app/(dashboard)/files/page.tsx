import { createClient } from '@/lib/supabase/server'
import { getFiles, getStorageUsageBytes, getProjectsForFiles } from '@/lib/files/queries'
import { planLimits } from '@/lib/config'
import { FileGrid } from '@/components/app/files/file-grid'
import { UploadDialog } from '@/components/app/files/upload-dialog'
import { StorageQuota } from '@/components/app/files/storage-quota'

export const metadata = { title: 'Files — GemLancer' }

export default async function FilesPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; q?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const tenantId = user?.app_metadata?.tenant_id as string

  const { project: projectFilter, q: search } = await searchParams

  const { data: tenantRow } = await supabase
    .from('tenants')
    .select('plan, storage_limit_gb')
    .eq('id', tenantId)
    .single()

  const [files, projects, usedBytes] = await Promise.all([
    getFiles(tenantId, { projectId: projectFilter, search }),
    getProjectsForFiles(tenantId),
    getStorageUsageBytes(tenantId),
  ])

  const plan = (tenantRow?.plan ?? 'starter') as keyof typeof planLimits
  const limitGb = tenantRow?.storage_limit_gb ?? planLimits[plan].storageGb

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Files</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Securely store and share project files with your clients.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <StorageQuota usedBytes={usedBytes} limitGb={limitGb} />
          <UploadDialog projects={projects} defaultProjectId={projectFilter} />
        </div>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap items-center gap-3">
        <input
          name="q"
          defaultValue={search}
          placeholder="Search files…"
          className="rounded-md border bg-background px-3 py-1.5 text-sm w-48"
        />
        {projects.length > 0 && (
          <select
            name="project"
            defaultValue={projectFilter ?? ''}
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
        <button
          type="submit"
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
        >
          Filter
        </button>
        {(projectFilter || search) && (
          <a
            href="/files"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </a>
        )}
      </form>

      {/* File count */}
      {files.length > 0 && (
        <p className="text-sm text-muted-foreground -mt-2">
          {files.length} {files.length === 1 ? 'file' : 'files'}
        </p>
      )}

      {/* Grid */}
      <FileGrid files={files} />
    </div>
  )
}
