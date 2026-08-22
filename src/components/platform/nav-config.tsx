import {
  Compass, FileText, LayoutDashboard, FolderGit2, KanbanSquare,
  Sparkles, ClipboardCheck, Send, Award, Globe2, BookOpen, MessagesSquare,
  Users, CheckCircle2, Star, CalendarCheck, BarChart3, Megaphone,
  Building2, UserCheck, TrendingUp, ShieldCheck, Server, Settings, ScrollText, HeartPulse,
} from 'lucide-react'
import type { Role } from '@/lib/types'

export interface NavItem {
  id: string
  label: string
  icon: any
  badge?: string
}

export const NAV: Record<Role, NavItem[]> = {
  STUDENT: [
    { id: 'discover', label: 'Discover', icon: Compass },
    { id: 'applications', label: 'Applications', icon: FileText },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'project', label: 'Project Workspace', icon: FolderGit2 },
    { id: 'kanban', label: 'Task Board', icon: KanbanSquare },
    { id: 'skills', label: 'Skills', icon: Sparkles },
    { id: 'assessments', label: 'Assessments', icon: ClipboardCheck },
    { id: 'submissions', label: 'Submissions', icon: Send },
    { id: 'certificates', label: 'Certificates', icon: Award },
    { id: 'portfolio', label: 'Portfolio', icon: Globe2 },
    { id: 'logs', label: 'Daily Logs', icon: BookOpen },
    { id: 'chat', label: 'Messages', icon: MessagesSquare },
  ],
  MENTOR: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'interns', label: 'My Interns', icon: Users },
    { id: 'reviews', label: 'Submissions to Review', icon: CheckCircle2 },
    { id: 'evaluation', label: 'Evaluation', icon: Star },
    { id: 'feedback', label: 'Feedback', icon: MessagesSquare },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
  ],
  COMPANY: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'internships', label: 'Internships', icon: Building2 },
    { id: 'applicants', label: 'Applicant Pipeline', icon: UserCheck },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'portfolios', label: 'Portfolios', icon: Globe2 },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
  ],
  RECRUITER: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'internships', label: 'Internships', icon: Building2 },
    { id: 'applicants', label: 'Applicant Pipeline', icon: UserCheck },
    { id: 'portfolios', label: 'Talent Pool', icon: Globe2 },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ],
  ADMIN: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'programs', label: 'Programs', icon: Building2 },
    { id: 'audit', label: 'Audit Logs', icon: ScrollText },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'security', label: 'Security', icon: ShieldCheck },
    { id: 'health', label: 'System Health', icon: HeartPulse },
    { id: 'settings', label: 'Settings', icon: Settings },
  ],
}
