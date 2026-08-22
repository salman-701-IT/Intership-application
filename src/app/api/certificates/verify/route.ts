import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  if (!code) return NextResponse.json({ valid: false })
  const certificate = await db.certificate.findFirst({
    where: { verificationCode: code },
    include: { user: true, internship: { include: { company: true } }, project: true },
  })
  if (!certificate) return NextResponse.json({ valid: false })
  return NextResponse.json({ valid: true, certificate })
}
