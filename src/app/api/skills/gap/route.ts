import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')!
  const internshipId = searchParams.get('internshipId')!

  const internship = await db.internship.findUnique({ where: { id: internshipId } })
  if (!internship) return NextResponse.json({ skills: [] })

  const required: string[] = (internship.skillsRequired as string[]) ?? []
  const userSkills = await db.userSkill.findMany({
    where: { userId },
    include: { skill: true },
  })

  const skills = required.map((name) => {
    const us = userSkills.find((u) => u.skill.name === name)
    const current = us?.current ?? 0
    return { name, current, required: true, gap: Math.max(0, 75 - current) }
  })

  // Add other tracked skills (not required) for context
  for (const us of userSkills) {
    if (!skills.find((s) => s.name === us.skill.name)) {
      skills.push({ name: us.skill.name, current: us.current, required: false, gap: 0 })
    }
  }

  return NextResponse.json({ skills })
}
