'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Check, Loader2, ExternalLink, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

const plans = [
  {
    id: 'starter' as const,
    name: 'Starter',
    price: '$29',
    interval: '/month',
    features: ['Up to 5 clients', '10 projects', '5 GB storage', '1 user', 'Invoicing & time tracking'],
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    price: '$79',
    interval: '/month',
    popular: true,
    features: ['Unlimited clients & projects', '50 GB storage', '1 user', 'Stripe payment links', 'Client portal'],
  },
  {
    id: 'agency' as const,
    name: 'Agency',
    price: '$199',
    interval: '/month',
    features: ['Everything in Pro', '500 GB storage', 'Up to 20 users', 'White label', 'Custom domain', 'Priority support'],
  },
]

export default function BillingSettingsPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUpgrade(plan: string) {
    setLoading(plan)
    setError(null)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create checkout session')
      window.location.href = data.url
    } catch (e: any) {
      setError(e.message)
      setLoading(null)
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to open billing portal')
      window.location.href = data.url
    } catch (e: any) {
      setError(e.message)
      setPortalLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 p-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />Settings
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your subscription plan and payment details.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Manage billing portal */}
      <div className="rounded-xl border p-5 flex items-center justify-between">
        <div>
          <p className="font-medium">Manage Subscription</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Update payment method, download invoices, or cancel.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleManageBilling}
          disabled={portalLoading}
          className="gap-2"
        >
          {portalLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ExternalLink className="h-4 w-4" />
          )}
          Billing Portal
        </Button>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-xl border p-5 flex flex-col gap-4 ${
              plan.popular ? 'border-primary shadow-sm' : ''
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-primary px-3 py-0.5 text-xs text-primary-foreground font-medium">
                  Most Popular
                </span>
              </div>
            )}

            <div>
              <p className="font-semibold">{plan.name}</p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground text-sm">{plan.interval}</span>
              </div>
            </div>

            <ul className="space-y-1.5 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <Button
              variant={plan.popular ? 'default' : 'outline'}
              onClick={() => handleUpgrade(plan.id)}
              disabled={loading === plan.id}
              className="w-full"
            >
              {loading === plan.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `Start with ${plan.name}`
              )}
            </Button>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        All plans include a 14-day free trial. No credit card required to start.
      </p>
    </div>
  )
}
