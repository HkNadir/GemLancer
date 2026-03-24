import Link from 'next/link'
import { User, Bell, Shield, CreditCard, Palette, Users, ChevronRight } from 'lucide-react'

export const metadata = { title: 'Settings — GemLancer' }

const settingsSections = [
  {
    href: '/settings/profile',
    icon: User,
    label: 'Profile',
    description: 'Your name, avatar, and account details',
  },
  {
    href: '/settings/notifications',
    icon: Bell,
    label: 'Notifications',
    description: 'Email and in-app notification preferences',
  },
  {
    href: '/settings/security',
    icon: Shield,
    label: 'Security',
    description: 'Password, 2FA, and active sessions',
  },
  {
    href: '/settings/billing',
    icon: CreditCard,
    label: 'Billing',
    description: 'Subscription plan, payment method, and invoices',
  },
  {
    href: '/settings/workspace',
    icon: Palette,
    label: 'Workspace',
    description: 'Brand colours, logo, and workspace name',
  },
  {
    href: '/settings/team',
    icon: Users,
    label: 'Team',
    description: 'Invite members and manage roles',
  },
]

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account, workspace, and preferences.
        </p>
      </div>

      <div className="divide-y rounded-xl border bg-card overflow-hidden">
        {settingsSections.map(({ href, icon: Icon, label, description }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50 transition-colors group"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted group-hover:bg-background transition-colors">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground truncate">{description}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}
