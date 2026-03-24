import Stripe from 'stripe'
import { stripeConfig } from '@/lib/config'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(stripeConfig.secretKey, {
      apiVersion: '2024-06-20',
    })
  }
  return _stripe
}

export { Stripe }
