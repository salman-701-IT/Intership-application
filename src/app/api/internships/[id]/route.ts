import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const internship = await db.internship.findUnique({
    where: { id },
    include: {
      company: true,
      assessments: true,
      _count: { select: { applications: true } },
    },
  })
  if (!internship) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ...internship, applicantsCount: internship._count?.applications ?? 0 })
}
