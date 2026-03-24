'use client'

import Link from 'next/link'
import { UserPlus, FileText, PlayCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const ACTIONS = [
  {
    label: 'New Client',
    icon: UserPlus,
    href: '/clients/new',
    description: 'Add a client',
    color: 'text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 dark:text-blue-400',
  },
  {
    label: 'New Invoice',
    icon: FileText,
    href: '/invoices/new',
    description: 'Create invoice',
    color: 'text-gem-600 bg-gem-50 hover:bg-gem-100 dark:bg-gem-950/30 dark:hover:bg-gem-950/50 dark:text-gem-400',
  },
  {
    label: 'Start Timer',
    icon: PlayCircle,
    href: '/time',
    description: 'Track time',
    color: 'text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-950/30 dark:hover:bg-green-950/50 dark:text-green-400',
  },
]

export function QuickActions() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-2">
        {ACTIONS.map((action) => {
          const Icon = action.icon
          return (
            <Link key={action.label} href={action.href} className="group">
              <div
                className={`flex flex-col items-center gap-2 rounded-xl p-3 transition-colors ${action.color}`}
              >
                <Icon className="h-6 w-6" />
                <div className="text-center">
                  <p className="text-xs font-semibold leading-tight">{action.label}</p>
                  <p className="text-[10px] opacity-70 leading-tight">{action.description}</p>
                </div>
              </div>
            </Link>
          )
        })}
      </CardContent>
    </Card>
  )
}
