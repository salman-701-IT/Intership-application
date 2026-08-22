import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const updated = await db.task.update({
    where: { id },
    data: {
      ...(body.status ? { status: body.status } : {}),
      ...(body.order !== undefined ? { order: body.order } : {}),
      ...(body.priority ? { priority: body.priority } : {}),
      ...(body.assigneeId !== undefined ? { assigneeId: body.assigneeId } : {}),
    },
  })
  return NextResponse.json(updated)
}
