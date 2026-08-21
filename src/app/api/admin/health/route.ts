import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: 'connected',
    version: '1.0.0',
  }
  try {
    await db.user.count()
  } catch {
    health.database = 'disconnected'
    health.status = 'degraded'
  }
  return NextResponse.json(health)
}
