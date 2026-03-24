'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from '@/components/app/theme-provider'
import {
  ChevronRight,
  Sun,
  Moon,
  Monitor,
  Languages,
  Settings,
  LogOut,
  Search,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import { NotificationsBell } from '@/components/app/notifications-bell'
import { signOutAction } from '@/lib/auth/actions'
import { cn, getInitials } from '@/lib/utils'
import type { User as UserType, UserRole } from '@/types/database'

// ── Breadcrumbs ───────────────────────────────────────────────
const ROUTE_LABELS: Record<string, string> = {
  dashboard:  'Dashboard',
  clients:    'Clients',
  projects:   'Projects',
  tasks:      'Tasks',
  invoices:   'Invoices',
  time:       'Time Tracker',
  reports:    'Reports',
  settings:   'Settings',
  onboarding: 'Onboarding',
}

function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  const crumbs = segments.map((seg, idx) => {
    const href = '/' + segments.slice(0, idx + 1).join('/')
    const label = ROUTE_LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ')
    const isLast = idx === segments.length - 1
    return { href, label, isLast }
  })

  if (crumbs.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="flex items-center">
      <ol className="flex items-center gap-1 text-sm">
        {crumbs.map((crumb, i) => (
          <React.Fragment key={crumb.href}>
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />}
            {crumb.isLast ? (
              <li className="font-semibold text-foreground truncate max-w-[200px]">
                {crumb.label}
              </li>
            ) : (
              <li>
                <Link
                  href={crumb.href}
                  className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[120px] inline-block"
                >
                  {crumb.label}
                </Link>
              </li>
            )}
          </React.Fragment>
        ))}
      </ol>
    </nav>
  )
}

// ── Theme sub-menu ────────────────────────────────────────────
function ThemeSubMenu() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="gap-2">
        {theme === 'dark' ? <Moon className="h-4 w-4" /> : theme === 'light' ? <Sun className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
        Theme
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuItem onClick={() => setTheme('light')} className="gap-2">
          <Sun className="h-4 w-4" />
          Light
          {theme === 'light' && <span className="ml-auto text-xs text-gem-600">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')} className="gap-2">
          <Moon className="h-4 w-4" />
          Dark
          {theme === 'dark' && <span className="ml-auto text-xs text-gem-600">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')} className="gap-2">
          <Monitor className="h-4 w-4" />
          System
          {theme === 'system' && <span className="ml-auto text-xs text-gem-600">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}

// ── User menu ─────────────────────────────────────────────────
const ROLE_LABELS: Record<UserRole, string> = {
  owner:  'Owner',
  admin:  'Admin',
  member: 'Member',
  client: 'Client',
}

interface UserMenuProps {
  profile: Pick<UserType, 'id' | 'full_name' | 'email' | 'role' | 'avatar_url'>
  rtl: boolean
  onToggleDir: () => void
}

function UserMenu({ profile, rtl, onToggleDir }: UserMenuProps) {
  const router = useRouter()

  async function handleSignOut() {
    await signOutAction()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.full_name} />
            <AvatarFallback className="text-xs">
              {getInitials(profile.full_name)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="end" forceMount>
        {/* Identity */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-0.5">
            <p className="text-sm font-semibold leading-tight">{profile.full_name}</p>
            <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
            <p className="text-xs text-gem-600 font-medium">{ROLE_LABELS[profile.role]}</p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/settings/profile" className="gap-2 cursor-pointer">
              <User className="h-4 w-4" />
              Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings" className="gap-2 cursor-pointer">
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          {/* Theme switcher */}
          <ThemeSubMenu />

          {/* RTL / LTR toggle */}
          <DropdownMenuItem onClick={onToggleDir} className="gap-2">
            <Languages className="h-4 w-4" />
            {rtl ? 'Switch to LTR' : 'Switch to RTL'}
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          className="gap-2 text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ── Header ────────────────────────────────────────────────────
interface HeaderProps {
  profile: Pick<UserType, 'id' | 'tenant_id' | 'full_name' | 'email' | 'role' | 'avatar_url'>
  rtl: boolean
  onToggleDir: () => void
  initialUnreadCount?: number
}

export function Header({ profile, rtl, onToggleDir, initialUnreadCount = 0 }: HeaderProps) {
  return (
    <header className="flex h-16 flex-shrink-0 items-center gap-4 border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Breadcrumbs — fills available space */}
      <div className="flex-1 min-w-0">
        <Breadcrumbs />
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1.5">
        {/* Search (opens command palette — full search in later task) */}
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </Button>

        {/* Notifications bell with live badge */}
        <NotificationsBell
          userId={profile.id}
          tenantId={profile.tenant_id}
          initialUnreadCount={initialUnreadCount}
        />

        {/* User avatar / dropdown */}
        <UserMenu profile={profile} rtl={rtl} onToggleDir={onToggleDir} />
      </div>
    </header>
  )
}
