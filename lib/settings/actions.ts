'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { resolveTenantId } from '@/lib/supabase/auth-context'

// ── Profile ────────────────────────────────────────────────────

export async function updateProfile(
  fullName: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const tenantId = await resolveTenantId(supabase, user.id, user.app_metadata?.tenant_id)
  if (!tenantId) return { error: 'No tenant context' }

  const trimmed = fullName.trim()
  if (!trimmed) return { error: 'Name is required' }

  const { error } = await supabase
    .from('users')
    .update({ full_name: trimmed })
    .eq('id', user.id)
    .eq('tenant_id', tenantId)

  if (error) return { error: error.message }

  revalidatePath('/settings/profile')
  return {}
}

export async function uploadAvatar(formData: FormData): Promise<{ error?: string; url?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const file = formData.get('avatar') as File | null
  if (!file) return { error: 'No file provided' }
  if (file.size > 2 * 1024 * 1024) return { error: 'Avatar must be under 2 MB' }
  if (!file.type.startsWith('image/')) return { error: 'File must be an image' }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `avatars/${user.id}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) return { error: uploadError.message }

  const { data: signed } = await supabase.storage
    .from('avatars')
    .createSignedUrl(path, 60 * 60 * 24 * 365) // 1 year

  const url = signed?.signedUrl ?? null

  if (url) {
    await supabase
      .from('users')
      .update({ avatar_url: url })
      .eq('id', user.id)
  }

  revalidatePath('/settings/profile')
  return { url: url ?? undefined }
}

// ── Password ───────────────────────────────────────────────────

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  if (newPassword.length < 8) return { error: 'New password must be at least 8 characters' }

  // Re-authenticate first to verify current password
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  })
  if (signInError) return { error: 'Current password is incorrect' }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: error.message }

  return {}
}

// ── Notifications ──────────────────────────────────────────────

export interface NotificationPrefs {
  email_invoice_sent: boolean
  email_invoice_paid: boolean
  email_invoice_overdue: boolean
  email_task_assigned: boolean
  email_milestone_update: boolean
  email_new_message: boolean
}

export async function updateNotificationPrefs(
  prefs: NotificationPrefs
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const tenantId = await resolveTenantId(supabase, user.id, user.app_metadata?.tenant_id)
  if (!tenantId) return { error: 'No tenant context' }

  const { error } = await supabase
    .from('users')
    .update({ notification_prefs: prefs })
    .eq('id', user.id)
    .eq('tenant_id', tenantId)

  if (error) return { error: error.message }

  revalidatePath('/settings/notifications')
  return {}
}

// ── Team ───────────────────────────────────────────────────────

export async function inviteTeamMember(
  email: string,
  role: 'admin' | 'member'
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const tenantId = await resolveTenantId(supabase, user.id, user.app_metadata?.tenant_id)
  if (!tenantId) return { error: 'No tenant context' }

  const callerRole = user.app_metadata?.role as string

  if (!['owner', 'admin'].includes(callerRole)) {
    return { error: 'Only owners and admins can invite team members' }
  }

  // Check plan limit
  const { count } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .not('role', 'eq', 'client')

  const { data: tenant } = await supabase
    .from('tenants')
    .select('max_users')
    .eq('id', tenantId)
    .single()

  if (tenant && (count ?? 0) >= (tenant.max_users ?? 1)) {
    return { error: 'User limit reached. Upgrade your plan to add more team members.' }
  }

  // Insert pending invite
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await supabase.from('invites').insert({
    tenant_id: tenantId,
    email,
    role,
    token,
    invited_by: user.id,
    expires_at: expiresAt,
  })

  if (error) return { error: error.message }

  // TODO: send invite email via /api/email/send when email is configured (Task 13)
  revalidatePath('/settings/team')
  return {}
}

export async function removeTeamMember(userId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const tenantId = await resolveTenantId(supabase, user.id, user.app_metadata?.tenant_id)
  if (!tenantId) return { error: 'No tenant context' }

  const callerRole = user.app_metadata?.role as string

  if (!['owner', 'admin'].includes(callerRole)) {
    return { error: 'Only owners and admins can remove team members' }
  }

  if (userId === user.id) {
    return { error: 'You cannot remove yourself' }
  }

  const { error } = await supabase
    .from('users')
    .update({ is_active: false })
    .eq('id', userId)
    .eq('tenant_id', tenantId)
    .neq('role', 'owner') // cannot remove owner

  if (error) return { error: error.message }

  revalidatePath('/settings/team')
  return {}
}

export async function updateMemberRole(
  userId: string,
  role: 'admin' | 'member'
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const tenantId = await resolveTenantId(supabase, user.id, user.app_metadata?.tenant_id)
  if (!tenantId) return { error: 'No tenant context' }

  const callerRole = user.app_metadata?.role as string

  if (callerRole !== 'owner') {
    return { error: 'Only the owner can change member roles' }
  }

  const { error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', userId)
    .eq('tenant_id', tenantId)
    .neq('role', 'owner')

  if (error) return { error: error.message }

  revalidatePath('/settings/team')
  return {}
}
