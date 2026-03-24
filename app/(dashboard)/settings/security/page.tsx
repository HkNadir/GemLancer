'use client'

import { useState, useTransition } from 'react'
import { ShieldCheck, ShieldOff, Smartphone, Loader2, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

export default function SecuritySettingsPage() {
  const { toast } = useToast()

  // ── 2FA state ─────────────────────────────────────────────
  const [totpEnabled, setTotpEnabled] = useState(false) // loaded from server ideally
  const [showEnableDialog, setShowEnableDialog] = useState(false)
  const [showDisableDialog, setShowDisableDialog] = useState(false)

  // Enable flow
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [manualCode, setManualCode] = useState<string | null>(null)
  const [enableCode, setEnableCode] = useState('')
  const [enableError, setEnableError] = useState<string | null>(null)
  const [isLoadingQR, startLoadingQR] = useTransition()
  const [isEnabling, startEnabling] = useTransition()

  // Disable flow
  const [disableCode, setDisableCode] = useState('')
  const [disableError, setDisableError] = useState<string | null>(null)
  const [isDisabling, startDisabling] = useTransition()

  // ── Password change state ──────────────────────────────────
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [showOldPw, setShowOldPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwError, setPwError] = useState<string | null>(null)
  const [isChangingPw, startChangingPw] = useTransition()

  // ── 2FA Enable ─────────────────────────────────────────────

  function openEnableDialog() {
    setEnableCode('')
    setEnableError(null)
    setQrCode(null)
    setShowEnableDialog(true)

    startLoadingQR(async () => {
      const res = await fetch('/api/auth/totp/generate')
      const data = await res.json()
      if (res.ok) {
        setQrCode(data.qrCode)
        setManualCode(data.manualCode)
      } else {
        setEnableError(data.error ?? 'Failed to start setup')
      }
    })
  }

  function submitEnable() {
    setEnableError(null)
    startEnabling(async () => {
      const res = await fetch('/api/auth/totp/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: enableCode }),
      })
      const data = await res.json()
      if (!res.ok) {
        setEnableError(data.error ?? 'Invalid code')
        return
      }
      setTotpEnabled(true)
      setShowEnableDialog(false)
      toast({ title: '2FA enabled', description: 'Two-factor authentication is now active on your account.' })
    })
  }

  // ── 2FA Disable ────────────────────────────────────────────

  function submitDisable() {
    setDisableError(null)
    startDisabling(async () => {
      const res = await fetch('/api/auth/totp/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: disableCode }),
      })
      const data = await res.json()
      if (!res.ok) {
        setDisableError(data.error ?? 'Invalid code')
        return
      }
      setTotpEnabled(false)
      setShowDisableDialog(false)
      setDisableCode('')
      toast({ title: '2FA disabled', description: 'Two-factor authentication has been removed.' })
    })
  }

  // ── Password change ────────────────────────────────────────

  function submitPasswordChange() {
    setPwError(null)
    if (newPassword.length < 8) { setPwError('New password must be at least 8 characters.'); return }
    if (!/[A-Z]/.test(newPassword)) { setPwError('Include at least one uppercase letter.'); return }
    if (!/[0-9]/.test(newPassword)) { setPwError('Include at least one number.'); return }
    if (!/[^A-Za-z0-9]/.test(newPassword)) { setPwError('Include at least one special character.'); return }

    startChangingPw(async () => {
      // Re-authenticate then update password via Supabase Auth
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      // Supabase doesn't support re-auth via password directly on the client.
      // The standard flow is: updateUser({ password }) + the user is already authenticated.
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        setPwError(error.message)
        return
      }

      setShowPasswordForm(false)
      setOldPassword('')
      setNewPassword('')
      toast({ title: 'Password updated', description: 'Your password has been changed successfully.' })
    })
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl">

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/settings" className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />Settings
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Security</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your password and two-factor authentication.</p>
      </div>

      {/* ── Password ── */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold">Password</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Change your account password.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowPasswordForm(!showPasswordForm)}>
            Change
          </Button>
        </div>

        {showPasswordForm && (
          <div className="space-y-4 pt-2 border-t">
            <div className="space-y-1.5">
              <Label htmlFor="new-pw">New Password</Label>
              <div className="relative">
                <Input
                  id="new-pw"
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 chars, uppercase, number, symbol"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {pwError && <p className="text-xs text-destructive">{pwError}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={submitPasswordChange} disabled={isChangingPw || !newPassword}>
                {isChangingPw && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Update Password
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowPasswordForm(false); setPwError(null) }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── 2FA ── */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-start gap-4">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${totpEnabled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
            {totpEnabled
              ? <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
              : <ShieldOff className="h-5 w-5 text-muted-foreground" />
            }
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Two-Factor Authentication</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {totpEnabled
                    ? 'Your account is protected with an authenticator app.'
                    : 'Add an extra layer of security to your account.'}
                </p>
              </div>
              {totpEnabled ? (
                <Button variant="outline" size="sm" onClick={() => { setDisableCode(''); setDisableError(null); setShowDisableDialog(true) }}>
                  Disable
                </Button>
              ) : (
                <Button size="sm" onClick={openEnableDialog}>
                  Enable
                </Button>
              )}
            </div>

            {!totpEnabled && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                <Smartphone className="h-4 w-4 shrink-0" />
                We strongly recommend enabling 2FA for your account.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Enable 2FA Dialog ── */}
      <Dialog open={showEnableDialog} onOpenChange={setShowEnableDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.), then enter the 6-digit code to confirm.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* QR Code */}
            <div className="flex flex-col items-center gap-3">
              {isLoadingQR ? (
                <div className="h-[200px] w-[200px] rounded-lg bg-muted flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : qrCode ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCode} alt="TOTP QR Code" width={200} height={200} className="rounded-lg border" />
                  {manualCode && (
                    <div className="w-full">
                      <p className="text-xs text-muted-foreground mb-1">Can&apos;t scan? Enter this code manually:</p>
                      <code className="block w-full rounded bg-muted px-3 py-2 text-xs font-mono text-center break-all">
                        {manualCode}
                      </code>
                    </div>
                  )}
                </>
              ) : (
                enableError && <p className="text-sm text-destructive">{enableError}</p>
              )}
            </div>

            {/* Code input */}
            <div className="space-y-1.5">
              <Label htmlFor="enable-code">Verification Code</Label>
              <Input
                id="enable-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={enableCode}
                onChange={(e) => { setEnableCode(e.target.value.replace(/\D/g, '')); setEnableError(null) }}
                className="text-center tracking-widest text-lg font-semibold"
              />
              {enableError && <p className="text-xs text-destructive">{enableError}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEnableDialog(false)}>Cancel</Button>
            <Button onClick={submitEnable} disabled={enableCode.length < 6 || isEnabling}>
              {isEnabling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm & Enable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Disable 2FA Dialog ── */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Enter your current authenticator code to confirm. This will remove 2FA protection from your account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="disable-code">Authenticator Code</Label>
            <Input
              id="disable-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={disableCode}
              onChange={(e) => { setDisableCode(e.target.value.replace(/\D/g, '')); setDisableError(null) }}
              className="text-center tracking-widest text-lg font-semibold"
            />
            {disableError && <p className="text-xs text-destructive">{disableError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisableDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={submitDisable} disabled={disableCode.length < 6 || isDisabling}>
              {isDisabling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Disable 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
