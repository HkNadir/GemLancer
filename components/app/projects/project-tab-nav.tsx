'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '',            label: 'Overview'   },
  { href: '/kanban',     label: 'Board'      },
  { href: '/milestones', label: 'Milestones' },
  { href: '/timeline',   label: 'Timeline'   },
  { href: '/time',       label: 'Time'       },
  { href: '/files',      label: 'Files'      },
]

export function ProjectTabNav({ projectId }: { projectId: string }) {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-0 -mb-px overflow-x-auto">
      {TABS.map((tab) => {
        const href = `/projects/${projectId}${tab.href}`
        // Active: exact match for overview, prefix match for others
        const isActive = tab.href === ''
          ? pathname === href
          : pathname.startsWith(href)

        return (
          <Link
            key={tab.href}
            href={href}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              isActive
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
