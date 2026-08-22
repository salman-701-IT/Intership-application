'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { LucideIcon, Sparkles } from 'lucide-react'
import { initials, statusColor, scoreColor } from '@/lib/format'
import { STUDENT_JOURNEY } from '@/lib/types'

/* ------------------------------------------------------------------ */
/* Page header                                                        */
/* ------------------------------------------------------------------ */
export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  eyebrow,
}: {
  title: string
  description?: string
  icon?: LucideIcon
  actions?: React.ReactNode
  eyebrow?: string
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        {eyebrow && (
          <p className="text-xs font-medium uppercase tracking-wider text-primary/80">{eyebrow}</p>
        )}
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-emerald text-white shadow-soft">
              <Icon className="h-4 w-4" />
            </div>
          )}
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        </div>
        {description && (
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Glass card                                                         */
/* ------------------------------------------------------------------ */
export function GlassCard({
  className,
  children,
  hover,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div
      className={cn(
        'glass rounded-2xl shadow-card',
        hover && 'transition-all duration-300 hover:shadow-soft hover:-translate-y-0.5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Stat card                                                          */
/* ------------------------------------------------------------------ */
export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
  accent = 'emerald',
  footer,
}: {
  label: string
  value: React.ReactNode
  icon: LucideIcon
  trend?: number
  trendLabel?: string
  accent?: 'emerald' | 'amber' | 'violet' | 'sky' | 'rose'
  footer?: React.ReactNode
}) {
  const accentMap: Record<string, string> = {
    emerald: 'from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400',
    amber: 'from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400',
    violet: 'from-violet-500/15 to-violet-500/5 text-violet-600 dark:text-violet-400',
    sky: 'from-sky-500/15 to-sky-500/5 text-sky-600 dark:text-sky-400',
    rose: 'from-rose-500/15 to-rose-500/5 text-rose-600 dark:text-rose-400',
  }
  return (
    <GlassCard hover className="p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
        </div>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br', accentMap[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {(trend !== undefined || footer) && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          {trend !== undefined && (
            <span className={cn('font-semibold', trend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
          {trendLabel && <span className="text-muted-foreground">{trendLabel}</span>}
          {footer}
        </div>
      )}
    </GlassCard>
  )
}

/* ------------------------------------------------------------------ */
/* Section card (titled)                                              */
/* ------------------------------------------------------------------ */
export function SectionCard({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
  contentClassName,
}: {
  title?: string
  description?: string
  icon?: LucideIcon
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  contentClassName?: string
}) {
  return (
    <Card className={cn('overflow-hidden border-border/60 shadow-card', className)}>
      {(title || actions) && (
        <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-5 py-3.5">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-primary" />}
            <div>
              <CardTitle className="text-sm font-semibold">{title}</CardTitle>
              {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </div>
          </div>
          {actions}
        </CardHeader>
      )}
      <CardContent className={cn('p-5', contentClassName)}>{children}</CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Status pill                                                        */
/* ------------------------------------------------------------------ */
export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide', statusColor(status), className)}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Score badge                                                       */
/* ------------------------------------------------------------------ */
export function ScoreBadge({ score, suffix = '/100' }: { score: number; suffix?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-sm font-bold tabular-nums', scoreColor(score))}>
      {score}{suffix}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* User avatar                                                       */
/* ------------------------------------------------------------------ */
export function UserAvatar({ name, src, size = 'md', className }: { name?: string | null; src?: string | null; size?: 'xs' | 'sm' | 'md' | 'lg'; className?: string }) {
  const sz = { xs: 'h-6 w-6 text-[10px]', sm: 'h-8 w-8 text-xs', md: 'h-9 w-9 text-sm', lg: 'h-12 w-12 text-base' }[size]
  return (
    <Avatar className={cn(sz, 'ring-2 ring-background shadow-sm', className)}>
      {src && <AvatarImage src={src} alt={name ?? 'avatar'} />}
      <AvatarFallback className="gradient-emerald text-white font-semibold">{initials(name)}</AvatarFallback>
    </Avatar>
  )
}

/* ------------------------------------------------------------------ */
/* Skill bar                                                         */
/* ------------------------------------------------------------------ */
export function SkillBar({ label, current, baseline, verified, category }: { label: string; current: number; baseline?: number; verified?: boolean; category?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium">{label}</span>
          {verified && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/15 text-[9px] text-emerald-600 dark:text-emerald-400">✓</span>
                </TooltipTrigger>
                <TooltipContent>Verified skill</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {category && <span className="text-[10px] text-muted-foreground">· {category}</span>}
        </div>
        <span className="text-xs font-semibold tabular-nums text-muted-foreground">{current}%</span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        {baseline !== undefined && (
          <div className="absolute inset-y-0 left-0 rounded-full bg-foreground/15" style={{ width: `${baseline}%` }} />
        )}
        <div
          className="absolute inset-y-0 left-0 rounded-full gradient-emerald transition-all duration-700"
          style={{ width: `${current}%` }}
        />
      </div>
      {baseline !== undefined && (
        <p className="text-[10px] text-muted-foreground">Baseline {baseline}% → now {current}% (+{current - baseline})</p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Empty state                                                       */
/* ------------------------------------------------------------------ */
export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold">{title}</p>
        {description && <p className="mx-auto max-w-sm text-xs text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Loading skeleton grid                                             */
/* ------------------------------------------------------------------ */
export function LoadingGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-32 rounded-2xl bg-muted shimmer" />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* AI badge                                                          */
/* ------------------------------------------------------------------ */
export function AIBadge({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-500/15 to-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-300', className)}>
      <Sparkles className="h-3 w-3" /> AI
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Journey tracker (student progression)                            */
/* ------------------------------------------------------------------ */
export function JourneyTracker({ activeStage, className }: { activeStage?: string; className?: string }) {
  const activeIdx = activeStage ? STUDENT_JOURNEY.indexOf(activeStage as any) : -1
  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {STUDENT_JOURNEY.map((stage, i) => {
        const done = activeIdx >= 0 && i < activeIdx
        const active = activeIdx === i
        return (
          <React.Fragment key={stage}>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors',
                done && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
                active && 'bg-primary text-primary-foreground',
                !done && !active && 'bg-muted text-muted-foreground'
              )}
            >
              {stage}
            </span>
            {i < STUDENT_JOURNEY.length - 1 && <span className="text-muted-foreground/40">→</span>}
          </React.Fragment>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Tiny progress ring                                                */
/* ------------------------------------------------------------------ */
export function ProgressRing({ value, size = 44, label, color = '#10b981' }: { value: number; size?: number; label?: string; color?: string }) {
  const stroke = 4
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-muted" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <span className="absolute text-xs font-bold tabular-nums">{label ?? `${value}%`}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* List item row                                                     */
/* ------------------------------------------------------------------ */
export function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
