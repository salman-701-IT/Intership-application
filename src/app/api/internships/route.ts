import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const domain = searchParams.get('domain') ?? undefined
  const remote = searchParams.get('remote')
  const status = searchParams.get('status') ?? 'OPEN'
  const q = searchParams.get('q') ?? undefined
  const companyId = searchParams.get('companyId') ?? undefined

  const internships = await db.internship.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(domain ? { domain } : {}),
      ...(remote !== null && remote !== undefined ? { remote: remote === 'true' } : {}),
      ...(companyId ? { companyId } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { description: { contains: q } },
            ],
          }
        : {}),
    },
    include: {
      company: true,
      _count: { select: { applications: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const data = internships.map((i) => ({
    ...i,
    applicantsCount: i._count?.applications ?? 0,
  }))

  return NextResponse.json(data)
}
