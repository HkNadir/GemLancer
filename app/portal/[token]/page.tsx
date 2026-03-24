import { notFound } from 'next/navigation'
import Link from 'next/link'
import { validatePortalToken, getPortalProjects, getPortalInvoices } from '@/lib/portal/queries'
import { FolderKanban, FileText, Clock } from 'lucide-react'

export const metadata = { title: 'Client Portal', robots: { index: false, follow: false } }

export default async function PortalOverviewPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const session = await validatePortalToken(token)
  if (!session) notFound()

  const [projects, invoices] = await Promise.all([
    getPortalProjects(session.tenantId, session.clientId),
    getPortalInvoices(session.tenantId, session.clientId),
  ])

  const outstandingInvoices = invoices.filter(
    (i: any) => i.status === 'sent' || i.status === 'overdue'
  )
  const overdueInvoices = invoices.filter((i: any) => i.status === 'overdue')
  const activeProjects = projects.filter((p: any) => p.status === 'active')

  function fmt(amount: number, currency: string) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(amount)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your project summary and outstanding items
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <FolderKanban className="h-4 w-4" />
            Active Projects
          </div>
          <p className="text-3xl font-bold">{activeProjects.length}</p>
        </div>
        <div className="rounded-xl border p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <FileText className="h-4 w-4" />
            Outstanding Invoices
          </div>
          <p className="text-3xl font-bold">{outstandingInvoices.length}</p>
          {overdueInvoices.length > 0 && (
            <p className="text-xs text-destructive mt-1">{overdueInvoices.length} overdue</p>
          )}
        </div>
        <div className="rounded-xl border p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Clock className="h-4 w-4" />
            Total Projects
          </div>
          <p className="text-3xl font-bold">{projects.length}</p>
        </div>
      </div>

      {/* Outstanding invoices alert */}
      {outstandingInvoices.length > 0 && (
        <div className="rounded-xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950 p-4 space-y-2">
          <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
            You have {outstandingInvoices.length} outstanding {outstandingInvoices.length === 1 ? 'invoice' : 'invoices'}
          </p>
          {outstandingInvoices.slice(0, 3).map((inv: any) => (
            <div key={inv.id} className="flex items-center justify-between text-sm">
              <Link
                href={`/portal/${token}/invoices/${inv.id}`}
                className="text-yellow-800 dark:text-yellow-200 hover:underline font-medium"
              >
                {inv.number}
              </Link>
              <span className="text-yellow-700 dark:text-yellow-300">
                {fmt(inv.total, inv.currency)}
                {inv.status === 'overdue' && (
                  <span className="ml-2 text-xs text-red-600 dark:text-red-400 font-medium">OVERDUE</span>
                )}
              </span>
            </div>
          ))}
          {outstandingInvoices.length > 3 && (
            <Link href={`/portal/${token}/invoices`} className="text-xs text-yellow-700 dark:text-yellow-300 hover:underline">
              View all invoices →
            </Link>
          )}
        </div>
      )}

      {/* Active projects */}
      {activeProjects.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Active Projects</h2>
          <div className="space-y-2">
            {activeProjects.map((p: any) => (
              <Link
                key={p.id}
                href={`/portal/${token}/projects/${p.id}`}
                className="flex items-center justify-between rounded-xl border p-4 hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="font-medium text-sm">{p.name}</p>
                  {p.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.description}</p>
                  )}
                </div>
                <span className="text-xs rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 font-medium">
                  Active
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
