'use client'

import { useState, useTransition } from 'react'
import { sendInvoice } from '@/lib/invoices/actions'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Send, ExternalLink } from 'lucide-react'

interface SendDialogProps {
  invoiceId: string
  invoiceNumber: string
  clientName: string
  hasStripe: boolean   // whether STRIPE_SECRET_KEY is configured
  total: number
  currency: string
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount)
}

export function SendDialog({
  invoiceId,
  invoiceNumber,
  clientName,
  hasStripe,
  total,
  currency,
}: SendDialogProps) {
  const [open, setOpen] = useState(false)
  const [createStripeLink, setCreateStripeLink] = useState(hasStripe)
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  function handleSend() {
    startTransition(async () => {
      const result = await sendInvoice(invoiceId, { createStripeLink })
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: `Invoice ${invoiceNumber} marked as sent` })
        if (result.paymentUrl) {
          setPaymentUrl(result.paymentUrl)
        } else {
          setOpen(false)
        }
      }
    })
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Send className="h-4 w-4" />
        Send invoice
      </Button>

      <Dialog open={open} onOpenChange={(v) => !v && setOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {paymentUrl ? 'Invoice sent!' : `Send ${invoiceNumber}`}
            </DialogTitle>
          </DialogHeader>

          {paymentUrl ? (
            /* Success state — show payment link */
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                {invoiceNumber} has been marked as sent. Share the payment link with your client:
              </p>
              <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3">
                <code className="flex-1 text-xs break-all">{paymentUrl}</code>
                <a
                  href={paymentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0"
                >
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
              </div>
              <Button
                onClick={() => {
                  navigator.clipboard?.writeText(paymentUrl)
                  toast({ title: 'Copied to clipboard' })
                }}
                variant="outline"
                className="w-full"
              >
                Copy link
              </Button>
              <DialogFooter>
                <Button onClick={() => setOpen(false)}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            /* Confirm state */
            <div className="space-y-4 py-2">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client</span>
                  <span className="font-medium">{clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice</span>
                  <span className="font-medium">{invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold">{formatCurrency(total, currency)}</span>
                </div>
              </div>

              {hasStripe && (
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="sd-stripe"
                    checked={createStripeLink}
                    onCheckedChange={(v) => setCreateStripeLink(Boolean(v))}
                    className="mt-0.5"
                  />
                  <div>
                    <Label htmlFor="sd-stripe" className="font-normal cursor-pointer">
                      Generate Stripe payment link
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Creates a hosted payment page so your client can pay by card online.
                    </p>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                This will mark the invoice as <strong>Sent</strong>. You can still manually mark it
                as paid later.
              </p>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button onClick={handleSend} disabled={isPending} className="gap-2">
                  <Send className="h-4 w-4" />
                  {isPending ? 'Sending…' : 'Confirm & send'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
