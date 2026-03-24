'use client'

import { useEffect, useState } from 'react'
import { Sidebar, type BadgeCounts } from '@/components/app/sidebar'
import { Header } from '@/components/app/header'
import { MobileNav } from '@/components/app/mobile-nav'
import { InactivityProvider } from '@/components/app/inactivity-provider'
import { FloatingTimer } from '@/components/app/floating-timer'
import { useSidebar } from '@/hooks/use-sidebar'
import { cn } from '@/lib/utils'
import type { User } from '@/types/database'

const DIR_STORAGE_KEY = 'gemlancer-dir'

type UserProfile = Pick<User, 'id' | 'tenant_id' | 'full_name' | 'email' | 'role' | 'avatar_url'>

interface DashboardShellProps {
  children: React.ReactNode
  profile: UserProfile
  badgeCounts: BadgeCounts
  initialUnreadCount: number
}

export function DashboardShell({
  children,
  profile,
  badgeCounts,
  initialUnreadCount,
}: DashboardShellProps) {
  const { collapsed, toggle, mounted } = useSidebar()
  const [rtl, setRtl] = useState(false)
  const [dirMounted, setDirMounted] = useState(false)

  // Hydrate RTL preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DIR_STORAGE_KEY)
      setRtl(saved === 'rtl')
    } catch {
      // ignore
    }
    setDirMounted(true)
  }, [])

  function toggleDir() {
    const next = !rtl
    setRtl(next)
    try {
      localStorage.setItem(DIR_STORAGE_KEY, next ? 'rtl' : 'ltr')
    } catch {
      // ignore
    }
  }

  // Avoid hydration mismatch for sidebar width — render without transition
  // on first paint, then enable after mount
  const sidebarTransitionClass = mounted ? 'transition-all duration-300' : ''

  return (
    <div
      dir={dirMounted ? (rtl ? 'rtl' : 'ltr') : 'ltr'}
      className="flex h-screen overflow-hidden bg-background"
    >
      {/* Desktop sidebar */}
      <Sidebar
        collapsed={collapsed}
        onToggle={toggle}
        profile={profile}
        badgeCounts={badgeCounts}
      />

      {/* Content area */}
      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col overflow-hidden',
          sidebarTransitionClass
        )}
      >
        <Header
          profile={profile}
          rtl={rtl}
          onToggleDir={toggleDir}
          initialUnreadCount={initialUnreadCount}
        />

        {/* Main scrollable content */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto"
          tabIndex={-1}
        >
          {/* Add bottom padding on mobile for the fixed nav bar */}
          <div className="pb-16 md:pb-0">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileNav unpaidInvoices={badgeCounts.unpaidInvoices} />

      {/* Inactivity auto-logout */}
      <InactivityProvider />

      {/* Floating timer */}
      <FloatingTimer />
    </div>
  )
}
