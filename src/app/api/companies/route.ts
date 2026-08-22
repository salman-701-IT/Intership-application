import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const companies = await db.company.findMany({
    orderBy: { name: 'asc' },
    include: { internships: { select: { id: true, status: true } } },
  })
  return NextResponse.json(companies)
}
