import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveTenantId } from '@/lib/supabase/auth-context'
import { getStripe } from '@/lib/stripe/client'
import { appConfig } from '@/lib/config'

/**
 * POST /api/billing/portal
 *
 * Creates a Stripe Customer Portal session for managing subscriptions/invoices.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tenantId = await resolveTenantId(supabase, user.id, user.app_metadata?.tenant_id)
  if (!tenantId) return NextResponse.json({ error: 'No tenant context' }, { status: 403 })

  const { data: tenantRow } = await supabase
    .from('tenants')
    .select('stripe_customer_id')
    .eq('id', tenantId)
    .single()

  if (!tenantRow?.stripe_customer_id) {
    return NextResponse.json({ error: 'No billing account found. Start a subscription first.' }, { status: 400 })
  }

  const stripe = getStripe()
  const session = await stripe.billingPortal.sessions.create({
    customer: tenantRow.stripe_customer_id,
    return_url: `${appConfig.url}/settings/billing`,
  })

  return NextResponse.json({ url: session.url })
}
