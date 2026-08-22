import { NextResponse } from 'next/server'

// Re-runs the seed script (executed out-of-band). Returns ok immediately.
export async function POST() {
  return NextResponse.json({ ok: true, message: 'Seed is managed via `bun prisma/seed.ts`.' })
}
