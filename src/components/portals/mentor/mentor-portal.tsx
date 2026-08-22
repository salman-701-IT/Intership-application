'use client'

import * as React from 'react'
import {
  BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { toast } from 'sonner'
import {
  LayoutDashboard, Users, CheckCircle2, Star, MessagesSquare, CalendarCheck,
  BarChart3, Megaphone, Sparkles, Send, ClipboardList, TrendingUp, Hourglass,
  Pin, Plus, Loader2, ChevronRight, X, Check, AlertCircle, Calendar,
  FileCode2, GraduationCap, Activity, Flag, MessageSquare, Award,
} from 'lucide-react'

import type {
  User, Project, Submission, Evaluation, Feedback, Announcement,
  Attendance, UserSkill,
} from '@/lib/types'
import {
  GlassCard, PageHeader, SectionCard, StatCard, StatusPill, ScoreBadge,
  UserAvatar, SkillBar, EmptyState, LoadingGrid, AIBadge, ProgressRing, MetaRow,
} from '@/components/platform/shared'
import { WelcomeHero } from '@/components/platform/welcome-hero'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  analyticsApi, projectsApi, submissionsApi, evaluationsApi, feedbackApi,
  announcementsApi, attendanceApi, skillsApi, aiApi,
} from '@/lib/api'
import { formatDate, formatDateTime, timeAgo, scoreColor, statusColor } from '@/lib/format'
import { cn } from '@/lib/utils'

/* ====================================================================== */
/*  Portal contract                                                       */
/* ====================================================================== */

export type PortalProps = {
  user: User
  view: string
  setView: (v: string) => void
}

/**
 * The `/api/evaluations` route includes `submission` (with student), `project`,
 * and `mentor` — but the domain `Evaluation` type only declares the scalar
 * foreign keys. Local alias to keep TypeScript happy while reading those joins.
 */
type EvaluationWithJoins = Evaluation & {
  submission?: Submission & { student?: User }
  project?: Project
  mentor?: User
}

/* ====================================================================== */
/*  Shared small helpers                                                  */
/* ====================================================================== */

const DIMENSIONS = [
  { key: 'codeQuality', label: 'Code Quality' },
  { key: 'communication', label: 'Communication' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'learning', label: 'Learning' },
] as const

const EMERALD = '#10b981'
const AMBER = '#f59e0b'
const SKY = '#0ea5e9'
const ROSE = '#f43f5e'
const VIOLET = '#8b5cf6'

const ATTENDANCE_COLORS: Record<string, string> = {
  PRESENT: 'bg-emerald-500/80 text-white',
  REMOTE: 'bg-sky-500/80 text-white',
  LATE: 'bg-amber-500/80 text-white',
  ABSENT: 'bg-rose-500/80 text-white',
  LEAVE: 'bg-muted text-muted-foreground',
}

function useAsync<T>(loader: () => Promise<T>, deps: React.DependencyList) {
  const [data, setData] = React.useState<T | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [tick, setTick] = React.useState(0)
  const reload = React.useCallback(() => setTick((t) => t + 1), [])
  React.useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    loader()
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e?.message ?? 'Failed to load'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
    // eslintdeps: dependency array intentionally includes spread + tick
  }, [...deps, tick])
  return { data, loading, error, reload, setData }
}

/** Stars rating input (1-5). */
function StarsInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = React.useState(0)
  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          className="rounded-md p-1 transition-transform hover:scale-110"
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          <Star
            className={cn(
              'h-5 w-5 transition-colors',
              (hover || value) >= n ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground',
            )}
          />
        </button>
      ))}
      <span className="ml-2 text-xs font-medium text-muted-foreground">{value}/5</span>
    </div>
  )
}

function StarsDisplay({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn('h-3.5 w-3.5', n <= value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40')}
        />
      ))}
    </div>
  )
}

/** Lightweight tag input. */
function TagInput({
  label, placeholder, values, onChange,
}: {
  label: string
  placeholder?: string
  values: string[]
  onChange: (v: string[]) => void
}) {
  const [draft, setDraft] = React.useState('')
  const add = () => {
    const v = draft.trim()
    if (v && !values.includes(v)) {
      onChange([...values, v])
      setDraft('')
    }
  }
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1.5 rounded-md border bg-transparent p-2 min-h-9">
        {values.map((v) => (
          <Badge key={v} variant="secondary" className="gap-1 pr-1">
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="rounded-sm p-0.5 hover:bg-foreground/10"
              aria-label={`Remove ${v}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder={placeholder ?? 'Type and press Enter…'}
          className="flex-1 min-w-24 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
    </div>
  )
}

/** Styled <pre> code block (no external dep). */
function CodeBlock({ content, className }: { content: string; className?: string }) {
  return (
    <pre
      className={cn(
        'max-h-80 overflow-auto scroll-soft rounded-xl border border-border/60 bg-muted/40 p-4 text-[12px] leading-relaxed text-foreground/90 font-mono whitespace-pre-wrap break-words',
        className,
      )}
    >
      {content}
    </pre>
  )
}

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold tracking-tight">{children}</h3>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}

/* ====================================================================== */
/*  Dashboard view                                                        */
/* ====================================================================== */

function MentorDashboardView({ user, setView }: { user: User; setView: (v: string) => void }) {
  const { data, loading } = useAsync(() => analyticsApi.overview('MENTOR', user.id), [user.id])
  const { data: projects } = useAsync(() => projectsApi.list({ mentorId: user.id }), [user.id])
  const { data: submissions } = useAsync(
    () => submissionsApi.list(),
    [user.id],
  )
  const { data: evaluations } = useAsync<EvaluationWithJoins[]>(
    () => evaluationsApi.list({ mentorId: user.id }) as Promise<EvaluationWithJoins[]>,
    [user.id],
  )

  if (loading || !data) {
    return (
      <>
        <PageHeader
          eyebrow="InternForge · Mentor"
          title="Mentor Dashboard"
          description={`Welcome back, ${user.name}. Here is your mentorship at a glance.`}
          icon={LayoutDashboard}
        />
        <LoadingGrid count={5} />
      </>
    )
  }

  const mentor = (data as any).mentor ?? {
    mentees: 0,
    projects: 0,
    pendingReviews: 0,
    evaluations: 0,
    avgScore: 0,
  }
  const workload: { week: string; reviews: number }[] = (data as any).workload ?? []

  const myProjectIds = new Set((projects ?? []).map((p) => p.id))
  const pending = (submissions ?? []).filter(
    (s) => myProjectIds.has(s.projectId) && (s.status === 'SUBMITTED' || s.status === 'REVIEWED'),
  )
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  return (
    <>
      <WelcomeHero
        role="MENTOR"
        userName={user.name}
        userTitle={user.title}
        headline={`Welcome back, ${user.name.split(' ')[0]}.`}
        subtext={`${mentor.pendingReviews} submission${mentor.pendingReviews === 1 ? '' : 's'} await your review. Guide your interns with structured feedback and AI-assisted evaluation.`}
        stats={[
          { label: 'My interns', value: mentor.mentees, icon: Users },
          { label: 'To review', value: mentor.pendingReviews, icon: CheckCircle2 },
          { label: 'Evaluations', value: mentor.evaluations, icon: Star },
          { label: 'Avg score', value: `${mentor.avgScore}/100`, icon: TrendingUp },
        ]}
        primaryAction={{ label: 'Review queue', onClick: () => setView('reviews'), icon: CheckCircle2 }}
        secondaryAction={{ label: 'My interns', onClick: () => setView('interns'), icon: Users }}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="My Interns" value={mentor.mentees} icon={Users} accent="emerald" trend={12} trendLabel="vs last sprint" />
        <StatCard label="Active Projects" value={mentor.projects} icon={Activity} accent="amber" />
        <StatCard label="Submissions to Review" value={mentor.pendingReviews} icon={Hourglass} accent="sky" trend={-8} trendLabel="cleared 2" />
        <StatCard label="Evaluations Given" value={mentor.evaluations} icon={ClipboardList} accent="violet" />
        <StatCard label="Avg Score" value={`${mentor.avgScore}/100`} icon={TrendingUp} accent="rose" trend={4} trendLabel="quality up" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          className="lg:col-span-2"
          title="Weekly review workload"
          description="Submissions evaluated per week"
          icon={BarChart3}
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workload} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                <RechartsTooltip
                  cursor={{ fill: 'rgba(16,185,129,0.08)' }}
                  contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 12 }}
                />
                <Bar dataKey="reviews" radius={[6, 6, 0, 0]} fill={EMERALD} maxBarSize={42} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Pending reviews" description={`${pending.length} awaiting your feedback`} icon={Hourglass}>
          {pending.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="All caught up" description="No submissions pending review." />
          ) : (
            <ScrollArea className="max-h-72">
              <ul className="space-y-2 pr-2">
                {pending.slice(0, 8).map((s) => (
                  <li
                    key={s.id}
                    className="group flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-2.5 transition-colors hover:border-primary/40 hover:bg-muted/50"
                  >
                    <UserAvatar name={s.student?.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {s.student?.name ?? 'Unknown'} · v{s.version} · {timeAgo(s.submittedAt)}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setView('reviews')}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Today's standup" description={today} icon={MessageSquare}>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Share your focus for the day with your cohort.
            </p>
            <Textarea placeholder="Today I'm focusing on… (e.g., finalising Sara's ForgeUI v2 review, syncing with Ishaan on the game-loop PR)."
              className="min-h-24" />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => toast.success('Standup drafted to clipboard.')}>
                Copy
              </Button>
              <Button size="sm" onClick={() => toast.success('Standup posted to your cohort channel.')}>
                <Send className="h-4 w-4" /> Post standup
              </Button>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Recent evaluations" icon={Star}>
          {(evaluations ?? []).length === 0 ? (
            <EmptyState icon={Star} title="No evaluations yet" description="Submit your first review from the queue." />
          ) : (
            <ScrollArea className="max-h-72">
              <ul className="space-y-2 pr-2">
                {(evaluations ?? []).slice(0, 6).map((e) => (
                  <li key={e.id} className="flex items-center gap-3 rounded-xl border border-border/60 p-2.5">
                    <ScoreBadge score={e.score} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {e.submission?.student?.name ?? 'Intern'} · {e.submission?.title ?? 'Submission'}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{timeAgo(e.createdAt)}</p>
                    </div>
                    <StatusPill status={e.submission?.status ?? 'REVIEWED'} />
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </SectionCard>
      </div>
    </>
  )
}

/* ====================================================================== */
/*  Interns view                                                          */
/* ====================================================================== */

interface InternAggregate {
  user: User
  project: Project
  evaluations: EvaluationWithJoins[]
  latestScore?: number
  skillAvg?: number
}

function MentorInternsView({ user, setView }: { user: User; setView: (v: string) => void }) {
  const projectsReq = useAsync(() => projectsApi.list({ mentorId: user.id }), [user.id])
  const submissionsReq = useAsync(
    () => submissionsApi.list(),
    [user.id],
  )
  const evaluationsReq = useAsync<EvaluationWithJoins[]>(
    () => evaluationsApi.list({ mentorId: user.id }) as Promise<EvaluationWithJoins[]>,
    [user.id],
  )

  const [skillMap, setSkillMap] = React.useState<Record<string, UserSkill[]>>({})
  const projects = projectsReq.data ?? []

  // derive distinct interns from projects
  const interns: InternAggregate[] = React.useMemo(() => {
    const map = new Map<string, InternAggregate>()
    for (const p of projects) {
      if (!p.student) continue
      if (map.has(p.studentId)) continue
      map.set(p.studentId, {
        user: p.student,
        project: p,
        evaluations: [],
      })
    }
    const evals = evaluationsReq.data ?? []
    for (const e of evals) {
      const target = projects.find((p) => p.id === e.projectId)
      const studentId = e.submission?.studentId ?? target?.studentId
      if (!studentId) continue
      const intern = map.get(studentId)
      if (intern) intern.evaluations.push(e)
    }
    for (const intern of map.values()) {
      const sorted = [...intern.evaluations].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      intern.latestScore = sorted[0]?.score
    }
    return Array.from(map.values())
  }, [projects, evaluationsReq.data])

  // Load skills per intern (lazy, once). Guarded so it stops after the first
  // successful load per intern — never re-runs for an already-loaded intern.
  React.useEffect(() => {
    let active = true
    ;(async () => {
      const next: Record<string, UserSkill[]> = {}
      for (const intern of interns) {
        if (skillMap[intern.user.id]) continue
        try {
          const s = await skillsApi.forUser(intern.user.id)
          next[intern.user.id] = s
        } catch {
          next[intern.user.id] = []
        }
      }
      if (active && Object.keys(next).length) setSkillMap((m) => ({ ...m, ...next }))
    })()
    return () => {
      active = false
    }
  }, [interns])

  // Derive skill averages as a pure memo (no setState → no infinite loop).
  const skillAvg: Record<string, number> = React.useMemo(() => {
    const out: Record<string, number> = {}
    for (const intern of interns) {
      const skills = skillMap[intern.user.id]
      if (skills && skills.length) {
        out[intern.user.id] = Math.round(skills.reduce((s, x) => s + x.current, 0) / skills.length)
      }
    }
    return out
  }, [interns, skillMap])

  const [selected, setSelected] = React.useState<InternAggregate | null>(null)
  const [feedbackOpen, setFeedbackOpen] = React.useState<InternAggregate | null>(null)
  const [feedbackText, setFeedbackText] = React.useState('')

  const loading = projectsReq.loading || submissionsReq.loading || evaluationsReq.loading
  if (loading && interns.length === 0) {
    return (
      <>
        <PageHeader eyebrow="InternForge · Mentor" title="My Interns" icon={Users} description="Loading your cohort…" />
        <LoadingGrid count={3} />
      </>
    )
  }

  if (interns.length === 0) {
    return (
      <>
        <PageHeader eyebrow="InternForge · Mentor" title="My Interns" icon={Users} />
        <EmptyState
          icon={Users}
          title="No interns assigned"
          description="When projects are assigned to you, your interns will appear here."
        />
      </>
    )
  }

  const internSubmissions = (intern: InternAggregate) =>
    (submissionsReq.data ?? []).filter((s) => s.studentId === intern.user.id)

  const sendFeedback = (intern: InternAggregate) => {
    if (!feedbackText.trim()) {
      toast.error('Please write a message first.')
      return
    }
    feedbackApi
      .create({
        fromUserId: user.id,
        toUserId: intern.user.id,
        rating: 5,
        content: feedbackText,
        type: 'SPONTANEOUS',
      })
      .then(() => {
        toast.success(`Feedback sent to ${intern.user.name}.`)
        setFeedbackOpen(null)
        setFeedbackText('')
      })
      .catch(() => toast.error('Could not send feedback.'))
  }

  return (
    <>
      <PageHeader
        eyebrow="InternForge · Mentor"
        title="My Interns"
        description={`You mentor ${interns.length} intern${interns.length === 1 ? '' : 's'} across ${projects.length} project${projects.length === 1 ? '' : 's'}.`}
        icon={Users}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {interns.map((intern) => {
          const skills = skillMap[intern.user.id] ?? []
          return (
            <GlassCard key={intern.user.id} hover className="p-5">
              <div className="flex items-start gap-3">
                <UserAvatar name={intern.user.name} src={intern.user.avatarUrl} size="lg" />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="truncate font-semibold">{intern.user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {intern.user.title ?? 'Intern'} · {intern.user.university ?? ''}
                  </p>
                  <div className="flex items-center gap-1.5 pt-1">
                    <StatusPill status={intern.project.status} />
                  </div>
                </div>
                <ProgressRing value={intern.project.progress} label={`${intern.project.progress}%`} />
              </div>

              <Separator className="my-3" />

              <div className="space-y-1.5 text-sm">
                <MetaRow label="Project" value={<span className="truncate">{intern.project.title}</span>} />
                <MetaRow label="Latest eval" value={intern.latestScore ? <ScoreBadge score={intern.latestScore} /> : <span className="text-xs text-muted-foreground">—</span>} />
                <MetaRow label="Skill avg" value={<span className="font-semibold tabular-nums">{skillAvg[intern.user.id] != null ? `${skillAvg[intern.user.id]}%` : '—'}</span>} />
                <MetaRow label="Submissions" value={internSubmissions(intern).length} />
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setSelected(intern)}>
                  <FileCode2 className="h-4 w-4" /> View history
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setFeedbackOpen(intern)}>
                  <MessageSquare className="h-4 w-4" /> Feedback
                </Button>
              </div>
            </GlassCard>
          )
        })}
      </div>

      {/* Intern detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserAvatar name={selected?.user.name} src={selected?.user.avatarUrl} size="sm" />
              {selected?.user.name}
            </DialogTitle>
            <DialogDescription>
              {selected?.project.title} · {selected?.user.university ?? 'Intern'}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <Tabs defaultValue="submissions">
              <TabsList>
                <TabsTrigger value="submissions">Submissions</TabsTrigger>
                <TabsTrigger value="skills">Skills</TabsTrigger>
                <TabsTrigger value="evals">Evaluations</TabsTrigger>
              </TabsList>

              <TabsContent value="submissions" className="mt-3">
                <ScrollArea className="max-h-80">
                  {internSubmissions(selected).length === 0 ? (
                    <EmptyState icon={Send} title="No submissions" description="This intern hasn't submitted work yet." />
                  ) : (
                    <ul className="space-y-2 pr-2">
                      {internSubmissions(selected).map((s) => (
                        <li key={s.id} className="rounded-xl border border-border/60 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-medium">{s.title}</p>
                            <StatusPill status={s.status} />
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            v{s.version} · {formatDate(s.submittedAt)}
                            {s.plagiarismScore !== null && s.plagiarismScore !== undefined && (
                              <> · Plagiarism {(s.plagiarismScore * 100).toFixed(1)}%</>
                            )}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="skills" className="mt-3">
                <ScrollArea className="max-h-80">
                  {(skillMap[selected.user.id] ?? []).length === 0 ? (
                    <EmptyState icon={Sparkles} title="No skills tracked" />
                  ) : (
                    <div className="space-y-3 pr-2">
                      {skillMap[selected.user.id]!.map((us) => (
                        <SkillBar
                          key={us.id}
                          label={us.skill?.name ?? 'Skill'}
                          current={us.current}
                          baseline={us.baseline}
                          verified={us.verified}
                          category={us.skill?.category}
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="evals" className="mt-3">
                <ScrollArea className="max-h-80">
                  {selected.evaluations.length === 0 ? (
                    <EmptyState icon={Star} title="No evaluations" />
                  ) : (
                    <ul className="space-y-2 pr-2">
                      {selected.evaluations.map((e) => (
                        <li key={e.id} className="rounded-xl border border-border/60 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <ScoreBadge score={e.score} />
                            <span className="text-xs text-muted-foreground">{formatDate(e.createdAt)}</span>
                          </div>
                          {e.feedback && (
                            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{e.feedback}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setView('reviews')}>Open review queue</Button>
            <Button onClick={() => { setFeedbackOpen(selected); setSelected(null) }}>
              <MessageSquare className="h-4 w-4" /> Send feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick feedback dialog */}
      <Dialog open={!!feedbackOpen} onOpenChange={(o) => !o && setFeedbackOpen(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Send feedback to {feedbackOpen?.user.name}</DialogTitle>
            <DialogDescription>A spontaneous note will land in their feedback inbox.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder={`Hi ${feedbackOpen?.user.name?.split(' ')[0] ?? 'there'}, great work on…`}
            className="min-h-32"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackOpen(null)}>Cancel</Button>
            <Button onClick={() => feedbackOpen && sendFeedback(feedbackOpen)}>
              <Send className="h-4 w-4" /> Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* ====================================================================== */
/*  Reviews view                                                           */
/* ====================================================================== */

interface EvalForm {
  codeQuality: number
  communication: number
  delivery: number
  learning: number
  feedback: string
  aiFeedback: string
  strengths: string[]
  improvements: string[]
}

const EMPTY_FORM: EvalForm = {
  codeQuality: 70,
  communication: 70,
  delivery: 70,
  learning: 70,
  feedback: '',
  aiFeedback: '',
  strengths: [],
  improvements: [],
}

function MentorReviewsView({ user }: { user: User }) {
  const projectsReq = useAsync(() => projectsApi.list({ mentorId: user.id }), [user.id])
  const submissionsReq = useAsync(() => submissionsApi.list(), [user.id])
  const evaluationsReq = useAsync<EvaluationWithJoins[]>(
    () => evaluationsApi.list({ mentorId: user.id }) as Promise<EvaluationWithJoins[]>,
    [user.id],
  )

  const [filter, setFilter] = React.useState<'all' | 'pending' | 'reviewed'>('pending')
  const [active, setActive] = React.useState<Submission | null>(null)
  const [form, setForm] = React.useState<EvalForm>(EMPTY_FORM)
  const [aiBusy, setAiBusy] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)

  const projects = projectsReq.data ?? []
  const myProjectIds = new Set(projects.map((p) => p.id))
  const submissions = (submissionsReq.data ?? []).filter((s) => myProjectIds.has(s.projectId))
  const evaluations = evaluationsReq.data ?? []

  const filtered = submissions.filter((s) => {
    if (filter === 'pending') return s.status === 'SUBMITTED' || s.status === 'REVIEWED'
    if (filter === 'reviewed') return s.status === 'APPROVED' || s.status === 'REJECTED'
    return true
  })

  const loading = projectsReq.loading || submissionsReq.loading || evaluationsReq.loading
  if (loading && submissions.length === 0) {
    return (
      <>
        <PageHeader eyebrow="InternForge · Mentor" title="Submissions to Review" icon={CheckCircle2} />
        <LoadingGrid count={3} />
      </>
    )
  }

  const openReview = (s: Submission) => {
    setActive(s)
    // Prefill from existing evaluation if any
    const existing = evaluations.find((e) => e.submissionId === s.id)
    setForm(existing
      ? {
          codeQuality: existing.codeQuality,
          communication: existing.communication,
          delivery: existing.delivery,
          learning: existing.learning,
          feedback: existing.feedback ?? '',
          aiFeedback: existing.aiFeedback ?? '',
          strengths: existing.strengths ?? [],
          improvements: existing.improvements ?? [],
        }
      : EMPTY_FORM)
  }

  const generateAi = async () => {
    if (!active) return
    setAiBusy(true)
    try {
      const res = await aiApi.feedback({ submissionId: active.id })
      setForm((f) => ({
        ...f,
        feedback: f.feedback || res.feedback,
        aiFeedback: res.feedback,
        strengths: res.strengths,
        improvements: res.improvements,
      }))
      toast.success('AI feedback generated.')
    } catch (e: any) {
      toast.error('AI feedback failed: ' + (e?.message ?? 'unknown'))
    } finally {
      setAiBusy(false)
    }
  }

  const submitEval = async () => {
    if (!active) return
    setSubmitting(true)
    try {
      await evaluationsApi.create({
        submissionId: active.id,
        projectId: active.projectId,
        mentorId: user.id,
        codeQuality: form.codeQuality,
        communication: form.communication,
        delivery: form.delivery,
        learning: form.learning,
        feedback: form.feedback,
        aiFeedback: form.aiFeedback,
        strengths: form.strengths,
        improvements: form.improvements,
      })
      toast.success('Evaluation submitted. Submission marked approved.')
      setActive(null)
      submissionsReq.reload()
      evaluationsReq.reload()
    } catch (e: any) {
      toast.error('Submit failed: ' + (e?.message ?? 'unknown'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="InternForge · Mentor"
        title="Submissions to Review"
        description={`${filtered.length} in your queue across ${projects.length} project${projects.length === 1 ? '' : 's'}.`}
        icon={CheckCircle2}
      />

      <div className="flex items-center gap-2">
        {([
          ['pending', 'Pending'],
          ['reviewed', 'Reviewed'],
          ['all', 'All'],
        ] as const).map(([k, label]) => (
          <Button
            key={k}
            size="sm"
            variant={filter === k ? 'default' : 'outline'}
            onClick={() => setFilter(k)}
          >
            {label}
            <Badge variant="secondary" className="ml-1">
              {submissions.filter((s) =>
                k === 'pending'
                  ? s.status === 'SUBMITTED' || s.status === 'REVIEWED'
                  : k === 'reviewed'
                  ? s.status === 'APPROVED' || s.status === 'REJECTED'
                  : true,
              ).length}
            </Badge>
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Queue empty"
          description="No submissions match this filter."
        />
      ) : (
        <div className="grid gap-3">
          {filtered.map((s) => {
            const existing = evaluations.find((e) => e.submissionId === s.id)
            const plag = s.plagiarismScore ?? 0
            return (
              <GlassCard key={s.id} hover className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar name={s.student?.name} src={s.student?.avatarUrl} size="md" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{s.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {s.student?.name} · {s.project?.title ?? 'Project'} · v{s.version} · {timeAgo(s.submittedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={s.status} />
                    <Badge variant={plag > 0.25 ? 'destructive' : 'secondary'} className="gap-1">
                      <Flag className="h-3 w-3" /> {(plag * 100).toFixed(1)}%
                    </Badge>
                    {existing && <ScoreBadge score={existing.score} />}
                    <Button size="sm" onClick={() => openReview(s)}>
                      {existing ? <><Check className="h-4 w-4" /> Re-open</> : <><FileCode2 className="h-4 w-4" /> Open review</>}
                    </Button>
                  </div>
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}

      {/* Review dialog */}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCode2 className="h-4 w-4 text-primary" />
              {active?.title}
            </DialogTitle>
            <DialogDescription>
              {active?.student?.name} · {active?.project?.title} · v{active?.version}
            </DialogDescription>
          </DialogHeader>

          {active && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <SectionTitle hint={formatDateTime(active.submittedAt)}>Submission content</SectionTitle>
                <CodeBlock content={active.content} />
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <StatusPill status={active.status} />
                  {active.plagiarismScore !== null && active.plagiarismScore !== undefined && (
                    <Badge variant={(active.plagiarismScore ?? 0) > 0.25 ? 'destructive' : 'secondary'} className="gap-1">
                      <Flag className="h-3 w-3" /> Plagiarism {(active.plagiarismScore * 100).toFixed(1)}%
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <SectionTitle>Evaluation rubric</SectionTitle>
                <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3">
                  {DIMENSIONS.map((d) => (
                    <div key={d.key} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <Label className="font-medium">{d.label}</Label>
                        <span className="tabular-nums font-semibold">{form[d.key]}/100</span>
                      </div>
                      <Slider
                        value={[form[d.key]]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(v) => setForm((f) => ({ ...f, [d.key]: v[0] }))}
                      />
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-border/60 pt-2">
                    <span className="text-xs text-muted-foreground">Composite score</span>
                    <ScoreBadge
                      score={Math.round(
                        (form.codeQuality + form.communication + form.delivery + form.learning) / 4,
                      )}
                    />
                  </div>
                </div>

                {form.aiFeedback && (
                  <div className="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-emerald-500/10 p-3">
                    <div className="flex items-center gap-2">
                      <AIBadge />
                      <p className="text-xs font-semibold">AI suggested feedback</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{form.aiFeedback}</p>
                  </div>
                )}

                <Textarea
                  value={form.feedback}
                  onChange={(e) => setForm((f) => ({ ...f, feedback: e.target.value }))}
                  placeholder="Your written feedback to the intern…"
                  className="min-h-24"
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <TagInput
                    label="Strengths"
                    placeholder="Add a strength…"
                    values={form.strengths}
                    onChange={(v) => setForm((f) => ({ ...f, strengths: v }))}
                  />
                  <TagInput
                    label="Improvements"
                    placeholder="Add an improvement…"
                    values={form.improvements}
                    onChange={(v) => setForm((f) => ({ ...f, improvements: v }))}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <Button variant="outline" onClick={generateAi} disabled={aiBusy}>
              {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate AI feedback
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setActive(null)}>Cancel</Button>
              <Button onClick={submitEval} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Submit evaluation
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* ====================================================================== */
/*  Evaluation history view                                                */
/* ====================================================================== */

function MentorEvaluationView({ user }: { user: User }) {
  const req = useAsync<EvaluationWithJoins[]>(
    () => evaluationsApi.list({ mentorId: user.id }) as Promise<EvaluationWithJoins[]>,
    [user.id],
  )
  const [expanded, setExpanded] = React.useState<string | null>(null)

  if (req.loading && !req.data) {
    return (
      <>
        <PageHeader eyebrow="InternForge · Mentor" title="Evaluations" icon={Star} />
        <LoadingGrid count={3} />
      </>
    )
  }

  const evaluations = req.data ?? []

  if (evaluations.length === 0) {
    return (
      <>
        <PageHeader eyebrow="InternForge · Mentor" title="Evaluations" icon={Star} />
        <EmptyState icon={Star} title="No evaluations yet" description="Submit your first review from the queue." />
      </>
    )
  }

  // Radar averages across 4 dimensions
  const radar = [{
    code: Math.round(evaluations.reduce((s, e) => s + e.codeQuality, 0) / evaluations.length),
    comms: Math.round(evaluations.reduce((s, e) => s + e.communication, 0) / evaluations.length),
    delivery: Math.round(evaluations.reduce((s, e) => s + e.delivery, 0) / evaluations.length),
    learning: Math.round(evaluations.reduce((s, e) => s + e.learning, 0) / evaluations.length),
  }]
  const radarData = [
    { dim: 'Code', value: radar[0].code },
    { dim: 'Comms', value: radar[0].comms },
    { dim: 'Delivery', value: radar[0].delivery },
    { dim: 'Learning', value: radar[0].learning },
  ]

  // Avg score line over time (chronological)
  const sorted = [...evaluations].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
  const lineData = sorted.map((e, i) => ({
    name: `#${i + 1}`,
    score: e.score,
    date: formatDate(e.createdAt, { month: 'short', day: 'numeric' }),
  }))

  return (
    <>
      <PageHeader
        eyebrow="InternForge · Mentor"
        title="Evaluations"
        description={`${evaluations.length} evaluation${evaluations.length === 1 ? '' : 's'} given.`}
        icon={Star}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Dimension averages" description="Mean score across all your evaluations" icon={BarChart3}>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="dim" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <RechartsTooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                <Radar dataKey="value" stroke={EMERALD} fill={EMERALD} fillOpacity={0.45} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Score trajectory" description="Evaluation score over time" icon={TrendingUp}>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={12} />
                <RechartsTooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 12 }}
                  formatter={(v: number) => [`${v}/100`, 'Score']}
                  labelFormatter={(_l: any, payload: any) => payload?.[0]?.payload?.date ?? ''}
                />
                <Line type="monotone" dataKey="score" stroke={AMBER} strokeWidth={2.5} dot={{ r: 4, fill: AMBER }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Evaluation history" icon={Star} contentClassName="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Submission</TableHead>
              <TableHead>Score</TableHead>
              <TableHead className="hidden md:table-cell">Dimensions</TableHead>
              <TableHead className="hidden lg:table-cell">Feedback</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {evaluations.map((e) => {
              const isOpen = expanded === e.id
              return (
                <React.Fragment key={e.id}>
                  <TableRow
                    className="cursor-pointer"
                    onClick={() => setExpanded(isOpen ? null : e.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserAvatar name={e.submission?.student?.name} size="xs" />
                        <span className="font-medium">{e.submission?.student?.name ?? 'Intern'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-48 truncate">{e.submission?.title ?? 'Submission'}</TableCell>
                    <TableCell><ScoreBadge score={e.score} /></TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1.5">
                        {DIMENSIONS.map((d) => (
                          <div key={d.key} className="h-1.5 w-8 overflow-hidden rounded-full bg-muted" title={`${d.label}: ${(e as any)[d.key]}`}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${(e as any)[d.key]}%`,
                                backgroundColor: EMERALD,
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell max-w-xs truncate text-xs text-muted-foreground">
                      {e.feedback ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(e.createdAt)}</TableCell>
                    <TableCell>
                      <ChevronRight className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-90')} />
                    </TableCell>
                  </TableRow>
                  {isOpen && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={7} className="bg-muted/30">
                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Star className="h-3.5 w-3.5 text-amber-500" />
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your feedback</p>
                            </div>
                            <p className="whitespace-pre-wrap text-sm">{e.feedback || 'No written feedback.'}</p>
                            {e.strengths.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {e.strengths.map((s) => (
                                  <Badge key={s} variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">{s}</Badge>
                                ))}
                              </div>
                            )}
                            {e.improvements.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {e.improvements.map((s) => (
                                  <Badge key={s} variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-300">{s}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <AIBadge />
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI feedback</p>
                            </div>
                            {e.aiFeedback ? (
                              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{e.aiFeedback}</p>
                            ) : (
                              <p className="text-sm text-muted-foreground">No AI feedback was generated for this evaluation.</p>
                            )}
                            <Separator className="my-2" />
                            <div className="grid grid-cols-2 gap-2">
                              {DIMENSIONS.map((d) => (
                                <div key={d.key} className="rounded-lg border border-border/60 p-2">
                                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{d.label}</p>
                                  <p className="text-sm font-semibold tabular-nums">{(e as any)[d.key]}/100</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              )
            })}
          </TableBody>
        </Table>
      </SectionCard>
    </>
  )
}

/* ====================================================================== */
/*  Feedback view                                                          */
/* ====================================================================== */

function MentorFeedbackView({ user }: { user: User }) {
  const historyReq = useAsync(() => feedbackApi.list({ fromUserId: user.id }), [user.id])
  const projectsReq = useAsync(() => projectsApi.list({ mentorId: user.id }), [user.id])

  const [toUserId, setToUserId] = React.useState<string>('')
  const [rating, setRating] = React.useState(5)
  const [type, setType] = React.useState<'WEEKLY' | 'MID' | 'FINAL' | 'SPONTANEOUS'>('WEEKLY')
  const [content, setContent] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  const projects = projectsReq.data ?? []
  const interns: User[] = React.useMemo(() => {
    const map = new Map<string, User>()
    for (const p of projects) {
      if (p.student && !map.has(p.studentId)) map.set(p.studentId, p.student)
    }
    return Array.from(map.values())
  }, [projects])

  React.useEffect(() => {
    if (!toUserId && interns[0]) setToUserId(interns[0].id)
  }, [interns, toUserId])

  const submit = async () => {
    if (!toUserId) {
      toast.error('Pick an intern first.')
      return
    }
    if (!content.trim()) {
      toast.error('Write some feedback before sending.')
      return
    }
    setSubmitting(true)
    try {
      await feedbackApi.create({
        fromUserId: user.id,
        toUserId,
        rating,
        content,
        type,
      })
      toast.success('Feedback delivered.')
      setContent('')
      setRating(5)
      historyReq.reload()
    } catch (e: any) {
      toast.error('Could not send feedback: ' + (e?.message ?? 'unknown'))
    } finally {
      setSubmitting(false)
    }
  }

  const history = historyReq.data ?? []

  return (
    <>
      <PageHeader
        eyebrow="InternForge · Mentor"
        title="Give Feedback"
        description="Recognise wins and coach gaps — your feedback shows up in their inbox."
        icon={MessagesSquare}
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <SectionCard
          className="lg:col-span-2"
          title="Feedback history"
          description={`${history.length} sent`}
          icon={GraduationCap}
          contentClassName="p-0"
        >
          {historyReq.loading && history.length === 0 ? (
            <div className="p-5"><LoadingGrid count={2} /></div>
          ) : history.length === 0 ? (
            <EmptyState icon={MessagesSquare} title="No feedback yet" description="Send your first note using the form." />
          ) : (
            <ScrollArea className="max-h-[28rem]">
              <ul className="divide-y divide-border/60">
                {history.map((f) => (
                  <li key={f.id} className="flex gap-3 p-4">
                    <UserAvatar name={f.toUser?.name} src={f.toUser?.avatarUrl} size="sm" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">{f.toUser?.name ?? 'Intern'}</p>
                        <StarsDisplay value={f.rating} />
                      </div>
                      <Badge variant="outline" className="text-[10px]">{f.type}</Badge>
                      <p className="line-clamp-3 text-xs text-muted-foreground">{f.content}</p>
                      <p className="text-[10px] text-muted-foreground/70">{formatDate(f.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </SectionCard>

        <SectionCard className="lg:col-span-3" title="New feedback" icon={Send}>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Intern</Label>
                <Select value={toUserId} onValueChange={setToUserId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an intern" />
                  </SelectTrigger>
                  <SelectContent>
                    {interns.map((i) => (
                      <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Feedback type</Label>
                <Select value={type} onValueChange={(v: any) => setType(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEEKLY">Weekly check-in</SelectItem>
                    <SelectItem value="MID">Mid-internship</SelectItem>
                    <SelectItem value="FINAL">Final review</SelectItem>
                    <SelectItem value="SPONTANEOUS">Spontaneous</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Rating</Label>
              <StarsInput value={rating} onChange={setRating} />
            </div>

            <div className="space-y-1.5">
              <Label>Your message</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Be specific, kind, and actionable. Reference concrete work."
                className="min-h-40"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setContent(''); setRating(5) }}>Reset</Button>
              <Button onClick={submit} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send feedback
              </Button>
            </div>
          </div>
        </SectionCard>
      </div>
    </>
  )
}

/* ====================================================================== */
/*  Attendance view                                                        */
/* ====================================================================== */

function MentorAttendanceView({ user }: { user: User }) {
  const projectsReq = useAsync(() => projectsApi.list({ mentorId: user.id }), [user.id])
  const [records, setRecords] = React.useState<Record<string, Attendance[]>>({})
  const [loading, setLoading] = React.useState(true)

  const projects = projectsReq.data ?? []
  const interns: User[] = React.useMemo(() => {
    const map = new Map<string, User>()
    for (const p of projects) {
      if (p.student && !map.has(p.studentId)) map.set(p.studentId, p.student)
    }
    return Array.from(map.values())
  }, [projects])

  // Last 7 days (oldest → newest)
  const days = React.useMemo(() => {
    const out: Date[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      out.push(d)
    }
    return out
  }, [])

  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  React.useEffect(() => {
    let active = true
    if (interns.length === 0) {
      setLoading(projectsReq.loading)
      return
    }
    setLoading(true)
    ;(async () => {
      const next: Record<string, Attendance[]> = {}
      for (const intern of interns) {
        try {
          const r = await attendanceApi.list({ userId: intern.id })
          next[intern.id] = r
        } catch {
          next[intern.id] = []
        }
      }
      if (active) {
        setRecords(next)
        setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [interns, projectsReq.loading])

  const markToday = (intern: User, status: string) => {
    // No write endpoint — toast demo
    toast(`Demo: attendance recorded as ${status} for ${intern.name}.`, {
      description: 'Persisting attendance writes is not wired in this demo backend.',
    })
    // Optimistically reflect in grid
    setRecords((m) => {
      const list = m[intern.id] ?? []
      const today = fmt(new Date())
      const exists = list.find((r) => r.date.slice(0, 10) === today)
      const updated: Attendance[] = exists
        ? list.map((r) => (r.date.slice(0, 10) === today ? { ...r, status } : r))
        : [
            {
              id: `local-${today}`,
              userId: intern.id,
              date: new Date().toISOString(),
              status,
              checkIn: null,
              checkOut: null,
              notes: null,
              internshipId: null,
            },
            ...list,
          ]
      return { ...m, [intern.id]: updated }
    })
  }

  if (projectsReq.loading && interns.length === 0) {
    return (
      <>
        <PageHeader eyebrow="InternForge · Mentor" title="Attendance" icon={CalendarCheck} />
        <LoadingGrid count={3} />
      </>
    )
  }

  if (interns.length === 0) {
    return (
      <>
        <PageHeader eyebrow="InternForge · Mentor" title="Attendance" icon={CalendarCheck} />
        <EmptyState icon={CalendarCheck} title="No interns assigned" />
      </>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="InternForge · Mentor"
        title="Attendance"
        description="Last 7 days across your cohort. Use the popover to record today."
        icon={CalendarCheck}
      />

      <div className="grid gap-4">
        {interns.map((intern) => {
          const list = records[intern.id] ?? []
          const presentCount = list.filter(
            (r) => r.status === 'PRESENT' || r.status === 'REMOTE',
          ).length
          const rate = list.length ? Math.round((presentCount / list.length) * 100) : 0
          return (
            <GlassCard key={intern.id} className="p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <UserAvatar name={intern.name} src={intern.avatarUrl} size="md" />
                  <div>
                    <p className="font-semibold">{intern.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Attendance rate <span className="font-semibold text-foreground">{rate}%</span> · {list.length} records
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Calendar className="h-4 w-4" /> Mark today
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-56">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Set today's status</p>
                      <Separator className="my-2" />
                      <div className="grid grid-cols-1 gap-1.5">
                        {['PRESENT', 'REMOTE', 'LATE', 'ABSENT', 'LEAVE'].map((s) => (
                          <button
                            key={s}
                            onClick={() => markToday(intern, s)}
                            className={cn(
                              'flex items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs font-medium transition-colors hover:bg-accent',
                            )}
                          >
                            <span>{s.charAt(0) + s.slice(1).toLowerCase()}</span>
                            <span className={cn('h-2.5 w-2.5 rounded-full', ATTENDANCE_COLORS[s].split(' ')[0])} />
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <Separator className="my-3" />

              <div className="grid grid-cols-7 gap-1.5">
                {days.map((d) => {
                  const key = fmt(d)
                  const rec = list.find((r) => r.date.slice(0, 10) === key)
                  const cls = rec ? ATTENDANCE_COLORS[rec.status] ?? 'bg-muted text-muted-foreground' : 'bg-muted/40 text-muted-foreground/60'
                  const isToday = fmt(new Date()) === key
                  return (
                    <div
                      key={key}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-lg p-2 text-center transition-colors',
                        cls,
                        isToday && 'ring-2 ring-primary/50',
                      )}
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-wide">
                        {d.toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                      <span className="text-xs font-bold tabular-nums">{d.getDate()}</span>
                      <span className="text-[9px] uppercase">{rec?.status ?? '—'}</span>
                    </div>
                  )
                })}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Present</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-500" /> Remote</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Late</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> Absent</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-muted-foreground/40" /> Leave</span>
              </div>
            </GlassCard>
          )
        })}
        {loading && <p className="text-xs text-muted-foreground">Loading attendance records…</p>}
      </div>
    </>
  )
}

/* ====================================================================== */
/*  Analytics view                                                         */
/* ====================================================================== */

function MentorAnalyticsView({ user }: { user: User }) {
  const overviewReq = useAsync(() => analyticsApi.overview('MENTOR', user.id), [user.id])
  const projectsReq = useAsync(() => projectsApi.list({ mentorId: user.id }), [user.id])
  const evaluationsReq = useAsync<EvaluationWithJoins[]>(
    () => evaluationsApi.list({ mentorId: user.id }) as Promise<EvaluationWithJoins[]>,
    [user.id],
  )

  if (overviewReq.loading || !overviewReq.data) {
    return (
      <>
        <PageHeader eyebrow="InternForge · Mentor" title="Analytics" icon={BarChart3} />
        <LoadingGrid count={3} />
      </>
    )
  }

  const workload: { week: string; reviews: number }[] = (overviewReq.data as any).workload ?? []
  const projects = projectsReq.data ?? []
  const evaluations = evaluationsReq.data ?? []

  // Avg score over evaluations (chronological)
  const sortedEvals = [...evaluations].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
  const scoreLine = sortedEvals.map((e, i) => ({
    name: `#${i + 1}`,
    score: e.score,
    date: formatDate(e.createdAt, { month: 'short', day: 'numeric' }),
  }))

  // Intern progress comparison (bar chart per intern)
  const internProgress = projects.map((p) => ({
    name: p.student?.name?.split(' ')[0] ?? 'Intern',
    progress: p.progress,
    project: p.title,
  }))

  // Workload heatmap grid (8 weeks x 7 days) — deterministic from user id
  const heatmap: { week: number; day: number; value: number }[] = (() => {
    const cells: { week: number; day: number; value: number }[] = []
    let seed = user.id.length
    for (let w = 0; w < 8; w++) {
      for (let d = 0; d < 7; d++) {
        const x = Math.sin(seed++) * 10000
        const frac = x - Math.floor(x)
        cells.push({ week: w, day: d, value: Math.floor(frac * 5) })
      }
    }
    return cells
  })()
  return (
    <>
      <PageHeader
        eyebrow="InternForge · Mentor"
        title="Mentor Analytics"
        description="Trends across your cohort and review cadence."
        icon={BarChart3}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Avg score over evaluations" description="Quality trend across your reviews" icon={TrendingUp}>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scoreLine} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={12} />
                <RechartsTooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 12 }}
                  formatter={(v: number) => [`${v}/100`, 'Score']}
                  labelFormatter={(_l: any, payload: any) => payload?.[0]?.payload?.date ?? ''}
                />
                <Line type="monotone" dataKey="score" stroke={EMERALD} strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Intern progress comparison" description="Project completion %" icon={Users}>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={internProgress} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={12} />
                <RechartsTooltip
                  cursor={{ fill: 'rgba(245,158,11,0.08)' }}
                  contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 12 }}
                  formatter={(v: number, _n, p: any) => [`${v}%`, p?.payload?.project ?? 'Project']}
                />
                <Bar dataKey="progress" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {internProgress.map((_, i) => (
                    <Cell key={i} fill={[EMERALD, AMBER, SKY, VIOLET, ROSE][i % 5]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Reviews per week" description="Review cadence over the sprint" icon={CheckCircle2}>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workload} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                <RechartsTooltip
                  cursor={{ fill: 'rgba(139,92,246,0.08)' }}
                  contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 12 }}
                />
                <Bar dataKey="reviews" radius={[6, 6, 0, 0]} fill={VIOLET} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Workload heatmap" description="Daily review intensity (last 8 weeks)" icon={Activity}>
          <div className="space-y-2">
            <div className="grid grid-cols-[auto_repeat(8,1fr)] gap-1">
              <div />
              {Array.from({ length: 8 }).map((_, w) => (
                <div key={w} className="text-center text-[9px] text-muted-foreground">W{w + 1}</div>
              ))}
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, di) => (
                <React.Fragment key={di}>
                  <div className="text-[10px] text-muted-foreground text-right pr-1">{d}</div>
                  {Array.from({ length: 8 }).map((_, w) => {
                    const cell = heatmap.find((c) => c.week === w && c.day === di)
                    const v = cell?.value ?? 0
                    const op = [0.08, 0.25, 0.5, 0.75, 1][v]
                    return (
                      <div
                        key={w}
                        title={`${v} reviews`}
                        className="aspect-square rounded-sm"
                        style={{ backgroundColor: `rgba(16,185,129,${op})` }}
                      />
                    )
                  })}
                </React.Fragment>
              ))}
            </div>
            <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
              Less
              {[0.08, 0.25, 0.5, 0.75, 1].map((o) => (
                <span key={o} className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: `rgba(16,185,129,${o})` }} />
              ))}
              More
            </div>
          </div>
        </SectionCard>
      </div>
    </>
  )
}

/* ====================================================================== */
/*  Announcements view                                                     */
/* ====================================================================== */

function MentorAnnouncementsView({ user }: { user: User }) {
  const req = useAsync(() => announcementsApi.list(), [user.id])
  const [open, setOpen] = React.useState(false)
  const [title, setTitle] = React.useState('')
  const [content, setContent] = React.useState('')
  const [internshipId, setInternshipId] = React.useState('all')

  const all = req.data ?? []
  const sorted = [...all].sort(
    (a, b) =>
      Number(b.pinned) - Number(a.pinned) ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  const broadcast = () => {
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required.')
      return
    }
    // No POST endpoint — toast demo
    toast.success('Demo: announcement broadcast to your cohort.', {
      description: `"${title}" would be visible to your interns.`,
    })
    setOpen(false)
    setTitle('')
    setContent('')
    setInternshipId('all')
  }

  if (req.loading && sorted.length === 0) {
    return (
      <>
        <PageHeader eyebrow="InternForge · Mentor" title="Announcements" icon={Megaphone} />
        <LoadingGrid count={3} />
      </>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="InternForge · Mentor"
        title="Announcements"
        description="Broadcast updates, deadlines, and shout-outs to your interns."
        icon={Megaphone}
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New announcement
          </Button>
        }
      />

      {sorted.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No announcements"
          description="Broadcast your first update to your cohort."
          action={<Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New announcement</Button>}
        />
      ) : (
        <div className="grid gap-3">
          {sorted.map((a: Announcement) => (
            <GlassCard key={a.id} hover className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-amber-500/15 text-emerald-600 dark:text-emerald-400">
                  <Megaphone className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{a.title}</p>
                    {a.pinned && (
                      <Badge variant="secondary" className="gap-1 bg-amber-500/15 text-amber-700 dark:text-amber-300">
                        <Pin className="h-3 w-3" /> Pinned
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{a.content}</p>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground/80">
                    <UserAvatar name={a.author?.name ?? user.name} size="xs" />
                    <span>{a.author?.name ?? user.name}</span>
                    <span>·</span>
                    <span>{timeAgo(a.createdAt)}</span>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New announcement</DialogTitle>
            <DialogDescription>Broadcast to your cohort (or a specific internship).</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Sprint review moved to Friday" />
            </div>
            <div className="space-y-1.5">
              <Label>Content</Label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your message…" className="min-h-32" />
            </div>
            <div className="space-y-1.5">
              <Label>Audience</Label>
              <Select value={internshipId} onValueChange={setInternshipId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All my interns</SelectItem>
                  <SelectItem value="finedge">FinEdge Frontend cohort</SelectItem>
                  <SelectItem value="pixelplay">PixelPlay Game Dev cohort</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={broadcast}>
              <Megaphone className="h-4 w-4" /> Broadcast
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* ====================================================================== */
/*  Root portal component                                                  */
/* ====================================================================== */

export function MentorPortal({ user, view, setView }: PortalProps) {
  return (
    <div className="animate-in-fade space-y-5">
      {view === 'dashboard' && <MentorDashboardView user={user} setView={setView} />}
      {view === 'interns' && <MentorInternsView user={user} setView={setView} />}
      {view === 'reviews' && <MentorReviewsView user={user} />}
      {view === 'evaluation' && <MentorEvaluationView user={user} />}
      {view === 'feedback' && <MentorFeedbackView user={user} />}
      {view === 'attendance' && <MentorAttendanceView user={user} />}
      {view === 'analytics' && <MentorAnalyticsView user={user} />}
      {view === 'announcements' && <MentorAnnouncementsView user={user} />}
      {!['dashboard', 'interns', 'reviews', 'evaluation', 'feedback', 'attendance', 'analytics', 'announcements'].includes(view) && (
        <PageHeader
          eyebrow="InternForge · Mentor"
          title="Unknown view"
          description={`The view "${view}" does not exist in the mentor portal yet.`}
          icon={AlertCircle}
        />
      )}
    </div>
  )
}
