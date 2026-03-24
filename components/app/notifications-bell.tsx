'use client'

import { useRouter } from 'next/navigation'
import { Bell, Check, CheckCheck, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { useNotifications } from '@/hooks/use-notifications'
import { cn } from '@/lib/utils'
import type { Notification, NotificationType } from '@/types/database'

// ── Notification type config ──────────────────────────────────
const TYPE_CONFIG: Record<
  NotificationType,
  { label: string; dotColor: string }
> = {
  invoice_paid:           { label: 'Invoice paid',           dotColor: 'bg-green-500' },
  task_overdue:           { label: 'Task overdue',           dotColor: 'bg-red-500' },
  message_received:       { label: 'New message',            dotColor: 'bg-blue-500' },
  milestone_approved:     { label: 'Milestone approved',     dotColor: 'bg-gem-500' },
  project_completed:      { label: 'Project completed',      dotColor: 'bg-green-600' },
  team_invite:            { label: 'Team invite',            dotColor: 'bg-purple-500' },
  subscription_renewing:  { label: 'Subscription renewing',  dotColor: 'bg-orange-500' },
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

interface NotificationItemProps {
  notification: Notification
  onRead: (id: string) => void
}

function NotificationItem({ notification, onRead }: NotificationItemProps) {
  const router = useRouter()
  const config = TYPE_CONFIG[notification.type] ?? { label: notification.type, dotColor: 'bg-gray-500' }
  const isUnread = !notification.read_at

  const handleClick = () => {
    if (isUnread) onRead(notification.id)
    if (notification.action_url) router.push(notification.action_url)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'flex w-full items-start gap-3 rounded-sm px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent',
        isUnread && 'bg-gem-50/50 dark:bg-gem-950/20'
      )}
    >
      {/* Type dot */}
      <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', config.dotColor)} />

      <div className="flex-1 min-w-0">
        <p className={cn('truncate font-medium leading-snug', isUnread ? 'text-foreground' : 'text-muted-foreground')}>
          {notification.title}
        </p>
        {notification.body && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {notification.body}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground/70">
          {formatTimeAgo(notification.created_at)}
        </p>
      </div>

      {notification.action_url && (
        <ExternalLink className="mt-1 h-3 w-3 shrink-0 text-muted-foreground/50" />
      )}
    </button>
  )
}

interface NotificationsBellProps {
  userId: string
  tenantId: string
  /** Initial count passed from server to avoid flash */
  initialUnreadCount?: number
}

export function NotificationsBell({
  userId,
  tenantId,
  initialUnreadCount = 0,
}: NotificationsBellProps) {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } =
    useNotifications(userId, tenantId)

  // Use real-time count after hydration, initial count for SSR
  const displayCount = unreadCount || initialUnreadCount

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {displayCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white leading-none">
              {displayCount > 99 ? '99+' : displayCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b">
          <DropdownMenuLabel className="p-0 font-semibold">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 rounded-full bg-gem-100 px-1.5 py-0.5 text-xs font-medium text-gem-700">
                {unreadCount} new
              </span>
            )}
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={markAllAsRead}
            >
              <CheckCheck className="mr-1 h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        {/* List */}
        <ScrollArea className="max-h-[420px]">
          {loading ? (
            <div className="space-y-1 p-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3 rounded-sm px-3 py-2.5">
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-3/4 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Bell className="mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">All caught up</p>
              <p className="text-xs text-muted-foreground/70">No notifications yet</p>
            </div>
          ) : (
            <div className="p-1">
              {notifications.map((n, idx) => (
                <div key={n.id}>
                  <NotificationItem notification={n} onRead={markAsRead} />
                  {idx < notifications.length - 1 && (
                    <div className="mx-3 h-px bg-border/50" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator className="m-0" />
            <div className="px-3 py-2">
              <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" asChild>
                <a href="/settings/notifications">View notification settings</a>
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
