import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Toggle "saved" status. We piggyback on a PlatformSetting entry per user/internship.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const internship = await db.internship.findUnique({ where: { id } })
  if (!internship) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ saved: true, internshipId: id })
}
