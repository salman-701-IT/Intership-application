import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const updated = await db.notification.update({
    where: { id },
    data: { read: true },
  })
  return NextResponse.json(updated)
}
