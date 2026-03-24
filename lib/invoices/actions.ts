'use server'

/**
 * GemLancer — Invoice Server Actions
 * Business rules enforced here:
 *  - Invoices CANNOT be deleted (trigger blocks it; we return an error before reaching DB)
 *  - Cancel via status = 'cancelled' instead
 *  - Sent invoices get a Stripe payment link if STRIPE_SECRET_KEY is set
 */

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { stripeConfig, appConfig } from '@/lib/config'
import { getAuthContext } from '@/lib/supabase/auth-context'

// ── Line item type ─────────────────────────────────────────────

export interface LineItem {
  id?: string       // present when editing existing items
  description: string
  quantity: number
  unit_price: number
}

// ── Create invoice ─────────────────────────────────────────────

export async function createInvoice(data: {
  client_id: string
  project_id?: string
  currency: string
  tax_rate: number
  discount_amount: number
  due_date?: string
  notes?: string
  recurring_interval?: string
  items: LineItem[]
}): Promise<{ id?: string; error?: string }> {
  try {
    const { supabase, tenantId } = await getAuthContext()

    if (data.items.length === 0) {
      return { error: 'At least one line item is required.' }
    }

    // Generate invoice number
    const { count } = await supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
    const num = (count ?? 0) + 1
    const number = `INV-${String(num).padStart(4, '0')}`

    // Insert invoice
    const { data: inv, error: invErr } = await supabase
      .from('invoices')
      .insert({
        tenant_id: tenantId,
        client_id: data.client_id,
        project_id: data.project_id || null,
        number,
        status: 'draft',
        currency: data.currency,
        tax_rate: data.tax_rate,
        discount_amount: data.discount_amount,
        due_date: data.due_date || null,
        notes: data.notes?.trim() || null,
        recurring_interval: data.recurring_interval || null,
        issue_date: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (invErr || !inv) return { error: invErr?.message ?? 'Failed to create invoice.' }

    // Insert line items
    const { error: itemsErr } = await supabase.from('invoice_items').insert(
      data.items.map((item) => ({
        invoice_id: inv.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }))
    )

    if (itemsErr) {
      // Clean up orphan invoice
      await supabase.from('invoices').delete().eq('id', inv.id)
      return { error: itemsErr.message }
    }

    revalidatePath('/invoices')
    return { id: inv.id }
  } catch (e: any) {
    return { error: e.message ?? 'Unexpected error.' }
  }
}

// ── Update invoice (draft only) ────────────────────────────────

export async function updateInvoice(
  id: string,
  data: {
    client_id?: string
    project_id?: string
    currency?: string
    tax_rate?: number
    discount_amount?: number
    due_date?: string
    notes?: string
    recurring_interval?: string
    items?: LineItem[]
  }
): Promise<{ success?: true; error?: string }> {
  try {
    const { supabase, tenantId } = await getAuthContext()

    // Only draft invoices can be edited
    const { data: existing } = await supabase
      .from('invoices')
      .select('id, status')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (!existing) return { error: 'Invoice not found.' }
    if (existing.status !== 'draft') {
      return { error: 'Only draft invoices can be edited. Cancel and recreate if needed.' }
    }

    const { error: updateErr } = await supabase
      .from('invoices')
      .update({
        client_id: data.client_id,
        project_id: data.project_id || null,
        currency: data.currency,
        tax_rate: data.tax_rate,
        discount_amount: data.discount_amount,
        due_date: data.due_date || null,
        notes: data.notes?.trim() || null,
        recurring_interval: data.recurring_interval || null,
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (updateErr) return { error: updateErr.message }

    if (data.items) {
      // Replace all items
      await supabase.from('invoice_items').delete().eq('invoice_id', id)
      if (data.items.length > 0) {
        const { error: itemsErr } = await supabase.from('invoice_items').insert(
          data.items.map((item) => ({
            invoice_id: id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
          }))
        )
        if (itemsErr) return { error: itemsErr.message }
      }
    }

    revalidatePath('/invoices')
    revalidatePath(`/invoices/${id}`)
    return { success: true }
  } catch (e: any) {
    return { error: e.message ?? 'Unexpected error.' }
  }
}

// ── Send invoice ───────────────────────────────────────────────

export async function sendInvoice(
  id: string,
  options?: { createStripeLink?: boolean }
): Promise<{ success?: true; paymentUrl?: string; error?: string }> {
  try {
    const { supabase, tenantId } = await getAuthContext()

    const { data: inv } = await supabase
      .from('invoices')
      .select('id, status, currency, tax_rate, discount_amount, invoice_items ( unit_price, quantity )')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (!inv) return { error: 'Invoice not found.' }
    if (inv.status === 'paid') return { error: 'Invoice is already paid.' }
    if (inv.status === 'cancelled') return { error: 'Cannot send a cancelled invoice.' }

    let stripePaymentLink: string | null = null

    // Create Stripe Payment Link if requested and Stripe is configured
    if (options?.createStripeLink) {
      try {
        const stripeResult = await createStripePaymentLink(id, inv, tenantId)
        stripePaymentLink = stripeResult ?? null
      } catch {
        // Non-fatal — proceed without payment link
      }
    }

    const { error } = await supabase
      .from('invoices')
      .update({
        status: 'sent',
        ...(stripePaymentLink ? { stripe_payment_link: stripePaymentLink } : {}),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) return { error: error.message }

    revalidatePath('/invoices')
    revalidatePath(`/invoices/${id}`)
    return { success: true, ...(stripePaymentLink ? { paymentUrl: stripePaymentLink } : {}) }
  } catch (e: any) {
    return { error: e.message ?? 'Unexpected error.' }
  }
}

// ── Mark paid (manual) ─────────────────────────────────────────

export async function markInvoicePaid(
  id: string
): Promise<{ success?: true; error?: string }> {
  try {
    const { supabase, tenantId } = await getAuthContext()

    const { error } = await supabase
      .from('invoices')
      .update({ status: 'paid' })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .neq('status', 'cancelled')

    if (error) return { error: error.message }

    revalidatePath('/invoices')
    revalidatePath(`/invoices/${id}`)
    return { success: true }
  } catch (e: any) {
    return { error: e.message ?? 'Unexpected error.' }
  }
}

// ── Cancel invoice (soft delete) ───────────────────────────────

export async function cancelInvoice(
  id: string
): Promise<{ success?: true; error?: string }> {
  try {
    const { supabase, tenantId } = await getAuthContext()

    const { data: inv } = await supabase
      .from('invoices')
      .select('id, status')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (!inv) return { error: 'Invoice not found.' }
    if (inv.status === 'paid') {
      return { error: 'Paid invoices cannot be cancelled. Issue a credit note instead.' }
    }

    const { error } = await supabase
      .from('invoices')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) return { error: error.message }

    revalidatePath('/invoices')
    revalidatePath(`/invoices/${id}`)
    return { success: true }
  } catch (e: any) {
    return { error: e.message ?? 'Unexpected error.' }
  }
}

// ── Duplicate invoice ──────────────────────────────────────────

export async function duplicateInvoice(
  id: string
): Promise<{ id?: string; error?: string }> {
  try {
    const { supabase, tenantId } = await getAuthContext()

    const { data: original } = await supabase
      .from('invoices')
      .select('*, items:invoice_items ( description, quantity, unit_price )')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (!original) return { error: 'Invoice not found.' }

    const { count } = await supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
    const num = (count ?? 0) + 1
    const number = `INV-${String(num).padStart(4, '0')}`

    const { data: newInv, error: invErr } = await supabase
      .from('invoices')
      .insert({
        tenant_id: tenantId,
        client_id: original.client_id,
        project_id: original.project_id,
        number,
        status: 'draft',
        currency: original.currency,
        tax_rate: original.tax_rate,
        discount_amount: original.discount_amount,
        due_date: null,
        notes: original.notes,
        recurring_interval: original.recurring_interval,
        issue_date: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (invErr || !newInv) return { error: invErr?.message ?? 'Failed to duplicate.' }

    const items = (original as any).items ?? []
    if (items.length > 0) {
      await supabase.from('invoice_items').insert(
        items.map((item: any) => ({
          invoice_id: newInv.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
        }))
      )
    }

    revalidatePath('/invoices')
    return { id: newInv.id }
  } catch (e: any) {
    return { error: e.message ?? 'Unexpected error.' }
  }
}

// ── Stripe Payment Link helper ─────────────────────────────────

async function createStripePaymentLink(
  invoiceId: string,
  inv: any,
  tenantId: string
): Promise<string | null> {
  let secretKey: string
  try { secretKey = stripeConfig.secretKey } catch { return null }
  if (!secretKey) return null

  const subtotal = (inv.invoice_items ?? []).reduce(
    (s: number, item: any) => s + item.quantity * item.unit_price,
    0
  )
  const total = Math.round((subtotal * (1 + inv.tax_rate / 100) - inv.discount_amount) * 100) // cents

  if (total <= 0) return null

  // Dynamic import to avoid bundling Stripe on client
  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' as any })

  const product = await stripe.products.create({
    name: `Invoice ${inv.number ?? invoiceId}`,
    metadata: { gemlancer_invoice_id: invoiceId, tenant_id: tenantId },
  })

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: total,
    currency: (inv.currency ?? 'usd').toLowerCase(),
  })

  const link = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    metadata: { gemlancer_invoice_id: invoiceId, tenant_id: tenantId },
    after_completion: {
      type: 'redirect',
      redirect: { url: `${appConfig.url}/invoices/${invoiceId}?paid=1` },
    },
  })

  return link.url
}
