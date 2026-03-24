'use client'

import Link from 'next/link'
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { SmartAlert } from '@/lib/dashboard/queries'

const ALERT_ICONS = {
  high:   { Icon: AlertTriangle, bg: 'bg-red-50 dark:bg-red-950/20',    border: 'border-red-200 dark:border-red-900',   icon: 'text-red-500' },
  medium: { Icon: Info,          bg: 'bg-yellow-50 dark:bg-yellow-950/20', border: 'border-yellow-200 dark:border-yellow-900', icon: 'text-yellow-500' },
}

interface SmartAlertsWidgetProps {
  alerts: SmartAlert[]
}

export function SmartAlertsWidget({ alerts }: SmartAlertsWidgetProps) {
  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          Smart Alerts
          {alerts.length > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
              {alerts.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No alerts</p>
            <p className="text-xs text-muted-foreground/70">Everything looks good</p>
          </div>
        ) : (
          alerts.map((alert, idx) => {
            const config = ALERT_ICONS[alert.urgency]
            const { Icon } = config
            return (
              <Link
                key={idx}
                href={alert.href}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-3 transition-opacity hover:opacity-80',
                  config.bg,
                  config.border
                )}
              >
                <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', config.icon)} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground leading-snug">
                    {alert.title}
                  </p>
                  {alert.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">
                      {alert.description}
                    </p>
                  )}
                </div>
              </Link>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

export function SmartAlertsWidgetSkeleton() {
  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-28" />
      </CardHeader>
      <CardContent className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
            <Skeleton className="mt-0.5 h-4 w-4 rounded shrink-0" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
