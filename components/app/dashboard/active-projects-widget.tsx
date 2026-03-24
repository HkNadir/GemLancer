'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { ProjectsStats } from '@/lib/dashboard/queries'

interface StatusRingProps {
  value: number
  total: number
  color: string
  label: string
}

function StatusRing({ value, total, color, label }: StatusRingProps) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  const circumference = 2 * Math.PI * 20 // r=20
  const strokeDash = (pct / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative h-14 w-14">
        <svg viewBox="0 0 48 48" className="h-14 w-14 -rotate-90">
          <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/40" />
          <circle
            cx="24" cy="24" r="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeDasharray={`${strokeDash} ${circumference}`}
            strokeLinecap="round"
            className={color}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-foreground">{value}</span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground text-center leading-tight">{label}</span>
    </div>
  )
}

interface ActiveProjectsWidgetProps {
  stats: ProjectsStats
}

export function ActiveProjectsWidget({ stats }: ActiveProjectsWidgetProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Projects</CardTitle>
          <Link
            href="/projects"
            className="flex items-center gap-1 text-xs text-gem-600 hover:text-gem-700 hover:underline"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 text-center">
          <span className="text-4xl font-bold text-foreground">{stats.total}</span>
          <p className="text-xs text-muted-foreground mt-0.5">Total projects</p>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <StatusRing value={stats.active}    total={stats.total} color="text-gem-600"    label="Active" />
          <StatusRing value={stats.completed} total={stats.total} color="text-green-600"  label="Done" />
          <StatusRing value={stats.onHold}    total={stats.total} color="text-yellow-500" label="On Hold" />
          <StatusRing value={stats.draft}     total={stats.total} color="text-gray-400"   label="Draft" />
        </div>
      </CardContent>
    </Card>
  )
}

export function ActiveProjectsWidgetSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-20" />
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-col items-center gap-1">
          <Skeleton className="h-10 w-12" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <Skeleton className="h-14 w-14 rounded-full" />
              <Skeleton className="h-3 w-10" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
