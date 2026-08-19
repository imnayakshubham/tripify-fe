import { BarChart3, Compass, MessageSquare, MessageSquarePlus, RefreshCw } from 'lucide-react'

import { NavUser } from '@/components/NavUser'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar'
import type { Identity } from '@/lib/identity'
import { cn } from '@/lib/utils'
import type { AuditRequestSummary } from '@/types/api'

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
  rows,
  historyLoading,
  onRefreshHistory,
}: {
  identity: Identity
  onIdentityChange: (next: Identity) => void
  activePlanId: string | null
  onOpenPlan: (planId: string) => void
  onNewTrip: () => void
  view: 'plan' | 'admin'
  onViewChange: (view: 'plan' | 'admin') => void
  /** Fetched by AppLayout, which also titles the header from the same list. */
  rows: AuditRequestSummary[] | null
  historyLoading: boolean
  onRefreshHistory: () => void
}) {
  const { isMobile, setOpenMobile } = useSidebar()

  // A failed run has no stored answer, so it cannot be reopened.
  const openable = (rows ?? []).filter((row) => row.status === 'completed')

  // On mobile the sidebar is a Sheet over the content, so any navigation has to
  // close it or the result it just opened stays hidden behind the overlay.
  function dismissOnMobile() {
    if (isMobile) setOpenMobile(false)
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="cursor-default hover:bg-transparent active:bg-transparent"
            >
              <div>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Compass className="size-4" />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold">Tripify</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Multi-agent trip planner
                  </span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="New trip"
              onClick={() => {
                onNewTrip()
                dismissOnMobile()
              }}
              className="min-h-11 group-data-[collapsible=icon]:min-h-8!"
            >
              <MessageSquarePlus />
              <span>New trip</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Recent</SidebarGroupLabel>
          <SidebarGroupAction onClick={onRefreshHistory} aria-label="Refresh history">
            <RefreshCw className={cn(historyLoading && 'animate-spin')} />
          </SidebarGroupAction>

          <SidebarGroupContent>
            <SidebarMenu>
              {historyLoading && !rows && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuSkeleton />
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuSkeleton />
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuSkeleton />
                  </SidebarMenuItem>
                </>
              )}

              {rows && openable.length === 0 && (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                  No trips yet.
                </p>
              )}

              {openable.map((row) => (
                <SidebarMenuItem key={row.id}>
                  <SidebarMenuButton
                    size="lg"
                    isActive={row.id === activePlanId && view === 'plan'}
                    tooltip={row.user_query}
                    onClick={() => {
                      onOpenPlan(row.id)
                      dismissOnMobile()
                    }}
                  >
                    <MessageSquare />
                    <div className="grid min-w-0 flex-1 gap-0.5 text-left leading-tight group-data-[collapsible=icon]:hidden">
                      <span className="truncate text-xs">{row.user_query}</span>
                      <span className="truncate text-[10px] text-muted-foreground">
                        {relativeDate(row.created_at)}
                        {identity.role === 'admin' && ` · ${row.user_email}`}
                      </span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {identity.role === 'admin' && (
          <>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={view === 'admin'}
                  tooltip="Metrics"
                  onClick={() => {
                    onViewChange(view === 'admin' ? 'plan' : 'admin')
                    dismissOnMobile()
                  }}
                  className="min-h-11 group-data-[collapsible=icon]:min-h-8!"
                >
                  <BarChart3 />
                  <span>Metrics</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <SidebarSeparator className="mx-0" />
          </>
        )}

        <NavUser identity={identity} onIdentityChange={onIdentityChange} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
