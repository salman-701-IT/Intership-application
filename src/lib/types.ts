// Domain types for the InternForge platform (mirrors Prisma models).
// These are the contracts every portal component & API route adheres to.

export type Role = 'STUDENT' | 'MENTOR' | 'COMPANY' | 'ADMIN' | 'RECRUITER'

export interface User {
  id: string
  email: string
  name: string
  role: Role
  avatarUrl?: string | null
  bio?: string | null
  title?: string | null
  location?: string | null
  phone?: string | null
  githubUrl?: string | null
  linkedinUrl?: string | null
  university?: string | null
  major?: string | null
  gradYear?: string | null
  status: string
  createdAt: string
  updatedAt: string
}

export interface Company {
  id: string
  name: string
  logoUrl?: string | null
  website?: string | null
  industry: string
  size?: string | null
  description?: string | null
  location?: string | null
  verified: boolean
  createdAt: string
}

export interface CompanyMembership {
  id: string
  userId: string
  companyId: string
  role: string
}

export interface Internship {
  id: string
  companyId: string
  company?: Company
  title: string
  description: string
  domain: string
  durationWeeks: number
  stipend?: string | null
  location?: string | null
  remote: boolean
  status: string
  slots: number
  requirements: string[]
  skillsRequired: string[]
  responsibilities: string[]
  startDate?: string | null
  endDate?: string | null
  applicationDeadline?: string | null
  createdAt: string
  // computed
  applicantsCount?: number
  matchScore?: number
  saved?: boolean
}

export type ApplicationStatus =
  | 'DRAFT' | 'SUBMITTED' | 'SCREENING' | 'INTERVIEW'
  | 'OFFERED' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN'

export interface Application {
  id: string
  internshipId: string
  internship?: Internship
  studentId: string
  student?: User
  status: ApplicationStatus
  coverLetter?: string | null
  resumeUrl?: string | null
  matchScore?: number | null
  stageNotes?: any
  appliedAt: string
  updatedAt: string
  interviews?: Interview[]
}

export interface Interview {
  id: string
  applicationId: string
  scheduledAt: string
  location?: string | null
  type: string
  notes?: string | null
  status: string
}

export interface Project {
  id: string
  internshipId?: string | null
  internship?: Internship
  title: string
  description: string
  studentId: string
  student?: User
  mentorId?: string | null
  mentor?: User
  status: string
  progress: number
  repoUrl?: string | null
  startDate?: string | null
  endDate?: string | null
  milestones?: Milestone[]
  tasks?: Task[]
  submissions?: Submission[]
  evaluations?: Evaluation[]
  certificates?: Certificate[]
}

export interface Milestone {
  id: string
  projectId: string
  title: string
  description?: string | null
  dueDate?: string | null
  status: string
  order: number
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'BLOCKED'

export interface Task {
  id: string
  projectId: string
  title: string
  description?: string | null
  status: TaskStatus
  priority: string
  assigneeId?: string | null
  assignee?: User
  dueDate?: string | null
  estimateHours?: number | null
  order: number
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface Submission {
  id: string
  projectId: string
  project?: Project
  taskId?: string | null
  task?: Task
  studentId: string
  student?: User
  title: string
  content: string
  fileUrl?: string | null
  version: number
  status: string
  plagiarismScore?: number | null
  submittedAt: string
  evaluations?: Evaluation[]
}

export interface Evaluation {
  id: string
  submissionId: string
  projectId: string
  mentorId: string
  mentor?: User
  codeQuality: number
  communication: number
  delivery: number
  learning: number
  score: number
  feedback?: string | null
  aiFeedback?: string | null
  strengths: string[]
  improvements: string[]
  createdAt: string
}

export interface Skill {
  id: string
  name: string
  category: string
  description?: string | null
}

export interface UserSkill {
  id: string
  userId: string
  skillId: string
  skill?: Skill
  baseline: number
  current: number
  verified: boolean
  evidence: any[]
  updatedAt: string
}

export interface Assessment {
  id: string
  internshipId?: string | null
  internship?: Internship
  title: string
  type: string
  description?: string | null
  questions: any[]
  maxScore: number
  dueDate?: string | null
  durationMins?: number | null
  createdAt: string
  result?: AssessmentResult | null
}

export interface AssessmentResult {
  id: string
  assessmentId: string
  userId: string
  score: number
  answers: any[]
  feedback?: string | null
  submittedAt: string
}

export interface Certificate {
  id: string
  certificateNumber: string
  userId: string
  user?: User
  internshipId?: string | null
  internship?: Internship
  projectId?: string | null
  project?: Project
  grade: string
  skills: string[]
  verificationCode: string
  qrData?: string | null
  template: string
  issuedAt: string
}

export interface DailyLog {
  id: string
  userId: string
  internshipId?: string | null
  date: string
  content: string
  tasksCompleted: string[]
  hoursSpent: number
  mood: string
  createdAt: string
}

export interface Attendance {
  id: string
  userId: string
  internshipId?: string | null
  date: string
  status: string
  checkIn?: string | null
  checkOut?: string | null
  notes?: string | null
}

export interface Feedback {
  id: string
  fromUserId: string
  fromUser?: User
  toUserId: string
  toUser?: User
  internshipId?: string | null
  rating: number
  content: string
  type: string
  createdAt: string
}

export interface Conversation {
  id: string
  type: string
  name?: string | null
  members?: (ConversationMember & { user?: User })[]
  messages?: Message[]
}

export interface ConversationMember {
  id: string
  conversationId: string
  userId: string
  joinedAt: string
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  sender?: User
  content: string
  type: string
  readBy: any[]
  createdAt: string
}

export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  read: boolean
  link?: string | null
  createdAt: string
}

export interface Announcement {
  id: string
  internshipId?: string | null
  companyId?: string | null
  title: string
  content: string
  authorId: string
  author?: User
  pinned: boolean
  createdAt: string
}

export interface OnboardingTask {
  id: string
  internshipId?: string | null
  userId?: string | null
  title: string
  description?: string | null
  type: string
  required: boolean
  status: string
  order: number
}

export interface Badge {
  id: string
  name: string
  description?: string | null
  icon?: string | null
  tier: string
}

export interface UserBadge {
  id: string
  userId: string
  badgeId: string
  badge?: Badge
  awardedAt: string
}

export interface AuditLog {
  id: string
  userId?: string | null
  user?: User | null
  action: string
  resource: string
  resourceId?: string | null
  details?: any
  ipAddress?: string | null
  severity: string
  createdAt: string
}

// Student journey stages
export const STUDENT_JOURNEY = [
  'Discover', 'Apply', 'Get Selected', 'Onboard', 'Learn',
  'Work', 'Submit', 'Receive Feedback', 'Improve', 'Get Assessed',
  'Complete Project', 'Get Evaluated', 'Earn Certificate', 'Generate Portfolio', 'Job Ready',
] as const
export type JourneyStage = typeof STUDENT_JOURNEY[number]

// API helpers
export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export interface ApiError {
  error: string
  code?: string
}
