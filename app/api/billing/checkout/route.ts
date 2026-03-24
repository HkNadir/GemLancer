import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveTenantId } from '@/lib/supabase/auth-context'
import { getStripe } from '@/lib/stripe/client'
import { stripeConfig, appConfig } from '@/lib/config'

/**
 * POST /api/billing/checkout
 * Body: { plan: 'starter' | 'pro' | 'agency' }
 *
 * Creates a Stripe Checkout session for subscription upgrade.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tenantId = await resolveTenantId(supabase, user.id, user.app_metadata?.tenant_id)
  if (!tenantId) return NextResponse.json({ error: 'No tenant context' }, { status: 403 })

  let body: { plan?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const plan = body.plan as 'starter' | 'pro' | 'agency' | undefined
  if (!plan || !['starter', 'pro', 'agency'].includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const priceId = stripeConfig.prices[`${plan}Monthly` as keyof typeof stripeConfig.prices]
  if (!priceId) {
    return NextResponse.json({ error: `Stripe price not configured for plan: ${plan}` }, { status: 400 })
  }

  // Get or create Stripe customer
  const { data: tenantRow } = await supabase
    .from('tenants')
    .select('name, stripe_customer_id')
    .eq('id', tenantId)
    .single()

  const stripe = getStripe()
  let customerId = tenantRow?.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email!,
      name: tenantRow?.name ?? user.email!,
      metadata: { tenant_id: tenantId },
    })
    customerId = customer.id

    await supabase
      .from('tenants')
      .update({ stripe_customer_id: customerId })
      .eq('id', tenantId)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      metadata: { tenant_id: tenantId, plan },
      trial_period_days: 14,
    },
    success_url: `${appConfig.url}/settings/billing?success=1`,
    cancel_url: `${appConfig.url}/settings/billing?canceled=1`,
  })

  return NextResponse.json({ url: session.url })
}
