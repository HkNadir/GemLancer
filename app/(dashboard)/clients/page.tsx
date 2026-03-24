import Link from 'next/link'
import { Plus, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getClients } from '@/lib/clients/queries'
import { TagBadge } from '@/components/app/clients/tag-badge'
import type { ClientTag } from '@/types/database'

export const metadata = { title: 'Clients — GemLancer' }

const TAG_FILTERS: { value: string; label: string }[] = [
  { value: 'all',      label: 'All' },
  { value: 'vip',      label: 'VIP' },
  { value: 'active',   label: 'Active' },
  { value: 'new',      label: 'New' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'inactive', label: 'Inactive' },
]

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; q?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const tenantId = user?.app_metadata?.tenant_id as string

  const { tag, q } = await searchParams
  const activeTag = (tag ?? 'all') as ClientTag | 'all'
  const search = q ?? ''

  const clients = await getClients(tenantId, activeTag, search)

  return (
    <div className="flex flex-col gap-6 p-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {clients.length} {clients.length === 1 ? 'client' : 'clients'}
            {activeTag !== 'all' ? ` tagged ${activeTag}` : ''}
          </p>
        </div>
        <Link
          href="/clients/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Client
        </Link>
      </div>

      {/* ── Filters + Search ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Tag filter tabs */}
        <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/30 overflow-x-auto">
          {TAG_FILTERS.map((f) => (
            <Link
              key={f.value}
              href={f.value === 'all' ? '/clients' : `/clients?tag=${f.value}`}
              className={`px-3 py-1 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                activeTag === f.value
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        {/* Search */}
        <form className="flex-1 max-w-xs">
          <input
            name="q"
            defaultValue={search}
            placeholder="Search name, email, company…"
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          {activeTag !== 'all' && (
            <input type="hidden" name="tag" value={activeTag} />
          )}
        </form>
      </div>

      {/* ── Table ── */}
      {clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
            <Users className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold">No clients found</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-xs">
            {search
              ? `No clients match "${search}". Try a different search.`
              : 'Add your first client to get started.'}
          </p>
          {!search && (
            <Link
              href="/clients/new"
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add your first client
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Tag</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Currency</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Invoiced</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Projects</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-muted/30 transition-colors group">
                  {/* Name + email + company */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs uppercase">
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <Link
                          href={`/clients/${client.id}`}
                          className="font-medium hover:underline"
                        >
                          {client.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {client.company ? `${client.company} · ` : ''}{client.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Tag */}
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <TagBadge tag={client.tag} />
                  </td>

                  {/* Currency */}
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                    {client.currency}
                  </td>

                  {/* Total invoiced */}
                  <td className="px-4 py-3 hidden md:table-cell text-right tabular-nums">
                    {client.total_invoiced > 0
                      ? formatCurrency(client.total_invoiced, client.currency)
                      : <span className="text-muted-foreground">—</span>
                    }
                  </td>

                  {/* Project count */}
                  <td className="px-4 py-3 hidden lg:table-cell text-right text-muted-foreground">
                    {client.project_count}
                    {client.open_invoice_count > 0 && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                        {client.open_invoice_count} open
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/clients/${client.id}`}
                        className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        View
                      </Link>
                      <Link
                        href={`/clients/${client.id}/edit`}
                        className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
