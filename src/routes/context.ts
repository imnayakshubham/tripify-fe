import { useOutletContext } from 'react-router-dom'

import type { PlanStream } from '@/hooks/usePlanStream'
import type { Identity } from '@/lib/identity'

/** What AppLayout hands its routes through <Outlet context={…} />. */
export interface AppOutletContext {
  stream: PlanStream
  identity: Identity
  onNewTrip: () => void
}

export function useAppContext(): AppOutletContext {
  return useOutletContext<AppOutletContext>()
}
