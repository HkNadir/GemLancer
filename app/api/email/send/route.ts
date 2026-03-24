import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/client'
import { renderInvoiceSentEmail } from '@/lib/email/templates/invoice-sent'
import { renderInvoicePaidEmail } from '@/lib/email/templates/invoice-paid'
import { renderInvoiceOverdueEmail } from '@/lib/email/templates/invoice-overdue'
import { renderClientPortalInviteEmail } from '@/lib/email/templates/client-portal-invite'
import { renderTeamInviteEmail } from '@/lib/email/templates/team-invite'

/**
 * POST /api/email/send
 *
 * Internal API for sending templated emails. Requires a shared secret header.
 * Called from server actions (not from client code).
 *
 * Body: { type: string, ...templateProps }
 */
export async function POST(req: NextRequest) {
  // Validate internal secret
  const secret = req.headers.get('x-internal-secret')
  if (process.env.INTERNAL_API_SECRET && secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { type, to, ...props } = body

  if (!type || !to) {
    return NextResponse.json({ error: 'Missing type or to' }, { status: 400 })
  }

  let html: string
  let subject: string

  switch (type) {
    case 'invoice_sent':
      html = renderInvoiceSentEmail(props)
      subject = `Invoice ${props.invoiceNumber} from ${props.senderName}`
      break

    case 'invoice_paid':
      html = renderInvoicePaidEmail(props)
      subject = `Payment received for invoice ${props.invoiceNumber}`
      break

    case 'invoice_overdue':
      html = renderInvoiceOverdueEmail(props)
      subject = `Overdue: Invoice ${props.invoiceNumber}`
      break

    case 'client_portal_invite':
      html = renderClientPortalInviteEmail(props)
      subject = `You've been invited to the ${props.senderName} client portal`
      break

    case 'team_invite':
      html = renderTeamInviteEmail(props)
      subject = `You've been invited to join ${props.workspaceName} on GemLancer`
      break

    default:
      return NextResponse.json({ error: `Unknown email type: ${type}` }, { status: 400 })
  }

  const result = await sendEmail({ to, subject, html })
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
