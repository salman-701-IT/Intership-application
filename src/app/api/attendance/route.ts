import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')!
  const records = await db.attendance.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: 30,
  })
  return NextResponse.json(records)
}
