import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId') ?? undefined
  const assigneeId = searchParams.get('assigneeId') ?? undefined

  const where: any = {}
  if (projectId) where.projectId = projectId
  if (assigneeId) where.assigneeId = assigneeId

  const tasks = await db.task.findMany({
    where,
    include: { assignee: true, project: true },
    orderBy: { order: 'asc' },
  })
  return NextResponse.json(tasks)
}

export async function POST(req: Request) {
  const body = await req.json()
  const count = await db.task.count({ where: { projectId: body.projectId } })
  const task = await db.task.create({
    data: {
      projectId: body.projectId,
      title: body.title,
      description: body.description ?? '',
      status: body.status ?? 'TODO',
      priority: body.priority ?? 'MEDIUM',
      assigneeId: body.assigneeId ?? null,
      dueDate: body.dueDate ?? null,
      estimateHours: body.estimateHours ?? null,
      order: count,
      tags: body.tags ?? [],
    },
  })
  return NextResponse.json(task)
}
