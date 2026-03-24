import { BarChart3 } from 'lucide-react'

export const metadata = { title: 'Reports — GemLancer' }

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Revenue, time, and project analytics across your business.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
          <BarChart3 className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold">Reports coming soon</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-xs">
          Detailed revenue breakdowns, time utilization reports, and client profitability analysis will appear here.
        </p>
      </div>
    </div>
  )
}
