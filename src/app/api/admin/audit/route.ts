import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const severity = searchParams.get('severity')
  const logs = await db.auditLog.findMany({
    where: severity ? { severity } : {},
    include: { user: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return NextResponse.json(logs)
}
