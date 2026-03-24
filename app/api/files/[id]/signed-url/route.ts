import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveTenantId } from '@/lib/supabase/auth-context'

/**
 * GET /api/files/[id]/signed-url
 *
 * Returns a fresh 1-hour signed URL for the file.
 * Used when a client-side component needs to re-fetch a download link.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tenantId = await resolveTenantId(supabase, user.id, user.app_metadata?.tenant_id)
  if (!tenantId) return NextResponse.json({ error: 'No tenant context' }, { status: 403 })

  const { id } = await params

  const { data: file, error } = await supabase
    .from('files')
    .select('bucket_path')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .single()

  if (error || !file) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: signed, error: signError } = await supabase.storage
    .from('files')
    .createSignedUrl(file.bucket_path, 3600)

  if (signError || !signed) {
    return NextResponse.json({ error: 'Could not generate signed URL' }, { status: 500 })
  }

  return NextResponse.json({ url: signed.signedUrl })
}
