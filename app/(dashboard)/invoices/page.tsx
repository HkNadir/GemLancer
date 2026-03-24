import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InvoiceTable } from '@/components/app/invoices/invoice-table'
import { getInvoices, getInvoiceStats } from '@/lib/invoices/queries'

export const metadata = { title: 'Invoices — GemLancer' }

const STATUS_TABS = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'sent' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Paid', value: 'paid' },
  { label: 'Cancelled', value: 'cancelled' },
]

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount)
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; client?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const tenantId = user?.app_metadata?.tenant_id as string

  const { status, client } = await searchParams
  const activeStatus = status ?? 'all'

  const [invoices, stats] = await Promise.all([
    getInvoices(tenantId, {
      status: activeStatus !== 'all' ? activeStatus : undefined,
      client_id: client,
    }),
    getInvoiceStats(tenantId),
  ])

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage invoices, send payment links, and track revenue.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/invoices/new">
            <Plus className="h-4 w-4" />
            New invoice
          </Link>
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          {
            label: 'Revenue (paid)',
            value: formatCurrency(stats.totalRevenue),
            color: 'text-green-600',
          },
          { label: 'Outstanding (sent)', value: formatCurrency(stats.sent), color: '' },
          {
            label: 'Overdue',
            value: formatCurrency(stats.overdue),
            color: stats.overdue > 0 ? 'text-red-600' : '',
          },
          { label: 'Draft', value: formatCurrency(stats.draft), color: 'text-muted-foreground' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-semibold mt-0.5 tabular-nums ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === 'all' ? '/invoices' : `/invoices?status=${tab.value}`}
            className={`px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeStatus === tab.value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Invoice table or empty state */}
      {invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
            <FileText className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold">
            {activeStatus === 'all' ? 'No invoices yet' : `No ${activeStatus} invoices`}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-xs">
            {activeStatus === 'all'
              ? 'Create your first invoice and start getting paid.'
              : `No invoices with status "${activeStatus}" found.`}
          </p>
          {activeStatus === 'all' && (
            <Button asChild className="mt-4 gap-2" size="sm">
              <Link href="/invoices/new">
                <Plus className="h-4 w-4" />
                New invoice
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <InvoiceTable invoices={invoices} />
      )}
    </div>
  )
}
