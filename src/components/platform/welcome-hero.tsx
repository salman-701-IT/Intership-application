'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Sparkles, ArrowRight, TrendingUp, ShieldCheck, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { STUDENT_JOURNEY, type Role } from '@/lib/types'

interface HeroProps {
  role: Role
  userName: string
  userTitle?: string | null
  headline: string
  subtext: string
  stats?: { label: string; value: React.ReactNode; icon: React.ElementType; accent?: string }[]
  primaryAction?: { label: string; onClick: () => void; icon?: React.ElementType }
  secondaryAction?: { label: string; onClick: () => void; icon?: React.ElementType }
  activeStage?: string
}

const ROLE_ACCENT: Record<Role, { gradient: string; ring: string; chip: string; emoji: string }> = {
  STUDENT: { gradient: 'from-emerald-500/20 via-emerald-500/5 to-transparent', ring: 'ring-emerald-500/30', chip: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', emoji: '🎓' },
  MENTOR: { gradient: 'from-sky-500/20 via-sky-500/5 to-transparent', ring: 'ring-sky-500/30', chip: 'bg-sky-500/15 text-sky-700 dark:text-sky-300', emoji: '🧭' },
  COMPANY: { gradient: 'from-amber-500/20 via-amber-500/5 to-transparent', ring: 'ring-amber-500/30', chip: 'bg-amber-500/15 text-amber-700 dark:text-amber-300', emoji: '🏢' },
  RECRUITER: { gradient: 'from-violet-500/20 via-violet-500/5 to-transparent', ring: 'ring-violet-500/30', chip: 'bg-violet-500/15 text-violet-700 dark:text-violet-300', emoji: '🎯' },
  ADMIN: { gradient: 'from-rose-500/20 via-rose-500/5 to-transparent', ring: 'ring-rose-500/30', chip: 'bg-rose-500/15 text-rose-700 dark:text-rose-300', emoji: '🛡️' },
}

export function WelcomeHero({
  role, userName, userTitle, headline, subtext, stats, primaryAction, secondaryAction, activeStage,
}: HeroProps) {
  const accent = ROLE_ACCENT[role]
  const activeIdx = activeStage ? STUDENT_JOURNEY.indexOf(activeStage as any) : -1

  return (
    <div className={cn('relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br p-5 shadow-card sm:p-6', accent.gradient)}>
      {/* Decorative grid pattern */}
      <div aria-hidden className="grid-pattern absolute inset-0 opacity-40" />
      {/* Decorative glow blob */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--primary), transparent 70%)' }}
      />

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide', accent.chip)}>
              <span>{accent.emoji}</span>
              {role === 'ADMIN' ? 'Super Admin' : role.charAt(0) + role.slice(1).toLowerCase()} Portal
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              <ShieldCheck className="h-3 w-3" /> Verified platform
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {headline}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">{subtext}</p>

          {/* Student journey ribbon (only for students) */}
          {role === 'STUDENT' && (
            <div className="pt-1">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">Your journey</p>
              <div className="flex flex-wrap items-center gap-1">
                {STUDENT_JOURNEY.map((stage, i) => {
                  const done = activeIdx >= 0 && i < activeIdx
                  const active = activeIdx === i
                  return (
                    <React.Fragment key={stage}>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors',
                          active && 'bg-primary text-primary-foreground shadow-soft',
                          done && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
                          !done && !active && 'bg-muted/60 text-muted-foreground'
                        )}
                      >
                        {stage}
                      </span>
                      {i < STUDENT_JOURNEY.length - 1 && <span className="text-muted-foreground/40">·</span>}
                    </React.Fragment>
                  )
                })}
              </div>
            </div>
          )}

          {(primaryAction || secondaryAction) && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {primaryAction && (
                <Button size="sm" className="gap-2 rounded-xl gradient-emerald text-white shadow-soft" onClick={primaryAction.onClick}>
                  {primaryAction.icon && <primaryAction.icon className="h-4 w-4" />}
                  {primaryAction.label}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
              {secondaryAction && (
                <Button size="sm" variant="outline" className="gap-2 rounded-xl" onClick={secondaryAction.onClick}>
                  {secondaryAction.icon && <secondaryAction.icon className="h-4 w-4" />}
                  {secondaryAction.label}
                </Button>
              )}
            </div>
          )}
        </div>

        {stats && stats.length > 0 && (
          <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-3">
            {stats.map((s, i) => (
              <div key={i} className="glass rounded-xl p-3 text-center">
                <div className={cn('mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-lg', s.accent ?? 'bg-primary/15 text-primary')}>
                  <s.icon className="h-3.5 w-3.5" />
                </div>
                <div className="text-lg font-bold tabular-nums leading-none">{s.value}</div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trust footer strip */}
      <div className="relative mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/40 pt-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3 text-primary" /> AI-assisted throughout</span>
        <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-emerald-500" /> Verified certificates</span>
        <span className="inline-flex items-center gap-1"><TrendingUp className="h-3 w-3 text-sky-500" /> Measurable skill growth</span>
        <span className="inline-flex items-center gap-1"><Zap className="h-3 w-3 text-amber-500" /> Real-time collaboration</span>
      </div>
    </div>
  )
}
