'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createInvoice, updateInvoice, type LineItem } from '@/lib/invoices/actions'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Trash2, Plus, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────

interface Client {
  id: string
  name: string
  company: string | null
  currency: string
}

interface Project {
  id: string
  name: string
}

interface InvoiceBuilderProps {
  mode: 'create' | 'edit'
  invoiceId?: string    // required for edit
  clients: Client[]
  // Pre-filled values for edit mode
  defaultValues?: {
    client_id: string
    project_id?: string
    currency: string
    tax_rate: number
    discount_amount: number
    due_date?: string
    notes?: string
    recurring_interval?: string
    items: LineItem[]
  }
}

// ── Currency options ───────────────────────────────────────────

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'INR', 'MXN']
const RECURRING = ['', 'monthly', 'quarterly', 'yearly']

// ── Line item row ──────────────────────────────────────────────

interface LineItemRowProps {
  item: LineItem & { _key: string }
  index: number
  onChange: (key: string, field: keyof LineItem, value: string | number) => void
  onRemove: (key: string) => void
  canRemove: boolean
}

function LineItemRow({ item, index, onChange, onRemove, canRemove }: LineItemRowProps) {
  const lineTotal = item.quantity * item.unit_price

  return (
    <div className="grid grid-cols-[auto_1fr_80px_100px_80px_auto] items-start gap-2">
      <span className="mt-2.5 text-muted-foreground">
        <GripVertical className="h-4 w-4" />
      </span>
      <div>
        <Input
          placeholder={`Item ${index + 1} description`}
          value={item.description}
          onChange={(e) => onChange(item._key, 'description', e.target.value)}
          required
        />
      </div>
      <div>
        <Input
          type="number"
          min="0.01"
          step="0.01"
          value={item.quantity}
          onChange={(e) => onChange(item._key, 'quantity', parseFloat(e.target.value) || 0)}
          placeholder="Qty"
          className="text-right"
        />
      </div>
      <div>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={item.unit_price}
          onChange={(e) => onChange(item._key, 'unit_price', parseFloat(e.target.value) || 0)}
          placeholder="Unit price"
          className="text-right"
        />
      </div>
      <div className="mt-2.5 text-right text-sm font-medium tabular-nums">
        {lineTotal.toFixed(2)}
      </div>
      <button
        type="button"
        onClick={() => onRemove(item._key)}
        disabled={!canRemove}
        className={cn(
          'mt-2 h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive transition-colors',
          !canRemove && 'opacity-30 cursor-not-allowed'
        )}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────

export function InvoiceBuilder({
  mode,
  invoiceId,
  clients,
  defaultValues,
}: InvoiceBuilderProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const genKey = () => Math.random().toString(36).slice(2)

  // Form state
  const [clientId, setClientId] = useState(defaultValues?.client_id ?? '')
  const [projectId, setProjectId] = useState(defaultValues?.project_id ?? '')
  const [currency, setCurrency] = useState(defaultValues?.currency ?? 'USD')
  const [taxRate, setTaxRate] = useState(defaultValues?.tax_rate ?? 0)
  const [discount, setDiscount] = useState(defaultValues?.discount_amount ?? 0)
  const [dueDate, setDueDate] = useState(defaultValues?.due_date ?? '')
  const [notes, setNotes] = useState(defaultValues?.notes ?? '')
  const [recurring, setRecurring] = useState(defaultValues?.recurring_interval ?? '')
  const [items, setItems] = useState<(LineItem & { _key: string })[]>(
    defaultValues?.items?.length
      ? defaultValues.items.map((i) => ({ ...i, _key: genKey() }))
      : [{ _key: genKey(), description: '', quantity: 1, unit_price: 0 }]
  )

  const [projects, setProjects] = useState<Project[]>([])

  // Auto-set currency from client
  useEffect(() => {
    const client = clients.find((c) => c.id === clientId)
    if (client && !defaultValues?.currency) {
      setCurrency(client.currency || 'USD')
    }
  }, [clientId, clients, defaultValues?.currency])

  // Fetch projects when client changes
  useEffect(() => {
    if (!clientId) {
      setProjects([])
      setProjectId('')
      return
    }
    const supabase = createClient()
    supabase
      .from('projects')
      .select('id, name')
      .eq('client_id', clientId)
      .order('name')
      .then(({ data }) => {
        setProjects(data ?? [])
        if (!defaultValues?.project_id) setProjectId('')
      })
  }, [clientId, defaultValues?.project_id])

  // Line item handlers
  function addItem() {
    setItems((prev) => [
      ...prev,
      { _key: genKey(), description: '', quantity: 1, unit_price: 0 },
    ])
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i._key !== key))
  }

  function updateItem(key: string, field: keyof LineItem, value: string | number) {
    setItems((prev) =>
      prev.map((i) => (i._key === key ? { ...i, [field]: value } : i))
    )
  }

  // Totals
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const taxAmount = subtotal * (taxRate / 100)
  const total = subtotal + taxAmount - discount

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const payload = {
      client_id: clientId,
      project_id: projectId || undefined,
      currency,
      tax_rate: taxRate,
      discount_amount: discount,
      due_date: dueDate || undefined,
      notes: notes || undefined,
      recurring_interval: recurring || undefined,
      items: items.map(({ _key, ...i }) => i),
    }

    startTransition(async () => {
      if (mode === 'create') {
        const result = await createInvoice(payload)
        if (result.error) {
          toast({ title: 'Error', description: result.error, variant: 'destructive' })
        } else {
          toast({ title: 'Invoice created' })
          router.push(`/invoices/${result.id}`)
        }
      } else {
        const result = await updateInvoice(invoiceId!, payload)
        if (result.error) {
          toast({ title: 'Error', description: result.error, variant: 'destructive' })
        } else {
          toast({ title: 'Invoice updated' })
          router.push(`/invoices/${invoiceId}`)
        }
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Client + Project */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold">Invoice details</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="ib-client">Client *</Label>
            <select
              id="ib-client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
              className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.company ? ` (${c.company})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ib-project">Project (optional)</Label>
            <select
              id="ib-project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={!clientId}
              className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            >
              <option value="">None</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ib-due">Due date</Label>
            <Input
              id="ib-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ib-currency">Currency</Label>
            <select
              id="ib-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ib-recurring">Recurring</Label>
            <select
              id="ib-recurring"
              value={recurring}
              onChange={(e) => setRecurring(e.target.value)}
              className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">One-time</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Line items</h2>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[auto_1fr_80px_100px_80px_auto] gap-2 text-xs text-muted-foreground font-medium">
          <span />
          <span>Description</span>
          <span className="text-right">Qty</span>
          <span className="text-right">Unit price</span>
          <span className="text-right">Total</span>
          <span />
        </div>

        <div className="space-y-2">
          {items.map((item, idx) => (
            <LineItemRow
              key={item._key}
              item={item}
              index={idx}
              onChange={updateItem}
              onRemove={removeItem}
              canRemove={items.length > 1}
            />
          ))}
        </div>

        <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-2">
          <Plus className="h-3.5 w-3.5" />
          Add line item
        </Button>
      </div>

      {/* Totals + tax + discount */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Notes */}
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="ib-notes">Notes / payment terms</Label>
            <textarea
              id="ib-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="e.g. Payment due within 30 days. Bank transfer preferred."
              className="w-full text-sm border rounded-md px-3 py-2 bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Summary */}
          <div className="sm:w-56 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums font-medium">
                {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currency}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">Tax (%)</span>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                className="w-20 text-right h-7 text-sm"
              />
            </div>

            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">Discount</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-24 text-right h-7 text-sm"
              />
            </div>

            <div className="flex justify-between text-sm font-bold border-t pt-2">
              <span>Total</span>
              <span className="tabular-nums text-base">
                {total.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currency}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || !clientId || items.length === 0}>
          {isPending
            ? mode === 'create'
              ? 'Creating…'
              : 'Saving…'
            : mode === 'create'
            ? 'Create invoice'
            : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}
