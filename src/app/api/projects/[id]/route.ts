import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const project = await db.project.findUnique({
    where: { id },
    include: {
      student: true,
      mentor: true,
      internship: { include: { company: true } },
      milestones: { orderBy: { order: 'asc' } },
      tasks: { orderBy: { order: 'asc' }, include: { assignee: true } },
      submissions: { include: { evaluations: { include: { mentor: true } } }, orderBy: { submittedAt: 'desc' } },
      evaluations: { include: { mentor: true }, orderBy: { createdAt: 'desc' } },
    },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(project)
}
