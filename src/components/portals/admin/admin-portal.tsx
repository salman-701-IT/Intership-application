'use client'

import * as React from 'react'
import type { User, Company, AuditLog, Internship, Submission } from '@/lib/types'
import { toast } from 'sonner'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar, LineChart, Line,
} from 'recharts'
import {
  PageHeader, GlassCard, StatCard, SectionCard, StatusPill, UserAvatar,
  EmptyState, LoadingGrid, MetaRow,
} from '@/components/platform/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { usersApi, internshipsApi, submissionsApi, analyticsApi, adminApi } from '@/lib/api'
import { formatDate, formatDateTime, formatNumber, timeAgo } from '@/lib/format'
import {
  Users, Building2, FileText, FolderGit2, Send, Award, ShieldCheck, Server,
  Settings, ScrollText, BarChart3, LayoutDashboard, HeartPulse, Activity,
  AlertTriangle, Search, Eye, Ban, UserCheck, UserCog, Plus, Pencil, Archive,
  Play, Download, RefreshCw, Sparkles, TrendingUp, Crown, CheckCircle2,
  Cpu, Database, Zap, Flag, FileSearch, Loader2, Info, Trash2, Save,
  ShieldAlert, Gauge, ArrowRight, Star, MoreVertical,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/* Portal contract                                                     */
/* ------------------------------------------------------------------ */
export type PortalProps = {
  user: User
  view: string
  setView: (v: string) => void
}

/* ------------------------------------------------------------------ */
/* Local shared types                                                  */
/* ------------------------------------------------------------------ */
type UserRow = User & {
  companyMemberships?: {
    id: string
    userId: string
    companyId: string
    role: string
    company: Company
  }[]
}

type AdminOverview = {
  totals: {
    totalUsers: number
    totalInternships: number
    totalApplications: number
    totalProjects: number
    totalSubmissions: number
    totalCertificates: number
  }
  admin?: {
    byRole: { role: string; count: number }[]
    auditEvents: number
    flagged: number
  }
  signups?: { month: string; value: number }[]
}

type PlatformSetting = { key: string; value: string; updatedAt?: string }

type HealthPayload = {
  status: string
  timestamp: string
  database: string
  version: string
}

const CHART_COLORS = ['#10b981', '#f59e0b', '#8b5cf6', '#14b8a6', '#f43f5e', '#64748b']
const ROLE_LABEL: Record<string, string> = {
  STUDENT: 'Students',
  MENTOR: 'Mentors',
  COMPANY: 'Company Admins',
  ADMIN: 'Super Admins',
  RECRUITER: 'Recruiters',
}

const SEVERITY_STYLE: Record<string, string> = {
  INFO: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
  WARN: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  ERROR: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300',
  CRITICAL: 'bg-rose-600 text-white',
}

function companyNameFor(u?: UserRow | null): string {
  const m = u?.companyMemberships?.[0]?.company
  return m?.name ?? '—'
}

function ChartFrame({
  height = 240, children,
}: {
  height?: number
  children: React.ReactNode
}) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children as any}
      </ResponsiveContainer>
    </div>
  )
}

function severityPillClass(sev: string): string {
  return SEVERITY_STYLE[sev?.toUpperCase()] ?? 'bg-muted text-muted-foreground'
}

function scoreColorClass(score: number): string {
  if (score >= 0.5) return 'text-rose-600 dark:text-rose-400'
  if (score >= 0.35) return 'text-amber-600 dark:text-amber-400'
  return 'text-emerald-600 dark:text-emerald-400'
}

function JsonBlock({ value }: { value: unknown }) {
  let pretty = '—'
  try {
    pretty = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  } catch {
    pretty = String(value)
  }
  return (
    <pre className="max-h-72 overflow-auto rounded-lg border border-border/60 bg-muted/30 p-3 text-xs leading-relaxed">
      <code className="font-mono whitespace-pre-wrap break-words">{pretty}</code>
    </pre>
  )
}

/* ================================================================== */
/* Root portal                                                         */
/* ================================================================== */
export function AdminPortal({ user, view, setView }: PortalProps) {
  const known = ['dashboard', 'users', 'programs', 'audit', 'analytics', 'security', 'health', 'settings']
  const v = known.includes(view) ? view : 'dashboard'
  return (
    <div className="animate-in-fade space-y-5">
      {v === 'dashboard' && <DashboardView user={user} setView={setView} />}
      {v === 'users' && <UsersView />}
      {v === 'programs' && <ProgramsView />}
      {v === 'audit' && <AuditView />}
      {v === 'analytics' && <AnalyticsView />}
      {v === 'security' && <SecurityView />}
      {v === 'health' && <HealthView />}
      {v === 'settings' && <SettingsView />}
    </div>
  )
}

/* ================================================================== */
/* 1. Dashboard                                                        */
/* ================================================================== */
function DashboardView({ user, setView }: { user: User; setView: (v: string) => void }) {
  const [overview, setOverview] = React.useState<AdminOverview | null>(null)
  const [audits, setAudits] = React.useState<AuditLog[]>([])
  const [flagged, setFlagged] = React.useState<Submission[]>([])
  const [loading, setLoading] = React.useState(true)
  const [err, setErr] = React.useState<string | null>(null)

  React.useEffect(() => {
    let active = true
    setLoading(true)
    setErr(null)
    Promise.all([
      analyticsApi.overview('ADMIN'),
      adminApi.auditLogs(),
      submissionsApi.list(),
    ])
      .then(([ov, logs, subs]) => {
        if (!active) return
        setOverview(ov as AdminOverview)
        setAudits(logs)
        setFlagged(subs.filter((s) => (s.plagiarismScore ?? 0) > 0.25))
      })
      .catch((e) => active && setErr(e.message ?? 'Failed to load'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const totals = overview?.totals
  const signups = overview?.signups ?? []
  const byRole = overview?.admin?.byRole ?? []
  const rolePie = byRole.map((b) => ({ name: ROLE_LABEL[b.role] ?? b.role, value: b.count }))

  return (
    <>
      <PageHeader
        eyebrow="InternForge · Admin"
        title="Platform Home"
        description={`Welcome back, ${user.name}. Platform-wide overview of users, programs, and security.`}
        icon={LayoutDashboard}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setView('analytics')}>
              <BarChart3 className="h-4 w-4" /> Analytics
            </Button>
            <Button size="sm" onClick={() => setView('security')}>
              <ShieldCheck className="h-4 w-4" /> Security
            </Button>
          </>
        }
      />

      {err && (
        <GlassCard className="border-rose-500/40 bg-rose-500/5 p-4 text-sm text-rose-700 dark:text-rose-300">
          <AlertTriangle className="mr-2 inline h-4 w-4" /> {err}
        </GlassCard>
      )}

      {loading ? (
        <LoadingGrid count={3} />
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Total Users" value={totals?.totalUsers ?? 0} icon={Users} accent="emerald" trend={12} trendLabel="vs last mo." />
            <StatCard label="Internships" value={totals?.totalInternships ?? 0} icon={Building2} accent="amber" />
            <StatCard label="Applications" value={totals?.totalApplications ?? 0} icon={FileText} accent="violet" trend={8} trendLabel="vs last mo." />
            <StatCard label="Projects" value={totals?.totalProjects ?? 0} icon={FolderGit2} accent="sky" />
            <StatCard label="Submissions" value={totals?.totalSubmissions ?? 0} icon={Send} accent="emerald" />
            <StatCard label="Certificates" value={totals?.totalCertificates ?? 0} icon={Award} accent="amber" />
          </div>

          {/* Charts */}
          <div className="grid gap-4 lg:grid-cols-3">
            <SectionCard
              title="User Signups"
              description="Monthly new-user trend"
              icon={TrendingUp}
              className="lg:col-span-2"
            >
              <ChartFrame height={260}>
                <AreaChart data={signups} margin={{ left: -16, right: 8, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="rgba(120,120,120,0.55)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="rgba(120,120,120,0.55)" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12, border: '1px solid rgba(120,120,120,0.2)',
                      background: 'rgba(20,20,20,0.92)', color: '#fff', fontSize: 12,
                    }}
                    labelStyle={{ color: '#a3e635' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2.5} fill="url(#signupGrad)" name="Signups" />
                </AreaChart>
              </ChartFrame>
            </SectionCard>

            <SectionCard
              title="Users by Role"
              description="Distribution across personas"
              icon={Users}
            >
              {rolePie.length === 0 ? (
                <EmptyState icon={Users} title="No users yet" />
              ) : (
                <ChartFrame height={260}>
                  <PieChart>
                    <Pie data={rolePie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                      {rolePie.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12, border: '1px solid rgba(120,120,120,0.2)',
                        background: 'rgba(20,20,20,0.92)', color: '#fff', fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ChartFrame>
              )}
            </SectionCard>
          </div>

          {/* Flagged + Audit */}
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard
              title="Flagged Submissions"
              description="Plagiarism score > 0.25"
              icon={ShieldAlert}
              actions={
                <Button variant="ghost" size="sm" onClick={() => setView('security')}>
                  Review all <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              }
            >
              {flagged.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="No flagged submissions" description="All clear — no plagiarism alerts." />
              ) : (
                <ScrollArea className="max-h-72 pr-3">
                  <div className="space-y-2">
                    {flagged.slice(0, 8).map((s) => (
                      <div key={s.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-2.5">
                        <UserAvatar name={s.student?.name} src={s.student?.avatarUrl} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{s.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {s.student?.name ?? '—'} · {s.project?.title ?? '—'}
                          </p>
                        </div>
                        <Badge className={cn('font-semibold', severityPillClass(
                          (s.plagiarismScore ?? 0) >= 0.5 ? 'CRITICAL' : 'WARN'
                        ))}>
                          {Math.round((s.plagiarismScore ?? 0) * 100)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </SectionCard>

            <SectionCard
              title="Recent Audit Events"
              description="Latest 5 platform events"
              icon={ScrollText}
              actions={
                <Button variant="ghost" size="sm" onClick={() => setView('audit')}>
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              }
            >
              {audits.length === 0 ? (
                <EmptyState icon={ScrollText} title="No audit events" />
              ) : (
                <div className="space-y-2">
                  {audits.slice(0, 5).map((a) => (
                    <div key={a.id} className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-2.5">
                      <div className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md', severityPillClass(a.severity))}>
                        {a.severity === 'CRITICAL' || a.severity === 'ERROR' ? (
                          <AlertTriangle className="h-3.5 w-3.5" />
                        ) : (
                          <Info className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="truncate text-sm font-medium">
                          <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">{a.action}</span>
                          <span className="mx-1 text-muted-foreground">·</span>
                          <span className="text-xs">{a.resource}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {a.user?.name ?? 'System'} · {timeAgo(a.createdAt)}
                        </p>
                      </div>
                      <Badge className={cn('font-semibold uppercase', severityPillClass(a.severity))}>
                        {a.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </>
      )}
    </>
  )
}

/* ================================================================== */
/* 2. Users                                                            */
/* ================================================================== */
function UsersView() {
  const [users, setUsers] = React.useState<UserRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [err, setErr] = React.useState<string | null>(null)
  const [roleFilter, setRoleFilter] = React.useState<string>('ALL')
  const [query, setQuery] = React.useState('')
  const [createOpen, setCreateOpen] = React.useState(false)
  const [viewUser, setViewUser] = React.useState<UserRow | null>(null)

  const load = React.useCallback(() => {
    setLoading(true)
    setErr(null)
    usersApi.list()
      .then((u) => setUsers(u as UserRow[]))
      .catch((e) => setErr(e.message ?? 'Failed to load users'))
      .finally(() => setLoading(false))
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return users.filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false
      if (!q) return true
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    })
  }, [users, roleFilter, query])

  return (
    <>
      <PageHeader
        eyebrow="InternForge · Admin"
        title="User Management"
        description="Manage all platform members — students, mentors, recruiters, company admins."
        icon={Users}
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New user
          </Button>
        }
      />

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />

      <Dialog open={!!viewUser} onOpenChange={(o) => !o && setViewUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>User Profile</DialogTitle>
            <DialogDescription>Demo read-only user view.</DialogDescription>
          </DialogHeader>
          {viewUser && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <UserAvatar name={viewUser.name} src={viewUser.avatarUrl} size="lg" />
                <div>
                  <p className="text-base font-semibold">{viewUser.name}</p>
                  <p className="text-sm text-muted-foreground">{viewUser.email}</p>
                </div>
              </div>
              <Separator />
              <MetaRow label="Role" value={<Badge variant="secondary">{viewUser.role}</Badge>} />
              <MetaRow label="Status" value={<StatusPill status={viewUser.status} />} />
              <MetaRow label="Company" value={companyNameFor(viewUser)} />
              <MetaRow label="Location" value={viewUser.location ?? '—'} />
              <MetaRow label="Joined" value={formatDate(viewUser.createdAt)} />
              <MetaRow label="Title" value={viewUser.title ?? '—'} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewUser(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <GlassCard className="p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email…"
              className="pl-8"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All roles</SelectItem>
              <SelectItem value="STUDENT">Students</SelectItem>
              <SelectItem value="MENTOR">Mentors</SelectItem>
              <SelectItem value="COMPANY">Company Admins</SelectItem>
              <SelectItem value="RECRUITER">Recruiters</SelectItem>
              <SelectItem value="ADMIN">Super Admins</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </GlassCard>

      {err && (
        <GlassCard className="border-rose-500/40 bg-rose-500/5 p-4 text-sm text-rose-700 dark:text-rose-300">
          <AlertTriangle className="mr-2 inline h-4 w-4" /> {err}
        </GlassCard>
      )}

      {loading ? (
        <LoadingGrid count={3} />
      ) : (
        <SectionCard
          title="All Users"
          description={`${filtered.length} of ${users.length} shown`}
          icon={Users}
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <UserAvatar name={u.name} src={u.avatarUrl} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{u.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{u.title ?? '—'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-[10px] uppercase">{u.role}</Badge>
                    </TableCell>
                    <TableCell><StatusPill status={u.status} /></TableCell>
                    <TableCell className="text-sm">{companyNameFor(u)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setViewUser(u)}>
                            <Eye className="mr-2 h-3.5 w-3.5" /> View
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => toast(`Demo: ${u.name} suspended`, { description: 'Soft-suspend toggled (mock).' })}>
                            <Ban className="mr-2 h-3.5 w-3.5" /> {u.status === 'SUSPENDED' ? 'Activate' : 'Suspend'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast(`Demo: impersonating ${u.name}`, { description: 'Session would switch (mock).' })}>
                            <UserCog className="mr-2 h-3.5 w-3.5" /> Impersonate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <EmptyState icon={Users} title="No users match" description="Try adjusting filters." />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </SectionCard>
      )}
    </>
  )
}

function CreateUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [role, setRole] = React.useState('STUDENT')

  function submit() {
    if (!name.trim() || !email.trim()) {
      toast('Please fill name and email.')
      return
    }
    toast.success('Demo: user created', {
      description: `${name} (${role}) would be added to the platform.`,
    })
    setName('')
    setEmail('')
    setRole('STUDENT')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New User</DialogTitle>
          <DialogDescription>Create a new platform account. This is a demo form.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="nu-name">Full name</Label>
            <Input id="nu-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aria Mehta" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nu-email">Email</Label>
            <Input id="nu-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@platform.io" />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="STUDENT">Student</SelectItem>
                <SelectItem value="MENTOR">Mentor</SelectItem>
                <SelectItem value="COMPANY">Company Admin</SelectItem>
                <SelectItem value="RECRUITER">Recruiter</SelectItem>
                <SelectItem value="ADMIN">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}><Plus className="h-4 w-4" /> Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ================================================================== */
/* 3. Programs                                                         */
/* ================================================================== */
function ProgramsView() {
  const [items, setItems] = React.useState<Internship[]>([])
  const [loading, setLoading] = React.useState(true)
  const [err, setErr] = React.useState<string | null>(null)
  const [newOpen, setNewOpen] = React.useState(false)

  const load = React.useCallback(() => {
    setLoading(true)
    setErr(null)
    internshipsApi.list({ status: '' })
      .then(setItems)
      .catch((e) => setErr(e.message ?? 'Failed to load internships'))
      .finally(() => setLoading(false))
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  // group by company
  const grouped = React.useMemo(() => {
    const map = new Map<string, Internship[]>()
    for (const i of items) {
      const name = i.company?.name ?? '—'
      if (!map.has(name)) map.set(name, [])
      map.get(name)!.push(i)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [items])

  return (
    <>
      <PageHeader
        eyebrow="InternForge · Admin"
        title="Program Management"
        description="Curate all internship programs across every company."
        icon={Building2}
        actions={
          <Button size="sm" onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4" /> New program
          </Button>
        }
      />

      <NewProgramDialog open={newOpen} onOpenChange={setNewOpen} />

      {err && (
        <GlassCard className="border-rose-500/40 bg-rose-500/5 p-4 text-sm text-rose-700 dark:text-rose-300">
          <AlertTriangle className="mr-2 inline h-4 w-4" /> {err}
        </GlassCard>
      )}

      {loading ? (
        <LoadingGrid count={3} />
      ) : grouped.length === 0 ? (
        <SectionCard title="Programs" icon={Building2}>
          <EmptyState icon={Building2} title="No programs yet" description="Add the first internship program." />
        </SectionCard>
      ) : (
        <div className="space-y-5">
          {grouped.map(([companyName, list]) => (
            <SectionCard
              key={companyName}
              title={companyName}
              description={`${list.length} program${list.length === 1 ? '' : 's'}`}
              icon={Building2}
            >
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Domain</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Slots</TableHead>
                      <TableHead>Applicants</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list
                      .slice()
                      .sort((a, b) => (b.applicantsCount ?? 0) - (a.applicantsCount ?? 0))
                      .map((i) => (
                        <TableRow key={i.id}>
                          <TableCell>
                            <p className="text-sm font-medium">{i.title}</p>
                            <p className="text-xs text-muted-foreground">{i.location ?? 'Remote'}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-[10px]">{i.domain}</Badge>
                          </TableCell>
                          <TableCell><StatusPill status={i.status} /></TableCell>
                          <TableCell className="text-sm tabular-nums">{i.slots}</TableCell>
                          <TableCell>
                            <span className="text-sm font-semibold tabular-nums">{i.applicantsCount ?? 0}</span>
                            <span className="ml-1 text-xs text-muted-foreground">/ {i.slots}</span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDate(i.applicationDeadline)}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => toast(`Demo: edit "${i.title}"`, { description: 'Editor would open (mock).' })}>
                                  <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => toast[i.status === 'ARCHIVED' ? 'success' : 'info'](
                                    `Demo: ${i.status === 'ARCHIVED' ? 're-opened' : 'archived'} "${i.title}"`,
                                    { description: 'Status would toggle (mock).' },
                                  )}
                                >
                                  {i.status === 'ARCHIVED' ? (
                                    <><Play className="mr-2 h-3.5 w-3.5" /> Open</>
                                  ) : (
                                    <><Archive className="mr-2 h-3.5 w-3.5" /> Archive</>
                                  )}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </>
  )
}

function NewProgramDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [title, setTitle] = React.useState('')
  const [domain, setDomain] = React.useState('Frontend')
  const [company, setCompany] = React.useState('FinEdge')

  function submit() {
    if (!title.trim()) {
      toast('Please enter a program title.')
      return
    }
    toast.success('Demo: program created', {
      description: `"${title}" for ${company} (${domain}) would be added.`,
    })
    setTitle('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Internship Program</DialogTitle>
          <DialogDescription>Demo form — wiring to backend is mocked.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="np-title">Title</Label>
            <Input id="np-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Frontend Engineer Intern" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Select value={company} onValueChange={setCompany}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FinEdge">FinEdge</SelectItem>
                  <SelectItem value="CloudPeak">CloudPeak</SelectItem>
                  <SelectItem value="MediSoft">MediSoft</SelectItem>
                  <SelectItem value="GameVista">GameVista</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Domain</Label>
              <Select value={domain} onValueChange={setDomain}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Frontend">Frontend</SelectItem>
                  <SelectItem value="Backend">Backend</SelectItem>
                  <SelectItem value="ML">ML</SelectItem>
                  <SelectItem value="DevOps">DevOps</SelectItem>
                  <SelectItem value="Data">Data</SelectItem>
                  <SelectItem value="Mobile">Mobile</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}><Plus className="h-4 w-4" /> Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ================================================================== */
/* 4. Audit Logs                                                       */
/* ================================================================== */
function AuditView() {
  const [logs, setLogs] = React.useState<AuditLog[]>([])
  const [loading, setLoading] = React.useState(true)
  const [err, setErr] = React.useState<string | null>(null)
  const [severity, setSeverity] = React.useState<string>('ALL')
  const [actionQuery, setActionQuery] = React.useState('')
  const [from, setFrom] = React.useState('')
  const [to, setTo] = React.useState('')
  const [selected, setSelected] = React.useState<AuditLog | null>(null)

  const load = React.useCallback(() => {
    setLoading(true)
    setErr(null)
    const params: Record<string, string> = {}
    if (severity !== 'ALL') params.severity = severity
    adminApi.auditLogs(params)
      .then(setLogs)
      .catch((e) => setErr(e.message ?? 'Failed to load audit logs'))
      .finally(() => setLoading(false))
  }, [severity])

  React.useEffect(() => {
    load()
  }, [load])

  const filtered = React.useMemo(() => {
    const q = actionQuery.trim().toLowerCase()
    const fromD = from ? new Date(from) : null
    const toD = to ? new Date(to + 'T23:59:59') : null
    return logs.filter((l) => {
      if (q && !l.action.toLowerCase().includes(q) && !l.resource.toLowerCase().includes(q)) return false
      if (fromD || toD) {
        const d = new Date(l.createdAt)
        if (fromD && d < fromD) return false
        if (toD && d > toD) return false
      }
      return true
    })
  }, [logs, actionQuery, from, to])

  // severity distribution chart
  const dist = React.useMemo(() => {
    const counts: Record<string, number> = { INFO: 0, WARN: 0, ERROR: 0, CRITICAL: 0 }
    for (const l of logs) {
      const k = (l.severity || 'INFO').toUpperCase()
      counts[k] = (counts[k] ?? 0) + 1
    }
    return (['INFO', 'WARN', 'ERROR', 'CRITICAL'] as const).map((s) => ({ severity: s, count: counts[s] ?? 0 }))
  }, [logs])

  return (
    <>
      <PageHeader
        eyebrow="InternForge · Admin"
        title="Audit Logs & Security"
        description="Tamper-evident trail of every administrative & user action."
        icon={ScrollText}
        actions={
          <Button size="sm" variant="outline" onClick={() => toast.success('Demo: CSV export queued', { description: `${filtered.length} rows would be exported.` })}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        }
      />

      {/* Filters */}
      <GlassCard className="p-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Severity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All severities</SelectItem>
              <SelectItem value="INFO">Info</SelectItem>
              <SelectItem value="WARN">Warn</SelectItem>
              <SelectItem value="ERROR">Error</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={actionQuery}
              onChange={(e) => setActionQuery(e.target.value)}
              placeholder="Search action / resource…"
              className="pl-8"
            />
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground" htmlFor="audit-from">From</Label>
            <Input id="audit-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground" htmlFor="audit-to">To</Label>
            <Input id="audit-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-4">
        <SectionCard title="Severity Distribution" icon={BarChart3} className="lg:col-span-1">
          <ChartFrame height={180}>
            <BarChart data={dist} layout="vertical" margin={{ left: 24, right: 8, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="rgba(120,120,120,0.55)" />
              <YAxis type="category" dataKey="severity" tick={{ fontSize: 11 }} stroke="rgba(120,120,120,0.55)" width={64} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12, border: '1px solid rgba(120,120,120,0.2)',
                  background: 'rgba(20,20,20,0.92)', color: '#fff', fontSize: 12,
                }}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {dist.map((d, i) => (
                  <Cell key={i} fill={
                    d.severity === 'CRITICAL' ? '#f43f5e'
                    : d.severity === 'ERROR' ? '#fb7185'
                    : d.severity === 'WARN' ? '#f59e0b'
                    : '#14b8a6'
                  } />
                ))}
              </Bar>
            </BarChart>
          </ChartFrame>
        </SectionCard>

        <SectionCard
          title="Audit Trail"
          description={`${filtered.length} events`}
          icon={ScrollText}
          className="lg:col-span-3"
          contentClassName="p-0"
        >
          {err ? (
            <div className="p-4 text-sm text-rose-600 dark:text-rose-400">
              <AlertTriangle className="mr-2 inline h-4 w-4" /> {err}
            </div>
          ) : loading ? (
            <div className="p-4"><LoadingGrid count={2} /></div>
          ) : (
            <ScrollArea className="max-h-[28rem]">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((l) => {
                      const high = l.severity === 'CRITICAL' || l.severity === 'ERROR'
                      return (
                        <TableRow
                          key={l.id}
                          className={cn('cursor-pointer', high && 'bg-rose-500/5 hover:bg-rose-500/10')}
                          onClick={() => setSelected(l)}
                        >
                          <TableCell className="text-xs text-muted-foreground">{formatDateTime(l.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <UserAvatar name={l.user?.name} src={l.user?.avatarUrl} size="xs" />
                              <span className="text-sm">{l.user?.name ?? 'System'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-[11px] uppercase tracking-wide">{l.action}</span>
                          </TableCell>
                          <TableCell className="text-sm">{l.resource}{l.resourceId ? ` · ${l.resourceId.slice(-6)}` : ''}</TableCell>
                          <TableCell>
                            <Badge className={cn('font-semibold uppercase', severityPillClass(l.severity))}>{l.severity}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{l.ipAddress ?? '—'}</TableCell>
                        </TableRow>
                      )
                    })}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <EmptyState icon={ScrollText} title="No matching audit events" />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          )}
        </SectionCard>
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit Event Detail</DialogTitle>
            <DialogDescription>{selected ? formatDateTime(selected.createdAt) : ''}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <MetaRow label="Action" value={<span className="font-mono text-xs uppercase">{selected.action}</span>} />
                <MetaRow label="Severity" value={<Badge className={cn('uppercase', severityPillClass(selected.severity))}>{selected.severity}</Badge>} />
                <MetaRow label="Resource" value={selected.resource} />
                <MetaRow label="Resource ID" value={selected.resourceId ?? '—'} />
                <MetaRow label="User" value={selected.user?.name ?? 'System'} />
                <MetaRow label="IP Address" value={<span className="font-mono text-xs">{selected.ipAddress ?? '—'}</span>} />
              </div>
              <Separator />
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Details</Label>
                <JsonBlock value={selected.details} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* ================================================================== */
/* 5. Analytics                                                        */
/* ================================================================== */
function AnalyticsView() {
  const [overview, setOverview] = React.useState<AdminOverview | null>(null)
  const [internships, setInternships] = React.useState<Internship[]>([])
  const [loading, setLoading] = React.useState(true)
  const [err, setErr] = React.useState<string | null>(null)
  const [range, setRange] = React.useState('30d')

  React.useEffect(() => {
    let active = true
    setLoading(true)
    setErr(null)
    Promise.all([
      analyticsApi.overview('ADMIN'),
      internshipsApi.list({ status: '' }),
    ])
      .then(([ov, ints]) => {
        if (!active) return
        setOverview(ov as AdminOverview)
        setInternships(ints)
      })
      .catch((e) => active && setErr(e.message ?? 'Failed to load analytics'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  // skill demand aggregate
  const skillDemand = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const i of internships) {
      for (const s of i.skillsRequired ?? []) {
        map.set(s, (map.get(s) ?? 0) + 1)
      }
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [internships])

  // top companies by applicants
  const topCompanies = React.useMemo(() => {
    const map = new Map<string, { name: string; applicants: number; programs: number }>()
    for (const i of internships) {
      const name = i.company?.name ?? '—'
      const cur = map.get(name) ?? { name, applicants: 0, programs: 0 }
      cur.applicants += i.applicantsCount ?? 0
      cur.programs += 1
      map.set(name, cur)
    }
    return Array.from(map.values()).sort((a, b) => b.applicants - a.applicants).slice(0, 6)
  }, [internships])

  const signups = overview?.signups ?? []
  const rolePie = (overview?.admin?.byRole ?? []).map((b) => ({ name: ROLE_LABEL[b.role] ?? b.role, value: b.count }))
  const auditEvents = overview?.admin?.auditEvents ?? 0
  const flagged = overview?.admin?.flagged ?? 0

  return (
    <>
      <PageHeader
        eyebrow="InternForge · Admin"
        title="Platform Analytics"
        description="Aggregate insights across users, programs, skills, and security."
        icon={BarChart3}
        actions={
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="quarter">Last quarter</SelectItem>
              <SelectItem value="ytd">Year to date</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {err && (
        <GlassCard className="border-rose-500/40 bg-rose-500/5 p-4 text-sm text-rose-700 dark:text-rose-300">
          <AlertTriangle className="mr-2 inline h-4 w-4" /> {err}
        </GlassCard>
      )}

      {loading ? (
        <LoadingGrid count={4} />
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Total Users" value={overview?.totals.totalUsers ?? 0} icon={Users} accent="emerald" />
            <StatCard label="Audit Events" value={auditEvents} icon={ScrollText} accent="amber" />
            <StatCard label="Flagged Subs" value={flagged} icon={ShieldAlert} accent="rose" />
            <StatCard label="Programs" value={overview?.totals.totalInternships ?? 0} icon={Building2} accent="violet" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Signups trend */}
            <SectionCard title="User Signups" description="Monthly trend" icon={TrendingUp}>
              <ChartFrame height={240}>
                <AreaChart data={signups} margin={{ left: -16, right: 8, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="anGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="rgba(120,120,120,0.55)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="rgba(120,120,120,0.55)" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12, border: '1px solid rgba(120,120,120,0.2)',
                      background: 'rgba(20,20,20,0.92)', color: '#fff', fontSize: 12,
                    }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2.5} fill="url(#anGrad)" />
                </AreaChart>
              </ChartFrame>
            </SectionCard>

            {/* Users by role pie */}
            <SectionCard title="Users by Role" icon={Users}>
              {rolePie.length === 0 ? (
                <EmptyState icon={Users} title="No users" />
              ) : (
                <ChartFrame height={240}>
                  <PieChart>
                    <Pie data={rolePie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                      {rolePie.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12, border: '1px solid rgba(120,120,120,0.2)',
                        background: 'rgba(20,20,20,0.92)', color: '#fff', fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ChartFrame>
              )}
            </SectionCard>

            {/* Skill demand */}
            <SectionCard title="Skill Demand" description="Aggregated across all internships" icon={Sparkles}>
              {skillDemand.length === 0 ? (
                <EmptyState icon={Sparkles} title="No skills mapped" />
              ) : (
                <ChartFrame height={240}>
                  <BarChart data={skillDemand} layout="vertical" margin={{ left: 32, right: 12, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="rgba(120,120,120,0.55)" allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="rgba(120,120,120,0.55)" width={90} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12, border: '1px solid rgba(120,120,120,0.2)',
                        background: 'rgba(20,20,20,0.92)', color: '#fff', fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} fill="#10b981" />
                  </BarChart>
                </ChartFrame>
              )}
            </SectionCard>

            {/* Top companies */}
            <SectionCard title="Top Companies" description="By applicant count" icon={Crown}>
              {topCompanies.length === 0 ? (
                <EmptyState icon={Building2} title="No data" />
              ) : (
                <div className="space-y-2.5">
                  {topCompanies.map((c, i) => {
                    const max = topCompanies[0]?.applicants || 1
                    const pct = Math.max(6, Math.round((c.applicants / max) * 100))
                    return (
                      <div key={c.name} className="flex items-center gap-3">
                        <div className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold',
                          i === 0 ? 'gradient-amber text-white' : 'bg-muted text-muted-foreground',
                        )}>
                          {i + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-medium">{c.name}</p>
                            <p className="text-xs font-semibold tabular-nums">{formatNumber(c.applicants)}</p>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full gradient-emerald" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">{c.programs} program{c.programs === 1 ? '' : 's'}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </SectionCard>
          </div>
        </>
      )}
    </>
  )
}

/* ================================================================== */
/* 6. Security                                                         */
/* ================================================================== */
function SecurityView() {
  const [subs, setSubs] = React.useState<Submission[]>([])
  const [audits, setAudits] = React.useState<AuditLog[]>([])
  const [loading, setLoading] = React.useState(true)
  const [err, setErr] = React.useState<string | null>(null)
  const [review, setReview] = React.useState<Submission | null>(null)

  const load = React.useCallback(() => {
    setLoading(true)
    setErr(null)
    Promise.all([submissionsApi.list(), adminApi.auditLogs()])
      .then(([s, a]) => {
        setSubs(s)
        setAudits(a)
      })
      .catch((e) => setErr(e.message ?? 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  const flagged = React.useMemo(
    () => subs.filter((s) => (s.plagiarismScore ?? 0) > 0.25).sort((a, b) => (b.plagiarismScore ?? 0) - (a.plagiarismScore ?? 0)),
    [subs],
  )
  const highRisk = flagged.filter((s) => (s.plagiarismScore ?? 0) >= 0.5)
  const avgScore = flagged.length
    ? Math.round((flagged.reduce((a, s) => a + (s.plagiarismScore ?? 0), 0) / flagged.length) * 100) / 100
    : 0
  const suspicious = audits.filter((a) => a.severity === 'WARN' || a.severity === 'ERROR' || a.severity === 'CRITICAL')

  return (
    <>
      <PageHeader
        eyebrow="InternForge · Admin"
        title="Fraud & Plagiarism"
        description="Detect plagiarism, monitor suspicious activity, and act on threats."
        icon={ShieldCheck}
        actions={
          <Button size="sm" onClick={() => toast.success('Demo: AI fraud scan started', { description: 'All submissions queued for AI analysis (mock).' })}>
            <Sparkles className="h-4 w-4" /> AI fraud scan
          </Button>
        }
      />

      {err && (
        <GlassCard className="border-rose-500/40 bg-rose-500/5 p-4 text-sm text-rose-700 dark:text-rose-300">
          <AlertTriangle className="mr-2 inline h-4 w-4" /> {err}
        </GlassCard>
      )}

      {loading ? (
        <LoadingGrid count={4} />
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Total Flagged" value={flagged.length} icon={Flag} accent="amber" />
            <StatCard label="High-risk (>50%)" value={highRisk.length} icon={ShieldAlert} accent="rose" />
            <StatCard label="Avg Plagiarism Score" value={avgScore.toFixed(2)} icon={Gauge} accent="violet" />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {/* Flagged table */}
            <SectionCard
              title="Flagged Submissions"
              description="Plagiarism score > 0.25"
              icon={ShieldAlert}
              className="lg:col-span-2"
              contentClassName="p-0"
            >
              {flagged.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="No flagged submissions" description="All submissions are clean." />
              ) : (
                <ScrollArea className="max-h-[28rem]">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Submission</TableHead>
                          <TableHead>Student</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {flagged.map((s) => {
                          const sc = s.plagiarismScore ?? 0
                          const high = sc >= 0.5
                          return (
                            <TableRow key={s.id} className={high ? 'bg-rose-500/5 hover:bg-rose-500/10' : ''}>
                              <TableCell>
                                <p className="text-sm font-medium">{s.title}</p>
                                <p className="text-xs text-muted-foreground">{s.project?.title ?? '—'}</p>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <UserAvatar name={s.student?.name} src={s.student?.avatarUrl} size="xs" />
                                  <span className="text-sm">{s.student?.name ?? '—'}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className={cn('text-sm font-bold tabular-nums', scoreColorClass(sc))}>
                                  {Math.round(sc * 100)}%
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button size="sm" variant="outline" onClick={() => setReview(s)}>
                                  <Eye className="h-3.5 w-3.5" /> Review
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              )}
            </SectionCard>

            {/* Suspicious activity */}
            <SectionCard
              title="Suspicious Activity"
              description={`${suspicious.length} warn+ events`}
              icon={Activity}
            >
              {suspicious.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="All clear" description="No suspicious activity." />
              ) : (
                <ScrollArea className="max-h-[28rem] pr-2">
                  <div className="space-y-2">
                    {suspicious.slice(0, 12).map((a) => (
                      <div key={a.id} className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{a.action}</span>
                          <Badge className={cn('font-semibold uppercase', severityPillClass(a.severity))}>{a.severity}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {a.user?.name ?? 'System'} · {a.resource} · {timeAgo(a.createdAt)}
                        </p>
                        {a.ipAddress && (
                          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/70">{a.ipAddress}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </SectionCard>
          </div>
        </>
      )}

      {/* Review dialog */}
      <Dialog open={!!review} onOpenChange={(o) => !o && setReview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Submission</DialogTitle>
            <DialogDescription>{review?.project?.title ?? '—'}</DialogDescription>
          </DialogHeader>
          {review && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <UserAvatar name={review.student?.name} src={review.student?.avatarUrl} size="md" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{review.student?.name ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">{review.title} · v{review.version}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Plagiarism</p>
                  <p className={cn('text-lg font-bold tabular-nums', scoreColorClass(review.plagiarismScore ?? 0))}>
                    {Math.round((review.plagiarismScore ?? 0) * 100)}%
                  </p>
                </div>
              </div>
              <Separator />
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Content</Label>
                <div className="max-h-60 overflow-auto rounded-lg border border-border/60 bg-muted/30 p-3 text-xs leading-relaxed whitespace-pre-wrap">
                  {review.content || '—'}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReview(null)}>Close</Button>
            <Button
              variant="destructive"
              onClick={() => {
                toast.success('Demo: submission flagged', { description: 'Notified mentor + student (mock).' })
                setReview(null)
              }}
            >
              <Flag className="h-4 w-4" /> Flag
            </Button>
            <Button
              onClick={() => {
                toast.success('Demo: submission cleared', { description: 'Plagiarism alert dismissed (mock).' })
                setReview(null)
              }}
            >
              <CheckCircle2 className="h-4 w-4" /> Clear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* ================================================================== */
/* 7. System Health                                                    */
/* ================================================================== */
function HealthView() {
  const [health, setHealth] = React.useState<HealthPayload | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [err, setErr] = React.useState<string | null>(null)
  const [lastCheck, setLastCheck] = React.useState<Date | null>(null)

  const runCheck = React.useCallback(() => {
    setLoading(true)
    setErr(null)
    fetch('/api/admin/health', { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<HealthPayload>
      })
      .then((d) => {
        setHealth(d)
        setLastCheck(new Date())
      })
      .catch((e) => setErr(e.message ?? 'Health check failed'))
      .finally(() => setLoading(false))
  }, [])

  React.useEffect(() => {
    runCheck()
  }, [runCheck])

  const ok = health?.status === 'ok'
  const dbOk = health?.database === 'connected'

  // mock perf series
  const perfSeries = React.useMemo(
    () => Array.from({ length: 12 }).map((_, i) => ({
      t: `${String(9 + i).padStart(2, '0')}:00`,
      ms: 60 + Math.round(Math.sin(i / 1.7) * 25 + Math.random() * 30),
    })),
    [lastCheck],
  )
  const avgMs = perfSeries.reduce((a, p) => a + p.ms, 0) / perfSeries.length
  const requestRate = 42 + Math.round(Math.random() * 18)
  const uptimePct = 99.94

  return (
    <>
      <PageHeader
        eyebrow="InternForge · Admin"
        title="System Health"
        description="Live status, performance, and uptime for the platform."
        icon={HeartPulse}
        actions={
          <Button size="sm" variant="outline" onClick={runCheck} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Run health check
          </Button>
        }
      />

      {err && (
        <GlassCard className="border-rose-500/40 bg-rose-500/5 p-4 text-sm text-rose-700 dark:text-rose-300">
          <AlertTriangle className="mr-2 inline h-4 w-4" /> {err}
        </GlassCard>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Status card */}
        <GlassCard className="p-5 lg:col-span-1">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">System Status</p>
              <div className="mt-2 flex items-center gap-2">
                <span className={cn(
                  'flex h-2.5 w-2.5 rounded-full',
                  ok ? 'animate-pulse bg-emerald-500' : 'animate-pulse bg-rose-500',
                )} />
                <span className={cn('text-xl font-bold capitalize', ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                  {health?.status ?? '—'}
                </span>
              </div>
            </div>
            <div className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl',
              ok ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
            )}>
              {ok ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            </div>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <MetaRow label="Database" value={
              <Badge variant="secondary" className={cn(
                'font-semibold uppercase',
                dbOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
              )}>
                {health?.database ?? '—'}
              </Badge>
            } />
            <MetaRow label="Version" value={<span className="font-mono text-xs">{health?.version ?? '—'}</span>} />
            <MetaRow label="Last check" value={lastCheck ? timeAgo(lastCheck.toISOString()) : '—'} />
            <MetaRow label="Timestamp" value={health ? formatDateTime(health.timestamp) : '—'} />
          </div>
        </GlassCard>

        {/* Performance metrics */}
        <SectionCard title="API Response Time" description={`avg ${avgMs.toFixed(0)} ms (mock)`} icon={Zap} className="lg:col-span-2">
          <ChartFrame height={180}>
            <LineChart data={perfSeries} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" />
              <XAxis dataKey="t" tick={{ fontSize: 11 }} stroke="rgba(120,120,120,0.55)" />
              <YAxis tick={{ fontSize: 11 }} stroke="rgba(120,120,120,0.55)" unit="ms" />
              <Tooltip
                contentStyle={{
                  borderRadius: 12, border: '1px solid rgba(120,120,120,0.2)',
                  background: 'rgba(20,20,20,0.92)', color: '#fff', fontSize: 12,
                }}
              />
              <Line type="monotone" dataKey="ms" stroke="#10b981" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ChartFrame>
        </SectionCard>
      </div>

      {/* Service cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Uptime (30d)" value={`${uptimePct}%`} icon={Activity} accent="emerald" trend={0} trendLabel="stable" />
        <StatCard label="Request Rate" value={`${requestRate}/min`} icon={Server} accent="amber" trend={6} trendLabel="vs avg" />
        <StatCard label="DB Connections" value="3 / 20" icon={Database} accent="violet" />
        <StatCard label="Background Jobs" value="2 queued" icon={Cpu} accent="sky" />
      </div>

      {/* Service status table */}
      <SectionCard title="Service Status" icon={Server} description="Internal platform services">
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { name: 'Web App (Next.js)', status: 'operational', latency: '12 ms' },
            { name: 'Database (SQLite)', status: 'operational', latency: '4 ms' },
            { name: 'WebSocket (chat-service :3003)', status: 'operational', latency: '18 ms' },
            { name: 'AI Service (z-ai-sdk)', status: 'operational', latency: '420 ms' },
            { name: 'Plagiarism Engine', status: 'degraded', latency: '890 ms' },
            { name: 'Cert Verifier', status: 'operational', latency: '8 ms' },
          ].map((s) => {
            const op = s.status === 'operational'
            return (
              <div key={s.name} className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-3">
                <div className="flex items-center gap-2.5">
                  <span className={cn(
                    'flex h-2 w-2 rounded-full',
                    op ? 'bg-emerald-500' : 'bg-amber-500',
                  )} />
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">latency {s.latency}</p>
                  </div>
                </div>
                <Badge variant="secondary" className={cn(
                  'font-semibold uppercase',
                  op ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
                )}>
                  {s.status}
                </Badge>
              </div>
            )
          })}
        </div>
      </SectionCard>
    </>
  )
}

/* ================================================================== */
/* 8. Settings                                                         */
/* ================================================================== */
function SettingsView() {
  const [settings, setSettings] = React.useState<PlatformSetting[]>([])
  const [loading, setLoading] = React.useState(true)
  const [err, setErr] = React.useState<string | null>(null)
  const [drafts, setDrafts] = React.useState<Record<string, string>>({})
  const [savingKey, setSavingKey] = React.useState<string | null>(null)
  const [resetOpen, setResetOpen] = React.useState(false)

  const load = React.useCallback(() => {
    setLoading(true)
    setErr(null)
    adminApi.settings()
      .then((s) => {
        setSettings(s as PlatformSetting[])
        const d: Record<string, string> = {}
        for (const it of s as PlatformSetting[]) d[it.key] = it.value
        setDrafts(d)
      })
      .catch((e) => setErr(e.message ?? 'Failed to load settings'))
      .finally(() => setLoading(false))
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  const isBool = (k: string) => k.startsWith('features.')

  async function save(key: string) {
    setSavingKey(key)
    try {
      const value = drafts[key] ?? ''
      await adminApi.updateSetting(key, value)
      setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)))
      toast.success(`Saved "${key}"`, { description: `Value: ${value}` })
    } catch (e: any) {
      toast.error('Failed to save setting', { description: e?.message ?? 'Unknown error' })
    } finally {
      setSavingKey(null)
    }
  }

  async function reseed() {
    try {
      await adminApi.seedDemo()
      toast.success('Demo: re-seed requested', { description: 'Run `bun prisma/seed.ts` to actually re-seed.' })
    } catch (e: any) {
      toast.error('Re-seed failed', { description: e?.message ?? 'Unknown error' })
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="InternForge · Admin"
        title="Platform Settings"
        description="Configure feature flags and demo data."
        icon={Settings}
      />

      {err && (
        <GlassCard className="border-rose-500/40 bg-rose-500/5 p-4 text-sm text-rose-700 dark:text-rose-300">
          <AlertTriangle className="mr-2 inline h-4 w-4" /> {err}
        </GlassCard>
      )}

      {loading ? (
        <LoadingGrid count={2} />
      ) : (
        <>
          {/* Platform settings */}
          <SectionCard
            title="Platform Configuration"
            description="Editable key/value store"
            icon={Settings}
          >
            <div className="space-y-3">
              {settings.map((s) => {
                const bool = isBool(s.key)
                const checked = drafts[s.key] === 'true'
                return (
                  <div key={s.key} className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/30 p-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs text-muted-foreground">{s.key}</p>
                      <p className="text-[11px] text-muted-foreground/80">
                        Updated {s.updatedAt ? timeAgo(s.updatedAt) : '—'}
                      </p>
                    </div>
                    {bool ? (
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={checked}
                          onCheckedChange={(c) => {
                            setDrafts((p) => ({ ...p, [s.key]: String(c) }))
                          }}
                        />
                        <Label className="text-xs text-muted-foreground">
                          {checked ? 'Enabled' : 'Disabled'}
                        </Label>
                        <Button
                          size="sm"
                          onClick={() => save(s.key)}
                          disabled={savingKey === s.key || drafts[s.key] === s.value}
                        >
                          {savingKey === s.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                          Save
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Input
                          value={drafts[s.key] ?? ''}
                          onChange={(e) => setDrafts((p) => ({ ...p, [s.key]: e.target.value }))}
                          className="sm:w-64"
                        />
                        <Button
                          size="sm"
                          onClick={() => save(s.key)}
                          disabled={savingKey === s.key || drafts[s.key] === s.value}
                        >
                          {savingKey === s.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                          Save
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
              {settings.length === 0 && (
                <EmptyState icon={Settings} title="No settings" description="Settings will appear here once seeded." />
              )}
            </div>
          </SectionCard>

          {/* Feature flag highlights */}
          <SectionCard title="Feature Flags" description="Quick toggles for major platform features" icon={ShieldCheck}>
            <div className="grid gap-3 sm:grid-cols-3">
              {(['features.ai_feedback', 'features.plagiarism', 'features.blockchain_certs'] as const).map((k) => {
                const v = drafts[k] === 'true'
                const Icon = k === 'features.ai_feedback' ? Sparkles : k === 'features.plagiarism' ? ShieldAlert : Star
                return (
                  <div key={k} className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-medium">{k.replace('features.', '').replace(/_/g, ' ')}</p>
                        <p className="text-[10px] text-muted-foreground">{v ? 'On' : 'Off'}</p>
                      </div>
                    </div>
                    <Switch
                      checked={v}
                      onCheckedChange={(c) => {
                        setDrafts((p) => ({ ...p, [k]: String(c) }))
                        // autosave
                        setTimeout(() => save(k), 0)
                      }}
                    />
                  </div>
                )
              })}
            </div>
          </SectionCard>

          {/* Data & demo */}
          <SectionCard title="Data & Demo" description="Dangerous operations — handle with care" icon={Database}>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                <p className="text-sm font-medium">Re-seed demo data</p>
                <p className="mb-3 text-xs text-muted-foreground">Re-runs the seed script to refresh demo content.</p>
                <Button size="sm" variant="outline" onClick={reseed}>
                  <RefreshCw className="h-3.5 w-3.5" /> Re-seed
                </Button>
              </div>
              <div className="flex-1 rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
                <p className="text-sm font-medium text-rose-700 dark:text-rose-300">Reset platform</p>
                <p className="mb-3 text-xs text-muted-foreground">Wipe all data and start fresh. Confirm before proceeding.</p>
                <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
                  <Button size="sm" variant="destructive" onClick={() => setResetOpen(true)}>
                    <Trash2 className="h-3.5 w-3.5" /> Reset platform
                  </Button>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset entire platform?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This would permanently delete every user, internship, project, and submission. This action is irreversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          toast.success('Demo: reset queued', { description: 'Would wipe & re-seed (mock).' })
                          setResetOpen(false)
                        }}
                      >
                        Yes, reset
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </SectionCard>
        </>
      )}
    </>
  )
}
