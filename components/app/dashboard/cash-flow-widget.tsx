'use client'

import Link from 'next/link'
import { DollarSign, ArrowRight, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCurrency } from '@/lib/utils'
import type { CashFlowItem } from '@/lib/dashboard/queries'

interface CashFlowWidgetProps {
  items: CashFlowItem[]
}

export function CashFlowWidget({ items }: CashFlowWidgetProps) {
  const total = items.reduce((sum, i) => sum + i.total, 0)
  const overdueTotal = items
    .filter((i) => i.status === 'overdue')
    .reduce((sum, i) => sum + i.total, 0)

  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Cash Flow Forecast
            </CardTitle>
            <CardDescription>Next 30 days</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(total)}
            </p>
            {overdueTotal > 0 && (
              <p className="text-xs text-red-500 font-medium">
                {formatCurrency(overdueTotal)} overdue
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-6 text-center">
            <DollarSign className="mb-2 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No open invoices due in 30 days</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[220px]">
            <div className="divide-y">
              {items.map((item) => {
                const isOverdue = item.daysUntilDue < 0
                const isDueToday = item.daysUntilDue === 0
                const isUrgent = item.daysUntilDue <= 3

                return (
                  <Link
                    key={item.id}
                    href={`/invoices/${item.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-foreground truncate">
                          {item.client_name}
                        </p>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          #{item.number}
                        </span>
                      </div>
                      <p className={cn(
                        'text-xs mt-0.5',
                        isOverdue ? 'text-red-500 font-medium' :
                        isDueToday ? 'text-orange-500 font-medium' :
                        isUrgent ? 'text-yellow-600' :
                        'text-muted-foreground'
                      )}>
                        {isOverdue
                          ? `${Math.abs(item.daysUntilDue)}d overdue`
                          : isDueToday
                            ? 'Due today'
                            : `Due in ${item.daysUntilDue}d`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(isOverdue || isDueToday) && (
                        <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                      )}
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrency(item.total, item.currency)}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </ScrollArea>
        )}
        <div className="border-t px-4 py-2">
          <Link
            href="/invoices?status=sent,overdue"
            className="flex items-center justify-center gap-1 text-xs text-gem-600 hover:text-gem-700 hover:underline"
          >
            View all open invoices <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

export function CashFlowWidgetSkeleton() {
  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader className="pb-2">
        <div className="flex justify-between">
          <div className="space-y-1">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      </CardHeader>
      <CardContent className="p-0 divide-y">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5">
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
