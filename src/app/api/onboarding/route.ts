import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const internshipId = searchParams.get('internshipId')
  const userId = searchParams.get('userId')
  const where: any = {}
  if (internshipId) where.internshipId = internshipId
  if (userId) where.userId = userId
  const tasks = await db.onboardingTask.findMany({
    where,
    orderBy: { order: 'asc' },
  })
  return NextResponse.json(tasks)
}
