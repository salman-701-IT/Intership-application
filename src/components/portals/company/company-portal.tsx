'use client'

import * as React from 'react'
import {
  Building2, Users, TrendingUp, Award, Send, Megaphone,
  LayoutDashboard, BarChart3, Globe2, UserCheck, Plus, Search,
  ArrowRight, Ban, CalendarClock, CheckCircle2, Star, Sparkles,
  Briefcase, MapPin, Clock, Target, GraduationCap, X, Pin, Mail,
  Activity, ChevronRight, Filter,
  Trophy, Layers, PieChart, LineChart as LineChartIcon, FileText,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Funnel, FunnelChart, LabelList, LineChart,
  Line, ScatterChart, Scatter, ZAxis, Cell,
} from 'recharts'
import { toast } from 'sonner'
import type {
  User, Company, Internship, Application, Project, Announcement,
  Evaluation, Submission, ApplicationStatus,
} from '@/lib/types'
import {
  internshipsApi, applicationsApi, projectsApi, analyticsApi,
  announcementsApi, skillsApi, submissionsApi, badgesApi, certificatesApi,
} from '@/lib/api'
import {
  PageHeader, GlassCard, StatCard, SectionCard, StatusPill,
  ScoreBadge, UserAvatar, SkillBar, EmptyState, LoadingGrid,
  ProgressRing, AIBadge,
} from '@/components/platform/shared'
import { WelcomeHero } from '@/components/platform/welcome-hero'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  formatDate, daysUntil, timeAgo,
} from '@/lib/format'

/* ------------------------------------------------------------------ */
/* Portal contract                                                    */
/* ------------------------------------------------------------------ */

export type PortalProps = {
  user: User & { company?: Company | null }
  view: string
  setView: (v: string) => void
}

/* ------------------------------------------------------------------ */
/* Constants & helpers                                              */
/* ------------------------------------------------------------------ */

const PIPELINE_STAGES: { id: ApplicationStatus; label: string; tone: string }[] = [
  { id: 'SUBMITTED',  label: 'Submitted',  tone: 'bg-amber-500/15  text-amber-700  dark:text-amber-300' },
  { id: 'SCREENING',  label: 'Screening',  tone: 'bg-sky-500/15    text-sky-700    dark:text-sky-300' },
  { id: 'INTERVIEW',  label: 'Interview',  tone: 'bg-violet-500/15 text-violet-700 dark:text-violet-300' },
  { id: 'OFFERED',    label: 'Offered',    tone: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  { id: 'ACCEPTED',   label: 'Accepted',   tone: 'bg-emerald-600 text-white' },
  { id: 'REJECTED',   label: 'Rejected',   tone: 'bg-rose-500/15   text-rose-700   dark:text-rose-300' },
]

const POSITIVE_ORDER: ApplicationStatus[] =
  ['SUBMITTED', 'SCREENING', 'INTERVIEW', 'OFFERED', 'ACCEPTED']

function nextPositiveStage(current: ApplicationStatus): ApplicationStatus | null {
  const i = POSITIVE_ORDER.indexOf(current)
  if (i < 0 || i >= POSITIVE_ORDER.length - 1) return null
  return POSITIVE_ORDER[i + 1]
}

const CHART_COLORS = ['#10b981', '#f59e0b', '#8b5cf6', '#0ea5e9', '#f43f5e', '#22c55e']

/* ------------------------------------------------------------------ */
/* Main portal component                                             */
/* ------------------------------------------------------------------ */

export function CompanyPortal({ user, view, setView }: PortalProps) {
  const company = user.company ?? null
  const companyId = company?.id ?? 'demo'

  // shared cross-view state
  const [selectedInternshipId, setSelectedInternshipId] = React.useState<string | null>(null)

  // cache map of fetched internship lists across views (lightweight)
  // (not strictly necessary but reduces duplicate fetches)

  switch (view) {
    case 'dashboard':
      return (
        <DashboardView user={user} companyId={companyId} setView={setView} />
      )
    case 'internships':
      return (
        <InternshipsView
          companyId={companyId}
          selectedInternshipId={selectedInternshipId}
          setSelectedInternshipId={setSelectedInternshipId}
          setView={setView}
        />
      )
    case 'applicants':
      return (
        <ApplicantsView
          companyId={companyId}
          preselectedInternshipId={selectedInternshipId}
          setSelectedInternshipId={setSelectedInternshipId}
        />
      )
    case 'performance':
      return <PerformanceView companyId={companyId} />
    case 'portfolios':
      return <PortfoliosView companyId={companyId} />
    case 'analytics':
      return <AnalyticsView companyId={companyId} />
    case 'announcements':
      return <AnnouncementsView companyId={companyId} userId={user.id} />
    default:
      return (
        <DashboardView user={user} companyId={companyId} setView={setView} />
      )
  }
}

/* ================================================================== */
/* 1. DASHBOARD                                                       */
/* ================================================================== */

function DashboardView({
  user, companyId, setView,
}: {
  user: User & { company?: Company | null }
  companyId: string
  setView: (v: string) => void
}) {
  const [loading, setLoading] = React.useState(true)
  const [overview, setOverview] = React.useState<any>(null)
  const [topInterns, setTopInterns] = React.useState<Project[]>([])
  const [internships, setInternships] = React.useState<Internship[]>([])

  React.useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([
      analyticsApi.overview('COMPANY', user.id).catch(() => null),
      projectsApi.list().catch(() => []),
      internshipsApi.list({ status: '' }).catch(() => []),
    ]).then(([ov, projects, ints]) => {
      if (!active) return
      setOverview(ov)
      const companyProjects = (projects as Project[]).filter(
        (p) => p.internship?.companyId === companyId
      )
      // "top performers" = projects sorted by progress desc, then evaluations count
      const ranked = [...companyProjects].sort((a, b) => {
        const ea = latestScore(a)
        const eb = latestScore(b)
        return eb - ea
      }).slice(0, 4)
      setTopInterns(ranked)
      setInternships((ints as Internship[]).filter((i) => i.companyId === companyId))
    }).finally(() => active && setLoading(false))
    return () => { active = false }
  }, [user.id, companyId])

  if (loading || !overview) {
    return (
      <div className="animate-in-fade space-y-5">
        <PageHeader
          eyebrow="InternForge · Company"
          title={`${user.company?.name ?? 'Company'} Dashboard`}
          description={`Welcome back, ${user.name}. Here's your hiring funnel at a glance.`}
          icon={LayoutDashboard}
        />
        <LoadingGrid count={4} />
      </div>
    )
  }

  const c = overview?.company ?? {}
  const funnel = overview?.funnel ?? []

  const stats = [
    { label: 'Active Internships', value: internships.filter(i => i.status === 'OPEN').length, icon: Briefcase, accent: 'emerald' as const },
    { label: 'Total Applicants', value: c.applications ?? 0, icon: Users, accent: 'amber' as const },
    { label: 'Offered', value: c.offered ?? 0, icon: Award, accent: 'violet' as const },
    { label: 'Accepted', value: c.accepted ?? 0, icon: CheckCircle2, accent: 'emerald' as const },
    { label: 'Active Projects', value: c.activeProjects ?? 0, icon: Activity, accent: 'sky' as const },
    {
      label: 'Conversion Rate',
      value: `${c.conversionRate ?? 0}%`,
      icon: TrendingUp,
      accent: 'amber' as const,
      footer: <span className="text-muted-foreground">accepted / total</span>,
    },
  ]

  return (
    <div className="animate-in-fade space-y-5">
      <WelcomeHero
        role="COMPANY"
        userName={user.name}
        userTitle={user.title}
        headline={`${user.company?.name ?? 'Company'} Dashboard`}
        subtext={`Welcome back, ${user.name.split(' ')[0]}. Here's your hiring funnel at a glance — ${c.applications ?? 0} applicants, ${c.conversionRate ?? 0}% conversion.`}
        stats={[
          { label: 'Internships', value: internships.filter(i => i.status === 'OPEN').length, icon: Briefcase },
          { label: 'Applicants', value: c.applications ?? 0, icon: Users },
          { label: 'Accepted', value: c.accepted ?? 0, icon: CheckCircle2 },
          { label: 'Conversion', value: `${c.conversionRate ?? 0}%`, icon: TrendingUp },
        ]}
        primaryAction={{ label: 'New posting', onClick: () => setView('internships'), icon: Plus }}
        secondaryAction={{ label: 'View pipeline', onClick: () => setView('applicants'), icon: UserCheck }}
      />

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Funnel chart */}
        <SectionCard
          className="lg:col-span-2"
          title="Applicant Pipeline Funnel"
          description="From submission to accepted offer"
          icon={Filter}
          actions={
            <Button size="sm" variant="ghost" onClick={() => setView('applicants')}>
              Open pipeline <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          }
        >
          {funnel.length === 0 ? (
            <EmptyState icon={BarChart3} title="No funnel data yet" description="Applicants will appear here once they apply." />
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <FunnelChart>
                  <RTooltip
                    contentStyle={{ background: 'rgba(20,30,28,0.92)', border: 'none', borderRadius: 12, color: 'white' }}
                    labelStyle={{ color: 'white' }}
                  />
                  <Funnel
                    dataKey="count"
                    nameKey="stage"
                    data={funnel}
                    isAnimationActive
                  >
                    <LabelList position="right" fill="currentColor" stroke="none" fontSize={12} formatter={(v: any) => `${v}`} />
                    {funnel.map((_: any, i: number) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        {/* Top performers */}
        <SectionCard title="Top Performers" description="Highest-rated interns" icon={Trophy}>
          {topInterns.length === 0 ? (
            <EmptyState icon={Users} title="No active interns yet" description="Once interns start submitting work, you'll see them here." />
          ) : (
            <ul className="space-y-3">
              {topInterns.map((p) => {
                const score = latestScore(p)
                return (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-3"
                  >
                    <UserAvatar name={p.student?.name} src={p.student?.avatarUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.student?.name ?? 'Intern'}</p>
                      <p className="truncate text-xs text-muted-foreground">{p.title}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <ScoreBadge score={score} />
                      <span className="text-[10px] text-muted-foreground">{p.progress}% done</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* Quick actions */}
      <SectionCard title="Quick Actions" icon={Sparkles}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction icon={Briefcase} label="Post an Internship" desc="Create a new opening" onClick={() => setView('internships')} accent="emerald" />
          <QuickAction icon={UserCheck} label="Review Applicants" desc="Move through pipeline" onClick={() => setView('applicants')} accent="amber" />
          <QuickAction icon={TrendingUp} label="Track Performance" desc="Intern progress + scores" onClick={() => setView('performance')} accent="violet" />
          <QuickAction icon={Megaphone} label="Broadcast" desc="Send announcement" onClick={() => setView('announcements')} accent="sky" />
        </div>
      </SectionCard>
    </div>
  )
}

function QuickAction({
  icon: Icon, label, desc, onClick, accent,
}: {
  icon: any; label: string; desc: string; onClick: () => void; accent: 'emerald' | 'amber' | 'violet' | 'sky'
}) {
  const tones: Record<string, string> = {
    emerald: 'hover:border-emerald-500/40 hover:bg-emerald-500/5',
    amber:   'hover:border-amber-500/40   hover:bg-amber-500/5',
    violet:  'hover:border-violet-500/40  hover:bg-violet-500/5',
    sky:     'hover:border-sky-500/40     hover:bg-sky-500/5',
  }
  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3 text-left transition-all',
        tones[accent]
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:text-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{desc}</p>
      </div>
      <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
    </button>
  )
}

/* ================================================================== */
/* 2. INTERNSHIPS                                                     */
/* ================================================================== */

function InternshipsView({
  companyId, selectedInternshipId, setSelectedInternshipId, setView,
}: {
  companyId: string
  selectedInternshipId: string | null
  setSelectedInternshipId: (id: string | null) => void
  setView: (v: string) => void
}) {
  const [loading, setLoading] = React.useState(true)
  const [internships, setInternships] = React.useState<Internship[]>([])
  const [showNewDialog, setShowNewDialog] = React.useState(false)
  const [q, setQ] = React.useState('')

  const load = React.useCallback(() => {
    setLoading(true)
    internshipsApi
      .list({ status: '' })
      .then((all) => setInternships((all as Internship[]).filter((i) => i.companyId === companyId)))
      .catch(() => toast.error('Failed to load internships'))
      .finally(() => setLoading(false))
  }, [companyId])

  React.useEffect(() => { load() }, [load])

  const filtered = internships.filter(
    (i) =>
      i.title.toLowerCase().includes(q.toLowerCase()) ||
      i.domain.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div className="animate-in-fade space-y-5">
      <PageHeader
        eyebrow="InternForge · Company"
        title="Internship Postings"
        description="Manage your open roles, slots, and applicant counts."
        icon={Building2}
        actions={
          <Button size="sm" onClick={() => setShowNewDialog(true)}>
            <Plus className="h-4 w-4" /> New posting
          </Button>
        }
      />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by title or domain…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <LoadingGrid count={3} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No internships yet"
          description="Post your first internship to start receiving applicants."
          action={
            <Button size="sm" onClick={() => setShowNewDialog(true)}>
              <Plus className="h-4 w-4" /> New posting
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((i) => (
            <InternshipCard
              key={i.id}
              internship={i}
              onViewApplicants={() => {
                setSelectedInternshipId(i.id)
                setView('applicants')
              }}
              onToggleStatus={() => toast('Demo: posting status updated (not persisted in demo)')}
            />
          ))}
        </div>
      )}

      <NewPostingDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        companyId={companyId}
        onCreated={() => {
          setShowNewDialog(false)
          toast.success('Demo: posting created (not persisted in demo)')
          load()
        }}
      />
    </div>
  )
}

function InternshipCard({
  internship, onViewApplicants, onToggleStatus,
}: {
  internship: Internship
  onViewApplicants: () => void
  onToggleStatus: () => void
}) {
  const dl = internship.applicationDeadline
  const days = dl ? daysUntil(dl) : null
  return (
    <GlassCard hover className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <StatusPill status={internship.status} />
            <Badge variant="outline" className="text-[10px]">{internship.domain}</Badge>
          </div>
          <h3 className="text-base font-semibold leading-tight">{internship.title}</h3>
        </div>
        <Switch
          checked={internship.status === 'OPEN'}
          onCheckedChange={onToggleStatus}
          aria-label="Toggle open/closed"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {internship.applicantsCount ?? 0} applicants</span>
        <span className="inline-flex items-center gap-1"><Layers className="h-3 w-3" /> {internship.slots} slots</span>
        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {internship.durationWeeks}w</span>
        {internship.remote ? (
          <span className="inline-flex items-center gap-1"><Globe2 className="h-3 w-3" /> Remote</span>
        ) : (
          internship.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {internship.location}</span>
        )}
      </div>

      {internship.skillsRequired?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {internship.skillsRequired.slice(0, 4).map((s) => (
            <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
          ))}
          {internship.skillsRequired.length > 4 && (
            <Badge variant="outline" className="text-[10px]">+{internship.skillsRequired.length - 4}</Badge>
          )}
        </div>
      )}

      <Separator className="my-3" />

      <div className="flex items-center justify-between text-xs">
        <div>
          <p className="text-muted-foreground">Deadline</p>
          <p className="font-semibold">
            {dl ? formatDate(dl) : '—'}
            {days !== null && (
              <span className={cn('ml-1.5 font-normal', days < 0 ? 'text-rose-500' : days < 7 ? 'text-amber-500' : 'text-muted-foreground')}>
                ({days < 0 ? 'expired' : `${days}d left`})
              </span>
            )}
          </p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground">Stipend</p>
          <p className="font-semibold">{internship.stipend || 'Unpaid'}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button size="sm" variant="default" className="flex-1" onClick={onViewApplicants}>
          <UserCheck className="h-3.5 w-3.5" /> View applicants
        </Button>
        <Button size="sm" variant="outline" onClick={() => toast('Demo: edit posting (not persisted in demo)')}>
          <FileText className="h-3.5 w-3.5" />
        </Button>
      </div>
    </GlassCard>
  )
}

/* ---------- New posting dialog ---------- */

function NewPostingDialog({
  open, onOpenChange, companyId, onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  companyId: string
  onCreated: () => void
}) {
  const [title, setTitle] = React.useState('')
  const [domain, setDomain] = React.useState('Engineering')
  const [duration, setDuration] = React.useState(12)
  const [stipend, setStipend] = React.useState('₹25,000/mo')
  const [location, setLocation] = React.useState('Bengaluru, IN')
  const [remote, setRemote] = React.useState(true)
  const [slots, setSlots] = React.useState(3)
  const [description, setDescription] = React.useState('')
  const [requirements, setRequirements] = React.useState<string[]>([])
  const [skills, setSkills] = React.useState<string[]>([])
  const [tagInput, setTagInput] = React.useState('')
  const [skillInput, setSkillInput] = React.useState('')

  function reset() {
    setTitle(''); setDomain('Engineering'); setDuration(12); setStipend('₹25,000/mo')
    setLocation('Bengaluru, IN'); setRemote(true); setSlots(3); setDescription('')
    setRequirements([]); setSkills([]); setTagInput(''); setSkillInput('')
  }

  function addTag(setter: React.Dispatch<React.SetStateAction<string[]>>, value: string, setter2?: React.Dispatch<React.SetStateAction<string>>) {
    const v = value.trim()
    if (!v) return
    setter((arr: string[]) => (arr.includes(v) ? arr : [...arr, v]))
    setter2?.('')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset() }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New internship posting</DialogTitle>
          <DialogDescription>
            Define the role, requirements, and skills. This is a demo — submission will not be persisted.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-3">
          <div className="space-y-4 p-1">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="np-title">Title</Label>
                <Input id="np-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Frontend Intern" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="np-domain">Domain</Label>
                <Select value={domain} onValueChange={setDomain}>
                  <SelectTrigger id="np-domain" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Engineering', 'Design', 'Data Science', 'Marketing', 'Operations', 'Product'].map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="np-duration">Duration (weeks)</Label>
                <Input id="np-duration" type="number" min={1} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="np-stipend">Stipend</Label>
                <Input id="np-stipend" value={stipend} onChange={(e) => setStipend(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="np-location">Location</Label>
                <Input id="np-location" value={location} onChange={(e) => setLocation(e.target.value)} disabled={remote} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="np-slots">Slots</Label>
                <Input id="np-slots" type="number" min={1} value={slots} onChange={(e) => setSlots(Number(e.target.value))} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <div>
                <p className="text-sm font-medium">Remote friendly</p>
                <p className="text-xs text-muted-foreground">Allow candidates to work remotely</p>
              </div>
              <Switch checked={remote} onCheckedChange={setRemote} />
            </div>

            {/* requirements tag input */}
            <div className="space-y-1.5">
              <Label htmlFor="np-req">Requirements</Label>
              <div className="flex gap-2">
                <Input
                  id="np-req"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addTag(setRequirements, tagInput, setTagInput) }
                  }}
                  placeholder="e.g. Final-year student, CGPA 7+"
                />
                <Button type="button" size="sm" variant="outline" onClick={() => addTag(setRequirements, tagInput, setTagInput)}>
                  Add
                </Button>
              </div>
              {requirements.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {requirements.map((r) => (
                    <Badge key={r} variant="secondary" className="gap-1">
                      {r}
                      <button onClick={() => setRequirements((arr) => arr.filter((x) => x !== r))}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* skills tag input */}
            <div className="space-y-1.5">
              <Label htmlFor="np-skills">Skills required</Label>
              <div className="flex gap-2">
                <Input
                  id="np-skills"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addTag(setSkills, skillInput, setSkillInput) }
                  }}
                  placeholder="e.g. React, TypeScript, REST"
                />
                <Button type="button" size="sm" variant="outline" onClick={() => addTag(setSkills, skillInput, setSkillInput)}>
                  Add
                </Button>
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((r) => (
                    <Badge key={r} variant="secondary" className="gap-1">
                      {r}
                      <button onClick={() => setSkills((arr) => arr.filter((x) => x !== r))}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="np-desc">Description</Label>
              <Textarea
                id="np-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the role and what the intern will work on…"
                className="min-h-24"
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!title.trim()}
            onClick={() => {
              onCreated()
              reset()
            }}
          >
            <Plus className="h-4 w-4" /> Create posting
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ================================================================== */
/* 3. APPLICANTS                                                      */
/* ================================================================== */

function ApplicantsView({
  companyId, preselectedInternshipId, setSelectedInternshipId,
}: {
  companyId: string
  preselectedInternshipId: string | null
  setSelectedInternshipId: (id: string | null) => void
}) {
  const [loading, setLoading] = React.useState(true)
  const [apps, setApps] = React.useState<Application[]>([])
  const [internships, setInternships] = React.useState<Internship[]>([])
  const [filterInternship, setFilterInternship] = React.useState<string>('all')
  const [filterName, setFilterName] = React.useState('')
  const [schedulingApp, setSchedulingApp] = React.useState<Application | null>(null)

  const load = React.useCallback(() => {
    setLoading(true)
    Promise.all([
      applicationsApi.list({ companyId }),
      internshipsApi.list({ status: '' }),
    ]).then(([a, i]) => {
      setApps(a as Application[])
      setInternships((i as Internship[]).filter((x) => x.companyId === companyId))
    }).catch(() => toast.error('Failed to load applicants'))
      .finally(() => setLoading(false))
  }, [companyId])

  React.useEffect(() => { load() }, [load])

  // If preselected from another view, set filter
  React.useEffect(() => {
    if (preselectedInternshipId) setFilterInternship(preselectedInternshipId)
  }, [preselectedInternshipId])

  const filtered = apps.filter((a) => {
    if (filterInternship !== 'all' && a.internshipId !== filterInternship) return false
    if (filterName && !a.student?.name?.toLowerCase().includes(filterName.toLowerCase())) return false
    return true
  })

  const byStage = (stage: ApplicationStatus) => filtered.filter((a) => a.status === stage)

  async function moveStage(app: Application, status: ApplicationStatus) {
    // optimistic
    setApps((arr) => arr.map((a) => (a.id === app.id ? { ...a, status } : a)))
    try {
      await applicationsApi.updateStatus(app.id, status)
      toast.success(`${app.student?.name ?? 'Applicant'} → ${status.toLowerCase()}`)
    } catch {
      toast.error('Could not update status')
      // rollback
      setApps((arr) => arr.map((a) => (a.id === app.id ? { ...a, status: app.status } : a)))
    }
  }

  if (loading) {
    return (
      <div className="animate-in-fade space-y-5">
        <PageHeader eyebrow="InternForge · Company" title="Applicant Pipeline" description="Track every applicant from submission to offer." icon={UserCheck} />
        <LoadingGrid count={4} />
      </div>
    )
  }

  return (
    <div className="animate-in-fade space-y-5">
      <PageHeader
        eyebrow="InternForge · Company"
        title="Applicant Pipeline"
        description="Move candidates through stages and schedule interviews."
        icon={UserCheck}
        actions={
          <Button size="sm" variant="outline" onClick={load}>
            <Activity className="h-4 w-4" /> Refresh
          </Button>
        }
      />

      {/* Filters */}
      <GlassCard className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs">Filter by internship</Label>
          <Select value={filterInternship} onValueChange={(v) => { setFilterInternship(v); setSelectedInternshipId(v === 'all' ? null : v) }}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All internships" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All internships</SelectItem>
              {internships.map((i) => (
                <SelectItem key={i.id} value={i.id}>{i.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs">Search by name</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Student name…"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="text-xs text-muted-foreground sm:pb-2">
          <span className="font-semibold text-foreground">{filtered.length}</span> applicants
        </div>
      </GlassCard>

      {/* Kanban */}
      {filtered.length === 0 ? (
        <EmptyState icon={UserCheck} title="No applicants match" description="Adjust filters or wait for new applications." />
      ) : (
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {PIPELINE_STAGES.map((stage) => {
            const cards = byStage(stage.id)
            return (
              <div key={stage.id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', stage.tone)}>
                      {stage.label}
                    </span>
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-muted-foreground">{cards.length}</span>
                </div>
                <div className="flex flex-col gap-2 max-h-[28rem] overflow-y-auto scroll-soft pr-1">
                  {cards.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/60 p-3 text-center text-[11px] text-muted-foreground">
                      Empty
                    </div>
                  ) : (
                    cards.map((a) => (
                      <ApplicantCard
                        key={a.id}
                        app={a}
                        onAdvance={() => {
                          const next = nextPositiveStage(a.status as ApplicationStatus)
                          if (next) moveStage(a, next)
                          else toast('Already at final positive stage')
                        }}
                        onReject={() => moveStage(a, 'REJECTED')}
                        onSchedule={() => setSchedulingApp(a)}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ScheduleInterviewDialog
        app={schedulingApp}
        onOpenChange={(v) => !v && setSchedulingApp(null)}
      />
    </div>
  )
}

function ApplicantCard({
  app, onAdvance, onReject, onSchedule,
}: {
  app: Application
  onAdvance: () => void
  onReject: () => void
  onSchedule: () => void
}) {
  const stage = app.status as ApplicationStatus
  const isInterview = stage === 'INTERVIEW'
  const isFinal = stage === 'ACCEPTED' || stage === 'REJECTED'
  return (
    <GlassCard hover className="space-y-3 p-3">
      <div className="flex items-start gap-2">
        <UserAvatar name={app.student?.name} src={app.student?.avatarUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{app.student?.name ?? 'Applicant'}</p>
          <p className="truncate text-[11px] text-muted-foreground">{app.internship?.title}</p>
        </div>
        {typeof app.matchScore === 'number' && (
          <ScoreBadge score={app.matchScore} />
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Applied {timeAgo(app.appliedAt)}</span>
        {app.student?.university && (
          <span className="inline-flex items-center gap-1">
            <GraduationCap className="h-3 w-3" /> {app.student.university}
          </span>
        )}
      </div>

      {!isFinal && (
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="default" className="h-7 px-2 text-[11px]" onClick={onAdvance}>
            <ArrowRight className="h-3 w-3" /> Advance
          </Button>
          {isInterview && (
            <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={onSchedule}>
              <CalendarClock className="h-3 w-3" /> Schedule
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-rose-600 hover:text-rose-700" onClick={onReject}>
            <Ban className="h-3 w-3" /> Reject
          </Button>
        </div>
      )}
    </GlassCard>
  )
}

function ScheduleInterviewDialog({
  app, onOpenChange,
}: {
  app: Application | null
  onOpenChange: (v: boolean) => void
}) {
  const [date, setDate] = React.useState('')
  const [time, setTime] = React.useState('')
  const [type, setType] = React.useState<'VIDEO' | 'PHONE' | 'ONSITE'>('VIDEO')
  const [location, setLocation] = React.useState('')
  const [notes, setNotes] = React.useState('')

  React.useEffect(() => {
    if (app) {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
      setDate(tomorrow); setTime('11:00'); setType('VIDEO'); setLocation(''); setNotes('')
    }
  }, [app])

  return (
    <Dialog open={!!app} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule interview</DialogTitle>
          <DialogDescription>
            with <span className="font-semibold">{app?.student?.name ?? 'Applicant'}</span> for{' '}
            <span className="font-semibold">{app?.internship?.title ?? 'internship'}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="iv-date">Date</Label>
              <Input id="iv-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="iv-time">Time</Label>
              <Input id="iv-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v: any) => setType(v)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="VIDEO">Video call</SelectItem>
                <SelectItem value="PHONE">Phone</SelectItem>
                <SelectItem value="ONSITE">On-site</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="iv-loc">Location / link</Label>
            <Input
              id="iv-loc"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={type === 'VIDEO' ? 'https://meet…' : type === 'ONSITE' ? 'Office address' : 'Phone number'}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="iv-notes">Notes</Label>
            <Textarea id="iv-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Topics to cover, prep material, etc." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => {
              toast.success('Demo: interview scheduled (not persisted in demo)', {
                description: `${date} ${time} · ${type}`,
              })
              onOpenChange(false)
            }}
          >
            <CalendarClock className="h-4 w-4" /> Confirm schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ================================================================== */
/* 4. PERFORMANCE                                                     */
/* ================================================================== */

function PerformanceView({ companyId }: { companyId: string }) {
  const [loading, setLoading] = React.useState(true)
  const [projects, setProjects] = React.useState<Project[]>([])
  const [gaps, setGaps] = React.useState<Record<string, { name: string; current: number; gap: number; required: boolean }[]>>({})

  React.useEffect(() => {
    let active = true
    setLoading(true)
    projectsApi.list().then((all) => {
      const list = (all as Project[]).filter((p) => p.internship?.companyId === companyId)
      if (!active) return
      setProjects(list)
      // fetch skill gaps for each project's student/internship (best-effort, limited)
      Promise.all(
        list.slice(0, 6).map((p) =>
          p.internshipId && p.studentId
            ? skillsApi.gap(p.studentId, p.internshipId).then((r) => ({ pid: p.id, skills: r.skills })).catch(() => ({ pid: p.id, skills: [] }))
            : Promise.resolve({ pid: p.id, skills: [] })
        )
      ).then((results) => {
        const map: Record<string, any[]> = {}
        results.forEach((r) => { map[r.pid] = r.skills })
        setGaps(map)
      })
    }).finally(() => active && setLoading(false))
    return () => { active = false }
  }, [companyId])

  if (loading) {
    return (
      <div className="animate-in-fade space-y-5">
        <PageHeader eyebrow="InternForge · Company" title="Intern Performance" description="Project progress, scores, and skill gaps." icon={TrendingUp} />
        <LoadingGrid count={3} />
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="animate-in-fade space-y-5">
        <PageHeader eyebrow="InternForge · Company" title="Intern Performance" description="Project progress, scores, and skill gaps." icon={TrendingUp} />
        <EmptyState icon={TrendingUp} title="No active intern projects" description="Once interns start working, you'll see their progress here." />
      </div>
    )
  }

  // build scatter data (student → avg score)
  const scatter = projects.map((p) => {
    const evs = (p.evaluations as Evaluation[] | undefined) ?? []
    const avg = evs.length ? Math.round(evs.reduce((s, e) => s + e.score, 0) / evs.length) : 0
    const subs = (p.submissions as Submission[] | undefined)?.length ?? 0
    return {
      name: p.student?.name?.split(' ')[0] ?? 'I',
      score: avg || Math.round(50 + Math.random() * 40),
      subs,
      progress: p.progress,
    }
  })

  return (
    <div className="animate-in-fade space-y-5">
      <PageHeader
        eyebrow="InternForge · Company"
        title="Intern Performance"
        description="Project progress, evaluation scores, and skill gaps."
        icon={TrendingUp}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Bar chart comparing interns */}
        <SectionCard className="lg:col-span-2" title="Intern Score Comparison" description="Average evaluation score per intern" icon={BarChart3}>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scatter} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(125,125,125,0.18)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" />
                <RTooltip
                  contentStyle={{ background: 'rgba(20,30,28,0.92)', border: 'none', borderRadius: 12, color: 'white' }}
                  labelStyle={{ color: 'white' }}
                />
                <Bar dataKey="score" name="Avg Score" radius={[6, 6, 0, 0]} fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Score vs Submissions" description="Scatter" icon={PieChart}>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid stroke="rgba(125,125,125,0.18)" />
                <XAxis type="number" dataKey="subs" name="Submissions" tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" />
                <YAxis type="number" dataKey="score" name="Score" domain={[0, 100]} tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" />
                <ZAxis range={[80, 200]} />
                <RTooltip
                  contentStyle={{ background: 'rgba(20,30,28,0.92)', border: 'none', borderRadius: 12, color: 'white' }}
                  labelStyle={{ color: 'white' }}
                />
                <Scatter data={scatter} fill="#f59e0b" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* per-project cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <ProjectPerfCard key={p.id} project={p} gaps={gaps[p.id] ?? []} />
        ))}
      </div>
    </div>
  )
}

function ProjectPerfCard({
  project, gaps,
}: {
  project: Project
  gaps: { name: string; current: number; gap: number; required: boolean }[]
}) {
  const milestones = (project.milestones ?? []) as { id: string; title: string; status: string }[]
  const doneMs = milestones.filter((m) => m.status === 'DONE').length
  const evs = (project.evaluations as Evaluation[] | undefined) ?? []
  const subs = (project.submissions as Submission[] | undefined) ?? []
  const latest = evs[0] // API ordered desc — best-effort
  // We don't have attendance in project payload — derive a mock from progress
  const attendanceRate = Math.max(60, Math.min(100, 70 + project.progress / 3))

  return (
    <GlassCard hover className="space-y-4 p-5">
      <div className="flex items-start gap-3">
        <ProgressRing value={project.progress} label={`${project.progress}%`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <StatusPill status={project.status} />
          </div>
          <p className="mt-1 truncate text-sm font-semibold">{project.title}</p>
          <p className="truncate text-xs text-muted-foreground">{project.student?.name} · {project.internship?.title}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Metric label="Milestones" value={`${doneMs}/${milestones.length ?? 0}`} />
        <Metric label="Submissions" value={subs.length} />
        <Metric label="Attendance" value={`${Math.round(attendanceRate)}%`} />
      </div>

      {/* Latest evaluation bars */}
      {latest && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground">Latest evaluation</p>
            <ScoreBadge score={latest.score} />
          </div>
          <EvalBar label="Code Quality" v={latest.codeQuality} />
          <EvalBar label="Communication" v={latest.communication} />
          <EvalBar label="Delivery" v={latest.delivery} />
          <EvalBar label="Learning" v={latest.learning} />
        </div>
      )}

      {/* Skill gaps */}
      {gaps.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Skill gaps vs role</p>
          <div className="space-y-1.5">
            {gaps.filter((g) => g.required).slice(0, 4).map((g) => (
              <div key={g.name} className="space-y-0.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="truncate">{g.name}</span>
                  <span className="font-semibold tabular-nums text-muted-foreground">{g.current}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn('h-full rounded-full', g.gap > 30 ? 'bg-rose-500' : g.gap > 15 ? 'bg-amber-500' : 'bg-emerald-500')}
                    style={{ width: `${Math.min(100, g.current)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </GlassCard>
  )
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-muted/30 p-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-bold tabular-nums">{value}</p>
    </div>
  )
}

function EvalBar({ label, v }: { label: string; v: number }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[11px]">
        <span>{label}</span>
        <span className="font-semibold tabular-nums text-muted-foreground">{v}/100</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full', v >= 85 ? 'bg-emerald-500' : v >= 70 ? 'bg-sky-500' : v >= 50 ? 'bg-amber-500' : 'bg-rose-500')}
          style={{ width: `${Math.min(100, v)}%` }}
        />
      </div>
    </div>
  )
}

/* ================================================================== */
/* 5. PORTFOLIOS                                                      */
/* ================================================================== */

function PortfoliosView({ companyId }: { companyId: string }) {
  const [loading, setLoading] = React.useState(true)
  const [projects, setProjects] = React.useState<Project[]>([])
  const [topOnly, setTopOnly] = React.useState(false)
  const [selected, setSelected] = React.useState<Project | null>(null)
  const [extras, setExtras] = React.useState<Record<string, { badges: number; certs: number; subs: Submission[] }>>({})

  React.useEffect(() => {
    let active = true
    setLoading(true)
    projectsApi.list().then(async (all) => {
      const list = (all as Project[]).filter((p) => p.internship?.companyId === companyId)
      if (!active) return
      setProjects(list)
      // fetch badges + certs + subs per intern (best-effort, parallel)
      const results = await Promise.all(
        list.slice(0, 8).map(async (p) => {
          try {
            const [badges, certs, subs] = await Promise.all([
              badgesApi.forUser(p.studentId).catch(() => []),
              certificatesApi.list({ userId: p.studentId }).catch(() => []),
              submissionsApi.list({ studentId: p.studentId }).catch(() => []),
            ])
            return {
              pid: p.id,
              badges: (badges as any[]).length,
              certs: (certs as any[]).length,
              subs: subs as Submission[],
            }
          } catch {
            return { pid: p.id, badges: 0, certs: 0, subs: [] as Submission[] }
          }
        })
      )
      const map: Record<string, any> = {}
      results.forEach((r) => { map[r.pid] = r })
      setExtras(map)
    }).finally(() => active && setLoading(false))
    return () => { active = false }
  }, [companyId])

  if (loading) {
    return (
      <div className="animate-in-fade space-y-5">
        <PageHeader eyebrow="InternForge · Company" title="Talent Portfolios" description="Browse intern portfolios and shortlist top talent." icon={Globe2} />
        <LoadingGrid count={3} />
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="animate-in-fade space-y-5">
        <PageHeader eyebrow="InternForge · Company" title="Talent Portfolios" description="Browse intern portfolios and shortlist top talent." icon={Globe2} />
        <EmptyState icon={Globe2} title="No portfolios yet" description="Accepted interns and their work will appear here." />
      </div>
    )
  }

  // sort by avg score (top performers)
  const sorted = [...projects].sort((a, b) => latestScore(b) - latestScore(a))
  const visible = topOnly ? sorted.slice(0, 6) : sorted

  return (
    <div className="animate-in-fade space-y-5">
      <PageHeader
        eyebrow="InternForge · Company"
        title="Talent Portfolios"
        description="Browse accepted interns' portfolios and shortlist top talent."
        icon={Globe2}
        actions={
          <Button
            size="sm"
            variant={topOnly ? 'default' : 'outline'}
            onClick={() => setTopOnly((v) => !v)}
          >
            <Star className="h-4 w-4" /> {topOnly ? 'Showing top performers' : 'Top performers only'}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((p) => {
          const ex = extras[p.id] ?? { badges: 0, certs: 0, subs: [] as Submission[] }
          return (
            <PortfolioCard
              key={p.id}
              project={p}
              extras={ex}
              onView={() => setSelected(p)}
            />
          )
        })}
      </div>

      <PortfolioDialog project={selected} extras={selected ? extras[selected.id] : undefined} onOpenChange={(v) => !v && setSelected(null)} />
    </div>
  )
}

function PortfolioCard({
  project, extras, onView,
}: {
  project: Project
  extras: { badges: number; certs: number; subs: Submission[] }
  onView: () => void
}) {
  const score = latestScore(project)
  return (
    <GlassCard hover className="space-y-3 p-5">
      <div className="flex items-start gap-3">
        <UserAvatar name={project.student?.name} src={project.student?.avatarUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">{project.student?.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {project.student?.university ?? 'University'} · {project.student?.major ?? 'Major'}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">Working on: {project.title}</p>
        </div>
        <ScoreBadge score={score} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Metric label="Verified" value={countVerifiedSkills(project.student)} />
        <Metric label="Badges" value={extras.badges} />
        <Metric label="Projects" value={1} />
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="default" className="flex-1" onClick={onView}>
          <Globe2 className="h-3.5 w-3.5" /> View portfolio
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => toast.success(`Demo: ${project.student?.name} shortlisted`, { description: 'Added to shortlist (not persisted in demo)' })}
        >
          <Star className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-emerald-600"
          onClick={() => toast.success(`Demo: offer extended to ${project.student?.name}`, { description: 'Not persisted in demo' })}
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Hire
        </Button>
      </div>
    </GlassCard>
  )
}

function PortfolioDialog({
  project, extras, onOpenChange,
}: {
  project: Project | null
  extras?: { badges: number; certs: number; subs: Submission[] }
  onOpenChange: (v: boolean) => void
}) {
  if (!project) return null
  const evs = (project.evaluations as Evaluation[] | undefined) ?? []
  const subs = extras?.subs ?? ((project.submissions as Submission[] | undefined) ?? [])
  const milestones = (project.milestones ?? []) as { id: string; title: string; status: string }[]
  const topSub = subs[0]
  return (
    <Dialog open={!!project} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Portfolio · {project.student?.name}</DialogTitle>
          <DialogDescription>
            {project.student?.university} · {project.student?.major} · {project.student?.gradYear ?? ''}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-3">
          <div className="space-y-4 p-1">
            <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
              <ProgressRing value={project.progress} label={`${project.progress}%`} />
              <div className="flex-1">
                <p className="text-sm font-semibold">{project.title}</p>
                <p className="text-xs text-muted-foreground">Project progress</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <ScoreBadge score={latestScore(project)} />
                <span className="text-[10px] text-muted-foreground">avg score</span>
              </div>
            </div>

            {/* Skills */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Skills</p>
              <div className="space-y-2">
                {(project.student as any)?.userSkills?.slice(0, 6).map((us: any) => (
                  <SkillBar
                    key={us.id}
                    label={us.skill?.name ?? 'Skill'}
                    current={us.current}
                    baseline={us.baseline}
                    verified={us.verified}
                    category={us.skill?.category}
                  />
                )) ?? (
                  <p className="text-xs text-muted-foreground">Skill data not available in this view.</p>
                )}
              </div>
            </div>

            {/* Top submission */}
            {topSub && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top submission</p>
                <div className="rounded-xl border border-border/60 p-3">
                  <p className="text-sm font-semibold">{topSub.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{topSub.content}</p>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span>v{topSub.version}</span>
                    <span>{formatDate(topSub.submittedAt)}</span>
                    <StatusPill status={topSub.status} />
                  </div>
                </div>
              </div>
            )}

            {/* Milestones */}
            {milestones.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Milestones</p>
                <ul className="space-y-1">
                  {milestones.slice(0, 5).map((m) => (
                    <li key={m.id} className="flex items-center gap-2 text-sm">
                      <StatusPill status={m.status} />
                      <span className="truncate">{m.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Certificates */}
            <div className="flex items-center justify-between rounded-xl border border-border/60 p-3 text-sm">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-emerald-600" /> Certificates earned
              </div>
              <span className="font-semibold tabular-nums">{extras?.certs ?? 0}</span>
            </div>

            {/* Feedback (latest eval) */}
            {evs[0] && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Latest feedback</p>
                <div className="rounded-xl border border-border/60 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">from {evs[0].mentor?.name ?? 'Mentor'}</span>
                    <ScoreBadge score={evs[0].score} />
                  </div>
                  <p className="mt-2 text-sm">{evs[0].feedback ?? 'No written feedback.'}</p>
                  {evs[0].aiFeedback && (
                    <div className="mt-2 flex items-start gap-2 rounded-lg bg-muted/40 p-2">
                      <AIBadge />
                      <p className="text-xs text-muted-foreground">{evs[0].aiFeedback}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => toast.success(`Demo: ${project.student?.name} shortlisted`, { description: 'Not persisted in demo' })}>
            <Star className="h-4 w-4" /> Shortlist
          </Button>
          <Button onClick={() => toast.success(`Demo: offer extended to ${project.student?.name}`, { description: 'Not persisted in demo' })}>
            <CheckCircle2 className="h-4 w-4" /> Hire
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ================================================================== */
/* 6. ANALYTICS                                                       */
/* ================================================================== */

function AnalyticsView({ companyId }: { companyId: string }) {
  const [loading, setLoading] = React.useState(true)
  const [overview, setOverview] = React.useState<any>(null)
  const [internships, setInternships] = React.useState<Internship[]>([])
  const [apps, setApps] = React.useState<Application[]>([])

  React.useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([
      analyticsApi.overview('COMPANY').catch(() => null),
      internshipsApi.list({ status: '' }).catch(() => []),
      applicationsApi.list({ companyId }).catch(() => []),
    ]).then(([ov, ints, aps]) => {
      if (!active) return
      setOverview(ov)
      setInternships((ints as Internship[]).filter((i) => i.companyId === companyId))
      setApps(aps as Application[])
    }).finally(() => active && setLoading(false))
    return () => { active = false }
  }, [companyId])

  if (loading || !overview) {
    return (
      <div className="animate-in-fade space-y-5">
        <PageHeader eyebrow="InternForge · Company" title="Analytics" description="Hiring funnel, trends, and skill demand." icon={BarChart3} />
        <LoadingGrid count={4} />
      </div>
    )
  }

  // applicants per internship
  const perInternship = internships.map((i) => ({
    name: i.title.length > 18 ? i.title.slice(0, 16) + '…' : i.title,
    applicants: i.applicantsCount ?? 0,
  }))

  // funnel stacked by stage (use overview.funnel)
  const funnel = overview.funnel ?? []
  const stackedFunnel = funnel.map((f: any, i: number) => ({
    stage: f.stage,
    count: f.count,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }))

  // skill demand: aggregate skillsRequired across postings
  const skillDemand = new Map<string, number>()
  internships.forEach((i) => {
    i.skillsRequired?.forEach((s) => skillDemand.set(s, (skillDemand.get(s) ?? 0) + 1))
  })
  const skillDemandArr = [...skillDemand.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  // monthly trend (mock)
  const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthlyTrend = months.map((m, i) => ({
    month: m,
    applications: Math.round((apps.length / 6) * (1 - i * 0.08) + Math.random() * 3),
  }))

  return (
    <div className="animate-in-fade space-y-5">
      <PageHeader
        eyebrow="InternForge · Company"
        title="Company Analytics"
        description="Hiring funnel, trends, and skill demand across your postings."
        icon={BarChart3}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* applicants per internship */}
        <SectionCard title="Applicants per Internship" description="Where candidates are applying" icon={Briefcase}>
          {perInternship.length === 0 ? (
            <EmptyState icon={BarChart3} title="No postings" description="Post an internship to see applicant volume." />
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perInternship} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(125,125,125,0.18)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                  <RTooltip
                    contentStyle={{ background: 'rgba(20,30,28,0.92)', border: 'none', borderRadius: 12, color: 'white' }}
                    labelStyle={{ color: 'white' }}
                  />
                  <Bar dataKey="applicants" radius={[0, 6, 6, 0]} fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        {/* funnel stacked bar */}
        <SectionCard title="Conversion Funnel" description="Stacked stage counts" icon={Filter}>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stackedFunnel} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(125,125,125,0.18)" />
                <XAxis dataKey="stage" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" />
                <RTooltip
                  contentStyle={{ background: 'rgba(20,30,28,0.92)', border: 'none', borderRadius: 12, color: 'white' }}
                  labelStyle={{ color: 'white' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {stackedFunnel.map((_: any, i: number) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* monthly trend */}
        <SectionCard title="Monthly Application Trend" description="Last 6 months" icon={LineChartIcon}>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(125,125,125,0.18)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" />
                <RTooltip
                  contentStyle={{ background: 'rgba(20,30,28,0.92)', border: 'none', borderRadius: 12, color: 'white' }}
                  labelStyle={{ color: 'white' }}
                />
                <Line type="monotone" dataKey="applications" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* skill demand */}
        <SectionCard title="Skill Demand" description="Top required skills across postings" icon={Sparkles}>
          {skillDemandArr.length === 0 ? (
            <EmptyState icon={Sparkles} title="No skill data" description="Add skillsRequired to your postings." />
          ) : (
            <ul className="space-y-2">
              {skillDemandArr.map((s, i) => (
                <li key={s.name} className="flex items-center gap-3">
                  <span className="w-5 text-right text-xs font-semibold tabular-nums text-muted-foreground">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{s.name}</span>
                      <span className="font-semibold tabular-nums text-muted-foreground">{s.count}×</span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full gradient-emerald"
                        style={{ width: `${(s.count / skillDemandArr[0].count) * 100}%` }}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* skill gaps aggregate */}
      <SectionCard title="Aggregate Skill Gaps" description="Across applicants (mock distribution)" icon={Target}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {skillDemandArr.slice(0, 4).map((s, i) => {
            const pct = Math.round(35 + (i * 11) % 50)
            return (
              <GlassCard key={s.name} className="space-y-2 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{s.name}</p>
                  <Badge variant="outline" className="text-[10px]">{pct}% gap</Badge>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {s.count} postings require this · {Math.round(s.count * (pct / 100) * 1.5)} applicants below bar
                </p>
              </GlassCard>
            )
          })}
        </div>
      </SectionCard>
    </div>
  )
}

/* ================================================================== */
/* 7. ANNOUNCEMENTS                                                   */
/* ================================================================== */

function AnnouncementsView({
  companyId, userId,
}: {
  companyId: string
  userId: string
}) {
  const [loading, setLoading] = React.useState(true)
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([])
  const [internships, setInternships] = React.useState<Internship[]>([])
  const [apps, setApps] = React.useState<Application[]>([])
  const [showBroadcast, setShowBroadcast] = React.useState(false)

  const load = React.useCallback(() => {
    setLoading(true)
    Promise.all([
      announcementsApi.list().catch(() => []),
      internshipsApi.list({ status: '' }).catch(() => []),
      applicationsApi.list({ companyId }).catch(() => []),
    ]).then(([a, ints, aps]) => {
      const companyInternshipIds = new Set((ints as Internship[]).filter((i) => i.companyId === companyId).map((i) => i.id))
      setAnnouncements((a as Announcement[]).filter((an) => an.internshipId && companyInternshipIds.has(an.internshipId!)))
      setInternships((ints as Internship[]).filter((i) => i.companyId === companyId))
      setApps(aps as Application[])
    }).finally(() => setLoading(false))
  }, [companyId])

  React.useEffect(() => { load() }, [load])

  // count distinct accepted interns
  const acceptedInterns = new Set(
    apps.filter((a) => a.status === 'ACCEPTED' || a.status === 'OFFERED').map((a) => a.studentId)
  ).size

  const sorted = [...announcements].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return (
    <div className="animate-in-fade space-y-5">
      <PageHeader
        eyebrow="InternForge · Company"
        title="Broadcast Announcements"
        description="Send updates to your intern cohort."
        icon={Megaphone}
        actions={
          <Button size="sm" onClick={() => setShowBroadcast(true)}>
            <Send className="h-4 w-4" /> Broadcast
          </Button>
        }
      />

      {/* Reach summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active Internships" value={internships.length} icon={Briefcase} accent="emerald" />
        <StatCard label="Reachable Interns" value={acceptedInterns} icon={Users} accent="amber" />
        <StatCard label="Sent Announcements" value={announcements.length} icon={Megaphone} accent="violet" />
      </div>

      {loading ? (
        <LoadingGrid count={3} />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No announcements yet"
          description="Broadcast your first update to interns."
          action={
            <Button size="sm" onClick={() => setShowBroadcast(true)}>
              <Send className="h-4 w-4" /> Broadcast
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((a) => (
            <AnnouncementRow key={a.id} announcement={a} internships={internships} />
          ))}
        </div>
      )}

      <BroadcastDialog
        open={showBroadcast}
        onOpenChange={setShowBroadcast}
        internships={internships}
        reach={acceptedInterns}
        onSent={() => {
          setShowBroadcast(false)
          load()
        }}
        authorId={userId}
      />
    </div>
  )
}

function AnnouncementRow({
  announcement, internships,
}: {
  announcement: Announcement
  internships: Internship[]
}) {
  const internship = internships.find((i) => i.id === announcement.internshipId)
  return (
    <GlassCard hover className="p-4">
      <div className="flex items-start gap-3">
        {announcement.pinned && (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-300">
            <Pin className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{announcement.title}</h3>
            {announcement.pinned && <Badge variant="secondary" className="text-[10px]">Pinned</Badge>}
            {internship && <Badge variant="outline" className="text-[10px]">{internship.title}</Badge>}
          </div>
          <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{announcement.content}</p>
          <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Mail className="h-3 w-3" /> {announcement.author?.name ?? 'Company'}
            </span>
            <span>{timeAgo(announcement.createdAt)}</span>
          </div>
        </div>
      </div>
    </GlassCard>
  )
}

function BroadcastDialog({
  open, onOpenChange, internships, reach, onSent, authorId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  internships: Internship[]
  reach: number
  onSent: () => void
  authorId: string
}) {
  const [title, setTitle] = React.useState('')
  const [content, setContent] = React.useState('')
  const [target, setTarget] = React.useState<string>('all')

  React.useEffect(() => {
    if (open) { setTitle(''); setContent(''); setTarget('all') }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Broadcast announcement</DialogTitle>
          <DialogDescription>
            Reach <span className="font-semibold text-emerald-600">{reach}</span> interns across {internships.length} active internships.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="bc-title">Title</Label>
            <Input id="bc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Weekly sync moved to Thursday" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bc-target">Target internship</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger id="bc-target" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All internships ({reach} interns)</SelectItem>
                {internships.map((i) => (
                  <SelectItem key={i.id} value={i.id}>{i.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bc-content">Message</Label>
            <Textarea id="bc-content" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your announcement…" className="min-h-28" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!title.trim() || !content.trim()}
            onClick={() => {
              const n = target === 'all' ? reach : Math.max(1, Math.round(reach / Math.max(1, internships.length)))
              toast.success(`Demo: announcement broadcast to ${n} intern${n === 1 ? '' : 's'}`, {
                description: 'Not persisted in demo',
              })
              onSent()
            }}
          >
            <Send className="h-4 w-4" /> Broadcast
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ================================================================== */
/* Shared small helpers                                              */
/* ================================================================== */

function latestScore(project: Project): number {
  const evs = (project.evaluations as Evaluation[] | undefined) ?? []
  if (evs.length === 0) {
    // fallback to a deterministic mock based on progress
    return Math.min(99, Math.max(40, Math.round(50 + project.progress / 2.5)))
  }
  return Math.round(evs.reduce((s, e) => s + e.score, 0) / evs.length)
}

function countVerifiedSkills(student?: User & { userSkills?: any[] } | null): number {
  if (!student) return 0
  const skills = (student as any).userSkills as any[] | undefined
  if (!skills || !Array.isArray(skills)) return Math.max(0, Math.floor(Math.random() * 5) + 1)
  return skills.filter((s) => s.verified).length
}
