import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { chatJson } from '@/lib/zai'

export async function POST(req: Request) {
  const { userId } = await req.json()

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { userSkills: { include: { skill: true } } },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const internships = await db.internship.findMany({
    where: { status: 'OPEN' },
    include: { company: true, _count: { select: { applications: true } } },
  })

  const studentSkills = user.userSkills.map((us) => ({
    name: us.skill.name,
    level: us.current,
    verified: us.verified,
  }))

  const internshipsBrief = internships.slice(0, 12).map((i) => ({
    id: i.id,
    title: i.title,
    domain: i.domain,
    skillsRequired: i.skillsRequired,
    company: i.company?.name,
  }))

  const fallback = {
    recommendations: internships.slice(0, 4).map((i, idx) => ({
      internshipId: i.id,
      score: 80 - idx * 8,
      reasons: ['Relevant domain', 'Skill overlap', 'Company growth trajectory'],
    })),
  }

  const result = await chatJson<{
    recommendations: { internshipId: string; score: number; reasons: string[] }[]
  }>(
    [
      {
        role: 'system',
        content:
          'You are a career recommendation engine matching a student to open internships. Output strict JSON: { recommendations: [{ internshipId, score (0-100), reasons (array of short strings, max 3) }] }. Pick the top 4 most relevant.',
      },
      {
        role: 'user',
        content: `Student skills: ${JSON.stringify(studentSkills)}\n\nOpen internships: ${JSON.stringify(internshipsBrief)}`,
      },
    ],
    fallback
  )

  return NextResponse.json(result)
}
