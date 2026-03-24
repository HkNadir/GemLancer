import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { appConfig } from '@/lib/config'

/**
 * GET /api/invites/[token]
 *
 * Accept a team invite. Validates the token, creates the user account,
 * and redirects to the login page with a success message.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = await createAdminClient()

  const { data: invite, error } = await supabase
    .from('invites')
    .select('*')
    .eq('token', token)
    .is('accepted_at', null)
    .single()

  if (error || !invite) {
    return NextResponse.redirect(new URL('/login?error=invalid_invite', req.url))
  }

  // Check expiry
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return NextResponse.redirect(new URL('/login?error=expired_invite', req.url))
  }

  // Check if user already exists in Supabase Auth
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existing = existingUsers?.users?.find((u) => u.email === invite.email)

  if (!existing) {
    // Create Supabase auth user with a temporary password (they'll reset it)
    const tempPassword = crypto.randomUUID()
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: invite.email,
      password: tempPassword,
      email_confirm: true,
      app_metadata: {
        tenant_id: invite.tenant_id,
        role: invite.role,
      },
    })

    if (createError || !newUser.user) {
      console.error('Failed to create invited user:', createError)
      return NextResponse.redirect(new URL('/login?error=invite_failed', req.url))
    }

    // Create users table row
    await supabase.from('users').insert({
      id: newUser.user.id,
      tenant_id: invite.tenant_id,
      email: invite.email,
      full_name: invite.email.split('@')[0],
      role: invite.role,
    })
  } else {
    // User already exists — link them to this tenant
    await supabase.auth.admin.updateUserById(existing.id, {
      app_metadata: {
        tenant_id: invite.tenant_id,
        role: invite.role,
      },
    })
  }

  // Mark invite as accepted
  await supabase
    .from('invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('token', token)

  // Redirect to password reset (new users need to set a password)
  const redirectUrl = existing
    ? `${appConfig.url}/login?invited=1`
    : `${appConfig.url}/forgot-password?email=${encodeURIComponent(invite.email)}&invited=1`

  return NextResponse.redirect(redirectUrl)
}
