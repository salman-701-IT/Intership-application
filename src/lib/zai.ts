import ZAI from 'z-ai-web-dev-sdk'

let cached: Awaited<ReturnType<typeof ZAI.create>> | null = null

export async function getZai() {
  if (cached) return cached
  try {
    cached = await ZAI.create()
    return cached
  } catch (e) {
    console.error('ZAI SDK init failed:', e)
    return null
  }
}

export async function chat(messages: { role: 'system' | 'user' | 'assistant'; content: string }[]): Promise<string | null> {
  const zai = await getZai()
  if (!zai) return null
  try {
    const res = await zai.chat.completions.create({ messages })
    const content = res?.choices?.[0]?.message?.content
    if (typeof content === 'string' && content.trim()) return content.trim()
    return null
  } catch (e) {
    console.error('ZAI chat failed:', e)
    return null
  }
}

/**
 * Call the LLM and return JSON. Falls back to the provided fallback on any error
 * so the UI always degrades gracefully.
 */
export async function chatJson<T>(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  fallback: T
): Promise<T> {
  const text = await chat(messages)
  if (!text) return fallback
  // Extract first JSON object from the response
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return fallback
  try {
    return JSON.parse(match[0]) as T
  } catch {
    return fallback
  }
}
