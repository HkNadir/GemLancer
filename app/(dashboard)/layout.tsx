import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/app/dashboard-shell'
import type { BadgeCounts } from '@/components/app/sidebar'
import type { User } from '@/types/database'

const DEV_BYPASS = process.env.NODE_ENV === 'development'

const DEV_PROFILE: Pick<User, 'id' | 'tenant_id' | 'full_name' | 'email' | 'role' | 'avatar_url'> = {
  id: '00000000-0000-0000-0000-000000000001',
  tenant_id: '00000000-0000-0000-0000-000000000000',
  full_name: 'Dev User',
  email: 'dev@gemlancer.test',
  role: 'owner',
  avatar_url: null,
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (DEV_BYPASS) {
    const badgeCounts: BadgeCounts = { overdueTasks: 2, unpaidInvoices: 3 }
    return (
      <DashboardShell profile={DEV_PROFILE} badgeCounts={badgeCounts} initialUnreadCount={1}>
        {children}
      </DashboardShell>
    )
  }

  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  const tenantId = authUser.app_metadata?.tenant_id as string | undefined

  if (!tenantId) {
    redirect('/onboarding')
  }

  const today = new Date().toISOString().split('T')[0]

  const [profileResult, overdueResult, unpaidResult, unreadResult] = await Promise.all([
    supabase
      .from('users')
      .select('id, tenant_id, full_name, email, role, avatar_url, totp_enabled')
      .eq('id', authUser.id)
      .eq('tenant_id', tenantId)
      .single(),

    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .lte('due_date', today)
      .not('status', 'in', '("done","cancelled")'),

    supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['sent', 'overdue']),

    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('user_id', authUser.id)
      .is('read_at', null),
  ])

  if (profileResult.error || !profileResult.data) {
    redirect('/onboarding')
  }

  const profile = profileResult.data as Pick<
    User,
    'id' | 'tenant_id' | 'full_name' | 'email' | 'role' | 'avatar_url'
  >

  const badgeCounts: BadgeCounts = {
    overdueTasks:   overdueResult.count ?? 0,
    unpaidInvoices: unpaidResult.count ?? 0,
  }

  const initialUnreadCount = unreadResult.count ?? 0

  return (
    <DashboardShell
      profile={profile}
      badgeCounts={badgeCounts}
      initialUnreadCount={initialUnreadCount}
    >
      {children}
    </DashboardShell>
  )
}
