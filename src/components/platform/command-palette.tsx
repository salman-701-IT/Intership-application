'use client'

import * as React from 'react'
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator, CommandShortcut,
} from '@/components/ui/command'
import * as LucideIcons from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCommand, type Command as Cmd } from './command-context'
import { usePlatform } from '@/lib/role-store'
import { NAV } from './nav-config'
import { useTheme } from 'next-themes'
import type { Role } from '@/lib/types'

const ROLE_ICON: Record<Role, string> = {
  STUDENT: 'GraduationCap',
  MENTOR: 'Users',
  COMPANY: 'Building2',
  RECRUITER: 'Briefcase',
  ADMIN: 'ShieldCheck',
}

// Render a lucide icon by name safely (falls back to Circle)
function Icon({ name, className }: { name?: string; className?: string }) {
  const C = (LucideIcons as any)[name ?? 'Circle'] ?? LucideIcons.Circle
  return <C className={cn('h-4 w-4 shrink-0', className)} />
}

export function CommandPalette({ onOpenDocs }: { onOpenDocs: () => void }) {
  const { open, setOpen } = useCommand()
  const { role, setView, setRole } = usePlatform()
  const { setTheme, resolvedTheme } = useTheme()

  // Build the command list directly from the current role/theme. This is a pure
  // memo — no setState in effects, so no render-loop risk.
  const commands: Cmd[] = React.useMemo(() => {
    const navCommands: Cmd[] = (NAV[role] ?? []).map((item) => ({
      id: `nav:${role}:${item.id}`,
      label: item.label,
      group: 'Navigation',
      icon: (item.icon as any).displayName ?? 'Circle',
      keywords: `${role.toLowerCase()} ${item.id} ${item.label}`,
      run: () => setView(item.id),
    }))

    const roleCommands: Cmd[] = (
      ['STUDENT', 'MENTOR', 'COMPANY', 'RECRUITER', 'ADMIN'] as Role[]
    ).map((r) => ({
      id: `role:${r}`,
      label: `Switch to ${r === 'ADMIN' ? 'Super Admin' : r.charAt(0) + r.slice(1).toLowerCase()}`,
      group: 'Switch role',
      icon: ROLE_ICON[r],
      keywords: `switch role ${r.toLowerCase()}`,
      run: () => setRole(r),
    }))

    const isDark = resolvedTheme === 'dark'
    const actionCommands: Cmd[] = [
      {
        id: 'action:docs',
        label: 'Open Documentation',
        group: 'Docs',
        icon: 'BookOpen',
        keywords: 'docs help manual',
        run: () => onOpenDocs(),
      },
      {
        id: 'action:theme-toggle',
        label: `Switch to ${isDark ? 'light' : 'dark'} theme`,
        group: 'Theme',
        icon: isDark ? 'Sun' : 'Moon',
        keywords: 'theme dark light mode appearance',
        run: () => setTheme(isDark ? 'light' : 'dark'),
      },
      {
        id: 'action:palette-help',
        label: 'About the command palette',
        group: 'Docs',
        icon: 'Sparkles',
        keywords: 'help command palette cmd k shortcut',
        run: () => onOpenDocs(),
      },
    ]

    return [...navCommands, ...roleCommands, ...actionCommands]
  }, [role, resolvedTheme, onOpenDocs, setView, setRole, setTheme])

  const grouped = React.useMemo(() => {
    const map = new Map<string, Cmd[]>()
    for (const c of commands) {
      if (!map.has(c.group)) map.set(c.group, [])
      map.get(c.group)!.push(c)
    }
    const order = ['Navigation', 'Actions', 'Switch role', 'Theme', 'Docs']
    return order.filter((g) => map.has(g)).map((g) => [g, map.get(g)!] as const)
  }, [commands])

  return (
    <CommandDialog open={open} onOpenChange={setOpen} className="max-w-2xl">
      <CommandInput placeholder="Search commands, views, actions… (Cmd+K)" />
      <CommandList className="max-h-[420px]">
        <CommandEmpty className="py-8 text-center text-sm text-muted-foreground">
          No matching commands.
        </CommandEmpty>
        {grouped.map(([group, items], gi) => (
          <React.Fragment key={group}>
            {gi > 0 && <CommandSeparator />}
            <CommandGroup heading={group} className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {items.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.label} ${c.keywords ?? ''} ${c.group}`}
                  onSelect={() => {
                    setOpen(false)
                    setTimeout(() => c.run(), 10)
                  }}
                  className="gap-2.5"
                >
                  <Icon name={c.icon} className="text-muted-foreground" />
                  <span className="flex-1 truncate text-sm">{c.label}</span>
                  {c.shortcut && <CommandShortcut>{c.shortcut}</CommandShortcut>}
                </CommandItem>
              ))}
            </CommandGroup>
          </React.Fragment>
        ))}
      </CommandList>
      <div className="flex items-center justify-between border-t border-border/60 px-3 py-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-2">
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">↑↓</kbd> navigate
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">↵</kbd> select
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">esc</kbd> close
        </span>
        <span className="font-medium text-primary/80">InternForge · ⌘K</span>
      </div>
    </CommandDialog>
  )
}
