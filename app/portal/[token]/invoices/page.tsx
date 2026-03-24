import { notFound } from 'next/navigation'
import Link from 'next/link'
import { validatePortalToken, getPortalInvoices } from '@/lib/portal/queries'

export default async function PortalInvoicesPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const session = await validatePortalToken(token)
  if (!session) notFound()

  const invoices = await getPortalInvoices(session.tenantId, session.clientId)

  const statusBadge: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    sent: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
    viewed: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
    paid: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
    overdue: 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400',
  }

  function fmt(amount: number, currency: string) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(amount)
  }

  function fmtDate(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>

      {invoices.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 py-16 text-center">
          <p className="text-sm font-medium">No invoices yet</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Invoice</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Issued</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Due</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoices.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/portal/${token}/invoices/${inv.id}`}
                      className="font-medium hover:underline text-primary"
                    >
                      {inv.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    {fmtDate(inv.issue_date)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    {fmtDate(inv.due_date)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadge[inv.status] ?? 'bg-muted text-muted-foreground'}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {fmt(inv.total, inv.currency)}
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
