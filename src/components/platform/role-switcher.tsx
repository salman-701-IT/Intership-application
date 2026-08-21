'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  GraduationCap, Briefcase, Building2, ShieldCheck, Users,
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePlatform } from '@/lib/role-store'
import { usersApi } from '@/lib/api'
import type { Role, User } from '@/lib/types'
import { UserAvatar } from './shared'

const ROLES: { id: Role; label: string; icon: any; blurb: string }[] = [
  { id: 'STUDENT', label: 'Student', icon: GraduationCap, blurb: 'Discover, apply, build & earn verified certificates' },
  { id: 'MENTOR', label: 'Mentor', icon: Users, blurb: 'Guide interns, review work, give feedback' },
  { id: 'COMPANY', label: 'Company Admin', icon: Building2, blurb: 'Post internships, track pipeline, hire' },
  { id: 'RECRUITER', label: 'Recruiter', icon: Briefcase, blurb: 'Source talent, screen applicants, shortlist' },
  { id: 'ADMIN', label: 'Super Admin', icon: ShieldCheck, blurb: 'Govern the platform, audit, secure' },
]

export function RoleSwitcher() {
  const { role, user, setRole, setUser, setUserId, setView, userId } = usePlatform()
  const [candidates, setCandidates] = React.useState<User[]>([])
  const [loadingRole, setLoadingRole] = React.useState<Role | null>(null)

  // Load candidate users for a role when it becomes active
  React.useEffect(() => {
    let active = true
    usersApi.list({ role, status: 'ACTIVE' }).then((u) => {
      if (active) setCandidates(u)
    }).catch(() => active && setCandidates([]))
    return () => { active = false }
  }, [role])

  async function switchRole(r: Role) {
    setLoadingRole(r)
    setRole(r)
    setView('dashboard')
    try {
      const me = await usersApi.me(r)
      if (me) {
        setUser(me)
        setUserId(me.id)
      }
    } catch {
      setUser(null)
      setUserId(null)
    } finally {
      setLoadingRole(null)
    }
  }

  async function pickUser(u: User) {
    setUserId(u.id)
    const me = await usersApi.me(role, u.id)
    if (me) setUser(me)
  }

  const active = ROLES.find((r) => r.id === role)!

  return (
    <div className="flex items-center gap-2">
      {/* User picker for the active role */}
      {candidates.length > 1 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 rounded-xl">
              <UserAvatar name={user?.name} src={user?.avatarUrl ?? undefined} size="xs" />
              <span className="hidden max-w-[120px] truncate sm:inline">{user?.name ?? 'Pick user'}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Demo {role.toLowerCase()}s</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {candidates.map((u) => (
              <DropdownMenuItem key={u.id} onClick={() => pickUser(u)} className="gap-2">
                <UserAvatar name={u.name} src={u.avatarUrl ?? undefined} size="xs" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{u.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{u.email}</span>
                </div>
                {u.id === userId && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Role switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="default" size="sm" className="gap-2 rounded-xl gradient-emerald text-white shadow-soft">
            <active.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{active.label}</span>
            <span className="sm:hidden">{active.label.split(' ')[0]}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Switch portal</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {ROLES.map((r) => (
            <DropdownMenuItem key={r.id} onClick={() => switchRole(r.id)} className="gap-2 py-2">
              <div className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg',
                r.id === role ? 'gradient-emerald text-white' : 'bg-muted text-muted-foreground'
              )}>
                <r.icon className="h-4 w-4" />
              </div>
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-medium">{r.label}</span>
                <span className="text-xs text-muted-foreground">{r.blurb}</span>
              </div>
              {loadingRole === r.id && <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />}
              {r.id === role && !loadingRole && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
