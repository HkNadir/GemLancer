import { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getRevenueChart,
  getProjectsStats,
  getTodaysTasks,
  getHoursStats,
  getCashFlowForecast,
  getSmartAlerts,
} from '@/lib/dashboard/queries'

// Widgets
import { RevenueChart, RevenueChartSkeleton } from '@/components/app/dashboard/revenue-chart'
import { ActiveProjectsWidget, ActiveProjectsWidgetSkeleton } from '@/components/app/dashboard/active-projects-widget'
import { TasksPreview, TasksPreviewSkeleton } from '@/components/app/dashboard/tasks-preview'
import { HoursWidget, HoursWidgetSkeleton } from '@/components/app/dashboard/hours-widget'
import { CashFlowWidget, CashFlowWidgetSkeleton } from '@/components/app/dashboard/cash-flow-widget'
import { SmartAlertsWidget, SmartAlertsWidgetSkeleton } from '@/components/app/dashboard/smart-alerts-widget'
import { QuickActions } from '@/components/app/dashboard/quick-actions'

export const metadata: Metadata = {
  title: 'Dashboard — GemLancer',
}

const DEV_BYPASS = process.env.NODE_ENV === 'development'
const DEV_TENANT_ID = '00000000-0000-0000-0000-000000000000'
const DEV_USER_ID = '00000000-0000-0000-0000-000000000001'

// ── Individual async widgets (each suspends independently) ────

async function RevenueSection({ tenantId }: { tenantId: string }) {
  const data = await getRevenueChart(tenantId)
  return <RevenueChart data={data} />
}

async function ProjectsSection({ tenantId }: { tenantId: string }) {
  const stats = await getProjectsStats(tenantId)
  return <ActiveProjectsWidget stats={stats} />
}

async function TasksSection({ tenantId }: { tenantId: string }) {
  const tasks = await getTodaysTasks(tenantId)
  return <TasksPreview tasks={tasks} />
}

async function HoursSection({ tenantId, userId }: { tenantId: string; userId: string }) {
  const stats = await getHoursStats(tenantId, userId)
  return <HoursWidget stats={stats} />
}

async function CashFlowSection({ tenantId }: { tenantId: string }) {
  const items = await getCashFlowForecast(tenantId)
  return <CashFlowWidget items={items} />
}

async function AlertsSection({ tenantId }: { tenantId: string }) {
  const alerts = await getSmartAlerts(tenantId)
  return <SmartAlertsWidget alerts={alerts} />
}

// ── Page ──────────────────────────────────────────────────────

export default async function DashboardPage() {
  let tenantId: string
  let userId: string
  let firstName: string

  if (DEV_BYPASS) {
    tenantId = DEV_TENANT_ID
    userId = DEV_USER_ID
    firstName = 'Dev'
  } else {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const tid = user.app_metadata?.tenant_id as string | undefined
    if (!tid) redirect('/onboarding')

    tenantId = tid
    userId = user.id

    const { data: profile } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .eq('tenant_id', tenantId)
      .single()

    firstName = profile?.full_name?.split(' ')[0] ?? 'there'
  }

  const greeting = getGreeting()

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {greeting}, {firstName} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-6">

        {/* Revenue chart — spans 4 cols on large */}
        <Suspense fallback={<RevenueChartSkeleton />}>
          <RevenueSection tenantId={tenantId} />
        </Suspense>

        {/* Quick actions — right column stack */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <QuickActions />

          <Suspense fallback={<HoursWidgetSkeleton />}>
            <HoursSection tenantId={tenantId} userId={userId} />
          </Suspense>
        </div>

        {/* Projects ring widget */}
        <div className="lg:col-span-2">
          <Suspense fallback={<ActiveProjectsWidgetSkeleton />}>
            <ProjectsSection tenantId={tenantId} />
          </Suspense>
        </div>

        {/* Today's tasks */}
        <Suspense fallback={<TasksPreviewSkeleton />}>
          <TasksSection tenantId={tenantId} />
        </Suspense>

        {/* Cash flow forecast */}
        <Suspense fallback={<CashFlowWidgetSkeleton />}>
          <CashFlowSection tenantId={tenantId} />
        </Suspense>

        {/* Smart alerts */}
        <Suspense fallback={<SmartAlertsWidgetSkeleton />}>
          <AlertsSection tenantId={tenantId} />
        </Suspense>
      </div>
    </div>
  )
}

// ── Helper ────────────────────────────────────────────────────
function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
