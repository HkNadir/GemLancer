import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { TeamTable } from '@/components/app/settings/team-table'
import { InviteDialog } from '@/components/app/settings/invite-dialog'

export const metadata = { title: 'Team — GemLancer' }

export default async function TeamSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const tenantId = user?.app_metadata?.tenant_id as string
  const callerRole = user?.app_metadata?.role as string

  const [{ data: members }, { data: tenant }] = await Promise.all([
    supabase
      .from('users')
      .select('id, full_name, email, role, avatar_url, is_active, created_at')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .not('role', 'eq', 'client')
      .order('created_at'),
    supabase
      .from('tenants')
      .select('max_users, plan')
      .eq('id', tenantId)
      .single(),
  ])

  const canInvite = ['owner', 'admin'].includes(callerRole)
  const atLimit = (members?.length ?? 0) >= (tenant?.max_users ?? 1)

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl">
      <Link href="/settings" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft className="h-4 w-4" />Settings
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {members?.length ?? 0} / {tenant?.max_users ?? 1} members
          </p>
        </div>
        {canInvite && <InviteDialog disabled={atLimit} />}
      </div>

      {atLimit && (
        <div className="rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950 p-3 text-sm text-yellow-800 dark:text-yellow-200">
          Member limit reached.{' '}
          <Link href="/settings/billing" className="underline font-medium">
            Upgrade your plan
          </Link>{' '}
          to invite more.
        </div>
      )}

      <TeamTable
        members={members ?? []}
        currentUserId={user?.id ?? ''}
        callerRole={callerRole}
      />
    </div>
  )
}
