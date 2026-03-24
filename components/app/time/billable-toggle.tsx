'use client'

import { useState, useTransition } from 'react'
import { updateTimeLog } from '@/lib/time/actions'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { DollarSign } from 'lucide-react'

interface BillableToggleProps {
  logId: string
  initialBillable: boolean
  disabled?: boolean
}

export function BillableToggle({ logId, initialBillable, disabled }: BillableToggleProps) {
  const [billable, setBillable] = useState(initialBillable)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  function handleToggle() {
    if (disabled || isPending) return

    const next = !billable
    setBillable(next) // optimistic

    startTransition(async () => {
      const result = await updateTimeLog(logId, { billable: next })
      if (result.error) {
        setBillable(!next) // revert
        toast({ title: 'Failed to update', description: result.error, variant: 'destructive' })
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={disabled || isPending}
      title={billable ? 'Billable — click to mark non-billable' : 'Non-billable — click to mark billable'}
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium transition-colors',
        billable
          ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
          : 'bg-muted text-muted-foreground hover:bg-muted/80',
        (disabled || isPending) && 'opacity-50 cursor-not-allowed'
      )}
    >
      <DollarSign className="h-3 w-3" />
      {billable ? 'Billable' : 'Non-billable'}
    </button>
  )
}
