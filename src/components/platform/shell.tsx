'use client'

import * as React from 'react'
import { Github, Sparkles, Heart, BookOpen, Search, Command as CommandIcon } from 'lucide-react'
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
import { CommandProvider, useCommand } from './command-context'
import { CommandPalette } from './command-palette'

function ShellInner({ children }: { children: React.ReactNode }) {
  const { role, view, setView, user } = usePlatform()
  const nav = NAV[role] ?? []
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [docsOpen, setDocsOpen] = React.useState(false)
  const { setOpen: setPaletteOpen } = useCommand()

  // Stable callback so the palette's command memo doesn't re-build every render.
  const openDocs = React.useCallback(() => setDocsOpen(true), [setDocsOpen])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Decorative top gradient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-64 opacity-60"
        style={{
          background:
            'radial-gradient(60rem 16rem at 15% -20%, color-mix(in oklch, var(--primary) 22%, transparent), transparent 70%), radial-gradient(50rem 14rem at 85% -30%, color-mix(in oklch, var(--accent) 28%, transparent), transparent 70%)',
        }}
      />

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
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl gradient-emerald text-white shadow-soft">
              <Sparkles className="h-5 w-5" />
              <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/20" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-base font-bold tracking-tight">InternForge</span>
              <span className="hidden text-[10px] text-muted-foreground sm:block">Verified internships · measurable skills</span>
            </div>
            <AIBadge className="ml-1 hidden md:inline-flex" />
          </div>

          {/* Command palette trigger (centered, desktop) */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="group mx-auto hidden h-9 w-full max-w-sm items-center gap-2 rounded-xl border border-border/60 bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:border-border hover:bg-muted/70 lg:flex"
            aria-label="Open command palette"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">Search or jump to…</span>
            <kbd className="inline-flex items-center gap-0.5 rounded-md border border-border/70 bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground shadow-sm">
              <CommandIcon className="h-2.5 w-2.5" />K
            </kbd>
          </button>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2 lg:ml-0">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 rounded-xl text-muted-foreground hover:text-foreground"
              onClick={() => setPaletteOpen(true)}
              aria-label="Command palette"
            >
              <Search className="h-4 w-4 lg:hidden" />
              <CommandIcon className="hidden h-4 w-4 lg:block" />
            </Button>
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
              <div className="hidden items-center gap-2 rounded-xl border border-border/60 bg-card/50 px-2 py-1 sm:flex">
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

      <div className="relative z-10 flex flex-1">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 top-16 z-30 w-64 shrink-0 border-r border-border/60 bg-sidebar/80 backdrop-blur-md transition-transform lg:static lg:top-0 lg:translate-x-0',
            mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          )}
          style={{ height: 'calc(100vh - 4rem)' }}
        >
          <nav className="flex h-full flex-col gap-1 overflow-y-auto p-3 scroll-soft">
            <div className="flex items-center justify-between px-2 pb-1 pt-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {role.toLowerCase()} portal
              </p>
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
                {nav.length} views
              </span>
            </div>
            {nav.map((item, idx) => {
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
                    'group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200',
                    active
                      ? 'gradient-emerald text-white shadow-soft'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground hover:translate-x-0.5'
                  )}
                >
                  {/* Active left indicator bar */}
                  <span
                    aria-hidden
                    className={cn(
                      'absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary opacity-0 transition-opacity',
                      active && 'opacity-100'
                    )}
                  />
                  <Icon className={cn('h-4 w-4 shrink-0 transition-transform', !active && 'text-muted-foreground group-hover:text-foreground group-hover:scale-110')} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && <Badge variant="secondary" className="h-5 text-[10px]">{item.badge}</Badge>}
                </button>
              )
            })}
            <div className="mt-auto space-y-2">
              <button
                onClick={() => setPaletteOpen(true)}
                className="flex w-full items-center gap-2.5 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                <CommandIcon className="h-3.5 w-3.5" />
                <span className="flex-1 text-left">Quick actions</span>
                <kbd className="rounded border border-border/70 bg-background px-1 py-0.5 font-mono text-[9px]">⌘K</kbd>
              </button>
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs">
                <p className="font-semibold text-foreground">Need a hand?</p>
                <p className="mt-1 text-muted-foreground">Switch roles at the top right, or press ⌘K to jump anywhere.</p>
              </div>
            </div>
          </nav>
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 top-16 z-20 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
        )}

        {/* Main */}
        <main className="flex-1 min-w-0">
          <div className="mx-auto w-full max-w-[1400px] px-3 py-5 sm:px-5 sm:py-7 lg:px-7">
            {children}
          </div>
        </main>
      </div>

      {/* Sticky footer */}
      <footer className="relative z-10 mt-auto border-t border-border/60 glass">
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

      {/* Command palette */}
      <CommandPalette onOpenDocs={openDocs} />
    </div>
  )
}

export function Shell({ children }: { children: React.ReactNode }) {
  // The Shell must wrap its inner tree with the CommandProvider so the palette
  // + registration hook share one registry.
  return (
    <CommandProvider>
      <ShellInner>{children}</ShellInner>
    </CommandProvider>
  )
}
