export function cn(...inputs: ClassValue[]) {
  return inputs.filter(Boolean).join(' ')
}

export function formatDate(d: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', opts).format(date)
}

export function formatDateTime(d: string | Date | null | undefined) {
  return formatDate(d, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function timeAgo(d: string | Date | null | undefined) {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  const diff = Date.now() - date.getTime()
  const sec = Math.round(diff / 1000)
  const min = Math.round(sec / 60)
  const hr = Math.round(min / 60)
  const day = Math.round(hr / 24)
  if (sec < 60) return 'just now'
  if (min < 60) return `${min}m ago`
  if (hr < 24) return `${hr}h ago`
  if (day < 7) return `${day}d ago`
  return formatDate(date)
}

export function daysUntil(d: string | Date | null | undefined) {
  if (!d) return null
  const date = typeof d === 'string' ? new Date(d) : d
  const diff = date.getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function initials(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat('en-US').format(n)
}

export function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n))
}

export function statusColor(status: string): string {
  const s = status.toUpperCase()
  const map: Record<string, string> = {
    // applications
    DRAFT: 'bg-muted text-muted-foreground',
    SUBMITTED: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    SCREENING: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
    INTERVIEW: 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300',
    OFFERED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    ACCEPTED: 'bg-emerald-600 text-white',
    REJECTED: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300',
    WITHDRAWN: 'bg-muted text-muted-foreground',
    // tasks
    TODO: 'bg-muted text-muted-foreground',
    IN_PROGRESS: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
    REVIEW: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    DONE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    BLOCKED: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300',
    // internships
    OPEN: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    CLOSED: 'bg-muted text-muted-foreground',
    ARCHIVED: 'bg-muted text-muted-foreground',
    // priority
    LOW: 'bg-muted text-muted-foreground',
    MEDIUM: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
    HIGH: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    URGENT: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300',
    // severity
    INFO: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
    WARN: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    ERROR: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300',
    CRITICAL: 'bg-rose-600 text-white',
    // attendance
    PRESENT: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    ABSENT: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300',
    LATE: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    LEAVE: 'bg-muted text-muted-foreground',
    REMOTE: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
  }
  return map[s] ?? 'bg-muted text-muted-foreground'
}

export function scoreColor(score: number): string {
  if (score >= 85) return 'text-emerald-600 dark:text-emerald-400'
  if (score >= 70) return 'text-sky-600 dark:text-sky-400'
  if (score >= 50) return 'text-amber-600 dark:text-amber-400'
  return 'text-rose-600 dark:text-rose-400'
}

export function gradeColor(grade: string): string {
  if (grade.startsWith('A')) return 'text-emerald-600 dark:text-emerald-400'
  if (grade.startsWith('B')) return 'text-sky-600 dark:text-sky-400'
  if (grade.startsWith('C')) return 'text-amber-600 dark:text-amber-400'
  return 'text-rose-600 dark:text-rose-400'
}

export function gradeToColor(grade: string) {
  if (grade.startsWith('A')) return 'emerald'
  if (grade.startsWith('B')) return 'sky'
  if (grade.startsWith('C')) return 'amber'
  return 'rose'
}
