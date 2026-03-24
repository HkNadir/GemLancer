import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe/client'
import { stripeConfig } from '@/lib/config'
import { handleSubscriptionEvent, handleInvoicePaid } from '@/lib/stripe/webhooks'

/**
 * POST /api/webhooks/stripe
 *
 * Stripe webhook endpoint. Configure in Stripe Dashboard:
 *   URL: <your-app>/api/webhooks/stripe
 *   Events: customer.subscription.*, invoice.paid
 */
export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  const stripe = getStripe()
  let event

  try {
    event = stripe.webhooks.constructEvent(body, signature, stripeConfig.webhookSecret)
  } catch (err: any) {
    console.error('Stripe webhook signature verification failed:', err.message)
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'customer.subscription.trial_will_end':
        await handleSubscriptionEvent(event.data.object as any)
        break

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as any)
        break

      default:
        // Ignore unhandled events
        break
    }
  } catch (err) {
    console.error(`Error handling Stripe event ${event.type}:`, err)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
