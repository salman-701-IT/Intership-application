'use client'

import * as React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { BookOpen, Search, X, FileText, ChevronRight, Loader2 } from 'lucide-react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { AIBadge } from './shared'

interface DocMeta {
  slug: string
  title: string
  order: number
  category: string
  excerpt: string
  size: number
  lines: number
}

interface DocContent {
  slug: string
  title: string
  category: string
  content: string
}

export function DocsViewer({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [catalog, setCatalog] = React.useState<DocMeta[]>([])
  const [active, setActive] = React.useState<string>('overview')
  const [doc, setDoc] = React.useState<DocContent | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [query, setQuery] = React.useState('')

  React.useEffect(() => {
    fetch('/api/docs', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setCatalog)
      .catch(() => {})
  }, [])

  React.useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch(`/api/docs/${active}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setDoc(d))
      .catch(() => setDoc(null))
      .finally(() => setLoading(false))
  }, [active, open])

  const filtered = React.useMemo(() => {
    if (!query.trim()) return catalog
    const q = query.toLowerCase()
    return catalog.filter((c) => c.title.toLowerCase().includes(q) || c.excerpt.toLowerCase().includes(q) || c.category.toLowerCase().includes(q))
  }, [catalog, query])

  const categories = React.useMemo(() => {
    const map = new Map<string, DocMeta[]>()
    for (const c of filtered) {
      if (!map.has(c.category)) map.set(c.category, [])
      map.get(c.category)!.push(c)
    }
    return Array.from(map.entries())
  }, [filtered])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[1100px]" side="right">
        <SheetHeader className="flex flex-row items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-emerald text-white shadow-soft">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <SheetTitle className="text-sm font-bold">Platform Documentation</SheetTitle>
              <p className="text-[11px] text-muted-foreground">InternForge · v1.0 · complete spec &amp; implementation guide</p>
            </div>
          </div>
          <AIBadge className="hidden sm:inline-flex" />
        </SheetHeader>

        <div className="flex min-h-0 flex-1">
          {/* TOC */}
          <aside className="hidden w-64 shrink-0 border-r border-border/60 bg-muted/20 sm:block">
            <div className="p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search docs…"
                  className="h-8 rounded-lg pl-8 text-xs"
                />
              </div>
            </div>
            <ScrollArea className="h-[calc(100vh-9.5rem)]">
              <nav className="space-y-3 px-3 pb-6">
                {categories.map(([cat, items]) => (
                  <div key={cat}>
                    <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">{cat}</p>
                    <div className="space-y-0.5">
                      {items.map((d) => (
                        <button
                          key={d.slug}
                          onClick={() => setActive(d.slug)}
                          className={cn(
                            'group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors',
                            active === d.slug
                              ? 'bg-primary/10 font-semibold text-primary'
                              : 'text-foreground/80 hover:bg-muted'
                          )}
                        >
                          <FileText className={cn('h-3.5 w-3.5 shrink-0', active === d.slug ? 'text-primary' : 'text-muted-foreground')} />
                          <span className="flex-1 truncate">{d.title}</span>
                          <span className="text-[9px] text-muted-foreground/60">{d.lines}L</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && <p className="px-2 py-4 text-center text-xs text-muted-foreground">No matches.</p>}
              </nav>
            </ScrollArea>
          </aside>

          {/* Content */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Mobile doc picker */}
            <div className="border-b border-border/60 p-3 sm:hidden">
              <select
                value={active}
                onChange={(e) => setActive(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
              >
                {catalog.map((d) => (
                  <option key={d.slug} value={d.slug}>{d.title}</option>
                ))}
              </select>
            </div>

            <ScrollArea className="flex-1">
              <div className="mx-auto max-w-3xl px-5 py-6 sm:px-8 sm:py-8">
                {loading && (
                  <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading document…
                  </div>
                )}
                {!loading && doc && (
                  <article className="prose-doc">
                    <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="rounded-full text-[10px]">{doc.category}</Badge>
                      <ChevronRight className="h-3 w-3" />
                      <span>{doc.title}</span>
                    </div>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                      {doc.content}
                    </ReactMarkdown>
                  </article>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/* ------------------------------------------------------------------ */
/* Styled markdown renderers                                         */
/* ------------------------------------------------------------------ */
const mdComponents = {
  h1: ({ children }: any) => <h1 className="mb-4 mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{children}</h1>,
  h2: ({ children }: any) => <h2 className="mb-3 mt-8 border-b border-border/60 pb-1.5 text-xl font-bold tracking-tight text-foreground">{children}</h2>,
  h3: ({ children }: any) => <h3 className="mb-2 mt-6 text-base font-semibold tracking-tight text-foreground">{children}</h3>,
  h4: ({ children }: any) => <h4 className="mb-2 mt-4 text-sm font-semibold text-foreground">{children}</h4>,
  p: ({ children }: any) => <p className="my-3 text-sm leading-relaxed text-foreground/90">{children}</p>,
  ul: ({ children }: any) => <ul className="my-3 ml-5 list-disc space-y-1 text-sm text-foreground/90 marker:text-primary">{children}</ul>,
  ol: ({ children }: any) => <ol className="my-3 ml-5 list-decimal space-y-1 text-sm text-foreground/90 marker:text-primary marker:font-semibold">{children}</ol>,
  li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
  a: ({ href, children }: any) => (
    <a href={href} target="_blank" rel="noreferrer" className="font-medium text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary">
      {children}
    </a>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="my-4 border-l-2 border-primary/60 bg-primary/5 py-2 pl-4 pr-3 text-sm italic text-foreground/80">{children}</blockquote>
  ),
  table: ({ children }: any) => (
    <div className="my-4 overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }: any) => <thead className="bg-muted/60">{children}</thead>,
  th: ({ children }: any) => <th className="border-b border-border/60 px-3 py-2 text-left font-semibold text-foreground">{children}</th>,
  td: ({ children }: any) => <td className="border-b border-border/40 px-3 py-2 align-top text-foreground/80">{children}</td>,
  code: ({ inline, className, children }: any) => {
    const isBlock = !inline && (className?.includes('language-') || String(children).includes('\n'))
    if (isBlock) {
      return (
        <code className={`block ${className ?? ''}`}>{children}</code>
      )
    }
    return <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px] text-foreground/90">{children}</code>
  },
  pre: ({ children }: any) => {
    const text = typeof children === 'object' ? (children as any)?.props?.children : String(children)
    const isMermaid = typeof text === 'string' && (children as any)?.props?.className?.includes('mermaid')
    if (isMermaid) {
      return (
        <div className="my-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">Mermaid diagram</p>
          <pre className="overflow-x-auto text-xs text-foreground/80">{text}</pre>
        </div>
      )
    }
    return <pre className="my-4 overflow-x-auto rounded-lg border border-border/60 bg-muted/60 p-3 text-xs text-foreground/90">{children}</pre>
  },
  hr: () => <hr className="my-6 border-border/60" />,
  strong: ({ children }: any) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }: any) => <em className="italic">{children}</em>,
}
