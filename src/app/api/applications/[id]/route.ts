import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const updated = await db.application.update({
    where: { id },
    data: { status: body.status },
    include: { internship: { include: { company: true } }, student: true },
  })

  await db.auditLog.create({
    data: {
      userId: updated.studentId,
      action: 'UPDATE',
      resource: 'Application',
      resourceId: id,
      severity: 'INFO',
      details: { status: body.status },
    },
  })

  return NextResponse.json(updated)
}
