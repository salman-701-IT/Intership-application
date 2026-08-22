import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const userId = body.userId as string | undefined
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const assessment = await db.assessment.findUnique({ where: { id } })
  if (!assessment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Score: count correct answers out of total, scale to maxScore
  const questions = (assessment.questions as any[]) ?? []
  const answers = (body.answers as any[]) ?? []
  let correct = 0
  for (const q of questions) {
    const a = answers.find((x) => x.id === q.id)
    if (a && a.selected === q.answer) correct++
  }
  const ratio = questions.length ? correct / questions.length : Math.min(1, answers.length / 5)
  const score = Math.round(ratio * assessment.maxScore)

  const existing = await db.assessmentResult.findUnique({
    where: { assessmentId_userId: { assessmentId: id, userId } },
  })

  const result = existing
    ? await db.assessmentResult.update({
        where: { id: existing.id },
        data: { score, answers, feedback: score >= 80 ? 'Strong work.' : 'Review fundamentals.' },
      })
    : await db.assessmentResult.create({
        data: { assessmentId: id, userId, score, answers, feedback: score >= 80 ? 'Strong work.' : 'Review fundamentals.' },
      })

  return NextResponse.json(result)
}
