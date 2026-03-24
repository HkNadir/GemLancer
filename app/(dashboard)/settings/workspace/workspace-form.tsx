'use client'

import { useState, useTransition } from 'react'
import { Check, Loader2, Lock } from 'lucide-react'
import { updateWorkspaceName, updateBrandColor, updateCustomDomain } from '@/lib/settings/white-label-actions'
import { BrandColorPicker } from '@/components/app/settings/brand-color-picker'
import { LogoUpload } from '@/components/app/settings/logo-upload'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface WorkspaceFormProps {
  name: string
  logoUrl: string | null
  primaryColor: string
  customDomain: string
  plan: 'starter' | 'pro' | 'agency'
}

export function WorkspaceForm({
  name: initialName,
  logoUrl: initialLogo,
  primaryColor: initialColor,
  customDomain: initialDomain,
  plan,
}: WorkspaceFormProps) {
  const [name, setName] = useState(initialName)
  const [logoUrl, setLogoUrl] = useState(initialLogo)
  const [color, setColor] = useState(initialColor)
  const [domain, setDomain] = useState(initialDomain)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const isAgency = plan === 'agency'

  function showSaved(section: string) {
    setSaved(section)
    setTimeout(() => setSaved(null), 3000)
  }

  function handleSaveName() {
    if (!name.trim()) { setError('Name is required'); return }
    setError(null)
    startTransition(async () => {
      const result = await updateWorkspaceName(name)
      if (result.error) { setError(result.error); return }
      showSaved('name')
    })
  }

  function handleSaveColor() {
    setError(null)
    startTransition(async () => {
      const result = await updateBrandColor(color)
      if (result.error) { setError(result.error); return }
      showSaved('color')
    })
  }

  function handleSaveDomain() {
    setError(null)
    startTransition(async () => {
      const result = await updateCustomDomain(domain)
      if (result.error) { setError(result.error); return }
      showSaved('domain')
    })
  }

  return (
    <div className="space-y-8">
      {/* Logo */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Logo</h2>
        <LogoUpload
          currentUrl={logoUrl}
          workspaceName={name}
          onUploaded={(url) => setLogoUrl(url)}
        />
      </section>

      {/* Name */}
      <section className="space-y-3 border-t pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Workspace Name</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <Button onClick={handleSaveName} disabled={pending} variant="outline">
            {saved === 'name' ? <Check className="h-4 w-4 text-green-500" /> : pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </div>
      </section>

      {/* Brand color */}
      <section className="space-y-3 border-t pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Brand Color</h2>
        <p className="text-xs text-muted-foreground">Applied to your client portal and branded documents.</p>
        <BrandColorPicker value={color} onChange={setColor} />
        <Button onClick={handleSaveColor} disabled={pending} variant="outline" className="gap-2">
          {saved === 'color' ? <><Check className="h-4 w-4 text-green-500" /> Saved</> : pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Color'}
        </Button>
      </section>

      {/* Custom domain — Agency only */}
      <section className="space-y-3 border-t pt-6">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Custom Domain</h2>
          {!isAgency && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
        {!isAgency ? (
          <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
            Custom domain is available on the{' '}
            <Link href="/settings/billing" className="text-primary hover:underline font-medium">
              Agency plan
            </Link>
            .
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Point a CNAME record from your domain to{' '}
              <code className="bg-muted px-1 rounded text-xs">portal.gemlancer.com</code>
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="portal.yourdomain.com"
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <Button onClick={handleSaveDomain} disabled={pending} variant="outline">
                {saved === 'domain' ? <Check className="h-4 w-4 text-green-500" /> : pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </>
        )}
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
