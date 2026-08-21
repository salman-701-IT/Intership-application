'use client'

import * as React from 'react'
import { Bell } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { usePlatform } from '@/lib/role-store'
import { notificationsApi } from '@/lib/api'
import type { Notification } from '@/lib/types'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/format'
import { getSocket } from '@/lib/socket'

const dotColor: Record<string, string> = {
  SUCCESS: 'bg-emerald-500',
  INFO: 'bg-sky-500',
  WARNING: 'bg-amber-500',
  ERROR: 'bg-rose-500',
  MENTION: 'bg-violet-500',
}

export function NotificationBell() {
  const { user } = usePlatform()
  const [items, setItems] = React.useState<Notification[]>([])

  const load = React.useCallback(() => {
    if (!user) return
    notificationsApi.list(user.id).then(setItems).catch(() => {})
  }, [user])

  React.useEffect(() => {
    load()
    if (!user) return
    const socket = getSocket()
    socket.emit('join:user', user.id)
    const handler = () => load()
    socket.on('notification', handler)
    return () => { socket.off('notification', handler) }
  }, [user, load])

  const unread = items.filter((n) => !n.read).length

  async function markRead(id: string) {
    await notificationsApi.markRead(id)
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-xl" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
              {unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && <Badge variant="secondary" className="text-[10px]">{unread} new</Badge>}
        </div>
        <ScrollArea className="max-h-80">
          <div className="flex flex-col">
            {items.length === 0 && (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">You are all caught up.</div>
            )}
            {items.map((n) => (
              <DropdownMenuItem
                key={n.id}
                className="flex cursor-pointer items-start gap-2 border-b px-3 py-2.5 last:border-b-0"
                onClick={() => markRead(n.id)}
              >
                <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', dotColor[n.type] ?? 'bg-muted-foreground')} />
                <div className="flex-1 space-y-0.5">
                  <p className={cn('text-sm leading-tight', !n.read && 'font-semibold')}>{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground/70">{timeAgo(n.createdAt)}</p>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
