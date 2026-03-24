import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProjectById } from '@/lib/projects/queries'
import { ChevronRight } from 'lucide-react'
import { ProjectTabNav } from '@/components/app/projects/project-tab-nav'

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const tenantId = user?.app_metadata?.tenant_id as string

  const { id } = await params
  const project = await getProjectById(tenantId, id)
  if (!project) notFound()

  const STATUS_COLOR: Record<string, string> = {
    draft:     'text-gray-500 bg-gray-100 dark:bg-gray-800',
    active:    'text-green-700 bg-green-100 dark:bg-green-900/30',
    on_hold:   'text-amber-700 bg-amber-100 dark:bg-amber-900/30',
    completed: 'text-blue-700 bg-blue-100 dark:bg-blue-900/30',
    cancelled: 'text-red-700 bg-red-100 dark:bg-red-900/30',
  }

  return (
    <div className="flex flex-col min-h-0">
      {/* Project header */}
      <div className="border-b bg-background px-6 pt-5 pb-0">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
          <Link href="/projects" className="hover:text-foreground">Projects</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium truncate max-w-[200px]">{project.name}</span>
        </nav>

        <div className="flex items-start justify-between gap-4 pb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold tracking-tight truncate">{project.name}</h1>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLOR[project.status] ?? ''}`}>
                {project.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{project.client.name}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href={`/projects/${params.id}/edit`}
              className="text-sm px-3 py-1.5 rounded-md border hover:bg-muted transition-colors">
              Edit
            </Link>
          </div>
        </div>

        {/* Tab nav */}
        <ProjectTabNav projectId={params.id} />
      </div>

      {/* Page content */}
      <div className="flex-1">{children}</div>
    </div>
  )
}
