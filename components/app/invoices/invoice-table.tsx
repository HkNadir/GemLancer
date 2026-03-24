'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { InvoiceStatusBadge } from './status-badge'
import { markInvoicePaid, cancelInvoice, duplicateInvoice } from '@/lib/invoices/actions'
import { useToast } from '@/hooks/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MoreHorizontal,
  Eye,
  Pencil,
  CheckCircle,
  Copy,
  XCircle,
  ExternalLink,
} from 'lucide-react'
import type { InvoiceListItem } from '@/lib/invoices/queries'

// ── Helpers ────────────────────────────────────────────────────

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ── Row actions ────────────────────────────────────────────────

function InvoiceRowActions({ invoice }: { invoice: InvoiceListItem }) {
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  function handleMarkPaid() {
    startTransition(async () => {
      const result = await markInvoicePaid(invoice.id)
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Invoice marked as paid' })
      }
    })
  }

  function handleCancel() {
    if (!confirm('Cancel this invoice? This cannot be undone.')) return
    startTransition(async () => {
      const result = await cancelInvoice(invoice.id)
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Invoice cancelled' })
      }
    })
  }

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicateInvoice(invoice.id)
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Invoice duplicated' })
        router.push(`/invoices/${result.id}/edit`)
      }
    })
  }

  const canEdit = invoice.status === 'draft'
  const canMarkPaid = invoice.status === 'sent' || invoice.status === 'overdue'
  const canCancel = invoice.status !== 'paid' && invoice.status !== 'cancelled'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted transition-colors"
          disabled={isPending}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Invoice actions</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem asChild className="gap-2">
          <Link href={`/invoices/${invoice.id}`}>
            <Eye className="h-3.5 w-3.5" />
            View
          </Link>
        </DropdownMenuItem>
        {canEdit && (
          <DropdownMenuItem asChild className="gap-2">
            <Link href={`/invoices/${invoice.id}/edit`}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Link>
          </DropdownMenuItem>
        )}
        {invoice.stripe_payment_link && (
          <DropdownMenuItem asChild className="gap-2">
            <a href={invoice.stripe_payment_link} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              Payment link
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {canMarkPaid && (
          <DropdownMenuItem onClick={handleMarkPaid} className="gap-2" disabled={isPending}>
            <CheckCircle className="h-3.5 w-3.5" />
            Mark as paid
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleDuplicate} className="gap-2" disabled={isPending}>
          <Copy className="h-3.5 w-3.5" />
          Duplicate
        </DropdownMenuItem>
        {canCancel && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleCancel}
              className="gap-2 text-destructive focus:text-destructive"
              disabled={isPending}
            >
              <XCircle className="h-3.5 w-3.5" />
              Cancel invoice
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ── Main table ─────────────────────────────────────────────────

interface InvoiceTableProps {
  invoices: InvoiceListItem[]
}

export function InvoiceTable({ invoices }: InvoiceTableProps) {
  if (invoices.length === 0) return null

  return (
    <div className="rounded-xl border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Invoice</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Client</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">
              Project
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">
              Due
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
            <th className="px-4 py-3 w-10" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {invoices.map((inv) => (
            <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
              <td className="px-4 py-3">
                <Link
                  href={`/invoices/${inv.id}`}
                  className="font-medium hover:underline"
                >
                  {inv.number}
                </Link>
                {inv.recurring_interval && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ↻ {inv.recurring_interval}
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <p className="font-medium">{inv.client?.name ?? '—'}</p>
                {inv.client?.company && (
                  <p className="text-xs text-muted-foreground">{inv.client.company}</p>
                )}
              </td>
              <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                {inv.project?.name ?? '—'}
              </td>
              <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                {formatDate(inv.due_date)}
              </td>
              <td className="px-4 py-3">
                <InvoiceStatusBadge status={inv.status} />
              </td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">
                {formatCurrency(inv.total, inv.currency)}
              </td>
              <td className="px-4 py-3">
                <InvoiceRowActions invoice={inv} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
