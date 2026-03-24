import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * POST /api/webhooks/message
 *
 * Triggered by Supabase Database Webhooks on INSERT to the messages table.
 * Use this to send email/push notifications when a new message arrives.
 *
 * Configure the webhook in Supabase Dashboard:
 *   Table: messages | Event: INSERT | URL: <your-app>/api/webhooks/message
 *   Header: x-webhook-secret: <WEBHOOK_SECRET env var>
 */
export async function POST(req: NextRequest) {
  // Validate shared secret
  const secret = req.headers.get('x-webhook-secret')
  const expected = process.env.SUPABASE_WEBHOOK_SECRET
  if (expected && secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: any
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const record = payload?.record
  if (!record) return NextResponse.json({ ok: true })

  // Only process messages from clients (freelancer → client notifications handled elsewhere)
  if (record.sender_type !== 'client') {
    return NextResponse.json({ ok: true })
  }

  try {
    const supabase = await createAdminClient()

    // Fetch project details + tenant owner to notify
    const [{ data: project }, { data: tenantUsers }] = await Promise.all([
      supabase
        .from('projects')
        .select('name, tenant_id')
        .eq('id', record.project_id)
        .single(),
      supabase
        .from('users')
        .select('id, email, full_name')
        .eq('tenant_id', record.tenant_id)
        .in('role', ['owner', 'admin'])
        .eq('is_active', true),
    ])

    if (!project || !tenantUsers?.length) {
      return NextResponse.json({ ok: true })
    }

    // Insert in-app notifications for internal users
    const notifications = tenantUsers.map((u: any) => ({
      tenant_id: record.tenant_id,
      user_id: u.id,
      type: 'message_received',
      title: `New message in "${project.name}"`,
      body: record.content?.slice(0, 100) ?? '',
      link: `/messages?project=${record.project_id}`,
      read: false,
    }))

    await supabase.from('notifications').insert(notifications)

    // TODO: send email via Resend when email templates are built (Task 13)
  } catch (err) {
    console.error('message webhook error:', err)
  }

  return NextResponse.json({ ok: true })
}
