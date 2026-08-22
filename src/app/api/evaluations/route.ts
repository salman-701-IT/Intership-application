import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const mentorId = searchParams.get('mentorId') ?? undefined
  const projectId = searchParams.get('projectId') ?? undefined

  const where: any = {}
  if (mentorId) where.mentorId = mentorId
  if (projectId) where.projectId = projectId

  const evaluations = await db.evaluation.findMany({
    where,
    include: { mentor: true, submission: { include: { student: true } }, project: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(evaluations)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { codeQuality, communication, delivery, learning } = body
  const score = Math.round(
    ((Number(codeQuality) || 0) + (Number(communication) || 0) + (Number(delivery) || 0) + (Number(learning) || 0)) / 4
  )
  const evaluation = await db.evaluation.create({
    data: {
      submissionId: body.submissionId,
      projectId: body.projectId,
      mentorId: body.mentorId,
      codeQuality: Number(codeQuality) || 0,
      communication: Number(communication) || 0,
      delivery: Number(delivery) || 0,
      learning: Number(learning) || 0,
      score,
      feedback: body.feedback ?? '',
      aiFeedback: body.aiFeedback ?? '',
      strengths: body.strengths ?? [],
      improvements: body.improvements ?? [],
    },
  })
  await db.submission.update({
    where: { id: body.submissionId },
    data: { status: 'APPROVED' },
  })
  return NextResponse.json(evaluation)
}
