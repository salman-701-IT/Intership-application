'use client'

/* ================================================================== *
 *  InternForge · Student Portal                                       *
 *  Single-file production implementation. 12 sub-sections.            *
 * ================================================================== */

import * as React from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  Compass, FileText, LayoutDashboard, FolderGit2, KanbanSquare, Sparkles,
  ClipboardCheck, Send, Award, Globe2, BookOpen, MessagesSquare,
  MapPin, Briefcase, Clock, Building2, Users, CheckCircle2, X, Loader2,
  Bookmark, Plus, Github, Linkedin, Share2, Calendar, Star, MessageSquare,
  TrendingUp, Target, Shield, Zap, ChevronRight, Pencil, Search, Home,
  Send as SendIcon, Bot, RefreshCw, Smile, Hourglass, ExternalLink,
  CircleDot, CheckCircle, AlertTriangle, FileCheck2, Code2, Layers,
  GitBranch, Award as AwardIcon, BadgeCheck, Signature,
  FileText as FileTextIcon, GripVertical,
} from 'lucide-react'

import type {
  User, Internship, Application, Project, Task, Submission, Evaluation,
  Certificate, DailyLog, Feedback, Conversation, Message, Badge as BadgeT,
  UserBadge, Skill, UserSkill, Assessment, AssessmentResult,
} from '@/lib/types'
import {
  internshipsApi, applicationsApi, projectsApi, tasksApi, submissionsApi,
  skillsApi, assessmentsApi, certificatesApi, logsApi, messagesApi,
  badgesApi, feedbackApi, analyticsApi, aiApi,
} from '@/lib/api'
import { getSocket } from '@/lib/socket'
import { formatDate, formatDateTime, timeAgo, daysUntil, initials, statusColor, scoreColor, gradeColor } from '@/lib/format'
import { cn } from '@/lib/utils'

import {
  PageHeader, GlassCard, StatCard, SectionCard, StatusPill, ScoreBadge,
  UserAvatar, SkillBar, EmptyState, LoadingGrid, AIBadge, JourneyTracker,
  ProgressRing, MetaRow,
} from '@/components/platform/shared'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, BarChart, Bar, ReferenceLine, Cell,
  RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts'

import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor,
  useSensor, useSensors, closestCenter, type DragEndEvent, type DragStartEvent,
  useDroppable,
} from '@dnd-kit/core'
import {
  useSortable, arrayMove, SortableContext, verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

/* ------------------------------------------------------------------ *
 *  Types                                                             *
 * ------------------------------------------------------------------ */

export interface PortalProps {
  user: User
  view: string
  setView: (v: string) => void
}

interface DemoUser extends User {
  userSkills?: (UserSkill & { skill?: Skill })[]
  userBadges?: (UserBadge & { badge?: BadgeT })[]
  company?: any
}

type AsyncState<T> = { data: T | null; loading: boolean; error: string | null }

/* ------------------------------------------------------------------ *
 *  Generic async hook                                                *
 * ------------------------------------------------------------------ */

function useAsync<T>(
  fn: () => Promise<T>,
  deps: React.DependencyList,
): AsyncState<T> & { reload: () => void } {
  const [state, setState] = React.useState<AsyncState<T>>({
    data: null, loading: true, error: null,
  })
  const [nonce, setNonce] = React.useState(0)
  const reload = React.useCallback(() => setNonce(n => n + 1), [])

  React.useEffect(() => {
    let active = true
    setState({ data: null, loading: true, error: null })
    fn()
      .then(d => active && setState({ data: d, loading: false, error: null }))
      .catch(e => active && setState({
        data: null, loading: false,
        error: e?.message ?? String(e),
      }))
    return () => { active = false }
  }, [...deps, nonce])

  return { ...state, reload }
}

/* ------------------------------------------------------------------ *
 *  Small UI helpers                                                  *
 * ------------------------------------------------------------------ */

function IconBtn({ icon: Icon, label, onClick, disabled }: {
  icon: any; label: string; onClick?: () => void; disabled?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClick} disabled={disabled} aria-label={label}>
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> {label ?? 'Loading…'}
    </div>
  )
}

function ErrorState({ error }: { error: string }) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="Something went wrong"
      description={error}
    />
  )
}

const STAGE_ORDER = ['SUBMITTED', 'SCREENING', 'INTERVIEW', 'OFFERED', 'ACCEPTED'] as const

function ApplicationPipeline({ status }: { status: string }) {
  const currentIdx = STAGE_ORDER.indexOf(status as any)
  const isWithdrawn = status === 'WITHDRAWN'
  const isRejected = status === 'REJECTED'
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {STAGE_ORDER.map((stage, i) => {
        const done = !isWithdrawn && !isRejected && currentIdx >= 0 && i < currentIdx
        const active = !isWithdrawn && !isRejected && i === currentIdx
        return (
          <React.Fragment key={stage}>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap',
                done && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
                active && 'bg-primary text-primary-foreground',
                !done && !active && 'bg-muted text-muted-foreground',
              )}
            >
              {done && <CheckCircle className="h-3 w-3" />}
              {stage}
            </span>
            {i < STAGE_ORDER.length - 1 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
            )}
          </React.Fragment>
        )
      })}
      {isWithdrawn && <Badge variant="outline" className="text-muted-foreground">Withdrawn</Badge>}
      {isRejected && <Badge variant="destructive">Rejected</Badge>}
    </div>
  )
}

/* ================================================================== *
 *  1. DISCOVER                                                        *
 * ================================================================== */

function DiscoverView({ user }: { user: DemoUser }) {
  const [q, setQ] = React.useState('')
  const [domain, setDomain] = React.useState('all')
  const [remote, setRemote] = React.useState('all')
  const [saved, setSaved] = React.useState<Record<string, boolean>>({})
  const [applying, setApplying] = React.useState<string | null>(null)

  const debouncedQ = React.useRef(q)
  React.useEffect(() => {
    const t = setTimeout(() => { debouncedQ.current = q; setQTick(t2 => t2 + 1) }, 300)
    return () => clearTimeout(t)
  }, [q])
  const [, setQTick] = React.useState(0)

  const internships = useAsync<Internship[]>(() => internshipsApi.list({
    ...(q ? { q } : {}),
    ...(domain !== 'all' ? { domain } : {}),
    ...(remote !== 'all' ? { remote } : {}),
  }), [debouncedQ.current, domain, remote])

  const recs = useAsync(() => aiApi.recommend({ userId: user.id }), [])
  const allInternships = internships.data ?? []
  const topRecs = (recs.data?.recommendations ?? []).slice(0, 3)
  const domains = Array.from(new Set(allInternships.map(i => i.domain).filter(Boolean)))

  const onApply = async (internshipId: string, title: string) => {
    setApplying(internshipId)
    try {
      await applicationsApi.apply({ internshipId })
      toast.success(`Applied to "${title}"`, { description: 'Your application is now in screening.' })
    } catch (e: any) {
      toast.error('Could not apply', { description: e?.message })
    } finally {
      setApplying(null)
    }
  }
  const onSave = (internshipId: string, title: string) => {
    setSaved(s => ({ ...s, [internshipId]: !s[internshipId] }))
    toast.success(saved[internshipId] ? `Removed "${title}"` : `Saved "${title}"`, {
      description: saved[internshipId] ? 'Removed from your shortlist.' : 'Added to your shortlist.',
    })
  }

  return (
    <>
      <PageHeader
        title="Discover Internships"
        description="Explore verified openings, AI-matched to your skill graph."
        eyebrow="InternForge · Student"
        icon={Compass}
        actions={
          <Button variant="outline" size="sm" onClick={() => internships.reload()}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        }
      />

      {/* AI Recommendations banner */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-violet text-white shadow-soft">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold flex items-center gap-2">
                AI Recommendations <AIBadge />
              </p>
              <p className="text-xs text-muted-foreground">Top matches based on your verified skills.</p>
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recs.loading ? (
            <div className="sm:col-span-2 lg:col-span-3">
              <Spinner label="Crunching matches…" />
            </div>
          ) : topRecs.length === 0 ? (
            <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-3">No recommendations yet.</p>
          ) : (
            topRecs.map((r, i) => {
              const job = allInternships.find(j => j.id === r.internshipId)
              if (!job) return null
              return (
                <div key={r.internshipId} className="rounded-xl border border-border/60 bg-muted/30 p-4 hover:shadow-soft transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{job.title}</p>
                      <p className="text-xs text-muted-foreground">{job.company?.name} · {job.domain}</p>
                    </div>
                    <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-bold text-primary tabular-nums">
                      {r.score}%
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {r.reasons.slice(0, 2).map((reason, idx) => (
                      <li key={idx} className="flex items-start gap-1 text-[11px] text-muted-foreground">
                        <CircleDot className="mt-0.5 h-3 w-3 shrink-0 text-primary/60" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                  <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => onApply(job.id, job.title)}>
                    <Send className="h-3 w-3" /> Apply
                  </Button>
                </div>
              )
            })
          )}
        </div>
      </GlassCard>

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search internships…"
              value={q}
              onChange={e => setQ(e.target.value)}
              className="pl-9"
              aria-label="Search internships"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={domain} onValueChange={setDomain}>
              <SelectTrigger className="h-9 w-[160px]" aria-label="Filter by domain">
                <SelectValue placeholder="Domain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All domains</SelectItem>
                {domains.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={remote} onValueChange={setRemote}>
              <SelectTrigger className="h-9 w-[160px]" aria-label="Filter by remote">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                <SelectItem value="true">Remote only</SelectItem>
                <SelectItem value="false">On-site only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {domain !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {domain}
              <button onClick={() => setDomain('all')} aria-label="Clear domain"><X className="h-3 w-3" /></button>
            </Badge>
          )}
          {remote !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {remote === 'true' ? 'Remote' : 'On-site'}
              <button onClick={() => setRemote('all')} aria-label="Clear location"><X className="h-3 w-3" /></button>
            </Badge>
          )}
          {(domain !== 'all' || remote !== 'all' || q) && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => { setDomain('all'); setRemote('all'); setQ('') }}
            >
              Clear all
            </button>
          )}
        </div>
      </GlassCard>

      {/* Cards grid */}
      {internships.loading ? (
        <LoadingGrid count={6} />
      ) : internships.error ? (
        <ErrorState error={internships.error} />
      ) : allInternships.length === 0 ? (
        <EmptyState icon={Compass} title="No internships match your filters" description="Try broadening the search." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allInternships.map(job => (
            <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <GlassCard hover className="flex h-full flex-col p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gradient-emerald text-white text-sm font-bold shadow-soft">
                    {initials(job.company?.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-tight truncate">{job.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{job.company?.name}</p>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onSave(job.id, job.title)} aria-label="Save internship">
                        <Bookmark className={cn('h-4 w-4', saved[job.id] && 'fill-amber-400 text-amber-500')} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{saved[job.id] ? 'Saved' : 'Save'}</TooltipContent>
                  </Tooltip>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" />{job.domain}</span>
                  <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{job.durationWeeks}w</span>
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{job.remote ? 'Remote' : job.location || 'On-site'}</span>
                  <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{job.applicantsCount ?? 0} applied</span>
                </div>

                <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{job.description}</p>

                {job.skillsRequired?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {job.skillsRequired.slice(0, 5).map((s, i) => (
                      <Badge key={i} variant="outline" className="text-[10px] font-medium">{s}</Badge>
                    ))}
                  </div>
                )}

                <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                  <div className="text-sm font-semibold">
                    {job.stipend ? <span className="text-emerald-600 dark:text-emerald-400">{job.stipend}</span> : <span className="text-muted-foreground">Unpaid</span>}
                  </div>
                  <Button size="sm" onClick={() => onApply(job.id, job.title)} disabled={applying === job.id}>
                    {applying === job.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    Apply
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </>
  )
}

/* ================================================================== *
 *  2. APPLICATIONS                                                    *
 * ================================================================== */

function ApplicationsView({ user }: { user: DemoUser }) {
  const apps = useAsync<Application[]>(() => applicationsApi.list({ studentId: user.id }), [user.id])
  const [withdrawing, setWithdrawing] = React.useState<string | null>(null)

  const onWithdraw = async (id: string) => {
    setWithdrawing(id)
    try {
      await applicationsApi.updateStatus(id, 'WITHDRAWN')
      toast.success('Application withdrawn', { description: 'The recruiter has been notified.' })
      apps.reload()
    } catch (e: any) {
      toast.error('Could not withdraw', { description: e?.message })
    } finally {
      setWithdrawing(null)
    }
  }

  return (
    <>
      <PageHeader
        title="My Applications"
        description="Track each application through the screening pipeline."
        eyebrow="InternForge · Student"
        icon={FileText}
      />
      {apps.loading ? <LoadingGrid count={3} /> :
        apps.error ? <ErrorState error={apps.error} /> :
        (apps.data ?? []).length === 0 ? (
          <EmptyState icon={FileText} title="No applications yet" description="Browse the marketplace to apply." />
        ) : (
          <div className="space-y-4">
            {(apps.data ?? []).map(app => (
              <GlassCard key={app.id} className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-emerald text-white text-sm font-bold">
                      {initials(app.internship?.company?.name)}
                    </div>
                    <div>
                      <p className="font-semibold">{app.internship?.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {app.internship?.company?.name} · Applied {formatDate(app.appliedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {app.matchScore != null && <ScoreBadge score={app.matchScore} suffix=" match" />}
                    <StatusPill status={app.status} />
                  </div>
                </div>

                <div className="mt-4">
                  <ApplicationPipeline status={app.status} />
                </div>

                {app.coverLetter && (
                  <div className="mt-4 rounded-lg border border-border/60 bg-muted/30 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Cover letter</p>
                    <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{app.coverLetter}</p>
                  </div>
                )}

                {app.interviews && app.interviews.length > 0 && (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {app.interviews.map(int => (
                      <div key={int.id} className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                        <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <div>
                          <p className="text-xs font-semibold">{int.type} interview</p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatDateTime(int.scheduledAt)} · {int.location || 'TBD'}
                          </p>
                        </div>
                        <StatusPill status={int.status} className="ml-auto" />
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-end gap-2">
                  <Button
                    variant="outline" size="sm"
                    onClick={() => onWithdraw(app.id)}
                    disabled={app.status === 'WITHDRAWN' || withdrawing === app.id}
                  >
                    {withdrawing === app.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                    Withdraw
                  </Button>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
    </>
  )
}

/* ================================================================== *
 *  3. DASHBOARD                                                       *
 * ================================================================== */

function DashboardView({ user }: { user: DemoUser }) {
  const ov = useAsync(() => analyticsApi.overview('STUDENT', user.id), [user.id])
  const fb = useAsync<Feedback[]>(() => feedbackApi.list({ toUserId: user.id }), [user.id])
  const tasks = useAsync<Task[]>(() => tasksApi.list({ assigneeId: user.id }), [user.id])
  const [logDraft, setLogDraft] = React.useState('')
  const [savingLog, setSavingLog] = React.useState(false)

  const student = (ov.data as any)?.student
  const skillTrend = (ov.data as any)?.skillTrend ?? []
  const latestFeedback = (fb.data ?? [])[0]
  const todayTasks = (tasks.data ?? []).slice(0, 5)

  const saveLog = async () => {
    if (!logDraft.trim()) { toast.error('Write a quick note first.'); return }
    setSavingLog(true)
    try {
      await logsApi.upsert({ userId: user.id, content: logDraft, hoursSpent: 6, mood: 'GOOD' })
      toast.success('Daily log saved', { description: 'Your mentor can now see today\'s note.' })
      setLogDraft('')
    } catch (e: any) {
      toast.error('Could not save log', { description: e?.message })
    } finally { setSavingLog(false) }
  }

  return (
    <>
      <PageHeader
        title="Student Dashboard"
        description={`Welcome back, ${user.name.split(' ')[0]}. Here's your journey snapshot.`}
        eyebrow="InternForge · Student"
        icon={LayoutDashboard}
      />

      <GlassCard className="p-5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Student journey</p>
        <div className="mt-3 overflow-x-auto">
          <JourneyTracker activeStage="Work" />
        </div>
      </GlassCard>

      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Applications" value={student?.applications ?? 0} icon={FileText} accent="emerald" />
        <StatCard label="Accepted" value={student?.accepted ?? 0} icon={CheckCircle2} accent="emerald" />
        <StatCard label="Active Projects" value={student?.projects ?? 0} icon={FolderGit2} accent="amber" />
        <StatCard label="Submissions" value={student?.submissions ?? 0} icon={Send} accent="sky" />
        <StatCard label="Avg Skill %" value={`${student?.avgSkill ?? 0}%`} icon={TrendingUp} accent="violet" trend={student?.skillGrowth ?? 0} trendLabel="growth" />
        <StatCard label="Certificates" value={student?.certificates ?? 0} icon={Award} accent="amber" />
        <StatCard label="Badges" value={student?.badges ?? 0} icon={Shield} accent="violet" />
        <StatCard label="Attendance" value={`${student?.attendanceRate ?? 100}%`} icon={Calendar} accent="emerald" />
      </div>

      {/* Skill trend + Mentor feedback */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Skill Growth" description="Weekly average across all tracked skills." icon={TrendingUp} className="lg:col-span-2" contentClassName="p-0">
          <div className="h-[220px] w-full p-2">
            {skillTrend.length === 0 ? <Spinner /> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={skillTrend} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="skillLine" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#0ea5e9" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted-foreground" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted-foreground" />
                  <RTooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="value" stroke="url(#skillLine)" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Mentor Feedback" icon={Star} description="Most recent note from your mentor.">
          {fb.loading ? <Spinner /> :
            latestFeedback ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <UserAvatar name={latestFeedback.fromUser?.name} src={latestFeedback.fromUser?.avatarUrl ?? undefined} size="sm" />
                  <div>
                    <p className="text-xs font-semibold">{latestFeedback.fromUser?.name}</p>
                    <p className="text-[10px] text-muted-foreground">{timeAgo(latestFeedback.createdAt)}</p>
                  </div>
                  <div className="ml-auto flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={cn('h-3 w-3', i < latestFeedback.rating ? 'fill-amber-400 text-amber-500' : 'text-muted-foreground/30')} />
                    ))}
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">"{latestFeedback.content}"</p>
              </div>
            ) : (
              <EmptyState icon={MessageSquare} title="No feedback yet" />
            )}
        </SectionCard>
      </div>

      {/* Tasks + Log */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Today's Tasks" icon={CheckCircle2} description="What's on your plate." className="lg:col-span-2">
          {tasks.loading ? <Spinner /> : todayTasks.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No tasks assigned" description="You're all caught up." />
          ) : (
            <ul className="space-y-2">
              {todayTasks.map(t => (
                <li key={t.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 p-2.5">
                  <StatusPill status={t.status} />
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  <Badge variant="outline" className="ml-auto text-[10px]">{t.priority}</Badge>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Daily Log" icon={BookOpen} description="Drop a quick note for today.">
          <Textarea
            value={logDraft}
            onChange={e => setLogDraft(e.target.value)}
            placeholder="Shipped the Combobox keyboard nav today…"
            className="min-h-[80px]"
            aria-label="Today's log"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Auto-saves on submit.</span>
            <Button size="sm" onClick={saveLog} disabled={savingLog}>
              {savingLog ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              Save
            </Button>
          </div>
        </SectionCard>
      </div>
    </>
  )
}

/* ================================================================== *
 *  4. PROJECT WORKSPACE                                               *
 * ================================================================== */

function ProjectView({ user }: { user: DemoUser }) {
  const projects = useAsync<Project[]>(() => projectsApi.list({ studentId: user.id }), [user.id])
  const project = (projects.data ?? [])[0]
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [newTitle, setNewTitle] = React.useState('')
  const [newContent, setNewContent] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  if (projects.loading) return <><PageHeader title="Project Workspace" icon={FolderGit2} eyebrow="InternForge · Student" /><LoadingGrid count={2} /></>
  if (projects.error) return <><PageHeader title="Project Workspace" icon={FolderGit2} eyebrow="InternForge · Student" /><ErrorState error={projects.error} /></>
  if (!project) return (
    <>
      <PageHeader title="Project Workspace" icon={FolderGit2} eyebrow="InternForge · Student" />
      <EmptyState icon={FolderGit2} title="No project yet" description="Once you're accepted, your mentor will assign a project." />
    </>
  )

  const milestones = (project as any).milestones ?? []
  const submissions = (project as any).submissions ?? project.tasks ?? []
  const latestEval = (project as any).evaluations?.[0]

  const submitNew = async () => {
    if (!newTitle.trim() || !newContent.trim()) { toast.error('Title and content are required.'); return }
    setSubmitting(true)
    try {
      await submissionsApi.create({ projectId: project.id, title: newTitle, content: newContent })
      toast.success('Submission uploaded', { description: 'Your mentor will be notified for review.' })
      setDialogOpen(false); setNewTitle(''); setNewContent('')
      projects.reload()
    } catch (e: any) {
      toast.error('Could not submit', { description: e?.message })
    } finally { setSubmitting(false) }
  }

  return (
    <>
      <PageHeader
        title="Project Workspace"
        description="Your capstone build, milestones, submissions & evaluations."
        eyebrow="InternForge · Student"
        icon={FolderGit2}
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4" /> New submission</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New submission</DialogTitle>
                <DialogDescription>Push your work for review by your mentor.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="t">Title</Label>
                  <Input id="t" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Combobox v2 — a11y fixes" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c">Content / PR description</Label>
                  <Textarea id="c" value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="Changes made…" className="min-h-[140px]" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={submitNew} disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Submit
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Project header */}
      <GlassCard className="overflow-hidden">
        <div className="gradient-emerald p-5 text-white">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/80">{project.internship?.company?.name} · Capstone</p>
              <h2 className="mt-1 text-xl font-bold tracking-tight">{project.title}</h2>
              <p className="mt-1 text-sm text-white/80 line-clamp-2">{project.description}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center">
                <ProgressRing value={project.progress} size={64} label={`${project.progress}%`} />
                <span className="mt-1 text-[10px] text-white/80">Progress</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <UserAvatar name={project.mentor?.name} src={project.mentor?.avatarUrl ?? undefined} size="xs" />
                  <span>{project.mentor?.name ?? 'Mentor'}</span>
                </div>
                {project.repoUrl && (
                  <a href={project.repoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-white/90 hover:text-white underline-offset-2 hover:underline">
                    <Github className="h-3 w-3" /> Repo
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 p-4">
          <StatusPill status={project.status} />
          <span className="text-xs text-muted-foreground">· {project.startDate ? `Started ${formatDate(project.startDate)}` : 'No start date'}</span>
        </div>
      </GlassCard>

      {/* Milestones */}
      <SectionCard title="Milestones" icon={Target} description="Project milestone timeline.">
        {milestones.length === 0 ? <EmptyState icon={Target} title="No milestones" /> : (
          <div className="relative space-y-4 pl-4">
            <div className="absolute left-[5px] top-1 bottom-1 w-px bg-border" />
            {milestones.map((m: any) => (
              <div key={m.id} className="relative">
                <span className={cn(
                  'absolute -left-[15px] top-1 h-3 w-3 rounded-full border-2 border-background',
                  m.status === 'DONE' && 'bg-emerald-500',
                  m.status === 'IN_PROGRESS' && 'bg-amber-500 animate-pulse',
                  m.status === 'PENDING' && 'bg-muted-foreground/40',
                )} />
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{m.title}</p>
                    {m.description && <p className="text-xs text-muted-foreground">{m.description}</p>}
                  </div>
                  <StatusPill status={m.status} />
                </div>
                {m.dueDate && <p className="mt-0.5 text-[10px] text-muted-foreground">Due {formatDate(m.dueDate)}</p>}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Submissions + Evaluation */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Submissions" icon={Send} description={`${submissions.length} submission${submissions.length === 1 ? '' : 's'}`}>
          {submissions.length === 0 ? <EmptyState icon={Send} title="No submissions yet" /> : (
            <ul className="space-y-2">
              {submissions.map((s: Submission) => (
                <li key={s.id} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.title}</p>
                      <p className="text-[10px] text-muted-foreground">v{s.version} · {formatDate(s.submittedAt)}</p>
                    </div>
                    <StatusPill status={s.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Latest Evaluation" icon={Star} description="Mentor rubric + AI synthesis.">
          {!latestEval ? <EmptyState icon={Star} title="No evaluations yet" /> : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserAvatar name={latestEval.mentor?.name} src={latestEval.mentor?.avatarUrl ?? undefined} size="xs" />
                  <span className="text-xs">{latestEval.mentor?.name}</span>
                </div>
                <ScoreBadge score={latestEval.score} />
              </div>
              {[
                { label: 'Code Quality', value: latestEval.codeQuality },
                { label: 'Communication', value: latestEval.communication },
                { label: 'Delivery', value: latestEval.delivery },
                { label: 'Learning', value: latestEval.learning },
              ].map(d => (
                <div key={d.label}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">{d.label}</span>
                    <span className="font-semibold tabular-nums">{d.value}/100</span>
                  </div>
                  <Progress value={d.value} className="h-1.5" />
                </div>
              ))}
              {latestEval.feedback && (
                <p className="rounded-lg border border-border/60 bg-muted/30 p-2.5 text-xs text-muted-foreground">{latestEval.feedback}</p>
              )}
              {latestEval.aiFeedback && (
                <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-2.5">
                  <span className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                    <AIBadge /> AI synthesis
                  </span>
                  <p className="text-xs text-muted-foreground">{latestEval.aiFeedback}</p>
                </div>
              )}
            </div>
          )}
        </SectionCard>
      </div>
    </>
  )
}

/* ================================================================== *
 *  5. KANBAN                                                          *
 * ================================================================== */

const KANBAN_COLUMNS: { id: Task['status']; label: string; tint: string }[] = [
  { id: 'TODO', label: 'To Do', tint: 'bg-muted-foreground/40' },
  { id: 'IN_PROGRESS', label: 'In Progress', tint: 'bg-sky-500' },
  { id: 'REVIEW', label: 'Review', tint: 'bg-amber-500' },
  { id: 'DONE', label: 'Done', tint: 'bg-emerald-500' },
  { id: 'BLOCKED', label: 'Blocked', tint: 'bg-rose-500' },
]

function KanbanCard({ task, isOverlay }: { task: Task; isOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group cursor-grab rounded-lg border border-border/60 bg-card p-3 shadow-sm hover:shadow-soft transition-shadow',
        isDragging && 'opacity-50',
        isOverlay && 'shadow-card rotate-2',
      )}
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="mt-0.5 h-3 w-3 text-muted-foreground/40" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug">{task.title}</p>
          {task.description && <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{task.description}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-[10px]">{task.priority}</Badge>
            {task.dueDate && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <Calendar className="h-2.5 w-2.5" />{formatDate(task.dueDate, { month: 'short', day: 'numeric' })}
              </Badge>
            )}
            {task.tags?.map((t, i) => (
              <span key={i} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">#{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function KanbanColumn({ id, label, tint, tasks }: {
  id: Task['status']; label: string; tint: string; tasks: Task[]
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/20 p-3 min-h-[200px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full', tint)} />
          <span className="text-xs font-semibold">{label}</span>
          <span className="text-[10px] text-muted-foreground">({tasks.length})</span>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 space-y-2 rounded-lg p-1 transition-colors',
          isOver && 'bg-primary/5 ring-1 ring-primary/30',
        )}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(t => <KanbanCard key={t.id} task={t} />)}
        </SortableContext>
        {tasks.length === 0 && (
          <p className="py-4 text-center text-[10px] text-muted-foreground">Drop here</p>
        )}
      </div>
    </div>
  )
}

function KanbanView({ user }: { user: DemoUser }) {
  const projects = useAsync<Project[]>(() => projectsApi.list({ studentId: user.id }), [user.id])
  const project = (projects.data ?? [])[0]
  const projectId = project?.id
  const tasks = useAsync<Task[]>(() => projectId ? tasksApi.list({ projectId }) : Promise.resolve([]), [projectId])
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [newTitle, setNewTitle] = React.useState('')
  const [newPriority, setNewPriority] = React.useState('MEDIUM')
  const [creating, setCreating] = React.useState(false)
  const [optimisticOverride, setOptimisticOverride] = React.useState<Task[] | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Join project room + listen for task:moved
  React.useEffect(() => {
    if (!projectId) return
    const sock = getSocket()
    try { sock.emit('join:project', projectId) } catch {}
    const handler = () => { setOptimisticOverride(null); tasks.reload() }
    sock.on('task:moved', handler)
    return () => { sock.off('task:moved', handler) }
  }, [projectId])

  // Clear optimistic override whenever new server data arrives
  React.useEffect(() => {
    setOptimisticOverride(null)
  }, [tasks.data])

  if (projects.loading) return <><PageHeader title="Task Board" icon={KanbanSquare} eyebrow="InternForge · Student" /><LoadingGrid count={3} /></>
  if (!projectId) return (
    <>
      <PageHeader title="Task Board" icon={KanbanSquare} eyebrow="InternForge · Student" />
      <EmptyState icon={KanbanSquare} title="No project yet" description="Tasks appear here once your mentor assigns a project." />
    </>
  )

  const serverTasks = tasks.data ?? []
  const allTasks = optimisticOverride ?? serverTasks
  const activeTask = serverTasks.find(t => t.id === activeId)

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id))
  const onDragEnd = async (e: DragEndEvent) => {
    setActiveId(null)
    const id = String(e.active.id)
    const overId = e.over?.id ? String(e.over.id) : null
    if (!overId) return
    let newStatus: Task['status'] | null = null
    if (KANBAN_COLUMNS.some(c => c.id === overId)) {
      newStatus = overId as Task['status']
    } else {
      const target = allTasks.find(t => t.id === overId)
      if (target) newStatus = target.status
    }
    if (!newStatus) return
    const task = allTasks.find(t => t.id === id)
    if (!task || task.status === newStatus) return
    // Optimistic move
    setOptimisticOverride(allTasks.map(t => t.id === id ? { ...t, status: newStatus! } : t))
    try {
      await tasksApi.move(id, newStatus)
      const sock = getSocket()
      try { sock.emit('task:moved', { projectId, taskId: id, status: newStatus, userId: user.id }) } catch {}
      tasks.reload()
    } catch (err: any) {
      toast.error('Could not move task', { description: err?.message })
      setOptimisticOverride(null)
      tasks.reload()
    }
  }

  const groupedDisplayed = (status: Task['status']) => allTasks.filter(t => t.status === status).sort((a, b) => a.order - b.order)

  const createTask = async () => {
    if (!newTitle.trim()) { toast.error('Title required.'); return }
    setCreating(true)
    try {
      await tasksApi.create({ projectId, title: newTitle, priority: newPriority, status: 'TODO', tags: [] })
      toast.success('Task created', { description: 'Added to your To-Do column.' })
      setDialogOpen(false); setNewTitle('')
      tasks.reload()
    } catch (e: any) {
      toast.error('Could not create task', { description: e?.message })
    } finally { setCreating(false) }
  }

  return (
    <>
      <PageHeader
        title="Task Board"
        description="Drag cards across the pipeline. Team sync happens live."
        eyebrow="InternForge · Student"
        icon={KanbanSquare}
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4" /> New task</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New task</DialogTitle>
                <DialogDescription>It'll land in the To-Do column.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tt">Title</Label>
                  <Input id="tt" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Polish tooltip transitions" />
                </div>
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select value={newPriority} onValueChange={setNewPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={createTask} disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {tasks.loading ? <LoadingGrid count={5} /> : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
            {KANBAN_COLUMNS.map(col => (
              <KanbanColumn
                key={col.id}
                id={col.id}
                label={col.label}
                tint={col.tint}
                tasks={groupedDisplayed(col.id)}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask ? <KanbanCard task={activeTask} isOverlay /> : null}
          </DragOverlay>
        </DndContext>
      )}
    </>
  )
}

/* ================================================================== *
 *  6. SKILLS                                                          *
 * ================================================================== */

function SkillsView({ user }: { user: DemoUser }) {
  const skillsRes = useAsync<any[]>(() => skillsApi.forUser(user.id), [user.id])
  const internshipsRes = useAsync<Internship[]>(() => internshipsApi.list({}), [user.id])
  const [gapInternship, setGapInternship] = React.useState<string>('')
  const gapRes = useAsync(() => gapInternship ? skillsApi.gap(user.id, gapInternship) : Promise.resolve({ skills: [] }), [gapInternship])
  const [aiOpen, setAiOpen] = React.useState(false)
  const [aiLoading, setAiLoading] = React.useState(false)
  const [aiData, setAiData] = React.useState<{ analysis: string; mapped: { skill: string; level: string; evidence: string }[] } | null>(null)

  // Flatten the response: Skill[] with nested userSkills into UserSkill[] with skill populated
  const userSkills: (UserSkill & { skill?: Skill })[] = React.useMemo(() => {
    if (!skillsRes.data) return []
    return skillsRes.data
      .filter((s: any) => Array.isArray(s.userSkills) && s.userSkills.length > 0)
      .flatMap((s: any) => s.userSkills.map((us: any) => ({ ...us, skill: { id: s.id, name: s.name, category: s.category, description: s.description } })))
  }, [skillsRes.data])

  const grouped = React.useMemo(() => {
    const map: Record<string, (UserSkill & { skill?: Skill })[]> = {}
    for (const us of userSkills) {
      const cat = us.skill?.category ?? 'General'
      if (!map[cat]) map[cat] = []
      map[cat].push(us)
    }
    return map
  }, [userSkills])

  const gapSkills = gapRes.data?.skills ?? []
  const myInternships = internshipsRes.data ?? []

  const runAi = async () => {
    setAiLoading(true); setAiOpen(true)
    try {
      const res = await aiApi.skillAnalysis({ userId: user.id })
      setAiData(res)
    } catch (e: any) {
      toast.error('AI analysis failed', { description: e?.message })
    } finally { setAiLoading(false) }
  }

  return (
    <>
      <PageHeader
        title="Skill Graph"
        description="Baseline vs current. Track growth, find gaps, get AI insight."
        eyebrow="InternForge · Student"
        icon={Sparkles}
        actions={
          <Button size="sm" variant="outline" onClick={runAi}>
            <Bot className="h-4 w-4" /> AI analysis
          </Button>
        }
      />

      {/* AI analysis dialog */}
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AIBadge /> AI Skill Analysis</DialogTitle>
            <DialogDescription>Generated from your internship work, submissions, and badges.</DialogDescription>
          </DialogHeader>
          {aiLoading ? (
            <div className="py-8"><Spinner label="Synthesizing your skill graph…" /></div>
          ) : aiData ? (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">{aiData.analysis}</p>
              <div className="overflow-hidden rounded-lg border border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Skill</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Evidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aiData.mapped.map((m, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{m.skill}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            m.level === 'Advanced' ? 'text-emerald-600' : m.level === 'Intermediate' ? 'text-sky-600' : 'text-amber-600'
                          }>{m.level}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{m.evidence}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <EmptyState icon={Bot} title="No analysis yet" />
          )}
        </DialogContent>
      </Dialog>

      {/* Skill bars grouped by category */}
      {skillsRes.loading ? <LoadingGrid count={4} /> : userSkills.length === 0 ? (
        <EmptyState icon={Sparkles} title="No skills tracked yet" description="Apply to an internship to start building your skill graph." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {Object.entries(grouped).map(([cat, list]) => (
            <SectionCard key={cat} title={cat} icon={Layers}>
              <div className="space-y-4">
                {list.map(us => (
                  <SkillBar
                    key={us.id}
                    label={us.skill?.name ?? 'Unknown'}
                    current={us.current}
                    baseline={us.baseline}
                    verified={us.verified}
                  />
                ))}
              </div>
            </SectionCard>
          ))}
        </div>
      )}

      {/* Skill gap analysis */}
      <SectionCard title="Skill Gap Analysis" icon={Target} description="Compare your level vs an internship's required skills (75% proficiency).">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Select value={gapInternship} onValueChange={setGapInternship}>
            <SelectTrigger className="w-[280px]"><SelectValue placeholder="Pick an internship" /></SelectTrigger>
            <SelectContent>
              {myInternships.map(i => <SelectItem key={i.id} value={i.id}>{i.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {!gapInternship ? (
          <EmptyState icon={Target} title="Pick an internship" description="We'll map your skill levels against its requirements." />
        ) : gapRes.loading ? <Spinner label="Computing gaps…" /> : gapSkills.length === 0 ? (
          <EmptyState icon={Target} title="No skill requirements for this role" />
        ) : (
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gapSkills} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted-foreground" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted-foreground" />
                <RTooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <ReferenceLine y={75} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Required 75', fontSize: 10, fill: '#f59e0b' }} />
                <Bar dataKey="current" name="Your level" radius={[4, 4, 0, 0]}>
                  {gapSkills.map((s, i) => (
                    <Cell key={i} fill={
                      s.current >= 75 ? '#10b981' :
                      s.current >= 50 ? '#f59e0b' : '#f43f5e'
                    } />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>
    </>
  )
}

/* ================================================================== *
 *  7. ASSESSMENTS                                                     *
 * ================================================================== */

function AssessmentsView({ user }: { user: DemoUser }) {
  // Resolve accepted internship id
  const appsRes = useAsync<Application[]>(() => applicationsApi.list({ studentId: user.id, status: 'ACCEPTED' }), [user.id])
  const acceptedInternshipId = (appsRes.data ?? [])[0]?.internshipId
  const assessmentsRes = useAsync<Assessment[]>(() =>
    acceptedInternshipId
      ? assessmentsApi.list({ internshipId: acceptedInternshipId, userId: user.id })
      : assessmentsApi.list({ userId: user.id }),
    [acceptedInternshipId])

  const [activeAssessment, setActiveAssessment] = React.useState<Assessment | null>(null)
  const [answers, setAnswers] = React.useState<Record<string, number>>({})
  const [submitting, setSubmitting] = React.useState(false)

  const startQuiz = (a: Assessment) => {
    setActiveAssessment(a); setAnswers({})
  }
  const submitQuiz = async () => {
    if (!activeAssessment) return
    setSubmitting(true)
    try {
      const arr = Object.entries(answers).map(([id, selected]) => ({ id, selected }))
      const res = await assessmentsApi.submit(activeAssessment.id, { answers: arr, userId: user.id } as any)
      toast.success(`Submitted! Scored ${res.score}/${activeAssessment.maxScore}`, {
        description: res.feedback ?? undefined,
      })
      setActiveAssessment(null)
      assessmentsRes.reload()
    } catch (e: any) {
      toast.error('Could not submit', { description: e?.message })
    } finally { setSubmitting(false) }
  }

  return (
    <>
      <PageHeader
        title="Assessments"
        description="Quizzes, coding challenges & project reviews."
        eyebrow="InternForge · Student"
        icon={ClipboardCheck}
      />
      {appsRes.loading || assessmentsRes.loading ? <LoadingGrid count={3} /> :
        assessmentsRes.error ? <ErrorState error={assessmentsRes.error} /> :
        (assessmentsRes.data ?? []).length === 0 ? (
          <EmptyState icon={ClipboardCheck} title="No assessments" description="Your mentor will publish quizzes here." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(assessmentsRes.data ?? []).map(a => (
              <GlassCard key={a.id} hover className="flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Badge variant="outline" className="text-[10px]">{a.type}</Badge>
                    <p className="mt-2 font-semibold leading-tight">{a.title}</p>
                  </div>
                  {a.result && <ScoreBadge score={a.result.score} suffix={`/${a.maxScore}`} />}
                </div>
                {a.description && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{a.description}</p>}
                <div className="mt-3 space-y-1 text-[11px] text-muted-foreground">
                  <MetaRow label="Max score" value={a.maxScore} />
                  <MetaRow label="Due" value={a.dueDate ? formatDate(a.dueDate) : '—'} />
                  <MetaRow label="Duration" value={a.durationMins ? `${a.durationMins} min` : '—'} />
                </div>
                <div className="mt-auto pt-4">
                  {a.result ? (
                    <Button size="sm" variant="outline" className="w-full" disabled>
                      <CheckCircle2 className="h-3 w-3" /> Completed · {a.result.score}
                    </Button>
                  ) : a.questions?.length > 0 ? (
                    <Button size="sm" className="w-full" onClick={() => startQuiz(a)}>
                      <Pencil className="h-3 w-3" /> Start
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="w-full" disabled>
                      External link
                    </Button>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>
        )}

      {/* Quiz dialog */}
      <Dialog open={!!activeAssessment} onOpenChange={o => !o && setActiveAssessment(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{activeAssessment?.title}</DialogTitle>
            <DialogDescription>Answer all questions, then submit.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-2">
            <div className="space-y-5">
              {(activeAssessment?.questions ?? []).map((q: any, idx: number) => (
                <div key={q.id ?? idx} className="space-y-2">
                  <p className="text-sm font-medium">{idx + 1}. {q.prompt}</p>
                  <RadioGroup
                    value={String(answers[q.id] ?? '')}
                    onValueChange={v => setAnswers(a => ({ ...a, [q.id]: Number(v) }))}
                  >
                    {q.options?.map((opt: string, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <RadioGroupItem value={String(i)} id={`${q.id}-${i}`} />
                        <Label htmlFor={`${q.id}-${i}`} className="text-sm font-normal">{opt}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveAssessment(null)}>Cancel</Button>
            <Button onClick={submitQuiz} disabled={submitting || Object.keys(answers).length < (activeAssessment?.questions?.length ?? 0)}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* ================================================================== *
 *  8. SUBMISSIONS                                                     *
 * ================================================================== */

function SubmissionsView({ user }: { user: DemoUser }) {
  const subs = useAsync<Submission[]>(() => submissionsApi.list({ studentId: user.id }), [user.id])
  const [checking, setChecking] = React.useState<string | null>(null)

  const runPlagiarism = async (id: string, title: string) => {
    setChecking(id)
    try {
      const res = await submissionsApi.plagiarism(id)
      toast.success(`Plagiarism score: ${Math.round(res.score * 100)}%`, {
        description: `Updated for "${title}".`,
      })
      subs.reload()
    } catch (e: any) {
      toast.error('Check failed', { description: e?.message })
    } finally { setChecking(null) }
  }

  return (
    <>
      <PageHeader
        title="Submissions"
        description="Every version you've pushed, with plagiarism checks."
        eyebrow="InternForge · Student"
        icon={Send}
      />
      {subs.loading ? <LoadingGrid count={3} /> :
        subs.error ? <ErrorState error={subs.error} /> :
        (subs.data ?? []).length === 0 ? (
          <EmptyState icon={Send} title="No submissions yet" description="Push your first version from the Project Workspace." />
        ) : (
          <SectionCard title="Your submissions" icon={Send}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plagiarism</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(subs.data ?? []).map(s => {
                  const score = s.plagiarismScore ?? 0
                  const pct = Math.round(score * 100)
                  const color = pct < 15 ? 'text-emerald-600 dark:text-emerald-400' : pct < 30 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                  const evals = s.evaluations ?? []
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <p className="font-medium">{s.title}</p>
                        {evals.length > 0 && (
                          <p className="text-[10px] text-muted-foreground">{evals.length} evaluation{evals.length === 1 ? '' : 's'}</p>
                        )}
                      </TableCell>
                      <TableCell><Badge variant="outline">v{s.version}</Badge></TableCell>
                      <TableCell><StatusPill status={s.status} /></TableCell>
                      <TableCell>
                        {score != null ? (
                          <span className={cn('text-sm font-semibold tabular-nums', color)}>{pct}%</span>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(s.submittedAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => runPlagiarism(s.id, s.title)} disabled={checking === s.id}>
                          {checking === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3" />}
                          Check
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </SectionCard>
        )}
    </>
  )
}

/* ================================================================== *
 *  9. CERTIFICATES                                                    *
 * ================================================================== */

function CertificatesView({ user }: { user: DemoUser }) {
  const certs = useAsync<Certificate[]>(() => certificatesApi.list({ userId: user.id }), [user.id])
  const projectsRes = useAsync<Project[]>(() => projectsApi.list({ studentId: user.id }), [user.id])
  const [verifying, setVerifying] = React.useState<string | null>(null)
  const [generating, setGenerating] = React.useState(false)

  const verify = async (code: string) => {
    setVerifying(code)
    try {
      const res = await certificatesApi.verify(code)
      if (res.valid) {
        toast.success('Certificate verified', { description: `Issued to ${res.certificate?.user?.name ?? 'a student'}.` })
      } else {
        toast.error('Verification failed', { description: 'This code is invalid or revoked.' })
      }
    } catch (e: any) {
      toast.error('Verification error', { description: e?.message })
    } finally { setVerifying(null) }
  }

  const generate = async () => {
    const project = (projectsRes.data ?? [])[0]
    if (!project) { toast.error('No project found to certify.'); return }
    setGenerating(true)
    try {
      await certificatesApi.generate({ userId: user.id, projectId: project.id, internshipId: project.internshipId ?? undefined })
      toast.success('Certificate generated', { description: 'A new credential has been minted.' })
      certs.reload()
    } catch (e: any) {
      toast.error('Could not generate', { description: e?.message })
    } finally { setGenerating(false) }
  }

  const hasProject = (projectsRes.data ?? []).length > 0

  return (
    <>
      <PageHeader
        title="Certificates"
        description="Verifiable credentials minted on completion."
        eyebrow="InternForge · Student"
        icon={Award}
        actions={
          <Button size="sm" onClick={generate} disabled={!hasProject || generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Generate certificate
          </Button>
        }
      />
      {certs.loading ? <LoadingGrid count={2} /> :
        (certs.data ?? []).length === 0 ? (
          <EmptyState
            icon={Award}
            title="No certificates yet"
            description={hasProject ? 'Click "Generate certificate" to mint one.' : 'Complete a project first.'}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {(certs.data ?? []).map(c => (
              <GlassCard key={c.id} className="overflow-hidden">
                <div className="relative gradient-emerald p-5 text-white">
                  <div className="absolute right-4 top-4 opacity-20">
                    <AwardIcon className="h-20 w-20" />
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-white/80">Certificate of Completion</p>
                  <p className="mt-2 text-xs text-white/70">{c.certificateNumber}</p>
                  <p className="mt-4 text-2xl font-bold tracking-tight">{c.user?.name ?? user.name}</p>
                  <p className="mt-1 text-xs text-white/70">
                    {c.internship?.title ?? c.project?.title ?? 'Internship Program'}
                  </p>
                  <div className="mt-5 flex items-end justify-between gap-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-white/70">Grade</p>
                      <p className="text-4xl font-black leading-none">{c.grade}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-white/70">Issued</p>
                      <p className="text-xs font-semibold">{formatDate(c.issuedAt)}</p>
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  {c.skills?.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1">
                      {c.skills.map((s, i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">{s}</Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Verification code</p>
                      <p className="font-mono font-semibold">{c.verificationCode}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => verify(c.verificationCode)} disabled={verifying === c.verificationCode}>
                      {verifying === c.verificationCode ? <Loader2 className="h-3 w-3 animate-spin" /> : <BadgeCheck className="h-3 w-3" />}
                      Verify
                    </Button>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
    </>
  )
}

/* ================================================================== *
 *  10. PORTFOLIO                                                      *
 * ================================================================== */

function PortfolioView({ user }: { user: DemoUser }) {
  const skillsRes = useAsync<any[]>(() => skillsApi.forUser(user.id), [user.id])
  const projectsRes = useAsync<Project[]>(() => projectsApi.list({ studentId: user.id }), [user.id])
  const subsRes = useAsync<Submission[]>(() => submissionsApi.list({ studentId: user.id }), [user.id])
  const certsRes = useAsync<Certificate[]>(() => certificatesApi.list({ userId: user.id }), [user.id])
  const badgesRes = useAsync<UserBadge[]>(() => badgesApi.forUser(user.id), [user.id])
  const feedbackRes = useAsync<Feedback[]>(() => feedbackApi.list({ toUserId: user.id }), [user.id])

  const userSkills: (UserSkill & { skill?: Skill })[] = React.useMemo(() => {
    if (!skillsRes.data) return []
    return skillsRes.data
      .filter((s: any) => Array.isArray(s.userSkills) && s.userSkills.length > 0)
      .flatMap((s: any) => s.userSkills.map((us: any) => ({ ...us, skill: { id: s.id, name: s.name, category: s.category, description: s.description } })))
  }, [skillsRes.data])

  const share = async () => {
    const url = `https://internforge.io/p/${user.id}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Portfolio link copied', { description: url })
    } catch {
      toast.success('Portfolio link', { description: url })
    }
  }

  const loading = skillsRes.loading || projectsRes.loading || subsRes.loading || certsRes.loading || badgesRes.loading || feedbackRes.loading
  const latestFeedback = (feedbackRes.data ?? [])[0]

  return (
    <>
      <PageHeader
        title="Public Portfolio"
        description="Auto-composed from your work, submissions, credentials & badges."
        eyebrow="InternForge · Student"
        icon={Globe2}
        actions={
          <Button size="sm" onClick={share}><Share2 className="h-4 w-4" /> Share</Button>
        }
      />
      {loading ? <LoadingGrid count={3} /> : (
        <div className="space-y-5">
          {/* Hero header */}
          <GlassCard className="overflow-hidden">
            <div className="relative gradient-emerald p-6 text-white sm:p-8">
              <div className="grid-pattern absolute inset-0 opacity-20" />
              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/20 ring-2 ring-white/30 text-2xl font-bold backdrop-blur">
                  {initials(user.name)}
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-white/80">{user.title ?? 'Student'}</p>
                  <h2 className="mt-1 text-3xl font-bold tracking-tight">{user.name}</h2>
                  <p className="mt-1 text-sm text-white/80">{user.bio ?? `${user.university ?? ''} · ${user.major ?? ''}`}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs">
                    {user.githubUrl && (
                      <a href={user.githubUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-white/90 hover:text-white">
                        <Github className="h-3 w-3" /> GitHub
                      </a>
                    )}
                    {user.linkedinUrl && (
                      <a href={user.linkedinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-white/90 hover:text-white">
                        <Linkedin className="h-3 w-3" /> LinkedIn
                      </a>
                    )}
                    {user.location && (
                      <span className="inline-flex items-center gap-1 text-white/80">
                        <MapPin className="h-3 w-3" /> {user.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Skills */}
          <SectionCard title="Skills" icon={Sparkles}>
            {userSkills.length === 0 ? <EmptyState icon={Sparkles} title="No skills yet" /> : (
              <div className="grid gap-3 sm:grid-cols-2">
                {userSkills.map(us => (
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
          </SectionCard>

          {/* Projects */}
          <SectionCard title="Projects" icon={FolderGit2}>
            {(projectsRes.data ?? []).length === 0 ? <EmptyState icon={FolderGit2} title="No projects yet" /> : (
              <div className="grid gap-3 sm:grid-cols-2">
                {(projectsRes.data ?? []).map(p => (
                  <div key={p.id} className="rounded-lg border border-border/60 bg-muted/20 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold">{p.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                      </div>
                      <ProgressRing value={p.progress} size={44} />
                    </div>
                    {p.repoUrl && (
                      <a href={p.repoUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <Github className="h-3 w-3" /> View repo <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Work evidence (submissions) */}
          <SectionCard title="Work Evidence" icon={Send} description="Top submissions across all projects.">
            {(subsRes.data ?? []).length === 0 ? <EmptyState icon={Send} title="No submissions yet" /> : (
              <ul className="space-y-2">
                {(subsRes.data ?? []).slice(0, 5).map(s => (
                  <li key={s.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
                    <FileCheck2 className="h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{s.title}</p>
                      <p className="text-[10px] text-muted-foreground">v{s.version} · {formatDate(s.submittedAt)}</p>
                    </div>
                    <StatusPill status={s.status} />
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {/* Credentials + Badges */}
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Credentials" icon={Award}>
              {(certsRes.data ?? []).length === 0 ? <EmptyState icon={Award} title="No certificates yet" /> : (
                <ul className="space-y-2">
                  {(certsRes.data ?? []).map(c => (
                    <li key={c.id} className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                      <AwardIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{c.grade} grade · {c.certificateNumber}</p>
                        <p className="text-[10px] text-muted-foreground">{c.verificationCode}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="Badges" icon={Shield}>
              {(badgesRes.data ?? []).length === 0 ? <EmptyState icon={Shield} title="No badges yet" /> : (
                <div className="flex flex-wrap gap-2">
                  {(badgesRes.data ?? []).map(b => (
                    <div key={b.id} className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5">
                      <span className="text-sm">{b.badge?.icon || '🏆'}</span>
                      <span className="text-xs font-medium">{b.badge?.name}</span>
                      <Badge variant="outline" className="text-[9px]">{b.badge?.tier}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          {/* Mentor testimonial */}
          {latestFeedback && (
            <SectionCard title="Mentor Testimonial" icon={Star}>
              <div className="flex items-start gap-3">
                <UserAvatar name={latestFeedback.fromUser?.name} src={latestFeedback.fromUser?.avatarUrl ?? undefined} size="md" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold">{latestFeedback.fromUser?.name}</p>
                    <Badge variant="outline" className="text-[9px]">{latestFeedback.type}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">"{latestFeedback.content}"</p>
                </div>
              </div>
            </SectionCard>
          )}
        </div>
      )}
    </>
  )
}

/* ================================================================== *
 *  11. DAILY LOGS                                                     *
 * ================================================================== */

function LogsView({ user }: { user: DemoUser }) {
  const logsRes = useAsync<DailyLog[]>(() => logsApi.list({ userId: user.id }), [user.id])
  const appsRes = useAsync<Application[]>(() => applicationsApi.list({ studentId: user.id, status: 'ACCEPTED' }), [user.id])
  const [content, setContent] = React.useState('')
  const [hours, setHours] = React.useState('6')
  const [mood, setMood] = React.useState('GOOD')
  const [saving, setSaving] = React.useState(false)

  const internshipId = (appsRes.data ?? [])[0]?.internshipId
  const logs = logsRes.data ?? []
  const moodEmoji = (m: string) => ({ GREAT: '🚀', GOOD: '✨', OKAY: '🙂', TIRED: '😴' } as Record<string, string>)[m] ?? '🙂'

  const chartData = [...logs].reverse().map(l => ({ date: formatDate(l.date, { month: 'short', day: 'numeric' }), hours: l.hoursSpent }))

  const save = async () => {
    if (!content.trim()) { toast.error('Write something first.'); return }
    setSaving(true)
    try {
      await logsApi.upsert({
        userId: user.id,
        internshipId: internshipId ?? undefined,
        content, hoursSpent: Number(hours) || 0, mood,
      })
      toast.success('Daily log saved', { description: 'Mentor will see your update.' })
      setContent('')
      logsRes.reload()
    } catch (e: any) {
      toast.error('Could not save', { description: e?.message })
    } finally { setSaving(false) }
  }

  return (
    <>
      <PageHeader
        title="Daily Logs"
        description="Capture your internship journey — one entry per day."
        eyebrow="InternForge · Student"
        icon={BookOpen}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Editor */}
        <SectionCard title="Today's Entry" icon={Pencil} description="Auto-saves on submit." className="lg:col-span-1">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="content">What did you ship today?</Label>
              <Textarea
                id="content"
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Shipped X, paired with Y, blocked on Z…"
                className="min-h-[120px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="hours">Hours</Label>
                <Input id="hours" type="number" min={0} max={24} step={0.5} value={hours} onChange={e => setHours(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mood">Mood</Label>
                <Select value={mood} onValueChange={setMood}>
                  <SelectTrigger id="mood"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GREAT">🚀 Great</SelectItem>
                    <SelectItem value="GOOD">✨ Good</SelectItem>
                    <SelectItem value="OKAY">🙂 Okay</SelectItem>
                    <SelectItem value="TIRED">😴 Tired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={save} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Save log
            </Button>
          </div>
        </SectionCard>

        {/* Chart */}
        <SectionCard title="Hours Per Day" icon={Hourglass} className="lg:col-span-2" contentClassName="p-0">
          <div className="h-[220px] w-full p-2">
            {chartData.length === 0 ? <Spinner /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted-foreground" />
                  <RTooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="hours" radius={[4, 4, 0, 0]} fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Timeline */}
      <SectionCard title="Log Timeline" icon={BookOpen}>
        {logsRes.loading ? <Spinner /> : logs.length === 0 ? (
          <EmptyState icon={BookOpen} title="No logs yet" description="Your entries will appear here." />
        ) : (
          <div className="relative space-y-4 pl-5">
            <div className="absolute left-[6px] top-2 bottom-2 w-px bg-border" />
            {logs.map(l => (
              <div key={l.id} className="relative">
                <span className="absolute -left-[18px] top-1 flex h-3 w-3 items-center justify-center rounded-full border-2 border-background bg-primary" />
                <div className="flex items-start gap-3">
                  <span className="text-xl">{moodEmoji(l.mood)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold">{formatDate(l.date)}</p>
                      <Badge variant="outline" className="text-[10px]">{l.hoursSpent}h</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{l.content}</p>
                    {l.tasksCompleted?.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {l.tasksCompleted.map((t, i) => (
                          <span key={i} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">✓ {t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  )
}

/* ================================================================== *
 *  12. CHAT                                                           *
 * ================================================================== */

function ChatView({ user }: { user: DemoUser }) {
  const convsRes = useAsync<Conversation[]>(() => messagesApi.conversations(user.id), [user.id])
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState('')
  const [localMsgs, setLocalMsgs] = React.useState<Record<string, Message[]>>({})
  const [aiMode, setAiMode] = React.useState(false)
  const [sending, setSending] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const conversations = convsRes.data ?? []
  const active = conversations.find(c => c.id === activeId) ?? null
  const activeMessages = (activeId && localMsgs[activeId]) || []

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [activeMessages.length])

  // Seed local messages when conversations load
  React.useEffect(() => {
    if (!conversations.length) return
    setLocalMsgs(prev => {
      const next = { ...prev }
      for (const c of conversations) {
        if (!next[c.id]) {
          next[c.id] = c.messages && c.messages.length ? [...c.messages].reverse() : []
        }
      }
      return next
    })
  }, [conversations])

  // Socket: join conversation + listen for incoming messages
  React.useEffect(() => {
    if (!activeId) return
    const sock = getSocket()
    try { sock.emit('join:conversation', activeId) } catch {}
    const handler = (msg: any) => {
      if (!msg?.conversationId || msg.conversationId !== activeId) return
      setLocalMsgs(prev => {
        const list = prev[activeId] ?? []
        if (list.find(m => m.id === msg.id)) return prev
        return { ...prev, [activeId]: [...list, msg] }
      })
    }
    sock.on('message', handler)
    return () => { sock.off('message', handler) }
  }, [activeId])

  const peer = (c: Conversation | null) => {
    if (!c) return null
    return c.members?.find(m => m.user && m.userId !== user.id)?.user ?? null
  }
  const peerUser = peer(active)

  const send = async () => {
    if (!draft.trim()) return
    if (aiMode) {
      const content = draft.trim(); setDraft('')
      // Optimistic user bubble
      const tempId = `local-${Date.now()}`
      const userMsg: Message = {
        id: tempId, conversationId: 'ai', senderId: user.id, sender: user,
        content, type: 'TEXT', readBy: [], createdAt: new Date().toISOString(),
      }
      const aiTempId = `ai-${Date.now()}`
      const aiPending: Message = {
        id: aiTempId, conversationId: 'ai', senderId: 'ai', sender: undefined as any,
        content: '…', type: 'AI', readBy: [], createdAt: new Date().toISOString(),
      }
      setLocalMsgs(prev => ({ ...prev, ai: [...(prev.ai ?? []), userMsg, aiPending] }))
      try {
        const res = await aiApi.chat({ message: content, context: `Student: ${user.name}` })
        setLocalMsgs(prev => {
          const list = prev.ai ?? []
          return { ...prev, ai: list.map(m => m.id === aiTempId ? { ...m, content: res.reply, type: 'AI' } : m) }
        })
      } catch (e: any) {
        setLocalMsgs(prev => {
          const list = prev.ai ?? []
          return { ...prev, ai: list.map(m => m.id === aiTempId ? { ...m, content: 'Could not reach the AI mentor.', type: 'AI' } : m) }
        })
      }
      return
    }
    if (!activeId) { toast.error('Pick a conversation first.'); return }
    setSending(true)
    const content = draft.trim(); setDraft('')
    try {
      const msg = await messagesApi.send(activeId, user.id, content)
      setLocalMsgs(prev => ({ ...prev, [activeId]: [...(prev[activeId] ?? []), msg] }))
      const sock = getSocket()
      try { sock.emit('message', { conversationId: activeId, senderId: user.id, content }) } catch {}
    } catch (e: any) {
      toast.error('Could not send', { description: e?.message })
    } finally { setSending(false) }
  }

  const messagesToShow = aiMode
    ? (localMsgs.ai ?? [])
    : activeMessages

  return (
    <>
      <PageHeader
        title="Messages"
        description="Chat with your mentor & team, or hop on the AI mentor."
        eyebrow="InternForge · Student"
        icon={MessagesSquare}
        actions={
          <div className="flex items-center gap-2">
            <Bot className={cn('h-4 w-4', aiMode && 'text-violet-600')} />
            <Switch checked={aiMode} onCheckedChange={setAiMode} aria-label="AI mentor mode" />
            <span className="text-xs text-muted-foreground">{aiMode ? 'AI Mentor' : 'Team chat'}</span>
          </div>
        }
      />

      <GlassCard className="overflow-hidden">
        <div className="grid h-[600px] grid-cols-1 md:grid-cols-[260px_1fr]">
          {/* Conversations list */}
          <div className={cn('border-r border-border/60 bg-muted/20', aiMode && 'opacity-50 pointer-events-none')}>
            <div className="p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Conversations</p>
            </div>
            <ScrollArea className="h-[540px]">
              <ul className="space-y-1 px-2 pb-4">
                {convsRes.loading ? <li className="p-3"><Spinner /></li> :
                  conversations.length === 0 ? (
                    <li className="p-3 text-xs text-muted-foreground">No conversations yet.</li>
                  ) : (
                    conversations.map(c => {
                      const other = peer(c)
                      const last = c.messages?.[0]
                      return (
                        <li key={c.id}>
                          <button
                            className={cn(
                              'flex w-full items-center gap-2 rounded-lg p-2 text-left transition-colors hover:bg-muted/60',
                              activeId === c.id && 'bg-primary/10 ring-1 ring-primary/30',
                            )}
                            onClick={() => { setActiveId(c.id); setAiMode(false) }}
                          >
                            <UserAvatar name={other?.name ?? '?'} src={other?.avatarUrl ?? undefined} size="sm" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold truncate">{other?.name ?? 'Conversation'}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{last?.content ?? 'No messages'}</p>
                            </div>
                          </button>
                        </li>
                      )
                    })
                  )}
              </ul>
            </ScrollArea>
          </div>

          {/* Chat panel */}
          <div className="flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
              {aiMode ? (
                <>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-violet text-white shadow-soft">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-2">Forge AI <AIBadge /></p>
                    <p className="text-[10px] text-muted-foreground">Project mentor · always on</p>
                  </div>
                </>
              ) : peerUser ? (
                <>
                  <UserAvatar name={peerUser.name} src={peerUser.avatarUrl ?? undefined} size="sm" />
                  <div>
                    <p className="text-sm font-semibold">{peerUser.name}</p>
                    <p className="text-[10px] text-muted-foreground">{peerUser.title ?? 'Mentor'}</p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Pick a conversation →</p>
              )}
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {!aiMode && !activeId && (
                <EmptyState icon={MessagesSquare} title="No conversation selected" description="Choose one on the left, or flip the AI mentor switch." />
              )}
              {messagesToShow.map(m => {
                const mine = m.senderId === user.id
                const isAi = m.type === 'AI' || m.senderId === 'ai'
                return (
                  <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-[80%] rounded-2xl px-3 py-2 text-sm',
                        isAi && 'bg-gradient-to-br from-violet-500/15 to-emerald-500/10 ring-1 ring-violet-500/20',
                        !isAi && mine && 'bg-primary text-primary-foreground',
                        !isAi && !mine && 'bg-muted',
                      )}
                    >
                      {isAi && (
                        <span className="mb-1 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                          <AIBadge /> Forge
                        </span>
                      )}
                      <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                      <p className={cn('mt-1 text-[9px]', mine && !isAi ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                        {formatDateTime(m.createdAt)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Composer */}
            <div className="border-t border-border/60 p-3">
              <div className="flex items-end gap-2">
                <Textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
                  }}
                  placeholder={aiMode ? 'Ask your AI mentor anything…' : 'Type a message…'}
                  className="min-h-[40px] resize-none"
                  aria-label="Message"
                />
                <Button onClick={send} disabled={sending || !draft.trim()} size="icon" className="h-10 w-10 shrink-0">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
                </Button>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">Enter to send · Shift+Enter for newline</p>
            </div>
          </div>
        </div>
      </GlassCard>
    </>
  )
}

/* ================================================================== *
 *  ROOT PORTAL                                                       *
 * ================================================================== */

export function StudentPortal({ user, view, setView }: PortalProps) {
  const demoUser = user as DemoUser

  const renderView = () => {
    switch (view) {
      case 'discover': return <DiscoverView user={demoUser} />
      case 'applications': return <ApplicationsView user={demoUser} />
      case 'dashboard': return <DashboardView user={demoUser} />
      case 'project': return <ProjectView user={demoUser} />
      case 'kanban': return <KanbanView user={demoUser} />
      case 'skills': return <SkillsView user={demoUser} />
      case 'assessments': return <AssessmentsView user={demoUser} />
      case 'submissions': return <SubmissionsView user={demoUser} />
      case 'certificates': return <CertificatesView user={demoUser} />
      case 'portfolio': return <PortfolioView user={demoUser} />
      case 'logs': return <LogsView user={demoUser} />
      case 'chat': return <ChatView user={demoUser} />
      default:
        return (
          <EmptyState
            icon={Compass}
            title="Section coming soon"
            description={`The "${view}" section is not wired yet.`}
            action={<Button onClick={() => setView('dashboard')}>Go to dashboard</Button>}
          />
        )
    }
  }

  return (
    <TooltipProvider>
      <div className="animate-in-fade space-y-5">
        {renderView()}
      </div>
    </TooltipProvider>
  )
}

export type { PortalProps }
