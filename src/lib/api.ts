import type {
  User, Company, Internship, Application, Project, Task, Submission,
  Evaluation, Skill, UserSkill, Assessment, AssessmentResult, Certificate,
  DailyLog, Attendance, Feedback, Conversation, Message, Notification,
  Announcement, OnboardingTask, Badge, UserBadge, AuditLog, Role,
} from './types'

const BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => res.statusText)
    throw new Error(`API ${res.status}: ${txt}`)
  }
  return res.json() as Promise<T>
}

// ---------------- Users ----------------
export const usersApi = {
  list: (params: Record<string, string | number> = {}) =>
    request<User[]>(`/users?${new URLSearchParams(params as any)}`),
  me: (role: Role, userId?: string) =>
    request<User & { company?: Company }>(`/users/me?role=${role}${userId ? `&userId=${userId}` : ''}`),
}

// ---------------- Internships ----------------
export const internshipsApi = {
  list: (params: Record<string, string | number | boolean> = {}) =>
    request<Internship[]>(`/internships?${new URLSearchParams(params as any)}`),
  get: (id: string) => request<Internship>(`/internships/${id}`),
  save: (id: string) => request<Internship>(`/internships/${id}/save`, { method: 'POST' }),
}

// ---------------- Applications ----------------
export const applicationsApi = {
  list: (params: Record<string, string> = {}) =>
    request<Application[]>(`/applications?${new URLSearchParams(params)}`),
  apply: (body: { internshipId: string; coverLetter?: string }) =>
    request<Application>(`/applications`, { method: 'POST', body: JSON.stringify(body) }),
  updateStatus: (id: string, status: string) =>
    request<Application>(`/applications/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
}

// ---------------- Projects ----------------
export const projectsApi = {
  list: (params: Record<string, string> = {}) =>
    request<Project[]>(`/projects?${new URLSearchParams(params)}`),
  get: (id: string) => request<Project>(`/projects/${id}`),
}

// ---------------- Tasks (kanban) ----------------
export const tasksApi = {
  list: (params: Record<string, string> = {}) =>
    request<Task[]>(`/tasks?${new URLSearchParams(params)}`),
  move: (id: string, status: string, order?: number) =>
    request<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ status, order }) }),
  create: (body: Partial<Task> & { projectId: string; title: string }) =>
    request<Task>(`/tasks`, { method: 'POST', body: JSON.stringify(body) }),
}

// ---------------- Submissions ----------------
export const submissionsApi = {
  list: (params: Record<string, string> = {}) =>
    request<Submission[]>(`/submissions?${new URLSearchParams(params)}`),
  create: (body: { projectId: string; title: string; content: string; taskId?: string }) =>
    request<Submission>(`/submissions`, { method: 'POST', body: JSON.stringify(body) }),
  plagiarism: (id: string) =>
    request<{ score: number }>(`/submissions/${id}/plagiarism`, { method: 'POST' }),
}

// ---------------- Evaluations ----------------
export const evaluationsApi = {
  list: (params: Record<string, string> = {}) =>
    request<Evaluation[]>(`/evaluations?${new URLSearchParams(params)}`),
  create: (body: Partial<Evaluation> & { submissionId: string; projectId: string; mentorId: string }) =>
    request<Evaluation>(`/evaluations`, { method: 'POST', body: JSON.stringify(body) }),
}

// ---------------- Skills ----------------
export const skillsApi = {
  list: () => request<Skill[]>(`/skills`),
  forUser: (userId: string) => request<UserSkill[]>(`/skills?userId=${userId}`),
  gap: (userId: string, internshipId: string) =>
    request<{ skills: { name: string; current: number; required: boolean; gap: number }[] }>(`/skills/gap?userId=${userId}&internshipId=${internshipId}`),
}

// ---------------- Assessments ----------------
export const assessmentsApi = {
  list: (params: Record<string, string> = {}) =>
    request<Assessment[]>(`/assessments?${new URLSearchParams(params)}`),
  submit: (id: string, body: { answers: any[] }) =>
    request<AssessmentResult>(`/assessments/${id}/submit`, { method: 'POST', body: JSON.stringify(body) }),
}

// ---------------- Certificates ----------------
export const certificatesApi = {
  list: (params: Record<string, string> = {}) =>
    request<Certificate[]>(`/certificates?${new URLSearchParams(params)}`),
  generate: (body: { userId: string; projectId: string; internshipId?: string }) =>
    request<Certificate>(`/certificates`, { method: 'POST', body: JSON.stringify(body) }),
  verify: (code: string) =>
    request<{ valid: boolean; certificate?: Certificate }>(`/certificates/verify?code=${code}`),
}

// ---------------- Daily logs ----------------
export const logsApi = {
  list: (params: Record<string, string> = {}) =>
    request<DailyLog[]>(`/logs?${new URLSearchParams(params)}`),
  upsert: (body: { userId: string; internshipId?: string; content: string; hoursSpent?: number; mood?: string }) =>
    request<DailyLog>(`/logs`, { method: 'POST', body: JSON.stringify(body) }),
}

// ---------------- Attendance ----------------
export const attendanceApi = {
  list: (params: Record<string, string> = {}) =>
    request<Attendance[]>(`/attendance?${new URLSearchParams(params)}`),
}

// ---------------- Notifications ----------------
export const notificationsApi = {
  list: (userId: string) => request<Notification[]>(`/notifications?userId=${userId}`),
  markRead: (id: string) =>
    request<Notification>(`/notifications/${id}`, { method: 'PATCH', body: JSON.stringify({ read: true }) }),
}

// ---------------- Messages ----------------
export const messagesApi = {
  conversations: (userId: string) => request<Conversation[]>(`/messages?userId=${userId}`),
  send: (conversationId: string, senderId: string, content: string) =>
    request<Message>(`/messages`, { method: 'POST', body: JSON.stringify({ conversationId, senderId, content }) }),
}

// ---------------- Announcements ----------------
export const announcementsApi = {
  list: (params: Record<string, string> = {}) =>
    request<Announcement[]>(`/announcements?${new URLSearchParams(params)}`),
}

// ---------------- Onboarding ----------------
export const onboardingApi = {
  list: (params: Record<string, string> = {}) =>
    request<OnboardingTask[]>(`/onboarding?${new URLSearchParams(params)}`),
  update: (id: string, status: string) =>
    request<OnboardingTask>(`/onboarding/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
}

// ---------------- Badges ----------------
export const badgesApi = {
  forUser: (userId: string) => request<UserBadge[]>(`/badges?userId=${userId}`),
}

// ---------------- Feedback ----------------
export const feedbackApi = {
  list: (params: Record<string, string> = {}) =>
    request<Feedback[]>(`/feedback?${new URLSearchParams(params)}`),
  create: (body: { fromUserId: string; toUserId: string; internshipId?: string; rating: number; content: string; type?: string }) =>
    request<Feedback>(`/feedback`, { method: 'POST', body: JSON.stringify(body) }),
}

// ---------------- Companies ----------------
export const companiesApi = {
  list: () => request<Company[]>(`/companies`),
}

// ---------------- Analytics ----------------
export const analyticsApi = {
  overview: (role: Role, userId?: string) =>
    request<any>(`/analytics/overview?role=${role}${userId ? `&userId=${userId}` : ''}`),
}

// ---------------- Admin ----------------
export const adminApi = {
  auditLogs: (params: Record<string, string> = {}) =>
    request<AuditLog[]>(`/admin/audit?${new URLSearchParams(params)}`),
  settings: () => request<{ key: string; value: string }[]>(`/admin/settings`),
  updateSetting: (key: string, value: string) =>
    request<{ key: string; value: string }>(`/admin/settings`, { method: 'PATCH', body: JSON.stringify({ key, value }) }),
  seedDemo: () => request<{ ok: boolean }>(`/admin/seed`, { method: 'POST' }),
}

// ---------------- AI ----------------
export const aiApi = {
  feedback: (body: { submissionId: string }) =>
    request<{ feedback: string; strengths: string[]; improvements: string[]; score: number }>(`/ai/feedback`, { method: 'POST', body: JSON.stringify(body) }),
  recommend: (body: { userId: string }) =>
    request<{ recommendations: { internshipId: string; score: number; reasons: string[] }[] }>(`/ai/recommend`, { method: 'POST', body: JSON.stringify(body) }),
  skillAnalysis: (body: { userId: string }) =>
    request<{ analysis: string; mapped: { skill: string; level: string; evidence: string }[] }>(`/ai/skill-analysis`, { method: 'POST', body: JSON.stringify(body) }),
  chat: (body: { message: string; context?: string }) =>
    request<{ reply: string }>(`/ai/chat`, { method: 'POST', body: JSON.stringify(body) }),
}
