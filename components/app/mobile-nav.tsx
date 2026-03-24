'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Briefcase, FileText, Clock, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface MobileNavItem {
  href: string
  label: string
  icon: React.ElementType
  badge?: number
}

interface MobileNavProps {
  unpaidInvoices?: number
}

export function MobileNav({ unpaidInvoices = 0 }: MobileNavProps) {
  const pathname = usePathname()

  const items: MobileNavItem[] = [
    { href: '/dashboard', label: 'Home',     icon: LayoutDashboard },
    { href: '/projects',  label: 'Projects', icon: Briefcase },
    { href: '/invoices',  label: 'Invoices', icon: FileText, badge: unpaidInvoices },
    { href: '/time',      label: 'Timer',    icon: Clock },
    { href: '/settings',  label: 'More',     icon: Menu },
  ]

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex h-16 border-t bg-background/95 backdrop-blur md:hidden"
      aria-label="Mobile navigation"
    >
      {items.map((item) => {
        const Icon = item.icon
        const active = isActive(item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors',
              active
                ? 'text-gem-600'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <div className="relative">
              <Icon
                className={cn(
                  'h-5 w-5 transition-transform',
                  active && 'scale-110'
                )}
              />
              {item.badge != null && item.badge > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white leading-none">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </div>
            <span className="leading-none">{item.label}</span>
            {active && (
              <span className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-gem-600" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
