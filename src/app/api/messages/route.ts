import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const conversations = await db.conversation.findMany({
    where: { members: { some: { userId: userId! } } },
    include: {
      members: { include: { user: true } },
      messages: { include: { sender: true }, orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(conversations)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { conversationId, senderId, content } = body
  const message = await db.message.create({
    data: {
      conversationId,
      senderId,
      content,
      type: 'TEXT',
      readBy: [senderId],
    },
    include: { sender: true },
  })
  return NextResponse.json(message)
}
