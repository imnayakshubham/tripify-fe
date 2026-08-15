import { useCallback } from 'react'
import { BarChart3, MessageSquarePlus, RefreshCw } from 'lucide-react'

import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useApiResource } from '@/hooks/useApiResource'
import { listAuditRequests } from '@/lib/api'
import type { Identity, Role } from '@/lib/identity'
import { cn } from '@/lib/utils'

function relativeDate(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  const sameDay = date.toDateString() === today.toDateString()
  return sameDay
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

export function AppSidebar({
  identity,
  onIdentityChange,
  activePlanId,
  onOpenPlan,
  onNewTrip,
  view,
  onViewChange,
  refreshKey,
}: {
  identity: Identity
  onIdentityChange: (next: Identity) => void
  activePlanId: string | null
  onOpenPlan: (planId: string) => void
  onNewTrip: () => void
  view: 'plan' | 'admin'
  onViewChange: (view: 'plan' | 'admin') => void
  /** Bumped after a run completes so the list picks up the new entry. */
  refreshKey: number
}) {
  const load = useCallback(() => listAuditRequests(30), [])
  const { data, loading, reload } = useApiResource(load, [
    identity.email,
    identity.role,
    refreshKey,
  ])

  // A failed run has no stored answer, so it cannot be reopened.
  const openable = (data ?? []).filter((row) => row.status === 'completed')

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r bg-sidebar">
      <div className="p-3">
        <Button className="w-full justify-start" variant="outline" onClick={onNewTrip}>
          <MessageSquarePlus />
          New trip
        </Button>
      </div>

      <div className="flex items-center justify-between px-4 pb-1">
        <span className="text-xs font-medium text-muted-foreground">Recent</span>
        <Button variant="ghost" size="icon-xs" onClick={reload} aria-label="Refresh history">
          <RefreshCw className={cn('size-3', loading && 'animate-spin')} />
        </Button>
      </div>

      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {loading && !data && (
          <div className="space-y-2 p-2">
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-full" />
          </div>
        )}

        {data && openable.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            No trips yet.
          </p>
        )}

        {openable.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => onOpenPlan(row.id)}
            title={row.user_query}
            className={cn(
              'flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left transition-colors',
              row.id === activePlanId && view === 'plan'
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'hover:bg-sidebar-accent/60',
            )}
          >
            <span className="truncate text-xs">{row.user_query}</span>
            <span className="text-[10px] text-muted-foreground">
              {relativeDate(row.created_at)}
              {identity.role === 'admin' && ` · ${row.user_email}`}
            </span>
          </button>
        ))}
      </nav>

      <div className="space-y-2 border-t p-3">
        {identity.role === 'admin' && (
          <Button
            variant={view === 'admin' ? 'secondary' : 'ghost'}
            size="sm"
            className="w-full justify-start"
            onClick={() => onViewChange(view === 'admin' ? 'plan' : 'admin')}
          >
            <BarChart3 />
            Metrics
          </Button>
        )}

        <div className="flex items-center gap-1.5">
          <Select
            value={identity.role}
            onValueChange={(role) => onIdentityChange({ ...identity, role: role as Role })}
          >
            <SelectTrigger size="sm" className="flex-1 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">user</SelectItem>
              <SelectItem value="admin">admin</SelectItem>
            </SelectContent>
          </Select>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )
}
