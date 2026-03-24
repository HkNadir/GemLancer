'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { ClientInsert, ClientUpdate, ClientTag } from '@/types/database'
import { getAuthContext } from '@/lib/supabase/auth-context'

// ── Create ────────────────────────────────────────────────────

export async function createClient_(formData: {
  name: string
  email: string
  company?: string
  phone?: string
  address?: string
  city?: string
  country?: string
  currency?: string
  tag?: ClientTag
  notes?: string
}): Promise<{ id: string } | { error: string }> {
  try {
    const { supabase, tenantId } = await getAuthContext()

    // Check plan limit
    const { data: withinLimit } = await supabase.rpc('check_plan_limit', {
      p_tenant_id: tenantId,
      p_resource: 'clients',
    })

    if (!withinLimit) {
      return { error: 'Client limit reached for your plan. Please upgrade to add more clients.' }
    }

    // Check email uniqueness within tenant
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('email', formData.email.toLowerCase().trim())
      .single()

    if (existing) {
      return { error: 'A client with this email already exists.' }
    }

    const { data, error } = await supabase
      .from('clients')
      .insert({
        tenant_id: tenantId,
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        company: formData.company?.trim() || null,
        phone: formData.phone?.trim() || null,
        address: formData.address?.trim() || null,
        city: formData.city?.trim() || null,
        country: formData.country || 'US',
        currency: formData.currency || 'USD',
        tag: formData.tag || 'new',
        notes: formData.notes?.trim() || null,
      } satisfies ClientInsert)
      .select('id')
      .single()

    if (error) return { error: error.message }

    revalidatePath('/clients')
    return { id: data.id }
  } catch (err) {
    return { error: String(err) }
  }
}

// ── Update ────────────────────────────────────────────────────

export async function updateClient(
  clientId: string,
  formData: Partial<{
    name: string
    email: string
    company: string
    phone: string
    address: string
    city: string
    country: string
    currency: string
    tag: ClientTag
    notes: string
  }>
): Promise<{ success: true } | { error: string }> {
  try {
    const { supabase, tenantId } = await getAuthContext()

    // Verify ownership
    const { data: existing } = await supabase
      .from('clients')
      .select('id, email')
      .eq('tenant_id', tenantId)
      .eq('id', clientId)
      .single()

    if (!existing) return { error: 'Client not found.' }

    // Check email uniqueness if email changed
    if (formData.email && formData.email.toLowerCase() !== existing.email) {
      const { data: duplicate } = await supabase
        .from('clients')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('email', formData.email.toLowerCase().trim())
        .neq('id', clientId)
        .single()

      if (duplicate) return { error: 'Another client with this email already exists.' }
    }

    const update: ClientUpdate = {}
    if (formData.name !== undefined) update.name = formData.name.trim()
    if (formData.email !== undefined) update.email = formData.email.toLowerCase().trim()
    if (formData.company !== undefined) update.company = formData.company.trim() || null
    if (formData.phone !== undefined) update.phone = formData.phone.trim() || null
    if (formData.address !== undefined) update.address = formData.address.trim() || null
    if (formData.city !== undefined) update.city = formData.city.trim() || null
    if (formData.country !== undefined) update.country = formData.country
    if (formData.currency !== undefined) update.currency = formData.currency
    if (formData.tag !== undefined) update.tag = formData.tag
    if (formData.notes !== undefined) update.notes = formData.notes.trim() || null

    const { error } = await supabase
      .from('clients')
      .update(update)
      .eq('tenant_id', tenantId)
      .eq('id', clientId)

    if (error) return { error: error.message }

    revalidatePath('/clients')
    revalidatePath(`/clients/${clientId}`)
    return { success: true }
  } catch (err) {
    return { error: String(err) }
  }
}

// ── Deactivate (soft delete) ───────────────────────────────────

export async function deactivateClient(clientId: string): Promise<{ success: true } | { error: string }> {
  try {
    const { supabase, tenantId } = await getAuthContext()

    const { error } = await supabase
      .from('clients')
      .update({ is_active: false } satisfies ClientUpdate)
      .eq('tenant_id', tenantId)
      .eq('id', clientId)

    if (error) return { error: error.message }

    revalidatePath('/clients')
    return { success: true }
  } catch (err) {
    return { error: String(err) }
  }
}

// ── Reactivate ─────────────────────────────────────────────────

export async function reactivateClient(clientId: string): Promise<{ success: true } | { error: string }> {
  try {
    const { supabase, tenantId } = await getAuthContext()

    const { error } = await supabase
      .from('clients')
      .update({ is_active: true } satisfies ClientUpdate)
      .eq('tenant_id', tenantId)
      .eq('id', clientId)

    if (error) return { error: error.message }

    revalidatePath('/clients')
    revalidatePath(`/clients/${clientId}`)
    return { success: true }
  } catch (err) {
    return { error: String(err) }
  }
}
