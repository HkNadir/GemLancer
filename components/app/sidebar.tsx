'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CheckSquare,
  FileText,
  Clock,
  BarChart2,
  Settings,
  Gem,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn, getInitials } from '@/lib/utils'
import type { User, UserRole } from '@/types/database'

// ── Nav config ────────────────────────────────────────────────
interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  badgeKey?: 'overdueTasks' | 'unpaidInvoices'
}

const PRIMARY_NAV: NavItem[] = [
  { href: '/dashboard',  label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/clients',    label: 'Clients',        icon: Users },
  { href: '/projects',   label: 'Projects',       icon: Briefcase },
  { href: '/tasks',      label: 'Tasks',          icon: CheckSquare, badgeKey: 'overdueTasks' },
  { href: '/invoices',   label: 'Invoices',       icon: FileText,    badgeKey: 'unpaidInvoices' },
  { href: '/time',       label: 'Time Tracker',   icon: Clock },
]

const SECONDARY_NAV: NavItem[] = [
  { href: '/reports',    label: 'Reports',        icon: BarChart2 },
  { href: '/settings',   label: 'Settings',       icon: Settings },
]

const ROLE_LABELS: Record<UserRole, string> = {
  owner:  'Owner',
  admin:  'Admin',
  member: 'Member',
  client: 'Client',
}

// ── Props ─────────────────────────────────────────────────────
export interface BadgeCounts {
  overdueTasks: number
  unpaidInvoices: number
}

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  profile: Pick<User, 'id' | 'full_name' | 'email' | 'role' | 'avatar_url'>
  badgeCounts: BadgeCounts
}

// ── Single nav item ───────────────────────────────────────────
function NavItemButton({
  item,
  isActive,
  collapsed,
  badge,
}: {
  item: NavItem
  isActive: boolean
  collapsed: boolean
  badge?: number
}) {
  const Icon = item.icon

  const inner = (
    <Link
      href={item.href}
      className={cn(
        'relative flex h-9 items-center gap-3 rounded-lg text-sm font-medium transition-colors',
        collapsed ? 'w-9 justify-center px-0' : 'px-3',
        isActive
          ? 'bg-gem-50 text-gem-700 dark:bg-gem-950/50 dark:text-gem-400'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />

      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {badge != null && badge > 0 && (
            <Badge
              variant="destructive"
              className="h-5 min-w-[20px] justify-center px-1 text-[10px] font-bold"
            >
              {badge > 99 ? '99+' : badge}
            </Badge>
          )}
        </>
      )}

      {/* Collapsed: dot badge */}
      {collapsed && badge != null && badge > 0 && (
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
      )}
    </Link>
  )

  if (!collapsed) return inner

  return (
    <Tooltip>
      <TooltipTrigger asChild>{inner}</TooltipTrigger>
      <TooltipContent side="right" className="flex items-center gap-2">
        {item.label}
        {badge != null && badge > 0 && (
          <Badge variant="destructive" className="h-4 px-1 text-[10px]">
            {badge > 99 ? '99+' : badge}
          </Badge>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

// ── Sidebar ───────────────────────────────────────────────────
export function Sidebar({ collapsed, onToggle, profile, badgeCounts }: SidebarProps) {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const getBadge = (item: NavItem): number | undefined => {
    if (!item.badgeKey) return undefined
    return badgeCounts[item.badgeKey] ?? 0
  }

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={cn(
          'hidden md:flex flex-col h-full border-r bg-card transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0',
          collapsed ? 'w-[60px]' : 'w-[240px]'
        )}
      >
        {/* Logo + collapse toggle */}
        <div
          className={cn(
            'flex h-16 items-center border-b flex-shrink-0',
            collapsed ? 'justify-center px-0' : 'justify-between px-4'
          )}
        >
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gem-600">
                <Gem className="h-4 w-4 text-white" />
              </div>
              <span className="text-base font-bold text-foreground">GemLancer</span>
            </Link>
          )}

          {collapsed && (
            <Link href="/dashboard" aria-label="GemLancer dashboard">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gem-600">
                <Gem className="h-4 w-4 text-white" />
              </div>
            </Link>
          )}

          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={onToggle}
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {collapsed && (
          <div className="flex justify-center py-2 border-b">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={onToggle}
              aria-label="Expand sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Navigation */}
        <ScrollArea className="flex-1 py-3">
          <nav
            className={cn('space-y-0.5', collapsed ? 'px-[10px]' : 'px-2')}
            aria-label="Primary navigation"
          >
            {PRIMARY_NAV.map((item) => (
              <NavItemButton
                key={item.href}
                item={item}
                isActive={isActive(item.href)}
                collapsed={collapsed}
                badge={getBadge(item)}
              />
            ))}
          </nav>

          {/* Divider */}
          <div className={cn('my-3 border-t', collapsed ? 'mx-2' : 'mx-3')} />

          <nav
            className={cn('space-y-0.5', collapsed ? 'px-[10px]' : 'px-2')}
            aria-label="Secondary navigation"
          >
            {SECONDARY_NAV.map((item) => (
              <NavItemButton
                key={item.href}
                item={item}
                isActive={isActive(item.href)}
                collapsed={collapsed}
                badge={getBadge(item)}
              />
            ))}
          </nav>
        </ScrollArea>

        {/* User section */}
        <div className={cn('border-t p-2', collapsed ? 'flex justify-center' : '')}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/settings/profile">
                  <Avatar className="h-8 w-8 cursor-pointer">
                    <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.full_name} />
                    <AvatarFallback className="text-xs">
                      {getInitials(profile.full_name)}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                <div>
                  <p className="font-medium">{profile.full_name}</p>
                  <p className="text-xs text-muted-foreground">{ROLE_LABELS[profile.role]}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <Link
              href="/settings/profile"
              className="flex items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-muted"
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.full_name} />
                <AvatarFallback className="text-xs">
                  {getInitials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground leading-tight">
                  {profile.full_name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {ROLE_LABELS[profile.role]}
                </p>
              </div>
            </Link>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}
