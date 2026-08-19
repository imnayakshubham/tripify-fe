import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Outlet, useLocation, useMatch, useNavigate } from 'react-router-dom'

import { AppSidebar } from '@/components/AppSidebar'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { usePlanStream } from '@/hooks/usePlanStream'
import { listAuditRequests } from '@/lib/api'
import { getIdentity, setIdentity, type Identity } from '@/lib/identity'
import type { AppOutletContext } from './context'

export function AppLayout() {
  const [identity, updateIdentity] = useState<Identity>(getIdentity)

  // The URL is the navigation state: /conv/:planId reopens a trip, /admin shows
  // metrics. That makes a plan shareable and the browser back button work, which
  // matters most on mobile where back is a system gesture.
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const openedId = useMatch('/conv/:planId')?.params.planId ?? null
  const view: 'plan' | 'admin' = pathname === '/admin' ? 'admin' : 'plan'

  // Lives here rather than in the plan route so navigating to /admin and back
  // doesn't abort a run that is still streaming.
  const stream = usePlanStream()

  // Fetched here, not in the sidebar, so the header title and the sidebar list
  // are the same data and cannot disagree about what a trip is called. Keyed by
  // identity because the API scopes the rows to the caller.
  const queryClient = useQueryClient()
  const history = useQuery({
    queryKey: ['history', identity.email, identity.role],
    queryFn: () => listAuditRequests(30),
  })

  // A finished run is a new row in that list.
  useEffect(() => {
    if (stream.phase === 'done') {
      void queryClient.invalidateQueries({ queryKey: ['history'] })
    }
  }, [stream.phase, queryClient])

  const activeRow = openedId
    ? history.data?.find((row) => row.id === openedId)
    : undefined

  const title =
    view === 'admin'
      ? 'Metrics'
      : (activeRow?.user_query ??
        // A deep link can land on a trip older than the 30 rows fetched above.
        (openedId ? 'Trip' : stream.query || 'Plan a trip'))

  function newTrip() {
    stream.cancel()
    navigate('/')
  }

  function onIdentityChange(next: Identity) {
    // Keep the module-level copy in step: the axios interceptor and the stream
    // client both read from there.
    setIdentity(next)
    updateIdentity(next)
    if (next.role !== 'admin' && view === 'admin') navigate('/')
  }

  return (
    // SidebarProvider ships min-h-svh; min-h-dvh has to replace it or the shell
    // can outgrow h-dvh and the page scrolls behind the pinned composer.
    <SidebarProvider className="h-dvh min-h-dvh overflow-hidden">
      <AppSidebar
        identity={identity}
        onIdentityChange={onIdentityChange}
        activePlanId={openedId}
        onOpenPlan={(planId) => {
          stream.cancel()
          navigate(`/conv/${planId}`)
        }}
        onNewTrip={newTrip}
        view={view}
        onViewChange={(next) => navigate(next === 'admin' ? '/admin' : '/')}
        rows={history.data ?? null}
        historyLoading={history.isPending}
        onRefreshHistory={() => void history.refetch()}
      />

      <SidebarInset className="min-w-0 overflow-hidden">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 data-vertical:h-4" />
          <span className="truncate text-sm font-medium" title={title}>
            {title}
          </span>
        </header>

        <Outlet context={{ stream, identity, onNewTrip: newTrip } satisfies AppOutletContext} />
      </SidebarInset>
    </SidebarProvider>
  )
}
