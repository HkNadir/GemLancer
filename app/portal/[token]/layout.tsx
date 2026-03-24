import { notFound } from 'next/navigation'
import Link from 'next/link'
import { validatePortalToken, getPortalTenant } from '@/lib/portal/queries'
import { FolderKanban, FileText, Files, MessageSquare } from 'lucide-react'

interface PortalLayoutProps {
  children: React.ReactNode
  params: Promise<{ token: string }>
}

export default async function PortalLayout({ children, params }: PortalLayoutProps) {
  const { token } = await params
  const session = await validatePortalToken(token)
  if (!session) notFound()

  const tenant = await getPortalTenant(session.tenantId)
  const accentColor = tenant?.primary_color ?? '#6366f1'

  const nav = [
    { href: `/portal/${token}`, label: 'Overview', icon: FolderKanban },
    { href: `/portal/${token}/projects`, label: 'Projects', icon: FolderKanban },
    { href: `/portal/${token}/invoices`, label: 'Invoices', icon: FileText },
    { href: `/portal/${token}/files`, label: 'Files', icon: Files },
    { href: `/portal/${token}/messages`, label: 'Messages', icon: MessageSquare },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header
        className="border-b px-6 py-3 flex items-center justify-between"
        style={{ borderBottomColor: `${accentColor}33` }}
      >
        <div className="flex items-center gap-3">
          {tenant?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tenant.logo_url} alt={tenant.name} className="h-8 w-auto object-contain" />
          ) : (
            <span className="font-bold text-lg" style={{ color: accentColor }}>
              {tenant?.name ?? 'Client Portal'}
            </span>
          )}
          <span className="text-xs text-muted-foreground border-l pl-3">Client Portal</span>
        </div>

        <span className="text-sm text-muted-foreground">
          Welcome, {session.clientName}
        </span>
      </header>

      {/* Nav */}
      <nav className="border-b px-6">
        <div className="flex gap-1 overflow-x-auto">
          {nav.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap border-b-2 border-transparent hover:border-primary"
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 p-6">{children}</main>

      {/* Footer */}
      <footer className="border-t px-6 py-4 text-center text-xs text-muted-foreground">
        Powered by {tenant?.name ?? 'GemLancer'} · Secure client portal
      </footer>
    </div>
  )
}
