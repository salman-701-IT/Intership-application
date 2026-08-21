'use client'

import * as React from 'react'
import { Github, Sparkles, Heart, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePlatform } from '@/lib/role-store'
import { NAV } from './nav-config'
import { ThemeToggle } from './theme-toggle'
import { RoleSwitcher } from './role-switcher'
import { NotificationBell } from './notification-bell'
import { DocsViewer } from './docs-viewer'
import { UserAvatar, AIBadge } from './shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function Shell({ children }: { children: React.ReactNode }) {
  const { role, view, setView, user } = usePlatform()
  const nav = NAV[role] ?? []
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [docsOpen, setDocsOpen] = React.useState(false)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border/60 glass-strong">
        <div className="flex h-16 items-center gap-3 px-3 sm:px-4 lg:px-6">
          {/* Mobile menu */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden rounded-xl"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </Button>

          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-emerald text-white shadow-soft">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-base font-bold tracking-tight">InternForge</span>
              <span className="hidden text-[10px] text-muted-foreground sm:block">Verified internships · measurable skills</span>
            </div>
            <AIBadge className="ml-1 hidden md:inline-flex" />
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 rounded-xl text-muted-foreground hover:text-foreground"
              onClick={() => setDocsOpen(true)}
            >
              <BookOpen className="h-4 w-4" />
              <span className="hidden lg:inline">Docs</span>
            </Button>
            <NotificationBell />
            <ThemeToggle />
            <RoleSwitcher />
            {user && (
              <div className="hidden items-center gap-2 rounded-xl border border-border/60 px-2 py-1 sm:flex">
                <UserAvatar name={user.name} src={user.avatarUrl ?? undefined} size="sm" />
                <div className="flex flex-col leading-none">
                  <span className="text-xs font-semibold">{user.name}</span>
                  <span className="text-[10px] text-muted-foreground">{user.title ?? role.toLowerCase()}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 top-16 z-30 w-64 shrink-0 border-r border-border/60 bg-sidebar/80 backdrop-blur-md transition-transform lg:static lg:top-0 lg:translate-x-0',
            mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          )}
          style={{ height: 'calc(100vh - 4rem)' }}
        >
          <nav className="flex h-full flex-col gap-1 overflow-y-auto p-3 scroll-soft">
            <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {role.toLowerCase()} portal
            </p>
            {nav.map((item) => {
              const Icon = item.icon
              const active = view === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setView(item.id)
                    setMobileOpen(false)
                  }}
                  className={cn(
                    'group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all',
                    active
                      ? 'gradient-emerald text-white shadow-soft'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                >
                  <Icon className={cn('h-4 w-4 shrink-0', !active && 'text-muted-foreground group-hover:text-foreground')} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && <Badge variant="secondary" className="h-5 text-[10px]">{item.badge}</Badge>}
                </button>
              )
            })}
            <div className="mt-auto rounded-xl border border-border/60 bg-muted/30 p-3 text-xs">
              <p className="font-semibold text-foreground">Need a hand?</p>
              <p className="mt-1 text-muted-foreground">Switch roles at the top right to explore every portal.</p>
            </div>
          </nav>
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 top-16 z-20 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />
        )}

        {/* Main */}
        <main className="flex-1 min-w-0">
          <div className="mx-auto w-full max-w-[1400px] px-3 py-5 sm:px-5 sm:py-7 lg:px-7">
            {children}
          </div>
        </main>
      </div>

      {/* Sticky footer */}
      <footer className="mt-auto border-t border-border/60 glass">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center justify-between gap-2 px-4 py-3 text-xs text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>InternForge — turn internships into measurable, verified skills.</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="https://github.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
              <Github className="h-3.5 w-3.5" /> Source
            </a>
            <span className="inline-flex items-center gap-1">
              Built with <Heart className="h-3 w-3 text-rose-500" /> on Z.ai
            </span>
          </div>
        </div>
      </footer>

      {/* Documentation drawer */}
      <DocsViewer open={docsOpen} onOpenChange={setDocsOpen} />
    </div>
  )
}
