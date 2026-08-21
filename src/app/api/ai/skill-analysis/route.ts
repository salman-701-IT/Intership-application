import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { chat } from '@/lib/zai'

export async function POST(req: Request) {
  const { userId } = await req.json()

  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      userSkills: { include: { skill: true } },
      submissions: { take: 5, orderBy: { submittedAt: 'desc' } },
      certificates: true,
      userBadges: { include: { badge: true } },
    },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const skills = user.userSkills.map((us) => ({
    name: us.skill.name,
    level: us.current,
    verified: us.verified,
    evidence: us.evidence,
  }))

  const fallbackMapped = skills.map((s) => ({
    skill: s.name,
    level: s.level >= 80 ? 'Advanced' : s.level >= 60 ? 'Intermediate' : 'Beginner',
    evidence: (s.evidence?.[0] as any)?.title ?? 'Verified internship work',
  }))

  const fallback = {
    analysis:
      'Your internship work demonstrates measurable growth, particularly in applied engineering skills. Focus on rounding out system design and strengthening evidence of impact.',
    mapped: fallbackMapped,
  }

  const text = await chat([
    {
      role: 'system',
      content:
        'You are an AI skill analyst. Map the student\'s internship work to industry-standard skills. Output strict JSON: { analysis: string (3-4 sentences), mapped: [{ skill, level, evidence }] }. level in [Beginner, Intermediate, Advanced].',
    },
    {
      role: 'user',
      content: `Student: ${user.name}\nSkills: ${JSON.stringify(skills)}\nSubmissions: ${user.submissions.map((s) => s.title).join(', ')}\nCertificates: ${user.certificates.length}\nBadges: ${user.userBadges.map((b) => b.badge.name).join(', ')}`,
    },
  ])

  if (!text) return NextResponse.json(fallback)

  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return NextResponse.json({ analysis: text.slice(0, 500), mapped: fallbackMapped })
  try {
    return NextResponse.json(JSON.parse(match[0]))
  } catch {
    return NextResponse.json(fallback)
  }
}
