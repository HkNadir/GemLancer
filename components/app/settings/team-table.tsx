'use client'

import { useState, useTransition } from 'react'
import { MoreHorizontal, Shield, UserMinus } from 'lucide-react'
import { removeTeamMember, updateMemberRole } from '@/lib/settings/actions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Member {
  id: string
  full_name: string
  email: string
  role: string
  avatar_url: string | null
  is_active: boolean
}

interface TeamTableProps {
  members: Member[]
  currentUserId: string
  callerRole: string
}

const roleBadge: Record<string, string> = {
  owner: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300',
  admin: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
  member: 'bg-muted text-muted-foreground',
}

export function TeamTable({ members: initial, currentUserId, callerRole }: TeamTableProps) {
  const [members, setMembers] = useState(initial)
  const [, startTransition] = useTransition()

  function handleRemove(id: string, name: string) {
    if (!confirm(`Remove ${name} from the team?`)) return
    startTransition(async () => {
      const result = await removeTeamMember(id)
      if (!result.error) setMembers((prev) => prev.filter((m) => m.id !== id))
    })
  }

  function handleRoleChange(id: string, role: 'admin' | 'member') {
    startTransition(async () => {
      const result = await updateMemberRole(id, role)
      if (!result.error) {
        setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)))
      }
    })
  }

  if (members.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/20 py-12 text-center">
        <p className="text-sm text-muted-foreground">No team members yet.</p>
      </div>
    )
  }

  const canManage = ['owner', 'admin'].includes(callerRole)

  return (
    <div className="rounded-xl border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Member</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Email</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
            {canManage && <th className="px-4 py-3" />}
          </tr>
        </thead>
        <tbody className="divide-y">
          {members.map((m) => (
            <tr key={m.id} className="hover:bg-muted/20 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                    {m.full_name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="font-medium">{m.full_name}</span>
                  {m.id === currentUserId && (
                    <span className="text-xs text-muted-foreground">(you)</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{m.email}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${roleBadge[m.role] ?? 'bg-muted text-muted-foreground'}`}>
                  {m.role}
                </span>
              </td>
              {canManage && (
                <td className="px-4 py-3 text-right">
                  {m.role !== 'owner' && m.id !== currentUserId && (
                    <DropdownMenu>
                      <DropdownMenuTrigger className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors">
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {callerRole === 'owner' && (
                          <>
                            {m.role !== 'admin' && (
                              <DropdownMenuItem onClick={() => handleRoleChange(m.id, 'admin')} className="gap-2">
                                <Shield className="h-4 w-4" />
                                Make Admin
                              </DropdownMenuItem>
                            )}
                            {m.role !== 'member' && (
                              <DropdownMenuItem onClick={() => handleRoleChange(m.id, 'member')} className="gap-2">
                                <Shield className="h-4 w-4" />
                                Make Member
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleRemove(m.id, m.full_name)}
                          className="gap-2 text-destructive focus:text-destructive"
                        >
                          <UserMinus className="h-4 w-4" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
