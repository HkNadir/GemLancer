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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { createProject, updateProject } from '@/lib/projects/actions'
import type { Project, ProjectStatus } from '@/types/database'

const schema = z.object({
  name:        z.string().min(1, 'Project name is required').max(200),
  client_id:   z.string().uuid('Please select a client'),
  description: z.string().max(2000).optional(),
  status:      z.enum(['draft', 'active', 'on_hold', 'completed', 'cancelled']).default('draft'),
  budget:      z.string().optional(),
  currency:    z.string().length(3).default('USD'),
  start_date:  z.string().optional(),
  end_date:    z.string().optional(),
  template_id: z.string().uuid().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  project?: Project
  clients: { id: string; name: string; company: string | null; currency: string }[]
  templates?: { id: string; name: string; task_count: number }[]
}

const CURRENCIES = ['USD','EUR','GBP','CAD','AUD','CHF','JPY','SGD','AED']
const STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: 'draft',     label: 'Draft'     },
  { value: 'active',    label: 'Active'    },
  { value: 'on_hold',   label: 'On Hold'   },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export function ProjectForm({ project, clients, templates = [] }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const isEdit = Boolean(project)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:        project?.name ?? '',
      client_id:   project?.client_id ?? '',
      description: project?.description ?? '',
      status:      project?.status ?? 'draft',
      budget:      project?.budget?.toString() ?? '',
      currency:    project?.currency ?? 'USD',
      start_date:  project?.start_date?.slice(0, 10) ?? '',
      end_date:    project?.end_date?.slice(0, 10) ?? '',
    },
  })

  const onSubmit = (values: FormValues) => {
    setServerError(null)
    startTransition(async () => {
      try {
        if (isEdit) {
          await updateProject(project!.id, {
            name: values.name,
            description: values.description || null,
            status: values.status,
            budget: values.budget ? parseFloat(values.budget) : null,
            currency: values.currency,
            start_date: values.start_date || null,
            end_date: values.end_date || null,
          })
          toast({ title: 'Project updated' })
          router.push(`/projects/${project!.id}`)
        } else {
          const { id } = await createProject({
            name: values.name,
            client_id: values.client_id,
            description: values.description,
            status: values.status,
            budget: values.budget ? parseFloat(values.budget) : undefined,
            currency: values.currency,
            start_date: values.start_date || undefined,
            end_date: values.end_date || undefined,
            template_id: values.template_id,
          })
          toast({ title: 'Project created', description: values.name })
          router.push(`/projects/${id}`)
        }
      } catch (err) {
        setServerError(String(err))
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

      {/* Core */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold">Project Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Project Name <span className="text-destructive">*</span></Label>
            <Input placeholder="Website Redesign" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          {!isEdit && (
            <div className="space-y-1.5">
              <Label>Client <span className="text-destructive">*</span></Label>
              <Select value={watch('client_id')} onValueChange={(v) => setValue('client_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}{c.company ? ` — ${c.company}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.client_id && <p className="text-xs text-destructive">{errors.client_id.message}</p>}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={watch('status')} onValueChange={(v) => setValue('status', v as ProjectStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label>Description</Label>
            <Textarea placeholder="What is this project about?" rows={3} {...register('description')} />
          </div>
        </div>
      </div>

      {/* Dates & Budget */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold">Timeline & Budget</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Start Date</Label>
            <Input type="date" {...register('start_date')} />
          </div>
          <div className="space-y-1.5">
            <Label>End Date</Label>
            <Input type="date" {...register('end_date')} />
          </div>
          <div className="space-y-1.5">
            <Label>Budget</Label>
            <Input type="number" min={0} step={0.01} placeholder="0.00" {...register('budget')} />
          </div>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Select value={watch('currency')} onValueChange={(v) => setValue('currency', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Template (create only) */}
      {!isEdit && templates.length > 0 && (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold">Start from Template</h2>
          <p className="text-xs text-muted-foreground">Optionally pre-populate milestones and tasks.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {[{ id: '', name: 'Blank project', task_count: 0 }, ...templates].map((t) => (
              <button key={t.id} type="button"
                onClick={() => setValue('template_id', t.id || undefined)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  (watch('template_id') ?? '') === t.id
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted'
                }`}
              >
                <p className="text-sm font-medium">{t.name}</p>
                {t.task_count > 0 && (
                  <p className="text-xs text-muted-foreground">{t.task_count} tasks</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {serverError && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>Cancel</Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? 'Save Changes' : 'Create Project'}
        </Button>
      </div>
    </form>
  )
}
