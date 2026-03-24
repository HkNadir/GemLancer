'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Palette, Users, Rocket, ChevronRight, ChevronLeft, Check, Loader2, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  saveWorkspaceStep,
  saveBrandingStep,
  inviteTeamMember,
  completeOnboarding,
} from '@/lib/auth/onboarding-actions'

// ── Step config ───────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Workspace',  icon: Building2 },
  { id: 2, label: 'Branding',   icon: Palette },
  { id: 3, label: 'Team',       icon: Users },
  { id: 4, label: 'Get Started', icon: Rocket },
]

const BRAND_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#0ea5e9', '#3b82f6', '#64748b', '#1e293b',
]

// ── Component ─────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Step 1
  const [workspaceName, setWorkspaceName] = useState('')
  const [workspaceSlug, setWorkspaceSlug] = useState('')

  // Step 2
  const [primaryColor, setPrimaryColor] = useState(BRAND_COLORS[0])

  // Step 3
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member')
  const [inviteSent, setInviteSent] = useState(false)

  function slugify(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50)
  }

  function handleNameChange(name: string) {
    setWorkspaceName(name)
    setWorkspaceSlug(slugify(name))
  }

  // ── Step navigation ───────────────────────────────────────

  function handleNext() {
    setError(null)
    if (step === 1) submitStep1()
    else if (step === 2) submitStep2()
    else if (step === 3) setStep(4)
    else finish()
  }

  function submitStep1() {
    if (!workspaceName.trim()) { setError('Workspace name is required.'); return }

    startTransition(async () => {
      const res = await saveWorkspaceStep({ name: workspaceName, slug: workspaceSlug })
      if (res.error) { setError(res.error); return }
      setStep(2)
    })
  }

  function submitStep2() {
    startTransition(async () => {
      const res = await saveBrandingStep({ primary_color: primaryColor })
      if (res.error) { setError(res.error); return }
      setStep(3)
    })
  }

  function handleSendInvite() {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) { setError('Enter a valid email address.'); return }
    setError(null)

    startTransition(async () => {
      const res = await inviteTeamMember({ email: inviteEmail, role: inviteRole })
      if (res.error) { setError(res.error); return }
      setInviteSent(true)
      toast({ title: 'Invite sent', description: `${inviteEmail} will receive an invitation email.` })
    })
  }

  function finish() {
    startTransition(async () => {
      const res = await completeOnboarding()
      if (res.error) { setError(res.error); return }
      router.push('/dashboard')
      router.refresh()
    })
  }

  // ── Progress bar ──────────────────────────────────────────

  const progress = ((step - 1) / (STEPS.length - 1)) * 100

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Top bar */}
      <div className="border-b px-6 py-4 flex items-center justify-between">
        <span className="text-lg font-bold tracking-tight">GemLancer</span>
        <span className="text-sm text-muted-foreground">Step {step} of {STEPS.length}</span>
      </div>

      {/* Progress */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step tabs */}
      <div className="border-b px-6 py-3 hidden sm:flex items-center gap-6">
        {STEPS.map((s) => (
          <div
            key={s.id}
            className={`flex items-center gap-2 text-sm transition-colors ${
              step === s.id ? 'text-foreground font-medium' : step > s.id ? 'text-muted-foreground' : 'text-muted-foreground/50'
            }`}
          >
            <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
              step > s.id
                ? 'bg-primary text-primary-foreground'
                : step === s.id
                ? 'border-2 border-primary text-primary'
                : 'border-2 border-muted-foreground/30 text-muted-foreground/50'
            }`}>
              {step > s.id ? <Check className="h-3.5 w-3.5" /> : s.id}
            </div>
            {s.label}
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-start justify-center p-6 pt-12">
        <div className="w-full max-w-lg space-y-8">

          {/* ── Step 1: Workspace ── */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">Name your workspace</h1>
                  <p className="text-sm text-muted-foreground">This is how your team and clients will see you.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ws-name">Workspace Name</Label>
                  <Input
                    id="ws-name"
                    placeholder="Acme Studio"
                    value={workspaceName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ws-slug">Workspace URL</Label>
                  <div className="flex items-center rounded-md border border-input overflow-hidden">
                    <span className="bg-muted px-3 py-2 text-sm text-muted-foreground border-r border-input whitespace-nowrap">
                      app.gemlancer.com/
                    </span>
                    <Input
                      id="ws-slug"
                      className="border-0 rounded-none focus-visible:ring-0"
                      value={workspaceSlug}
                      onChange={(e) => setWorkspaceSlug(slugify(e.target.value))}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Lowercase letters, numbers, and hyphens only.</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Branding ── */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Palette className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">Choose your brand color</h1>
                  <p className="text-sm text-muted-foreground">Used in the client portal and email communications.</p>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Brand Color</Label>
                <div className="grid grid-cols-6 gap-2">
                  {BRAND_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setPrimaryColor(color)}
                      className={`h-10 w-10 rounded-lg transition-all ${
                        primaryColor === color
                          ? 'ring-2 ring-offset-2 ring-foreground scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <div className="h-10 w-10 rounded-lg border" style={{ backgroundColor: primaryColor }} />
                  <div>
                    <p className="text-sm font-medium">Selected color</p>
                    <p className="text-xs text-muted-foreground font-mono">{primaryColor}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Team ── */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">Invite your team</h1>
                  <p className="text-sm text-muted-foreground">Optional — you can do this later in Settings → Team.</p>
                </div>
              </div>

              {inviteSent ? (
                <div className="flex items-center gap-3 rounded-xl border border-green-200 dark:border-green-800/40 bg-green-50 dark:bg-green-900/10 p-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">Invite sent to {inviteEmail}</p>
                    <button className="text-xs text-green-600 underline" onClick={() => { setInviteSent(false); setInviteEmail('') }}>
                      Invite another person
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="invite-email">Email Address</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="colleague@company.com"
                      value={inviteEmail}
                      onChange={(e) => { setInviteEmail(e.target.value); setError(null) }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Role</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['member', 'admin'] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setInviteRole(r)}
                          className={`rounded-lg border p-3 text-left transition-colors ${
                            inviteRole === r ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                          }`}
                        >
                          <p className="text-sm font-medium capitalize">{r}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {r === 'admin' ? 'Full access except billing' : 'Projects, tasks & time'}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleSendInvite}
                    disabled={isPending}
                  >
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Send Invite
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ── Step 4: Get Started ── */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Rocket className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">You&apos;re all set!</h1>
                  <p className="text-sm text-muted-foreground">GemLancer is ready. Here&apos;s what to do first.</p>
                </div>
              </div>

              <div className="divide-y rounded-xl border overflow-hidden">
                {[
                  { icon: '👤', title: 'Add your first client', desc: 'Go to Clients → New Client' },
                  { icon: '📁', title: 'Create a project', desc: 'Go to Projects → New Project' },
                  { icon: '🧾', title: 'Send your first invoice', desc: 'Go to Invoices → New Invoice' },
                  { icon: '⏱️', title: 'Start tracking time', desc: 'Use the floating timer on any project' },
                ].map((item) => (
                  <div key={item.title} className="flex items-center gap-4 px-4 py-3 bg-card">
                    <span className="text-xl">{item.icon}</span>
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                Your 14-day free trial is active. No credit card required yet.{' '}
                <a href="/settings/billing" className="underline hover:text-foreground">View plans</a>
              </div>
            </div>
          )}

          {/* ── Error ── */}
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* ── Navigation ── */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {step > 1 && (
                <Button variant="ghost" onClick={() => { setStep(step - 1); setError(null) }} disabled={isPending}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {step === 3 && (
                <Button variant="ghost" onClick={() => { setStep(4); setError(null) }} disabled={isPending}>
                  <SkipForward className="mr-1 h-4 w-4" />
                  Skip
                </Button>
              )}
              <Button onClick={handleNext} disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {step === 4 ? 'Go to Dashboard' : (
                  <>Next <ChevronRight className="ml-1 h-4 w-4" /></>
                )}
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
