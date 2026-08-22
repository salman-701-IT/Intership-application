import { NextResponse } from 'next/server'
import { chat } from '@/lib/zai'

export async function POST(req: Request) {
  const { message, context } = await req.json()

  const reply = await chat([
    {
      role: 'system',
      content:
        'You are Forge, an AI mentor assistant inside the InternForge internship platform. You help students with project guidance, study plans, debugging approaches, and career advice. Be concise, warm, and practical. Use short paragraphs and occasional bullet points. Never invent credentials.',
    },
    ...(context ? [{ role: 'user' as const, content: `Context: ${context}` }, { role: 'assistant' as const, content: 'Got it. How can I help?' }] : []),
    { role: 'user', content: message },
  ])

  return NextResponse.json({
    reply: reply ?? 'I am here to help — try asking about your project plan, a debugging approach, or how to prioritize your week.',
  })
}
