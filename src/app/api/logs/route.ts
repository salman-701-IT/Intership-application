import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')!
  const logs = await db.dailyLog.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: 30,
  })
  return NextResponse.json(logs)
}

export async function POST(req: Request) {
  const body = await req.json()
  const date = new Date(body.date ?? Date.now())
  date.setHours(0, 0, 0, 0)
  const log = await db.dailyLog.upsert({
    where: {
      userId_internshipId_date: {
        userId: body.userId,
        internshipId: body.internshipId ?? 'none',
        date,
      },
    },
    update: {
      content: body.content,
      hoursSpent: body.hoursSpent ?? 0,
      mood: body.mood ?? 'GOOD',
      tasksCompleted: body.tasksCompleted ?? [],
    },
    create: {
      userId: body.userId,
      internshipId: body.internshipId ?? null,
      date,
      content: body.content,
      hoursSpent: body.hoursSpent ?? 0,
      mood: body.mood ?? 'GOOD',
      tasksCompleted: body.tasksCompleted ?? [],
    },
  })
  return NextResponse.json(log)
}
