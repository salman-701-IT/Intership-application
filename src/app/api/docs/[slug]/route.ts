import { NextResponse } from 'next/server'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { CATALOG, DOCS_DIR } from '../route'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const entry = CATALOG.find((c) => c.slug === slug)
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  try {
    const content = await fs.readFile(path.join(DOCS_DIR, entry.file), 'utf-8')
    return NextResponse.json({
      slug: entry.slug,
      title: entry.title,
      category: entry.category,
      order: entry.order,
      content,
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
