import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { chatJson } from '@/lib/zai'

export async function POST(req: Request) {
  const { submissionId } = await req.json()
  const submission = await db.submission.findUnique({
    where: { id: submissionId },
    include: { project: true, student: true, task: true },
  })
  if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const fallback = {
    feedback: 'Solid submission with clear structure and readable code. Address edge cases and add regression tests before merging.',
    strengths: ['Readable structure', 'Reasonable naming'],
    improvements: ['Cover edge cases', 'Add regression tests', 'Extract magic numbers'],
    score: 80,
  }

  const result = await chatJson<{
    feedback: string
    strengths: string[]
    improvements: string[]
    score: number
  }>(
    [
      {
        role: 'system',
        content:
          'You are a senior engineering mentor reviewing an intern submission. Output strict JSON with keys: feedback (string, 2-3 sentences), strengths (array of strings), improvements (array of strings), score (integer 0-100). Be specific, kind, and actionable.',
      },
      {
        role: 'user',
        content: `Project: ${submission.project?.title}\nTask: ${submission.task?.title ?? 'N/A'}\nSubmission title: ${submission.title}\nContent:\n${submission.content.slice(0, 3000)}`,
      },
    ],
    fallback
  )

  return NextResponse.json(result)
}
