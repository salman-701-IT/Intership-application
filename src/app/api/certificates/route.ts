import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const certificates = await db.certificate.findMany({
    where: userId ? { userId } : {},
    include: { user: true, internship: { include: { company: true } }, project: true },
    orderBy: { issuedAt: 'desc' },
  })
  return NextResponse.json(certificates)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { userId, projectId, internshipId } = body
  const count = await db.certificate.count()
  const number = `IF-CERT-2025-${String(count + 1).padStart(4, '0')}`
  const code = `IF-VERIFY-${Math.random().toString(36).slice(2, 8).toUpperCase()}`

  // Compute grade from project evaluations
  const evaluations = await db.evaluation.findMany({ where: { projectId } })
  const avg = evaluations.length
    ? evaluations.reduce((s, e) => s + e.score, 0) / evaluations.length
    : 85
  const grade = avg >= 90 ? 'A+' : avg >= 80 ? 'A' : avg >= 70 ? 'B+' : avg >= 60 ? 'B' : 'C'

  const project = await db.project.findUnique({ where: { id: projectId } })
  const skills: string[] = project ? [project.title.split(' ')[0]] : ['Verified']

  const certificate = await db.certificate.create({
    data: {
      certificateNumber: number,
      userId,
      internshipId: internshipId ?? null,
      projectId,
      grade,
      skills,
      verificationCode: code,
      qrData: `https://internforge.io/verify/${code}`,
      template: 'emerald',
    },
    include: { user: true, internship: { include: { company: true } }, project: true },
  })
  return NextResponse.json(certificate)
}
