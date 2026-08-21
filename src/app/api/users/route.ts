import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const role = searchParams.get('role') ?? undefined
  const companyOnly = searchParams.get('companyOnly') === 'true'
  const users = await db.user.findMany({
    where: {
      ...(role ? { role } : {}),
      status: 'ACTIVE',
      ...(companyOnly ? { companyMemberships: { some: {} } } : {}),
    },
    orderBy: { name: 'asc' },
    include: { companyMemberships: { include: { company: true } } },
    take: 50,
  })
  return NextResponse.json(users)
}
