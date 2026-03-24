import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, Pencil, Download, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InvoicePreview } from '@/components/app/invoices/invoice-preview'
import { SendDialog } from '@/components/app/invoices/send-dialog'
import { getInvoiceById } from '@/lib/invoices/queries'
import { stripeConfig } from '@/lib/config'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return { title: `Invoice — GemLancer` }
}

export default async function InvoiceDetailPage({
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
  const [invoice, tenantData] = await Promise.all([
    getInvoiceById(id, tenantId),
    supabase
      .from('tenants')
      .select('name, logo_url, primary_color')
      .eq('id', tenantId)
      .single()
      .then((r) => r.data),
  ])

  if (!invoice) notFound()

  const tenant = {
    name: tenantData?.name ?? 'My Company',
    logo_url: tenantData?.logo_url ?? null,
    primary_color: tenantData?.primary_color ?? null,
  }

  const canEdit = invoice.status === 'draft'
  const canSend = invoice.status === 'draft' || invoice.status === 'sent'
  let hasStripe = false
  try { stripeConfig.secretKey; hasStripe = true } catch { hasStripe = false }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      {/* Breadcrumb + actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/invoices"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Invoices
        </Link>

        <div className="flex items-center gap-2">
          {/* Download PDF */}
          <a
            href={`/api/invoices/${id}/pdf`}
            className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border hover:bg-muted transition-colors"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </a>

          {/* Edit (draft only) */}
          {canEdit && (
            <Button variant="outline" asChild className="gap-2">
              <Link href={`/invoices/${params.id}/edit`}>
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            </Button>
          )}

          {/* Send */}
          {canSend && (
            <SendDialog
              invoiceId={id}
              invoiceNumber={invoice.number}
              clientName={invoice.client?.name ?? ''}
              hasStripe={hasStripe}
              total={invoice.total}
              currency={invoice.currency}
            />
          )}
        </div>
      </div>

      {/* Invoice preview */}
      <InvoicePreview invoice={invoice} tenant={tenant} />
    </div>
  )
}
