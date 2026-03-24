'use server'

/**
 * GemLancer — Time Log Server Actions
 * Business rule: time logs are immutable after 30 days (DB trigger enforces, app checks early).
 */

import { revalidatePath } from 'next/cache'
import { getAuthContext } from '@/lib/supabase/auth-context'

// ── Immutability guard ─────────────────────────────────────────

function isWithin30Days(startedAt: string): boolean {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  return new Date(startedAt) >= thirtyDaysAgo
}

// ── Create manual time log ─────────────────────────────────────

export async function createManualLog(data: {
  task_id: string
  started_at: string   // ISO string e.g. "2026-03-24T09:00"
  ended_at: string     // ISO string e.g. "2026-03-24T11:30"
  description?: string
  billable: boolean
}): Promise<{ success?: true; error?: string }> {
  try {
    const { supabase, user, tenantId } = await getAuthContext()

    const startMs = new Date(data.started_at).getTime()
    const endMs = new Date(data.ended_at).getTime()
    const durationMinutes = Math.round((endMs - startMs) / 60_000)

    if (durationMinutes <= 0) {
      return { error: 'End time must be after start time.' }
    }
    if (durationMinutes > 24 * 60) {
      return { error: 'A single entry cannot exceed 24 hours.' }
    }

    // Verify task belongs to tenant
    const { data: task, error: taskErr } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', data.task_id)
      .eq('tenant_id', tenantId)
      .single()

    if (taskErr || !task) return { error: 'Task not found or access denied.' }

    const { error } = await supabase.from('time_logs').insert({
      tenant_id: tenantId,
      task_id: data.task_id,
      user_id: user.id,
      started_at: new Date(data.started_at).toISOString(),
      ended_at: new Date(data.ended_at).toISOString(),
      duration_minutes: durationMinutes,
      description: data.description?.trim() || null,
      billable: data.billable,
    })

    if (error) return { error: error.message }

    revalidatePath('/time')
    return { success: true }
  } catch (e: any) {
    return { error: e.message ?? 'Unexpected error.' }
  }
}

// ── Update time log ────────────────────────────────────────────

export async function updateTimeLog(
  id: string,
  updates: {
    description?: string
    billable?: boolean
    started_at?: string
    ended_at?: string
  }
): Promise<{ success?: true; error?: string }> {
  try {
    const { supabase, tenantId } = await getAuthContext()

    const { data: log, error: fetchErr } = await supabase
      .from('time_logs')
      .select('id, started_at')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (fetchErr || !log) return { error: 'Log not found.' }
    if (!isWithin30Days(log.started_at)) {
      return { error: 'Time logs older than 30 days cannot be edited.' }
    }

    const payload: Record<string, unknown> = {}

    if (updates.description !== undefined) {
      payload.description = updates.description?.trim() || null
    }
    if (updates.billable !== undefined) {
      payload.billable = updates.billable
    }
    if (updates.started_at !== undefined && updates.ended_at !== undefined) {
      const durationMinutes = Math.round(
        (new Date(updates.ended_at).getTime() - new Date(updates.started_at).getTime()) / 60_000
      )
      if (durationMinutes <= 0) return { error: 'End time must be after start time.' }
      payload.started_at = new Date(updates.started_at).toISOString()
      payload.ended_at = new Date(updates.ended_at).toISOString()
      payload.duration_minutes = durationMinutes
    }

    const { error } = await supabase
      .from('time_logs')
      .update(payload)
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) return { error: error.message }

    revalidatePath('/time')
    return { success: true }
  } catch (e: any) {
    return { error: e.message ?? 'Unexpected error.' }
  }
}

// ── Delete time log ────────────────────────────────────────────

export async function deleteTimeLog(
  id: string
): Promise<{ success?: true; error?: string }> {
  try {
    const { supabase, tenantId } = await getAuthContext()

    const { data: log, error: fetchErr } = await supabase
      .from('time_logs')
      .select('id, started_at')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (fetchErr || !log) return { error: 'Log not found.' }
    if (!isWithin30Days(log.started_at)) {
      return { error: 'Time logs older than 30 days cannot be deleted.' }
    }

    const { error } = await supabase
      .from('time_logs')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) return { error: error.message }

    revalidatePath('/time')
    return { success: true }
  } catch (e: any) {
    return { error: e.message ?? 'Unexpected error.' }
  }
}
