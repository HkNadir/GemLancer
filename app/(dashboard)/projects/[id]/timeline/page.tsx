import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProjectById } from '@/lib/projects/queries'
import { GanttChart } from '@/components/app/projects/gantt-chart'

export const metadata = { title: 'Timeline — GemLancer' }

export default async function TimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const tenantId = user?.app_metadata?.tenant_id as string

  const { id } = await params
  const project = await getProjectById(tenantId, id)
  if (!project) notFound()

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-sm font-semibold">Timeline</h2>
      {project.milestones.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 py-16 text-center">
          <p className="text-sm font-medium">No milestones to display</p>
          <p className="text-xs text-muted-foreground mt-1">Add milestones with due dates to see the Gantt view.</p>
        </div>
      ) : (
        <GanttChart
          milestones={project.milestones}
          projectStart={project.start_date}
          projectEnd={project.end_date}
        />
      )}
    </div>
  )
}
