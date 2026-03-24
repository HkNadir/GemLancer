'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { checkRateLimit, recordLoginAttempt, clearFailedAttempts } from '@/lib/auth/rate-limit'
import { writeAuditLog, isNewDevice } from '@/lib/auth/audit'
import { appConfig } from '@/lib/config'

// ── Validation Schemas ────────────────────────────────────────

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
  rememberMe: z.boolean().optional(),
})

const signUpSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters.')
    .max(100, 'Full name is too long.')
    .regex(/^[a-zA-Z\s'-]+$/, 'Full name contains invalid characters.'),
  email: z.string().email('Please enter a valid work email.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
    .regex(/[0-9]/, 'Password must contain at least one number.')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character.'),
  companyName: z
    .string()
    .min(2, 'Company name must be at least 2 characters.')
    .max(100, 'Company name is too long.'),
  termsAccepted: z.boolean().refine((v) => v === true, {
    message: 'You must accept the terms of service.',
  }),
})

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
})

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
      .regex(/[0-9]/, 'Password must contain at least one number.')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

// ── Return Types ──────────────────────────────────────────────

export interface AuthActionResult {
  error?: string
  field?: string
  rateLimited?: boolean
  retryAfterMinutes?: number
  success?: boolean
}

// ── Helpers ───────────────────────────────────────────────────

function getRequestContext() {
  const headersList = headers()
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headersList.get('x-real-ip') ??
    'unknown'
  const userAgent = headersList.get('user-agent') ?? 'unknown'
  return { ip, userAgent }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
}

// ── Sign In ───────────────────────────────────────────────────

export async function signInAction(
  _prevState: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  const { ip, userAgent } = getRequestContext()

  const raw = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    rememberMe: formData.get('rememberMe') === 'on',
  }

  // Client-mirrored schema validation (server-side authoritative)
  const parsed = signInSchema.safeParse(raw)
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]
    return { error: firstError.message, field: String(firstError.path[0]) }
  }

  const { email, password } = parsed.data

  // ── Rate limit check (before touching auth) ─────────────────
  const rateLimit = await checkRateLimit(email, ip)
  if (!rateLimit.allowed) {
    return {
      error: `Too many failed login attempts. Please try again in ${rateLimit.retryAfterMinutes} minute${rateLimit.retryAfterMinutes === 1 ? '' : 's'}.`,
      rateLimited: true,
      retryAfterMinutes: rateLimit.retryAfterMinutes,
    }
  }

  // ── Authenticate ────────────────────────────────────────────
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    await recordLoginAttempt(email, ip, false, userAgent)

    // Generic message prevents email enumeration
    return { error: 'Invalid email or password. Please try again.' }
  }

  // ── Post-auth: clear rate limit, record success, audit ──────
  await clearFailedAttempts(email)
  await recordLoginAttempt(email, ip, true, userAgent)

  const tenantId = data.user.app_metadata?.tenant_id as string | undefined
  if (tenantId) {
    const newDevice = await isNewDevice(data.user.id, ip)

    await writeAuditLog({
      tenantId,
      userId: data.user.id,
      action: 'login_success',
      resource: 'auth',
      ip,
      userAgent,
      metadata: { email, newDevice },
    })

    // TODO: If newDevice, send "suspicious login" email via Resend (Task 13)
  }

  // ── Redirect (TOTP check handled in middleware Part 2) ──────
  redirect('/dashboard')
}

// ── Sign Up ───────────────────────────────────────────────────

export async function signUpAction(
  _prevState: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  const raw = {
    fullName: formData.get('fullName') as string,
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    companyName: formData.get('companyName') as string,
    termsAccepted: formData.get('termsAccepted') === 'on',
  }

  const parsed = signUpSchema.safeParse(raw)
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]
    return { error: firstError.message, field: String(firstError.path[0]) }
  }

  const { fullName, email, password, companyName } = parsed.data

  // ── Create auth user ────────────────────────────────────────
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${appConfig.url}/api/auth/callback`,
      data: { full_name: fullName }, // stored in auth.users.raw_user_meta_data
    },
  })

  if (authError) {
    if (authError.message.toLowerCase().includes('already registered')) {
      return { error: 'An account with this email already exists. Try signing in.', field: 'email' }
    }
    return { error: 'Failed to create account. Please try again.' }
  }

  if (!authData.user) {
    return { error: 'Failed to create account. Please try again.' }
  }

  // ── Create tenant + owner user row via DB function ──────────
  const admin = await createAdminClient()
  const baseSlug = generateSlug(companyName)

  // Ensure slug uniqueness
  let slug = baseSlug
  const { data: existingTenant } = await admin
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existingTenant) {
    slug = `${baseSlug}-${Date.now().toString(36)}`
  }

  const { data: tenantResult, error: tenantError } = await admin.rpc('create_tenant_with_owner', {
    p_tenant_name: companyName,
    p_tenant_slug: slug,
    p_user_id: authData.user.id,
    p_user_email: email,
    p_user_name: fullName,
  })

  if (tenantError || !tenantResult) {
    // Rollback: delete the auth user to prevent orphaned accounts
    await admin.auth.admin.deleteUser(authData.user.id)
    return { error: 'Failed to set up your account. Please try again.' }
  }

  // ── If email confirmation disabled (dev), redirect to onboarding
  if (authData.session) {
    redirect('/onboarding')
  }

  // Otherwise, email confirmation is pending
  redirect('/verify?email=' + encodeURIComponent(email))
}

// ── Sign Out ──────────────────────────────────────────────────

export async function signOutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

// ── Forgot Password ───────────────────────────────────────────

export async function forgotPasswordAction(
  _prevState: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  const raw = { email: formData.get('email') as string }

  const parsed = forgotPasswordSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message, field: 'email' }
  }

  const supabase = await createClient()
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appConfig.url}/reset-password`,
  })

  // Always return success to prevent email enumeration
  return { success: true }
}

// ── Reset Password ────────────────────────────────────────────

export async function resetPasswordAction(
  _prevState: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  const raw = {
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  }

  const parsed = resetPasswordSchema.safeParse(raw)
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]
    return { error: firstError.message, field: String(firstError.path[0]) }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })

  if (error) {
    return { error: 'Failed to reset password. Your reset link may have expired.' }
  }

  redirect('/login?message=password_reset')
}

// ── Google OAuth ──────────────────────────────────────────────

export async function googleSignInAction(): Promise<AuthActionResult> {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${appConfig.url}/api/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error || !data.url) {
    return { error: 'Failed to initiate Google sign-in. Please try again.' }
  }

  redirect(data.url)
}

// ── Resend Verification Email ─────────────────────────────────

export async function resendVerificationAction(
  _prevState: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get('email') as string

  if (!email || !z.string().email().safeParse(email).success) {
    return { error: 'Invalid email address.' }
  }

  const supabase = await createClient()
  await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: `${appConfig.url}/api/auth/callback` },
  })

  // Always return success
  return { success: true }
}
