'use client'

import { useState, useTransition } from 'react'
import { UserPlus, Loader2, X } from 'lucide-react'
import { inviteTeamMember } from '@/lib/settings/actions'
import { Button } from '@/components/ui/button'

export function InviteDialog({ disabled }: { disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'member'>('member')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleInvite() {
    if (!email.trim()) { setError('Email is required'); return }
    setError(null)
    startTransition(async () => {
      const result = await inviteTeamMember(email.trim(), role)
      if (result.error) { setError(result.error); return }
      setSuccess(true)
      setEmail('')
      setTimeout(() => { setSuccess(false); setOpen(false) }, 2000)
    })
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} disabled={disabled} className="gap-2">
        <UserPlus className="h-4 w-4" />
        Invite Member
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border bg-background shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Invite Team Member</h2>
          <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              onKeyDown={(e) => { if (e.key === 'Enter') handleInvite() }}
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="member">Member — can view and edit assigned items</option>
              <option value="admin">Admin — can manage all projects and clients</option>
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-green-600 dark:text-green-400">Invite sent!</p>}

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleInvite} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
            Send Invite
          </Button>
        </div>
      </div>
    </div>
  )
}
