import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { InvoiceBuilder } from '@/components/app/invoices/invoice-builder'
import { getClientsForInvoice } from '@/lib/invoices/queries'

export const metadata = { title: 'New Invoice — GemLancer' }

export default async function NewInvoicePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const tenantId = user?.app_metadata?.tenant_id as string

  const clients = await getClientsForInvoice(tenantId)

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      {/* Breadcrumb */}
      <Link
        href="/invoices"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ChevronLeft className="h-4 w-4" />
        Invoices
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Invoice</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create a new invoice with line items, tax, and optional Stripe payment link.
        </p>
      </div>

      <InvoiceBuilder mode="create" clients={clients} />
    </div>
  )
}
