import { NextRequest, NextResponse } from 'next/server'
import { validatePortalToken, sendPortalMessage } from '@/lib/portal/queries'

/**
 * POST /api/portal/messages
 *
 * Allows client portal users to send messages.
 * Uses portal_token from request body for auth (no Supabase session).
 */
export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { project_id, sender_id, content, portal_token } = body

  if (!portal_token || !project_id || !sender_id || !content?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Validate the portal token
  const session = await validatePortalToken(portal_token)
  if (!session || session.userId !== sender_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await sendPortalMessage(session.tenantId, project_id, sender_id, content)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: crypto.randomUUID() })
}
