import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveTenantId } from '@/lib/supabase/auth-context'
import { getTaskById } from '@/lib/projects/queries'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tenantId = await resolveTenantId(supabase, user.id, user.app_metadata?.tenant_id)
  if (!tenantId) return NextResponse.json({ error: 'No tenant context' }, { status: 403 })
  const { id } = await params
  const task = await getTaskById(tenantId, id)
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(task)
}
