import Link from 'next/link'
import { Plus, LayoutGrid, List } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getProjects, type ProjectFilter } from '@/lib/projects/queries'
import { ProjectCard } from '@/components/app/projects/project-card'

export const metadata = { title: 'Projects — GemLancer' }

const FILTERS: { value: ProjectFilter; label: string }[] = [
  { value: 'all',       label: 'All'       },
  { value: 'active',    label: 'Active'    },
  { value: 'on_hold',   label: 'On Hold'   },
  { value: 'overdue',   label: 'Overdue'   },
  { value: 'completed', label: 'Completed' },
  { value: 'draft',     label: 'Draft'     },
]

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; view?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const tenantId = user?.app_metadata?.tenant_id as string

  const { filter: filterParam, view: viewParam } = await searchParams
  const filter = (filterParam ?? 'all') as ProjectFilter
  const view = viewParam === 'list' ? 'list' : 'grid'

  const projects = await getProjects(tenantId, filter)

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/projects/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" />New Project
        </Link>
      </div>

      {/* Filters + View toggle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/30 overflow-x-auto">
          {FILTERS.map((f) => (
            <Link key={f.value}
              href={`/projects?filter=${f.value}&view=${view}`}
              className={`px-3 py-1 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                filter === f.value ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >{f.label}</Link>
          ))}
        </div>
        <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/30">
          <Link href={`/projects?filter=${filter}&view=grid`}
            className={`p-1.5 rounded-md transition-colors ${view === 'grid' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            <LayoutGrid className="h-4 w-4" />
          </Link>
          <Link href={`/projects?filter=${filter}&view=list`}
            className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            <List className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Empty state */}
      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-20 text-center">
          <h3 className="text-base font-semibold">No projects found</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-xs">
            {filter === 'all' ? 'Create your first project to start tracking work.' : `No ${filter} projects.`}
          </p>
          {filter === 'all' && (
            <Link href="/projects/new"
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors">
              <Plus className="h-4 w-4" />Create first project
            </Link>
          )}
        </div>
      ) : view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Project</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Client</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Status</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Due</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/projects/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        p.health === 'on_track' ? 'bg-green-500' : p.health === 'at_risk' ? 'bg-amber-500' : 'bg-red-500'
                      }`} />
                      <span className="text-xs text-muted-foreground capitalize">{p.health.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{p.client.name}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="capitalize text-xs">{p.status.replace('_', ' ')}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-right text-muted-foreground text-xs">
                    {p.end_date ? new Date(p.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden hidden sm:block">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${p.progress}%` }} />
                      </div>
                      <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">{p.progress}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
