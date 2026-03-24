'use client'

/**
 * Revenue chart — monthly, last 12 months.
 * Uses Recharts (AreaChart for invoiced, BarChart overlay for paid).
 */

import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { RevenueDataPoint } from '@/lib/dashboard/queries'

function formatCurrency(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value}`
}

interface RevenueChartProps {
  data: RevenueDataPoint[]
}

export function RevenueChart({ data }: RevenueChartProps) {
  const totalInvoiced = data.reduce((sum, d) => sum + d.invoiced, 0)
  const totalPaid = data.reduce((sum, d) => sum + d.paid, 0)

  return (
    <Card className="col-span-full lg:col-span-4">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Revenue</CardTitle>
            <CardDescription>Last 12 months</CardDescription>
          </div>
          <div className="flex gap-4 text-right">
            <div>
              <p className="text-xs text-muted-foreground">Invoiced</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(totalInvoiced)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Collected</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(totalPaid)}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="invoicedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--gem-500, 262 52% 47%))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--gem-500, 262 52% 47%))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              className="fill-muted-foreground"
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              className="fill-muted-foreground"
              width={52}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                `$${value.toLocaleString()}`,
                name === 'invoiced' ? 'Invoiced' : 'Paid',
              ]}
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid hsl(var(--border))',
                backgroundColor: 'hsl(var(--popover))',
                color: 'hsl(var(--popover-foreground))',
                fontSize: 12,
              }}
            />
            <Legend
              iconSize={8}
              iconType="circle"
              formatter={(value) => (value === 'invoiced' ? 'Invoiced' : 'Paid')}
              wrapperStyle={{ fontSize: 12 }}
            />
            <Area
              type="monotone"
              dataKey="invoiced"
              stroke="hsl(262, 52%, 47%)"
              strokeWidth={2}
              fill="url(#invoicedGradient)"
              dot={false}
            />
            <Bar
              dataKey="paid"
              fill="hsl(142, 76%, 36%)"
              radius={[3, 3, 0, 0]}
              maxBarSize={16}
              opacity={0.85}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function RevenueChartSkeleton() {
  return (
    <Card className="col-span-full lg:col-span-4">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex gap-4">
            <div className="space-y-1 text-right">
              <Skeleton className="h-3 w-14 ml-auto" />
              <Skeleton className="h-6 w-20 ml-auto" />
            </div>
            <div className="space-y-1 text-right">
              <Skeleton className="h-3 w-14 ml-auto" />
              <Skeleton className="h-6 w-20 ml-auto" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[240px] w-full" />
      </CardContent>
    </Card>
  )
}
