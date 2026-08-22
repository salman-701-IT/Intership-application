import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const settings = await db.platformSetting.findMany()
  return NextResponse.json(settings)
}

export async function PATCH(req: Request) {
  const body = await req.json()
  const setting = await db.platformSetting.upsert({
    where: { key: body.key },
    update: { value: body.value },
    create: { key: body.key, value: body.value },
  })
  return NextResponse.json(setting)
}
