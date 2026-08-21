'use client'

import * as React from 'react'
import { usePlatform } from '@/lib/role-store'
import { usersApi } from '@/lib/api'
import { Shell } from '@/components/platform/shell'
import { StudentPortal } from '@/components/portals/student/student-portal'
import { MentorPortal } from '@/components/portals/mentor/mentor-portal'
import { CompanyPortal } from '@/components/portals/company/company-portal'
import { AdminPortal } from '@/components/portals/admin/admin-portal'
import { Sparkles } from 'lucide-react'

export default function Home() {
  const { role, user, setUser, setUserId, view, setView, userId } = usePlatform()
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    usersApi
      .me(role, userId ?? undefined)
      .then((u) => {
        if (!active) return
        setUser(u)
        setUserId(u.id)
      })
      .catch(() => {
        if (!active) return
        setUser(null)
        setUserId(null)
        setError('Could not load demo user — try another role.')
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [role, userId])

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-emerald text-white shadow-soft">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading InternForge…</p>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-emerald text-white shadow-soft">
          <Sparkles className="h-6 w-6" />
        </div>
        <p className="text-sm text-muted-foreground">{error ?? 'No user loaded.'}</p>
      </div>
    )
  }

  return (
    <Shell>
      {role === 'STUDENT' && <StudentPortal user={user} view={view} setView={setView} />}
      {role === 'MENTOR' && <MentorPortal user={user} view={view} setView={setView} />}
      {(role === 'COMPANY' || role === 'RECRUITER') && <CompanyPortal user={user} view={view} setView={setView} />}
      {role === 'ADMIN' && <AdminPortal user={user} view={view} setView={setView} />}
    </Shell>
  )
}
