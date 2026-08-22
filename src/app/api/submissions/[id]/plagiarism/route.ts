import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Heuristic plagiarism "detection": re-score the submission deterministically.
// Real deployment would call an embedding/external service.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sub = await db.submission.findUnique({ where: { id } })
  if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Deterministic pseudo-score from content length & keyword repetition
  const text = sub.content ?? ''
  const words = text.split(/\s+/).filter(Boolean)
  const repeats = words.length - new Set(words.map((w) => w.toLowerCase())).size
  const ratio = words.length ? repeats / words.length : 0
  const score = Math.min(0.95, Math.max(0.02, ratio * 1.4 + (text.includes('TODO') ? 0.1 : 0)))

  const updated = await db.submission.update({
    where: { id },
    data: { plagiarismScore: score, status: 'REVIEWED' },
  })
  return NextResponse.json({ score, submission: updated })
}
