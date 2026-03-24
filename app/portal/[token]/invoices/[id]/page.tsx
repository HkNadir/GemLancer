import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { validatePortalToken, getPortalInvoice, getPortalTenant } from '@/lib/portal/queries'

export default async function PortalInvoiceDetailPage({
  params,
}: {
  params: Promise<{ token: string; id: string }>
}) {
  const { token, id: invoiceId } = await params
  const session = await validatePortalToken(token)
  if (!session) notFound()

  const [invoice, tenant] = await Promise.all([
    getPortalInvoice(session.tenantId, session.clientId, invoiceId),
    getPortalTenant(session.tenantId),
  ])
  if (!invoice) notFound()

  const inv = invoice as any
  const items = inv.invoice_items ?? []
  const subtotal = items.reduce((s: number, i: any) => s + i.quantity * i.unit_price, 0)
  const taxAmount = subtotal * ((inv.tax_rate ?? 0) / 100)
  const discount = inv.discount_amount ?? 0
  const total = subtotal + taxAmount - discount

  const accentColor = tenant?.primary_color ?? '#6366f1'

  function fmt(amount: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: inv.currency.toUpperCase(),
      minimumFractionDigits: 2,
    }).format(amount)
  }

  function fmtDate(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const isPaid = inv.status === 'paid'

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/portal/${token}/invoices`} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Invoices
        </Link>
      </div>

      <div className="rounded-xl border overflow-hidden">
        {/* Accent bar */}
        <div className="h-1.5" style={{ background: accentColor }} />

        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-2xl font-bold" style={{ color: accentColor }}>{tenant?.name ?? 'Invoice'}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">INVOICE</p>
              <p className="text-muted-foreground">{inv.number}</p>
              <span className={`inline-flex mt-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {inv.status}
              </span>
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Issue Date</p>
              <p className="font-medium">{fmtDate(inv.issue_date)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Due Date</p>
              <p className={`font-medium ${inv.status === 'overdue' ? 'text-destructive' : ''}`}>
                {fmtDate(inv.due_date)}
              </p>
            </div>
            {inv.payment_link_url && !isPaid && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Payment</p>
                <a
                  href={inv.payment_link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                  style={{ color: accentColor }}
                >
                  Pay Now →
                </a>
              </div>
            )}
          </div>

          {/* Line items */}
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2" style={{ borderColor: accentColor }}>
                <th className="text-left py-2 font-semibold text-muted-foreground">Description</th>
                <th className="text-right py-2 font-semibold text-muted-foreground w-16">Qty</th>
                <th className="text-right py-2 font-semibold text-muted-foreground w-28">Price</th>
                <th className="text-right py-2 font-semibold text-muted-foreground w-28">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any) => (
                <tr key={item.id} className="border-b border-muted">
                  <td className="py-3">{item.description}</td>
                  <td className="py-3 text-right text-muted-foreground">{item.quantity}</td>
                  <td className="py-3 text-right text-muted-foreground">{fmt(item.unit_price)}</td>
                  <td className="py-3 text-right font-medium">{fmt(item.quantity * item.unit_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-56 space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{fmt(subtotal)}</span>
              </div>
              {(inv.tax_rate ?? 0) > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax ({inv.tax_rate}%)</span>
                  <span>{fmt(taxAmount)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>−{fmt(discount)}</span>
                </div>
              )}
              <div
                className="flex justify-between font-bold text-lg pt-2 border-t-2"
                style={{ borderColor: accentColor, color: accentColor }}
              >
                <span>Total</span>
                <span>{fmt(total)}</span>
              </div>
            </div>
          </div>

          {inv.notes && (
            <div className="border-t pt-4 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">Notes</p>
              <p className="whitespace-pre-wrap">{inv.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
