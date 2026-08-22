'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Role, User } from './types'

interface PlatformState {
  role: Role
  userId: string | null // selected demo user id for the active role
  user: User | null
  view: string // active sub-view within a portal
  setRole: (role: Role) => void
  setUser: (user: User | null) => void
  setUserId: (id: string | null) => void
  setView: (view: string) => void
}

export const usePlatform = create<PlatformState>()(
  persist(
    (set) => ({
      role: 'STUDENT',
      userId: null,
      user: null,
      view: 'dashboard',
      // Switching roles must clear the stale userId/user so the /me call for the
      // new role does a clean smart-pick instead of 404'ing on the old id.
      setRole: (role) => set({ role, userId: null, user: null, view: 'dashboard' }),
      setUser: (user) => set({ user }),
      setUserId: (id) => set({ userId: id }),
      setView: (view) => set({ view }),
    }),
    {
      name: 'internforge-platform',
      // Only persist the long-lived preferences, not transient state
      partialize: (s) => ({ role: s.role, view: s.view }),
    }
  )
)

export const DEMO_USER_IDS: Record<Role, string[]> = {
  STUDENT: [],
  MENTOR: [],
  COMPANY: [],
  ADMIN: [],
  RECRUITER: [],
}
