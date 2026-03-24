'use client'

/**
 * Client component that mounts the inactivity logout hook.
 * Rendered inside DashboardShell so it only activates in
 * authenticated routes.
 */

import { useState } from 'react'
import { useInactivityLogout } from '@/hooks/use-inactivity-logout'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Clock } from 'lucide-react'

export function InactivityProvider() {
  const [showWarning, setShowWarning] = useState(false)

  useInactivityLogout({
    onWarning: () => setShowWarning(true),
    onLogout: () => setShowWarning(false),
  })

  if (!showWarning) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 shadow-lg">
      <Alert variant="warning">
        <Clock className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between gap-3">
          <span>You&apos;ll be signed out in 2 minutes due to inactivity.</span>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={() => setShowWarning(false)}
          >
            Stay signed in
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  )
}
