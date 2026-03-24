'use server'

import { revalidatePath } from 'next/cache'
import { getAuthContext } from '@/lib/supabase/auth-context'

// ── Step 1: Workspace name + slug ─────────────────────────────

export async function saveWorkspaceStep(data: {
  name: string
  slug: string
}): Promise<{ error?: string }> {
  try {
    const { supabase, tenantId } = await getAuthContext()

    const slug = data.slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 50)

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .neq('id', tenantId)
      .single()

    if (existing) {
      return { error: 'This workspace URL is already taken. Try another.' }
    }

    const { error } = await supabase
      .from('tenants')
      .update({ name: data.name.trim(), slug })
      .eq('id', tenantId)

    if (error) return { error: error.message }

    return {}
  } catch (err) {
    return { error: String(err) }
  }
}

// ── Step 2: Branding (logo + color) ───────────────────────────

export async function saveBrandingStep(data: {
  primary_color?: string
  logo_url?: string
}): Promise<{ error?: string }> {
  try {
    const { supabase, tenantId } = await getAuthContext()

    const update: Record<string, string> = {}
    if (data.primary_color) update.primary_color = data.primary_color
    if (data.logo_url) update.logo_url = data.logo_url

    if (Object.keys(update).length > 0) {
      const { error } = await supabase
        .from('tenants')
        .update(update)
        .eq('id', tenantId)
      if (error) return { error: error.message }
    }

    return {}
  } catch (err) {
    return { error: String(err) }
  }
}

// ── Step 3: Invite team member ────────────────────────────────

export async function inviteTeamMember(data: {
  email: string
  role: 'admin' | 'member'
}): Promise<{ error?: string }> {
  try {
    const { supabase, user, tenantId } = await getAuthContext()

    const token = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

    const { error } = await supabase.from('invites').insert({
      tenant_id: tenantId,
      email: data.email.toLowerCase().trim(),
      role: data.role,
      token,
      invited_by: user.id,
      expires_at: expiresAt.toISOString(),
    })

    if (error) return { error: error.message }

    // TODO Task 13: send invite email via Resend
    // await sendTeamInviteEmail({ email: data.email, token, tenantName })

    return {}
  } catch (err) {
    return { error: String(err) }
  }
}

// ── Complete onboarding ────────────────────────────────────────

export async function completeOnboarding(): Promise<{ error?: string }> {
  try {
    const { supabase, tenantId } = await getAuthContext()

    const { error } = await supabase
      .from('tenants')
      .update({ onboarding_completed: true })
      .eq('id', tenantId)

    if (error) return { error: error.message }

    // Refresh JWT so app_metadata.onboarding_completed = true
    // Middleware will then allow access to /dashboard
    await supabase.auth.refreshSession()

    revalidatePath('/dashboard')
    return {}
  } catch (err) {
    return { error: String(err) }
  }
}
