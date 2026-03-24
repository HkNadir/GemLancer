/**
 * InvoicePreview — print-ready invoice layout.
 * Used on the invoice detail page and by the PDF export route.
 * Intentionally uses inline-compatible styles to survive PDF rendering.
 */

import { InvoiceStatusBadge } from './status-badge'
import type { InvoiceDetail } from '@/lib/invoices/queries'

interface Tenant {
  name: string
  logo_url: string | null
  primary_color: string | null
}

interface InvoicePreviewProps {
  invoice: InvoiceDetail
  tenant: Tenant
}

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
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function InvoicePreview({ invoice, tenant }: InvoicePreviewProps) {
  const subtotal = invoice.items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const taxAmount = subtotal * ((invoice.tax_rate ?? 0) / 100)
  const discount = invoice.discount_amount ?? 0
  const total = subtotal + taxAmount - discount

  const accentColor = tenant.primary_color ?? '#6366f1'

  return (
    <div
      className="bg-white text-gray-900 rounded-xl border shadow-sm overflow-hidden print:shadow-none print:border-0"
      id="invoice-preview"
    >
      {/* Header bar */}
      <div
        className="h-2"
        style={{ backgroundColor: accentColor }}
      />

      <div className="p-8 sm:p-12 space-y-8">
        {/* Top: company + invoice label */}
        <div className="flex flex-col sm:flex-row sm:justify-between gap-6">
          <div>
            {tenant.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tenant.logo_url}
                alt={tenant.name}
                className="h-10 w-auto object-contain mb-2"
              />
            ) : (
              <div
                className="text-xl font-bold mb-2"
                style={{ color: accentColor }}
              >
                {tenant.name}
              </div>
            )}
          </div>

          <div className="text-right">
            <div className="flex items-center sm:justify-end gap-2 mb-1">
              <span className="text-2xl font-bold text-gray-900">INVOICE</span>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <p className="text-lg font-semibold text-gray-500">{invoice.number}</p>
          </div>
        </div>

        {/* Dates + client */}
        <div className="grid sm:grid-cols-3 gap-6 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">Bill To</p>
            <p className="font-semibold text-gray-900">{invoice.client?.name ?? '—'}</p>
            {invoice.client?.company && (
              <p className="text-gray-500">{invoice.client.company}</p>
            )}
            {invoice.project && (
              <p className="text-gray-400 mt-1 text-xs">Project: {invoice.project.name}</p>
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">Issue Date</p>
            <p className="font-medium">{formatDate(invoice.issue_date)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">Due Date</p>
            <p
              className="font-medium"
              style={
                invoice.status === 'overdue'
                  ? { color: '#dc2626' }
                  : undefined
              }
            >
              {formatDate(invoice.due_date)}
            </p>
          </div>
        </div>

        {/* Line items table */}
        <div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `2px solid ${accentColor}` }}>
                <th className="text-left py-2 font-semibold text-gray-600">Description</th>
                <th className="text-right py-2 font-semibold text-gray-600 w-16">Qty</th>
                <th className="text-right py-2 font-semibold text-gray-600 w-28">Unit Price</th>
                <th className="text-right py-2 font-semibold text-gray-600 w-28">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoice.items.map((item, i) => (
                <tr key={item.id ?? i}>
                  <td className="py-3 pr-4">{item.description}</td>
                  <td className="py-3 text-right tabular-nums text-gray-500">
                    {item.quantity}
                  </td>
                  <td className="py-3 text-right tabular-nums text-gray-500">
                    {formatCurrency(item.unit_price, invoice.currency)}
                  </td>
                  <td className="py-3 text-right tabular-nums font-medium">
                    {formatCurrency(item.quantity * item.unit_price, invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-full sm:w-64 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span className="tabular-nums">{formatCurrency(subtotal, invoice.currency)}</span>
            </div>
            {invoice.tax_rate > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Tax ({invoice.tax_rate}%)</span>
                <span className="tabular-nums">{formatCurrency(taxAmount, invoice.currency)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span className="tabular-nums">−{formatCurrency(discount, invoice.currency)}</span>
              </div>
            )}
            <div
              className="flex justify-between font-bold text-base pt-2 border-t-2"
              style={{ borderColor: accentColor }}
            >
              <span>Total</span>
              <span className="tabular-nums" style={{ color: accentColor }}>
                {formatCurrency(total, invoice.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="text-sm text-gray-500 border-t pt-6">
            <p className="font-semibold text-gray-700 mb-1">Notes</p>
            <p className="whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {/* Payment link */}
        {invoice.stripe_payment_link && invoice.status !== 'paid' && (
          <div className="rounded-lg p-4 text-center" style={{ backgroundColor: `${accentColor}15` }}>
            <p className="text-sm font-medium mb-2" style={{ color: accentColor }}>
              Pay online
            </p>
            <a
              href={invoice.stripe_payment_link}
              target="_blank"
              rel="noreferrer"
              className="inline-block px-5 py-2 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: accentColor }}
            >
              Pay now →
            </a>
          </div>
        )}

        {/* Footer */}
        <div className="text-xs text-center text-gray-300 border-t pt-4">
          Generated by GemLancer
        </div>
      </div>
    </div>
  )
}
