import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { Role } from '@/lib/types'

// Pick the most "interesting" demo user for a role (e.g. a mentor with assigned
// projects, a student with an active project) so the demo experience is rich.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const role = (searchParams.get('role') ?? 'STUDENT') as Role
  const userId = searchParams.get('userId') ?? undefined

  const baseInclude = {
    companyMemberships: { include: { company: true } },
    userSkills: { include: { skill: true } },
    userBadges: { include: { badge: true } },
  }

  let where: any = userId ? { id: userId, role } : { role, status: 'ACTIVE' }
  let orderBy: any = { createdAt: 'asc' }

  if (!userId) {
    if (role === 'MENTOR') {
      orderBy = { mentoredProjects: { _count: 'desc' } }
    } else if (role === 'STUDENT') {
      orderBy = { enrolledProjects: { _count: 'desc' } }
    } else if (role === 'COMPANY' || role === 'RECRUITER') {
      where = { role, status: 'ACTIVE', companyMemberships: { some: {} } }
    }
  }

  let user = await db.user.findFirst({ where, include: baseInclude, orderBy })

  // Fallback: if the smart query returns nothing, fall back to any active user of the role
  if (!user) {
    user = await db.user.findFirst({
      where: userId ? { id: userId, role } : { role, status: 'ACTIVE' },
      include: baseInclude,
      orderBy: { createdAt: 'asc' },
    })
  }

  if (!user) {
    return NextResponse.json({ error: 'No demo user for role' }, { status: 404 })
  }

  return NextResponse.json({
    ...user,
    company: user.companyMemberships?.[0]?.company ?? null,
  })
}
