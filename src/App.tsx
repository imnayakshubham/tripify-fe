import { useEffect, useState } from 'react'

import { AdminView } from '@/components/AdminView'
import { AppSidebar } from '@/components/AppSidebar'
import { PlanView } from '@/components/PlanView'
import { usePlanStream } from '@/hooks/usePlanStream'
import { ApiError, getPlanResult } from '@/lib/api'
import { getIdentity, setIdentity, type Identity } from '@/lib/identity'
import type { PlanResponse } from '@/types/api'

export default function App() {
  const [identity, updateIdentity] = useState<Identity>(getIdentity)
  const [view, setView] = useState<'plan' | 'admin'>('plan')

  const stream = usePlanStream()

  // A plan reopened from history, kept apart from the live run so starting a
  // new trip doesn't have to unpick which of the two is on screen.
  const [openedId, setOpenedId] = useState<string | null>(null)
  const [openedPlan, setOpenedPlan] = useState<PlanResponse | null>(null)
  const [openedLoading, setOpenedLoading] = useState(false)
  const [openedError, setOpenedError] = useState<string | null>(null)

  // Bumped when a run finishes, so the sidebar picks the new trip up.
  const [historyKey, setHistoryKey] = useState(0)
  useEffect(() => {
    if (stream.phase === 'done') setHistoryKey((key) => key + 1)
  }, [stream.phase])

  function onIdentityChange(next: Identity) {
    // Keep the module-level copy in step: the axios interceptor and the stream
    // client both read from there.
    setIdentity(next)
    updateIdentity(next)
    if (next.role !== 'admin' && view === 'admin') setView('plan')
  }

  function newTrip() {
    stream.cancel()
    setOpenedId(null)
    setOpenedPlan(null)
    setOpenedError(null)
    setView('plan')
  }

  async function openPlan(planId: string) {
    stream.cancel()
    setView('plan')
    setOpenedId(planId)
    setOpenedPlan(null)
    setOpenedError(null)
    setOpenedLoading(true)

    try {
      setOpenedPlan(await getPlanResult(planId))
    } catch (error) {
      setOpenedError(
        error instanceof ApiError ? error.message : 'That trip could not be loaded.',
      )
    } finally {
      setOpenedLoading(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar
        identity={identity}
        onIdentityChange={onIdentityChange}
        activePlanId={openedId}
        onOpenPlan={openPlan}
        onNewTrip={newTrip}
        view={view}
        onViewChange={setView}
        refreshKey={historyKey}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        {view === 'admin' ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-5xl px-6 py-6">
              <AdminView />
            </div>
          </div>
        ) : (
          <PlanView
            stream={stream}
            openedPlan={openedPlan}
            openedLoading={openedLoading}
            openedError={openedError}
          />
        )}
      </main>
    </div>
  )
}
