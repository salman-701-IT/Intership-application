import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { Role } from '@/lib/types'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const role = (searchParams.get('role') ?? 'STUDENT') as Role
  const userId = searchParams.get('userId') ?? undefined

  const totalUsers = await db.user.count()
  const totalInternships = await db.internship.count()
  const totalApplications = await db.application.count()
  const totalProjects = await db.project.count()
  const totalSubmissions = await db.submission.count()
  const totalCertificates = await db.certificate.count()

  const result: any = { totals: { totalUsers, totalInternships, totalApplications, totalProjects, totalSubmissions, totalCertificates } }

  if (role === 'STUDENT' && userId) {
    const applications = await db.application.count({ where: { studentId: userId } })
    const accepted = await db.application.count({ where: { studentId: userId, status: 'ACCEPTED' } })
    const projects = await db.project.findMany({
      where: { studentId: userId },
      include: { _count: { select: { submissions: true, evaluations: true } } },
    })
    const submissions = projects.reduce((s, p) => s + (p._count?.submissions ?? 0), 0)
    const evaluations = projects.reduce((s, p) => s + (p._count?.evaluations ?? 0), 0)
    const skills = await db.userSkill.findMany({ where: { userId }, include: { skill: true } })
    const avgSkill = skills.length ? Math.round(skills.reduce((s, x) => s + x.current, 0) / skills.length) : 0
    const skillGrowth = skills.length
      ? Math.round(skills.reduce((s, x) => s + (x.current - x.baseline), 0) / skills.length)
      : 0
    const certificates = await db.certificate.count({ where: { userId } })
    const badges = await db.userBadge.count({ where: { userId } })
    const logs = await db.dailyLog.count({ where: { userId } })
    const attendance = await db.attendance.findMany({ where: { userId } })
    const present = attendance.filter((a) => a.status === 'PRESENT' || a.status === 'REMOTE').length
    const attendanceRate = attendance.length ? Math.round((present / attendance.length) * 100) : 100

    result.student = {
      applications, accepted, projects: projects.length, submissions, evaluations,
      avgSkill, skillGrowth, certificates, badges, logs, attendanceRate,
      skillCount: skills.length,
    }

    // skill trend time-series (mock weekly)
    result.skillTrend = Array.from({ length: 8 }).map((_, i) => ({
      week: `W${i + 1}`,
      value: Math.min(100, Math.round(avgSkill * 0.55 + (avgSkill * 0.45 * (i + 1)) / 8)),
    }))
  }

  if (role === 'MENTOR' && userId) {
    const mentees = await db.project.findMany({
      where: { mentorId: userId },
      select: { studentId: true },
      distinct: ['studentId'],
    })
    const projects = await db.project.count({ where: { mentorId: userId } })
    const pendingReviews = await db.submission.count({
      where: { project: { mentorId: userId }, status: { in: ['SUBMITTED', 'REVIEWED'] } },
    })
    const evaluations = await db.evaluation.count({ where: { mentorId: userId } })
    const avgScoreAgg = await db.evaluation.aggregate({ where: { mentorId: userId }, _avg: { score: true } })
    result.mentor = {
      mentees: mentees.length,
      projects,
      pendingReviews,
      evaluations,
      avgScore: Math.round(avgScoreAgg._avg?.score ?? 0),
    }
    // mentor workload trend
    result.workload = Array.from({ length: 6 }).map((_, i) => ({
      week: `W${i + 1}`,
      reviews: Math.max(1, Math.round(evaluations / 6 + Math.random() * 2)),
    }))
  }

  if (role === 'COMPANY' || role === 'RECRUITER') {
    const totalInternshipsAll = await db.internship.count()
    const totalApps = await db.application.count()
    const accepted = await db.application.count({ where: { status: 'ACCEPTED' } })
    const offered = await db.application.count({ where: { status: 'OFFERED' } })
    const inProgress = await db.project.count({ where: { status: 'IN_PROGRESS' } })
    result.company = {
      internships: totalInternshipsAll,
      applications: totalApps,
      accepted,
      offered,
      activeProjects: inProgress,
      conversionRate: totalApps ? Math.round((accepted / totalApps) * 100) : 0,
    }
    // applicant funnel
    const funnel = [
      { stage: 'Submitted', count: await db.application.count({ where: { status: 'SUBMITTED' } }) },
      { stage: 'Screening', count: await db.application.count({ where: { status: 'SCREENING' } }) },
      { stage: 'Interview', count: await db.application.count({ where: { status: 'INTERVIEW' } }) },
      { stage: 'Offered', count: await db.application.count({ where: { status: 'OFFERED' } }) },
      { stage: 'Accepted', count: await db.application.count({ where: { status: 'ACCEPTED' } }) },
    ]
    result.funnel = funnel
  }

  if (role === 'ADMIN') {
    const byRole = await db.user.groupBy({ by: ['role'], _count: { _all: true } })
    result.admin = {
      byRole: byRole.map((b) => ({ role: b.role, count: b._count?._all ?? 0 })),
      auditEvents: await db.auditLog.count(),
      flagged: await db.submission.count({ where: { plagiarismScore: { gt: 0.25 } } }),
    }
    // signups trend (mock)
    result.signups = Array.from({ length: 6 }).map((_, i) => ({
      month: ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
      value: Math.round(20 + i * 12 + Math.random() * 10),
    }))
  }

  return NextResponse.json(result)
}
