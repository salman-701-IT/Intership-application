import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const internshipId = searchParams.get('internshipId')
  const announcements = await db.announcement.findMany({
    where: internshipId ? { internshipId } : {},
    include: { author: true },
    orderBy: { pinned: 'desc' },
  })
  return NextResponse.json(announcements)
}
