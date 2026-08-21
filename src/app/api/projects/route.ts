import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get('studentId') ?? undefined
  const mentorId = searchParams.get('mentorId') ?? undefined

  const where: any = {}
  if (studentId) where.studentId = studentId
  if (mentorId) where.mentorId = mentorId

  const projects = await db.project.findMany({
    where,
    include: {
      student: true,
      mentor: true,
      internship: { include: { company: true } },
      milestones: { orderBy: { order: 'asc' } },
      tasks: { orderBy: { order: 'asc' } },
      _count: { select: { submissions: true, evaluations: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(projects)
}
