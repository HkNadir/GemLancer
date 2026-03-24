'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ChevronLeft, Loader2, Check } from 'lucide-react'
import { updateNotificationPrefs, type NotificationPrefs } from '@/lib/settings/actions'
import { Button } from '@/components/ui/button'

const defaultPrefs: NotificationPrefs = {
  email_invoice_sent: true,
  email_invoice_paid: true,
  email_invoice_overdue: true,
  email_task_assigned: true,
  email_milestone_update: true,
  email_new_message: true,
}

const prefLabels: { key: keyof NotificationPrefs; label: string; description: string }[] = [
  { key: 'email_invoice_sent', label: 'Invoice sent', description: 'When you send an invoice to a client' },
  { key: 'email_invoice_paid', label: 'Invoice paid', description: 'When a client pays an invoice' },
  { key: 'email_invoice_overdue', label: 'Invoice overdue', description: 'When an invoice passes its due date' },
  { key: 'email_task_assigned', label: 'Task assigned', description: 'When a task is assigned to you' },
  { key: 'email_milestone_update', label: 'Milestone updates', description: 'When a milestone is approved or changes' },
  { key: 'email_new_message', label: 'New messages', description: 'When a client sends you a message' },
]

export default function NotificationSettingsPage() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pending, startTransition] = useTransition()

  function toggle(key: keyof NotificationPrefs) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await updateNotificationPrefs(prefs)
      if (result.error) { setError(result.error); return }
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    })
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl">
      <Link href="/settings" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft className="h-4 w-4" />Settings
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground mt-1">Control which emails you receive.</p>
      </div>

      <div className="rounded-xl border divide-y">
        {prefLabels.map(({ key, label, description }) => (
          <label key={key} className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-muted/30 transition-colors">
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
            <input
              type="checkbox"
              checked={prefs[key]}
              onChange={() => toggle(key)}
              className="h-4 w-4 rounded accent-primary"
            />
          </label>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && (
        <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
          <Check className="h-4 w-4" />
          Preferences saved
        </p>
      )}

      <Button onClick={handleSave} disabled={pending} className="w-fit">
        {pending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Save Preferences
      </Button>
    </div>
  )
}
