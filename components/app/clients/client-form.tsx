'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { createClient_, updateClient } from '@/lib/clients/actions'
import type { Client, ClientTag } from '@/types/database'

// ── Validation schema ─────────────────────────────────────────

const clientSchema = z.object({
  name:     z.string().min(1, 'Name is required').max(200),
  email:    z.string().email('Invalid email address'),
  company:  z.string().max(200).optional(),
  phone:    z.string().max(50).optional(),
  address:  z.string().max(300).optional(),
  city:     z.string().max(100).optional(),
  country:  z.string().min(2).max(2).default('US'),
  currency: z.string().min(3).max(3).default('USD'),
  tag:      z.enum(['vip', 'active', 'new', 'prospect', 'inactive']).default('new'),
  notes:    z.string().max(5000).optional(),
})

type ClientFormValues = z.infer<typeof clientSchema>

// ── Data ──────────────────────────────────────────────────────

const CURRENCIES = [
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'GBP', label: 'GBP — British Pound' },
  { code: 'CAD', label: 'CAD — Canadian Dollar' },
  { code: 'AUD', label: 'AUD — Australian Dollar' },
  { code: 'CHF', label: 'CHF — Swiss Franc' },
  { code: 'JPY', label: 'JPY — Japanese Yen' },
  { code: 'SGD', label: 'SGD — Singapore Dollar' },
  { code: 'AED', label: 'AED — UAE Dirham' },
  { code: 'SAR', label: 'SAR — Saudi Riyal' },
]

const COUNTRIES = [
  { code: 'US', label: 'United States' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'CA', label: 'Canada' },
  { code: 'AU', label: 'Australia' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
  { code: 'NL', label: 'Netherlands' },
  { code: 'CH', label: 'Switzerland' },
  { code: 'SG', label: 'Singapore' },
  { code: 'AE', label: 'United Arab Emirates' },
  { code: 'SA', label: 'Saudi Arabia' },
  { code: 'IN', label: 'India' },
  { code: 'JP', label: 'Japan' },
  { code: 'BR', label: 'Brazil' },
  { code: 'MX', label: 'Mexico' },
  { code: 'ZA', label: 'South Africa' },
  { code: 'NG', label: 'Nigeria' },
  { code: 'KE', label: 'Kenya' },
  { code: 'PK', label: 'Pakistan' },
  { code: 'PH', label: 'Philippines' },
  { code: 'OTHER', label: 'Other' },
]

const TAGS: { value: ClientTag; label: string }[] = [
  { value: 'new',      label: 'New' },
  { value: 'active',   label: 'Active' },
  { value: 'vip',      label: 'VIP' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'inactive', label: 'Inactive' },
]

// ── Props ─────────────────────────────────────────────────────

interface ClientFormProps {
  /** Pass existing client to switch into edit mode */
  client?: Client
}

// ── Component ─────────────────────────────────────────────────

export function ClientForm({ client }: ClientFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const isEdit = Boolean(client)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name:     client?.name ?? '',
      email:    client?.email ?? '',
      company:  client?.company ?? '',
      phone:    client?.phone ?? '',
      address:  client?.address ?? '',
      city:     client?.city ?? '',
      country:  client?.country ?? 'US',
      currency: client?.currency ?? 'USD',
      tag:      (client?.tag as ClientTag) ?? 'new',
      notes:    client?.notes ?? '',
    },
  })

  const onSubmit = (values: ClientFormValues) => {
    setServerError(null)

    startTransition(async () => {
      const result = isEdit
        ? await updateClient(client!.id, values)
        : await createClient_(values)

      if ('error' in result) {
        setServerError(result.error)
        return
      }

      toast({
        title: isEdit ? 'Client updated' : 'Client created',
        description: isEdit
          ? `${values.name} has been updated.`
          : `${values.name} has been added to your clients.`,
      })

      if (isEdit) {
        router.push(`/clients/${client!.id}`)
      } else {
        router.push(`/clients/${'id' in result ? result.id : ''}`)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

      {/* ── Contact Information ─────────────────────────── */}
      <section className="rounded-xl border bg-card p-6">
        <h2 className="text-sm font-semibold mb-4">Contact Information</h2>
        <div className="grid gap-4 sm:grid-cols-2">

          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
            <Input
              id="name"
              placeholder="Jane Smith"
              autoComplete="off"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email Address <span className="text-destructive">*</span></Label>
            <Input
              id="email"
              type="email"
              placeholder="jane@company.com"
              autoComplete="off"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              placeholder="Acme Corp"
              {...register('company')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 555 000 0000"
              {...register('phone')}
            />
          </div>

        </div>
      </section>

      {/* ── Address ────────────────────────────────────── */}
      <section className="rounded-xl border bg-card p-6">
        <h2 className="text-sm font-semibold mb-4">Address</h2>
        <div className="grid gap-4 sm:grid-cols-2">

          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="address">Street Address</Label>
            <Input id="address" placeholder="123 Main St" {...register('address')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="city">City</Label>
            <Input id="city" placeholder="New York" {...register('city')} />
          </div>

          <div className="space-y-1.5">
            <Label>Country</Label>
            <Select
              value={watch('country')}
              onValueChange={(v) => setValue('country', v, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

        </div>
      </section>

      {/* ── Business Details ────────────────────────────── */}
      <section className="rounded-xl border bg-card p-6">
        <h2 className="text-sm font-semibold mb-4">Business Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">

          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Select
              value={watch('currency')}
              onValueChange={(v) => setValue('currency', v, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Tag</Label>
            <Select
              value={watch('tag')}
              onValueChange={(v) => setValue('tag', v as ClientTag, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select tag" />
              </SelectTrigger>
              <SelectContent>
                {TAGS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

        </div>
      </section>

      {/* ── Notes ──────────────────────────────────────── */}
      <section className="rounded-xl border bg-card p-6">
        <h2 className="text-sm font-semibold mb-4">Internal Notes</h2>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="Any internal notes about this client..."
            rows={4}
            {...register('notes')}
          />
          <p className="text-xs text-muted-foreground">
            Only visible to your team — never shown in the client portal.
          </p>
        </div>
      </section>

      {/* ── Server error ────────────────────────────────── */}
      {serverError && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      {/* ── Actions ────────────────────────────────────── */}
      <div className="flex items-center gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? 'Save Changes' : 'Create Client'}
        </Button>
      </div>

    </form>
  )
}
