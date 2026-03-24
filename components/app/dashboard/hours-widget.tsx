'use client'

import { TrendingUp, TrendingDown, Minus, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { HoursStats } from '@/lib/dashboard/queries'

function formatHours(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

interface HoursWidgetProps {
  stats: HoursStats
}

export function HoursWidget({ stats }: HoursWidgetProps) {
  const { thisWeekMinutes, lastWeekMinutes, percentChange, billableMinutes } = stats

  const billablePercent =
    thisWeekMinutes > 0 ? Math.round((billableMinutes / thisWeekMinutes) * 100) : 0

  const TrendIcon =
    percentChange == null
      ? Minus
      : percentChange > 0
        ? TrendingUp
        : percentChange < 0
          ? TrendingDown
          : Minus

  const trendColor =
    percentChange == null
      ? 'text-muted-foreground'
      : percentChange > 0
        ? 'text-green-600'
        : percentChange < 0
          ? 'text-red-500'
          : 'text-muted-foreground'

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Hours This Week
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-4xl font-bold text-foreground tabular-nums">
              {formatHours(thisWeekMinutes)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              vs {formatHours(lastWeekMinutes)} last week
            </p>
          </div>

          <div className={cn('flex items-center gap-1 text-sm font-medium', trendColor)}>
            <TrendIcon className="h-4 w-4" />
            {percentChange != null && `${Math.abs(percentChange)}%`}
          </div>
        </div>

        {/* Billable bar */}
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Billable</span>
            <span className="font-medium text-foreground">
              {formatHours(billableMinutes)} ({billablePercent}%)
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gem-600 transition-all duration-500"
              style={{ width: `${billablePercent}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function HoursWidgetSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-36" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-10 w-24 mb-1" />
        <Skeleton className="h-3 w-36 mb-4" />
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      </CardContent>
    </Card>
  )
}
