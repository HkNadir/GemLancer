import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { WorkspaceForm } from './workspace-form'

export const metadata = { title: 'Workspace Settings — GemLancer' }

export default async function WorkspaceSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const tenantId = user?.app_metadata?.tenant_id as string

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, logo_url, primary_color, custom_domain, plan')
    .eq('id', tenantId)
    .single()

  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl">
      <Link href="/settings" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft className="h-4 w-4" />Settings
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Workspace</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Brand colors, logo, and workspace identity.
        </p>
      </div>

      <WorkspaceForm
        name={tenant?.name ?? ''}
        logoUrl={tenant?.logo_url ?? null}
        primaryColor={tenant?.primary_color ?? '#6366f1'}
        customDomain={tenant?.custom_domain ?? ''}
        plan={(tenant?.plan ?? 'starter') as 'starter' | 'pro' | 'agency'}
      />
    </div>
  )
}
