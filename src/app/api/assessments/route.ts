import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const internshipId = searchParams.get('internshipId') ?? undefined
  const userId = searchParams.get('userId') ?? undefined

  const assessments = await db.assessment.findMany({
    where: internshipId ? { internshipId } : {},
    include: {
      internship: true,
      results: userId ? { where: { userId } } : false,
    },
    orderBy: { createdAt: 'desc' },
  })

  const data = assessments.map((a) => ({
    ...a,
    result: a.results?.[0] ?? null,
  }))
  return NextResponse.json(data)
}
