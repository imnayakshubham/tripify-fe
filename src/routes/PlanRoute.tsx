import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'

import { PlanView } from '@/components/PlanView'
import { ApiError, getPlanResult } from '@/lib/api'
import { useAppContext } from './context'

export function PlanRoute() {
  const { stream, onNewTrip } = useAppContext()
  const { planId } = useParams()

  const opened = useQuery({
    queryKey: ['plan', planId],
    queryFn: () => getPlanResult(planId!),
    enabled: Boolean(planId),
  })

  const error = opened.error
    ? opened.error instanceof ApiError
      ? opened.error.message
      : 'That trip could not be loaded.'
    : null

  return (
    <PlanView
      stream={stream}
      openedPlan={planId ? (opened.data ?? null) : null}
      openedLoading={Boolean(planId) && opened.isPending}
      openedError={error}
      onNewTrip={onNewTrip}
    />
  )
}
