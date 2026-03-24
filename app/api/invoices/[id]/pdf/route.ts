import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveTenantId } from '@/lib/supabase/auth-context'
import { getInvoiceById } from '@/lib/invoices/queries'

/**
 * GET /api/invoices/[id]/pdf
 *
 * Returns an HTML page styled for print / PDF save.
 * For full PDF generation, integrate a headless browser library (e.g. Puppeteer)
 * or a PDF service (e.g. WeasyPrint, PDFShift) and swap the Response below.
 * The HTML output is already print-optimised with @media print styles.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = await resolveTenantId(supabase, user.id, user.app_metadata?.tenant_id)
  if (!tenantId) return NextResponse.json({ error: 'No tenant context' }, { status: 403 })

  const { id } = await params

  const [invoice, tenantRes] = await Promise.all([
    getInvoiceById(id, tenantId),
    supabase
      .from('tenants')
      .select('name, logo_url, primary_color')
      .eq('id', tenantId)
      .single(),
  ])

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  const tenant = {
    name: tenantRes.data?.name ?? 'My Company',
    logo_url: tenantRes.data?.logo_url ?? null,
    primary_color: tenantRes.data?.primary_color ?? '#6366f1',
  }

  const accentColor = tenant.primary_color ?? '#6366f1'

  const subtotal = invoice.items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const taxAmount = subtotal * ((invoice.tax_rate ?? 0) / 100)
  const discount = invoice.discount_amount ?? 0
  const total = subtotal + taxAmount - discount

  function fmt(amount: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: invoice!.currency.toUpperCase(),
      minimumFractionDigits: 2,
    }).format(amount)
  }

  function fmtDate(dateStr: string | null) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const itemsHtml = invoice.items
    .map(
      (item) => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #f1f5f9">${item.description}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f1f5f9;text-align:right">${item.quantity}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f1f5f9;text-align:right">${fmt(item.unit_price)}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600">${fmt(item.quantity * item.unit_price)}</td>
    </tr>`
    )
    .join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${invoice.number} — Invoice</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; background: white; }
    .page { max-width: 800px; margin: 0 auto; padding: 48px; }
    .accent-bar { height: 6px; background: ${accentColor}; margin-bottom: 48px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .company-name { font-size: 22px; font-weight: 800; color: ${accentColor}; }
    .invoice-label { font-size: 28px; font-weight: 800; color: #0f172a; }
    .invoice-number { font-size: 16px; color: #64748b; margin-top: 4px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 32px; margin-bottom: 40px; }
    .meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 4px; }
    .meta-value { font-size: 14px; font-weight: 600; color: #0f172a; }
    .meta-sub { font-size: 13px; color: #64748b; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
    th { font-size: 12px; font-weight: 600; color: #64748b; padding: 8px; text-align: left; border-bottom: 2px solid ${accentColor}; }
    th:not(:first-child) { text-align: right; }
    .totals { display: flex; justify-content: flex-end; }
    .totals-table { width: 260px; }
    .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
    .totals-label { color: #64748b; }
    .totals-total { font-size: 18px; font-weight: 800; color: ${accentColor}; border-top: 2px solid ${accentColor}; padding-top: 8px; margin-top: 8px; }
    .notes { margin-top: 40px; padding-top: 24px; border-top: 1px solid #f1f5f9; font-size: 13px; color: #64748b; }
    .notes-title { font-weight: 600; color: #374151; margin-bottom: 6px; }
    .footer { text-align: center; font-size: 11px; color: #cbd5e1; margin-top: 48px; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 24px; }
      @page { margin: 0; }
    }
  </style>
</head>
<body>
<div class="accent-bar"></div>
<div class="page">
  <div class="header">
    <div class="company-name">${tenant.name}</div>
    <div>
      <div class="invoice-label">INVOICE</div>
      <div class="invoice-number">${invoice.number}</div>
    </div>
  </div>

  <div class="meta">
    <div>
      <div class="meta-label">Bill To</div>
      <div class="meta-value">${invoice.client?.name ?? '—'}</div>
      ${invoice.client?.company ? `<div class="meta-sub">${invoice.client.company}</div>` : ''}
      ${invoice.project ? `<div class="meta-sub" style="margin-top:6px;font-size:12px;color:#94a3b8">Project: ${invoice.project.name}</div>` : ''}
    </div>
    <div>
      <div class="meta-label">Issue Date</div>
      <div class="meta-value">${fmtDate(invoice.issue_date)}</div>
    </div>
    <div>
      <div class="meta-label">Due Date</div>
      <div class="meta-value" style="${invoice.status === 'overdue' ? 'color:#dc2626' : ''}">${fmtDate(invoice.due_date)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th style="text-align:right;width:60px">Qty</th>
        <th style="text-align:right;width:120px">Unit Price</th>
        <th style="text-align:right;width:120px">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-table">
      <div class="totals-row">
        <span class="totals-label">Subtotal</span>
        <span>${fmt(subtotal)}</span>
      </div>
      ${invoice.tax_rate > 0 ? `<div class="totals-row"><span class="totals-label">Tax (${invoice.tax_rate}%)</span><span>${fmt(taxAmount)}</span></div>` : ''}
      ${discount > 0 ? `<div class="totals-row" style="color:#16a34a"><span>Discount</span><span>−${fmt(discount)}</span></div>` : ''}
      <div class="totals-row totals-total">
        <span>Total</span>
        <span>${fmt(total)}</span>
      </div>
    </div>
  </div>

  ${invoice.notes ? `<div class="notes"><div class="notes-title">Notes</div><p>${invoice.notes.replace(/\n/g, '<br>')}</p></div>` : ''}

  <div class="footer">Generated by GemLancer</div>
</div>
<script>window.onload = () => window.print()</script>
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
