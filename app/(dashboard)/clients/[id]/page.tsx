import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft,
  Mail,
  Phone,
  MapPin,
  Building2,
  Pencil,
  FolderKanban,
  Receipt,
  Clock,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import {
  getClientById,
  getClientStats,
  getClientProjects,
  getClientInvoices,
} from '@/lib/clients/queries'
import { TagBadge } from '@/components/app/clients/tag-badge'
import type { ProjectStatus, InvoiceStatus } from '@/types/database'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return { title: 'Client — GemLancer' }
}

// ── Status helpers ────────────────────────────────────────────

const PROJECT_STATUS: Record<ProjectStatus, { label: string; className: string }> = {
  draft:     { label: 'Draft',     className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  active:    { label: 'Active',    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  on_hold:   { label: 'On Hold',   className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  completed: { label: 'Completed', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
}

const INVOICE_STATUS: Record<InvoiceStatus, { label: string; className: string }> = {
  draft:     { label: 'Draft',     className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  sent:      { label: 'Sent',      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  viewed:    { label: 'Viewed',    className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  paid:      { label: 'Paid',      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  overdue:   { label: 'Overdue',   className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

// ── Page ──────────────────────────────────────────────────────

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const tenantId = user?.app_metadata?.tenant_id as string

  const [{ id }, { tab }] = await Promise.all([params, searchParams])
  const activeTab = tab ?? 'overview'

  const [client, stats, projects, invoices] = await Promise.all([
    getClientById(tenantId, id),
    getClientStats(tenantId, id),
    getClientProjects(tenantId, id),
    getClientInvoices(tenantId, id),
  ])

  if (!client) notFound()

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'projects', label: `Projects (${projects.length})` },
    { key: 'invoices', label: `Invoices (${invoices.length})` },
  ]

  return (
    <div className="flex flex-col gap-6 p-6">

      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/clients" className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Clients
        </Link>
      </div>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        {/* Avatar */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-xl uppercase">
          {client.name.charAt(0)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
            <TagBadge tag={client.tag} />
            {!client.is_active && (
              <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                Inactive
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {client.company && (
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                {client.company}
              </span>
            )}
            <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 hover:text-foreground">
              <Mail className="h-3.5 w-3.5" />
              {client.email}
            </a>
            {client.phone && (
              <a href={`tel:${client.phone}`} className="flex items-center gap-1.5 hover:text-foreground">
                <Phone className="h-3.5 w-3.5" />
                {client.phone}
              </a>
            )}
            {(client.city || client.country) && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {[client.city, client.country].filter(Boolean).join(', ')}
              </span>
            )}
          </div>
        </div>

        {/* Edit button */}
        <Link
          href={`/clients/${client.id}/edit`}
          className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition-colors shrink-0"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Link>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Projects',
            value: stats.total_projects,
            sub: `${stats.active_projects} active`,
            icon: FolderKanban,
          },
          {
            label: 'Total Invoiced',
            value: formatCurrency(stats.total_invoiced, client.currency),
            sub: `${formatCurrency(stats.total_paid, client.currency)} paid`,
            icon: Receipt,
          },
          {
            label: 'Outstanding',
            value: formatCurrency(stats.total_outstanding, client.currency),
            sub: stats.total_outstanding > 0 ? 'awaiting payment' : 'all clear',
            icon: Receipt,
            highlight: stats.total_outstanding > 0,
          },
          {
            label: 'Time Logged',
            value: formatMinutes(stats.total_logged_minutes),
            sub: 'across all projects',
            icon: Clock,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl border p-4 ${stat.highlight ? 'border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/10' : 'bg-card'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`h-4 w-4 ${stat.highlight ? 'text-amber-600' : 'text-muted-foreground'}`} />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <p className={`text-xl font-semibold tabular-nums ${stat.highlight ? 'text-amber-700 dark:text-amber-400' : ''}`}>
              {stat.value}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="border-b flex gap-1">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/clients/${client.id}?tab=${tab.key}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* ── Tab content ── */}

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Contact details card */}
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <h3 className="text-sm font-semibold">Contact Details</h3>
            <dl className="space-y-2 text-sm">
              {[
                { label: 'Email',    value: client.email },
                { label: 'Phone',    value: client.phone ?? '—' },
                { label: 'Company',  value: client.company ?? '—' },
                { label: 'Address',  value: [client.address, client.city, client.country].filter(Boolean).join(', ') || '—' },
                { label: 'Currency', value: client.currency },
                { label: 'Member since', value: new Date(client.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) },
              ].map(({ label, value }) => (
                <div key={label} className="flex gap-2">
                  <dt className="w-28 shrink-0 text-muted-foreground">{label}</dt>
                  <dd className="font-medium break-all">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Notes card */}
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Internal Notes</h3>
              <Link
                href={`/clients/${client.id}/edit`}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Edit
              </Link>
            </div>
            {client.notes ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{client.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No notes added.</p>
            )}
          </div>
        </div>
      )}

      {/* Projects */}
      {activeTab === 'projects' && (
        <div>
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-16 text-center">
              <FolderKanban className="h-8 w-8 text-muted-foreground mb-3" />
              <h3 className="text-sm font-semibold">No projects yet</h3>
              <p className="mt-1 text-xs text-muted-foreground">Create a project and assign it to this client.</p>
              <Link
                href="/projects/new"
                className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                New Project
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Project</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Budget</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {projects.map((p) => {
                    const ps = PROJECT_STATUS[p.status]
                    return (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <Link href={`/projects/${p.id}`} className="font-medium hover:underline">
                            {p.name}
                          </Link>
                          {p.end_date && (
                            <p className="text-xs text-muted-foreground">
                              Due {new Date(p.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ps.className}`}>
                            {ps.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-right text-muted-foreground tabular-nums">
                          {p.budget ? formatCurrency(p.budget, p.currency) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden hidden sm:block">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${p.progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
                              {p.progress}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Invoices */}
      {activeTab === 'invoices' && (
        <div>
          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-16 text-center">
              <Receipt className="h-8 w-8 text-muted-foreground mb-3" />
              <h3 className="text-sm font-semibold">No invoices yet</h3>
              <p className="mt-1 text-xs text-muted-foreground">Create an invoice for this client to start getting paid.</p>
              <Link
                href="/invoices/new"
                className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                New Invoice
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Invoice</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Due</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoices.map((inv) => {
                    const is = INVOICE_STATUS[inv.status]
                    return (
                      <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <Link href={`/invoices/${inv.id}`} className="font-medium hover:underline">
                            {inv.number}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            Issued {new Date(inv.issue_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${is.className}`}>
                            {is.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-right text-muted-foreground">
                          {new Date(inv.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3 text-right font-medium tabular-nums">
                          {formatCurrency(inv.total, inv.currency)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
