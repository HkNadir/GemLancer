/**
 * Audit log writer for post-authentication events.
 *
 * Writes to the `audit_logs` table which requires a tenant_id.
 * For pre-auth events (failed logins), use `login_attempts` instead.
 */

import { createAdminClient } from '@/lib/supabase/server'

export interface AuditEventParams {
  tenantId: string
  userId: string | null
  action: string
  resource: string
  resourceId?: string | null
  ip?: string | null
  userAgent?: string | null
  metadata?: Record<string, unknown>
}

export async function writeAuditLog(params: AuditEventParams): Promise<void> {
  try {
    const admin = await createAdminClient()

    await admin.from('audit_logs').insert({
      tenant_id: params.tenantId,
      user_id: params.userId,
      action: params.action,
      resource: params.resource,
      resource_id: params.resourceId ?? null,
      ip_address: params.ip ?? null,
      user_agent: params.userAgent ?? null,
      metadata: params.metadata ?? {},
    })
  } catch {
    // Audit logging must never break the main flow
    console.error('[AuditLog] Failed to write audit event:', params.action)
  }
}

/**
 * Detects potentially suspicious login activity.
 * Compares the current IP against the user's last 5 known IPs.
 * Returns true if the IP appears new (not seen in recent history).
 */
export async function isNewDevice(userId: string, currentIp: string): Promise<boolean> {
  try {
    const admin = await createAdminClient()

    const { data } = await admin
      .from('audit_logs')
      .select('metadata')
      .eq('user_id', userId)
      .eq('action', 'login_success')
      .order('created_at', { ascending: false })
      .limit(10)

    if (!data || data.length === 0) return false // First login, not suspicious

    const knownIps = new Set(
      data.map((row) => (row.metadata as Record<string, unknown>)?.ip as string).filter(Boolean)
    )

    return !knownIps.has(currentIp)
  } catch {
    return false
  }
}
