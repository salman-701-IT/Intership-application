import { NextResponse } from 'next/server'
import { promises as fs } from 'node:fs'
import path from 'node:path'

export interface DocMeta {
  slug: string
  title: string
  order: number
  category: string
  excerpt: string
  size: number
  lines: number
}

// Ordered documentation catalogue (mirrors the files in /docs)
const CATALOG: { slug: string; title: string; category: string; order: number; file: string }[] = [
  { slug: 'overview', title: 'Overview & Index', category: 'Start here', order: 0, file: 'README.md' },
  { slug: '01-product-specification', title: 'Product Specification', category: 'Product', order: 1, file: '01-product-specification.md' },
  { slug: '02-architecture', title: 'System Architecture', category: 'Engineering', order: 2, file: '02-architecture.md' },
  { slug: '03-database-schema', title: 'Database Schema', category: 'Engineering', order: 3, file: '03-database-schema.md' },
  { slug: '04-api-reference', title: 'API Reference', category: 'Engineering', order: 4, file: '04-api-reference.md' },
  { slug: '05-ai-features', title: 'AI Features', category: 'Engineering', order: 5, file: '05-ai-features.md' },
  { slug: '06-security-rbac', title: 'Security & RBAC', category: 'Engineering', order: 6, file: '06-security-rbac.md' },
  { slug: '07-design-system', title: 'Design System', category: 'Design', order: 7, file: '07-design-system.md' },
  { slug: '08-deployment-devops', title: 'Deployment & DevOps', category: 'DevOps', order: 8, file: '08-deployment-devops.md' },
  { slug: '09-testing-qa', title: 'Testing & QA', category: 'Quality', order: 9, file: '09-testing-qa.md' },
  { slug: '10-roadmap', title: 'Product Roadmap', category: 'Product', order: 10, file: '10-roadmap.md' },
]

const DOCS_DIR = path.join(process.cwd(), 'docs')

function extractExcerpt(md: string): string {
  // First non-heading paragraph
  const lines = md.split('\n')
  let inFence = false
  for (const line of lines) {
    if (line.trim().startsWith('```')) inFence = !inFence
    if (inFence) continue
    const t = line.trim()
    if (!t || t.startsWith('#') || t.startsWith('|') || t.startsWith('---')) continue
    return t.slice(0, 140) + (t.length > 140 ? '…' : '')
  }
  return ''
}

export async function GET() {
  const out: DocMeta[] = []
  for (const c of CATALOG) {
    try {
      const fp = path.join(DOCS_DIR, c.file)
      const stat = await fs.stat(fp)
      const content = await fs.readFile(fp, 'utf-8')
      out.push({
        slug: c.slug,
        title: c.title,
        order: c.order,
        category: c.category,
        excerpt: extractExcerpt(content),
        size: stat.size,
        lines: content.split('\n').length,
      })
    } catch {
      // skip missing
    }
  }
  return NextResponse.json(out)
}

export { CATALOG, DOCS_DIR }
