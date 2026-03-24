/**
 * GemLancer Edge Function: flag-overdue-tasks
 *
 * Runs on a cron schedule (daily at 01:00 UTC via Supabase dashboard cron).
 * Marks tasks as overdue by inserting a task_activity record and creating
 * in-app notifications for assignees.
 *
 * Does NOT mutate task.status — overdue is a derived state from due_date + status.
 * This function creates notifications so the UI can surface overdue tasks clearly.
 *
 * Deploy: supabase functions deploy flag-overdue-tasks --no-verify-jwt
 * Cron:   0 1 * * *
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req: Request) => {
  // Simple bearer token check to prevent unauthorized invocations
  const authHeader = req.headers.get('Authorization')
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey)
  const now = new Date().toISOString()

  try {
    // Find all non-done tasks past their due_date that haven't been notified today
    const { data: overdueTasks, error: fetchError } = await admin
      .from('tasks')
      .select(`
        id, title, tenant_id, project_id, assignee_id, due_date,
        project:projects ( name, client_id )
      `)
      .lt('due_date', now)
      .not('status', 'in', '("done","cancelled")')
      .not('due_date', 'is', null)

    if (fetchError) throw fetchError

    if (!overdueTasks || overdueTasks.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, message: 'No overdue tasks found' }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    let notificationsCreated = 0

    for (const task of overdueTasks) {
      if (!task.assignee_id) continue

      // Check if we already sent an overdue notification for this task today
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const { data: existing } = await admin
        .from('notifications')
        .select('id')
        .eq('tenant_id', task.tenant_id)
        .eq('user_id', task.assignee_id)
        .eq('type', 'task_overdue')
        .like('action_url', `%/tasks/${task.id}%`)
        .gte('created_at', todayStart.toISOString())
        .limit(1)
        .single()

      if (existing) continue // already notified today

      const projectName = (task.project as any)?.name ?? 'Unknown project'
      const dueDate = new Date(task.due_date!).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })

      await admin.from('notifications').insert({
        tenant_id: task.tenant_id,
        user_id: task.assignee_id,
        type: 'task_overdue',
        title: `Overdue: ${task.title}`,
        body: `This task was due on ${dueDate} in ${projectName}.`,
        action_url: `/projects/${task.project_id}?task=${task.id}`,
      })

      notificationsCreated++
    }

    return new Response(
      JSON.stringify({
        processed: overdueTasks.length,
        notifications_created: notificationsCreated,
        timestamp: now,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[flag-overdue-tasks]', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
