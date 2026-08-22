import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const updated = await db.onboardingTask.update({
    where: { id },
    data: { status: body.status },
  })
  return NextResponse.json(updated)
}
