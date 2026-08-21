import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const toUserId = searchParams.get('toUserId')
  const fromUserId = searchParams.get('fromUserId')
  const where: any = {}
  if (toUserId) where.toUserId = toUserId
  if (fromUserId) where.fromUserId = fromUserId
  const feedback = await db.feedback.findMany({
    where,
    include: { fromUser: true, toUser: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(feedback)
}

export async function POST(req: Request) {
  const body = await req.json()
  const feedback = await db.feedback.create({
    data: {
      fromUserId: body.fromUserId,
      toUserId: body.toUserId,
      internshipId: body.internshipId ?? null,
      rating: body.rating ?? 5,
      content: body.content,
      type: body.type ?? 'WEEKLY',
    },
    include: { fromUser: true, toUser: true },
  })
  return NextResponse.json(feedback)
}
