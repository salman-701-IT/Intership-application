'use client'

import * as React from 'react'

export interface Command {
  id: string
  label: string
  group: 'Navigation' | 'Actions' | 'Switch role' | 'Theme' | 'Docs'
  keywords?: string
  icon?: string // lucide name
  hint?: string
  run: () => void
  shortcut?: string
}

interface CommandContextValue {
  open: boolean
  setOpen: (o: boolean) => void
  toggle: () => void
}

const CommandContext = React.createContext<CommandContextValue | null>(null)

/**
 * Provides only the open/close state for the command palette + the global ⌘K
 * hotkey. Command lists are computed directly in the palette from the stores,
 * which avoids any setState-in-effect registration loops.
 */
export function CommandProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)

  const toggle = React.useCallback(() => setOpen((o) => !o), [])

  // Global hotkey: Cmd+K / Ctrl+K
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const value = React.useMemo(() => ({ open, setOpen, toggle }), [open, toggle])

  return <CommandContext.Provider value={value}>{children}</CommandContext.Provider>
}

export function useCommand() {
  const ctx = React.useContext(CommandContext)
  if (!ctx) throw new Error('useCommand must be used within CommandProvider')
  return ctx
}
