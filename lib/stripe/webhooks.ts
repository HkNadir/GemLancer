import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/server'

type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'

/**
 * Map Stripe subscription status to our DB enum.
 * Any unmapped status defaults to 'incomplete'.
 */
function mapStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  const map: Partial<Record<Stripe.Subscription.Status, SubscriptionStatus>> = {
    trialing: 'trialing',
    active: 'active',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'unpaid',
    incomplete: 'incomplete',
    incomplete_expired: 'incomplete',
    paused: 'past_due',
  }
  return map[status] ?? 'incomplete'
}

/**
 * Upsert subscription data to DB when Stripe fires subscription events.
 */
export async function handleSubscriptionEvent(sub: Stripe.Subscription) {
  const supabase = await createAdminClient()
  const tenantId = sub.metadata?.tenant_id

  if (!tenantId) {
    console.warn('handleSubscriptionEvent: no tenant_id in metadata', sub.id)
    return
  }

  const plan = (sub.metadata?.plan ?? 'starter') as 'starter' | 'pro' | 'agency'

  await supabase
    .from('subscriptions')
    .upsert({
      tenant_id: tenantId,
      stripe_sub_id: sub.id,
      stripe_price_id: (sub.items.data[0]?.price?.id) ?? null,
      plan,
      status: mapStatus(sub.status),
      trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
      current_period_start: sub.current_period_start
        ? new Date(sub.current_period_start * 1000).toISOString()
        : null,
      current_period_end: sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: sub.cancel_at_period_end,
      canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
    })
    .match({ tenant_id: tenantId })

  // Mirror plan on tenants table
  await supabase
    .from('tenants')
    .update({ plan })
    .eq('id', tenantId)
}

/**
 * Mark an invoice as paid when Stripe fires invoice.paid.
 */
export async function handleInvoicePaid(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return
  const supabase = await createAdminClient()

  // Our invoices are linked by stripe_invoice_id if present
  const stripeInvoiceId = invoice.id
  await supabase
    .from('invoices')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('stripe_invoice_id', stripeInvoiceId)
}
