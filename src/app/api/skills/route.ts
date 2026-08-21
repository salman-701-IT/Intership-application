import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const where = userId ? { userSkills: { some: { userId } } } : {}
  const skills = await db.skill.findMany({
    where,
    orderBy: { category: 'asc' },
    include: { userSkills: userId ? { where: { userId } } : false },
  })
  return NextResponse.json(skills)
}
