import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get('studentId') ?? undefined
  const projectId = searchParams.get('projectId') ?? undefined
  const status = searchParams.get('status') ?? undefined

  const where: any = {}
  if (studentId) where.studentId = studentId
  if (projectId) where.projectId = projectId
  if (status) where.status = status

  const submissions = await db.submission.findMany({
    where,
    include: {
      student: true,
      project: true,
      task: true,
      evaluations: { include: { mentor: true } },
    },
    orderBy: { submittedAt: 'desc' },
  })
  return NextResponse.json(submissions)
}

export async function POST(req: Request) {
  const body = await req.json()
  const student = await db.user.findFirst({ where: { role: 'STUDENT' }, orderBy: { createdAt: 'asc' } })
  if (!student) return NextResponse.json({ error: 'No student' }, { status: 400 })

  const count = await db.submission.count({ where: { projectId: body.projectId } })
  const submission = await db.submission.create({
    data: {
      projectId: body.projectId,
      taskId: body.taskId ?? null,
      studentId: body.studentId ?? student.id,
      title: body.title,
      content: body.content,
      status: 'SUBMITTED',
      version: count + 1,
      plagiarismScore: Math.random() * 0.15,
    },
    include: { project: true },
  })
  return NextResponse.json(submission)
}
