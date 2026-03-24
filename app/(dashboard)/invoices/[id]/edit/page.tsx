import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { InvoiceBuilder } from '@/components/app/invoices/invoice-builder'
import { getInvoiceById, getClientsForInvoice } from '@/lib/invoices/queries'

export const metadata = { title: 'Edit Invoice — GemLancer' }

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const tenantId = user?.app_metadata?.tenant_id as string

  const { id } = await params
  const [invoice, clients] = await Promise.all([
    getInvoiceById(id, tenantId),
    getClientsForInvoice(tenantId),
  ])

  if (!invoice) notFound()

  // Only draft invoices can be edited
  if (invoice.status !== 'draft') {
    redirect(`/invoices/${id}`)
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/invoices" className="hover:text-foreground transition-colors">
          Invoices
        </Link>
        <span>/</span>
        <Link href={`/invoices/${params.id}`} className="hover:text-foreground transition-colors">
          {invoice.number}
        </Link>
        <span>/</span>
        <span className="text-foreground">Edit</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit {invoice.number}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Only draft invoices can be edited.
        </p>
      </div>

      <InvoiceBuilder
        mode="edit"
        invoiceId={params.id}
        clients={clients}
        defaultValues={{
          client_id: invoice.client?.id ?? '',
          project_id: invoice.project?.id,
          currency: invoice.currency,
          tax_rate: invoice.tax_rate,
          discount_amount: invoice.discount_amount ?? 0,
          due_date: invoice.due_date ?? undefined,
          notes: invoice.notes ?? undefined,
          recurring_interval: invoice.recurring_interval ?? undefined,
          items: invoice.items,
        }}
      />
    </div>
  )
}
