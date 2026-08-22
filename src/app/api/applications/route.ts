import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get('studentId') ?? undefined
  const internshipId = searchParams.get('internshipId') ?? undefined
  const companyId = searchParams.get('companyId') ?? undefined
  const status = searchParams.get('status') ?? undefined

  const where: any = {}
  if (studentId) where.studentId = studentId
  if (internshipId) where.internshipId = internshipId
  if (status) where.status = status
  if (companyId) where.internship = { companyId }

  const applications = await db.application.findMany({
    where,
    include: {
      internship: { include: { company: true } },
      student: true,
      interviews: true,
    },
    orderBy: { appliedAt: 'desc' },
  })

  return NextResponse.json(applications)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { internshipId, coverLetter } = body
  // Use the first student as the demo applicant
  const student = await db.user.findFirst({ where: { role: 'STUDENT' }, orderBy: { createdAt: 'asc' } })
  if (!student) return NextResponse.json({ error: 'No student' }, { status: 400 })

  const existing = await db.application.findFirst({
    where: { internshipId, studentId: student.id },
  })
  if (existing) return NextResponse.json(existing)

  const application = await db.application.create({
    data: {
      internshipId,
      studentId: student.id,
      coverLetter: coverLetter ?? '',
      status: 'SUBMITTED',
      matchScore: Math.floor(60 + Math.random() * 35),
    },
    include: { internship: { include: { company: true } } },
  })
  return NextResponse.json(application)
}
