'use client'

/**
 * WeeklySummary — Recharts bar chart showing billable vs non-billable hours
 * per day for the current Mon–Sun week. Receives prepared data as props (server-side).
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts'

export interface WeeklyDay {
  day: string          // e.g. "Mon", "Tue"
  billable: number     // hours (decimal)
  nonBillable: number  // hours (decimal)
}

interface WeeklySummaryProps {
  data: WeeklyDay[]
  totalHours: number
  billableHours: number
  weekLabel: string  // e.g. "Mar 18 – Mar 24, 2026"
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-md">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {Number(p.value).toFixed(1)}h
        </p>
      ))}
    </div>
  )
}

export function WeeklySummary({
  data,
  totalHours,
  billableHours,
  weekLabel,
}: WeeklySummaryProps) {
  const nonBillableHours = totalHours - billableHours
  const billablePct = totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0

  return (
    <div className="rounded-xl border bg-card p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-semibold">Weekly Summary</p>
          <p className="text-xs text-muted-foreground mt-0.5">{weekLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums">{totalHours.toFixed(1)}h</p>
          <p className="text-xs text-muted-foreground">{billablePct}% billable</p>
        </div>
      </div>

      {/* Stat pills */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 rounded-lg bg-green-50 dark:bg-green-900/20 px-3 py-2">
          <p className="text-xs text-green-700 dark:text-green-400 font-medium">Billable</p>
          <p className="text-lg font-bold text-green-700 dark:text-green-400 tabular-nums">
            {billableHours.toFixed(1)}h
          </p>
        </div>
        <div className="flex-1 rounded-lg bg-muted px-3 py-2">
          <p className="text-xs text-muted-foreground font-medium">Non-billable</p>
          <p className="text-lg font-bold tabular-nums">{nonBillableHours.toFixed(1)}h</p>
        </div>
      </div>

      {/* Bar chart */}
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} barGap={2} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}h`}
            width={28}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="square"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
          />
          <Bar dataKey="billable" name="Billable" fill="#16a34a" radius={[3, 3, 0, 0]} />
          <Bar dataKey="nonBillable" name="Non-billable" fill="#94a3b8" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
