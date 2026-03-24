import { cn } from '@/lib/utils'
import type { ClientTag } from '@/types/database'

const tagConfig: Record<ClientTag, { label: string; className: string }> = {
  vip:      { label: 'VIP',      className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  active:   { label: 'Active',   className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  new:      { label: 'New',      className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  prospect: { label: 'Prospect', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
}

export function TagBadge({
  tag,
  className,
}: {
  tag: ClientTag
  className?: string
}) {
  const config = tagConfig[tag] ?? tagConfig.active
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}

export { tagConfig }
