'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { createMilestone } from '@/lib/projects/actions'

const schema = z.object({
  name:            z.string().min(1, 'Name required').max(200),
  description:     z.string().max(2000).optional(),
  due_date:        z.string().optional(),
  payment_percent: z.string().optional(),
})

type F = z.infer<typeof schema>

interface Props {
  projectId: string
  onSaved: () => void
  onCancel: () => void
}

export function MilestoneForm({ projectId, onSaved, onCancel }: Props) {
  const [isPending, startTransition] = useTransition()
  const { register, handleSubmit, formState: { errors } } = useForm<F>({ resolver: zodResolver(schema) })

  const onSubmit = (values: F) => {
    startTransition(async () => {
      await createMilestone({
        project_id: projectId,
        name: values.name,
        description: values.description,
        due_date: values.due_date || undefined,
        payment_percent: values.payment_percent ? parseFloat(values.payment_percent) : undefined,
      })
      onSaved()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="rounded-xl border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold">New Milestone</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Name *</label>
          <input
            {...register('name')}
            placeholder="Phase 1 — Discovery"
            className="w-full text-sm border rounded-md px-3 py-1.5 bg-background outline-none focus:ring-1 focus:ring-ring"
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Due Date</label>
          <input type="date" {...register('due_date')}
            className="w-full text-sm border rounded-md px-3 py-1.5 bg-background" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Payment %</label>
          <input type="number" min={0} max={100} step={1} placeholder="e.g. 30"
            {...register('payment_percent')}
            className="w-full text-sm border rounded-md px-3 py-1.5 bg-background" />
        </div>
        <div className="sm:col-span-2 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Description</label>
          <textarea rows={2} {...register('description')}
            className="w-full text-sm border rounded-md px-3 py-1.5 bg-background resize-none outline-none focus:ring-1 focus:ring-ring" />
        </div>
      </div>
      <div className="flex items-center gap-2 justify-end">
        <button type="button" onClick={onCancel}
          className="text-sm px-3 py-1.5 rounded-md border hover:bg-muted transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={isPending}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Create Milestone
        </button>
      </div>
    </form>
  )
}
