/**
 * Drives POST /plans/stream and reduces its events into render state.
 *
 * The pipeline shown to the user is not guessed: the supervisor's `routed`
 * event carries the agents it actually selected, in the order the graph will
 * run them, so from the first event onward the steps are real.
 */

import { useCallback, useEffect, useReducer, useRef } from 'react'

import { ApiError } from '@/lib/api'
import { streamPlan } from '@/lib/stream'
import type { AgentEvent, PlanResponse, RoutedEvent, StartEvent } from '@/types/api'

export type StepStatus = 'pending' | 'running' | 'succeeded' | 'failed'

export interface PipelineStep {
  agent: string
  status: StepStatus
  durationMs: number | null
}

export type StreamPhase = 'idle' | 'running' | 'done' | 'error'

interface State {
  phase: StreamPhase
  planId: string | null
  steps: PipelineStep[]
  supervisorReasoning: string
  plan: PlanResponse | null
  error: string | null
}

type Action =
  | { type: 'submit' }
  | { type: 'start'; event: StartEvent }
  | { type: 'routed'; event: RoutedEvent }
  | { type: 'agent'; event: AgentEvent }
  | { type: 'done'; plan: PlanResponse }
  | { type: 'error'; message: string }
  | { type: 'cancel' }
  | { type: 'reset' }

const INITIAL: State = {
  phase: 'idle',
  planId: null,
  steps: [],
  supervisorReasoning: '',
  plan: null,
  error: null,
}

function step(agent: string, status: StepStatus = 'pending'): PipelineStep {
  return { agent, status, durationMs: null }
}

/** Mark the first pending step running, so exactly one step is ever active. */
function startNextPending(steps: PipelineStep[]): PipelineStep[] {
  const next = steps.findIndex((item) => item.status === 'pending')
  if (next === -1) return steps
  return steps.map((item, index) =>
    index === next ? { ...item, status: 'running' } : item,
  )
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'submit':
      return { ...INITIAL, phase: 'running' }

    case 'start':
      return {
        ...state,
        phase: 'running',
        planId: action.event.plan_id,
        steps: [step('supervisor', 'running')],
      }

    case 'routed': {
      // The supervisor is still running at this point — its `agent` event
      // arrives next. Everything after it is now known.
      const selected = action.event.selected_agents.map((agent) => step(agent))
      return {
        ...state,
        supervisorReasoning: action.event.supervisor_reasoning,
        steps: [
          ...state.steps.filter((item) => item.agent === 'supervisor'),
          ...selected,
          step('synthesis'),
        ],
      }
    }

    case 'agent': {
      const settled = state.steps.map((item) =>
        item.agent === action.event.agent_name
          ? {
              ...item,
              status: action.event.status as StepStatus,
              durationMs: action.event.duration_ms,
            }
          : item,
      )
      return { ...state, steps: startNextPending(settled) }
    }

    case 'done':
      return { ...state, phase: 'done', plan: action.plan }

    case 'error':
      return {
        ...state,
        phase: 'error',
        error: action.message,
        // Anything still in flight did not finish; do not leave it spinning.
        steps: state.steps.map((item) =>
          item.status === 'running' || item.status === 'pending'
            ? { ...item, status: 'failed' }
            : item,
        ),
      }

    case 'cancel':
      return { ...INITIAL }

    case 'reset':
      return INITIAL

    default:
      return state
  }
}

export type PlanStream = State & {
  submit: (userQuery: string) => Promise<void>
  cancel: () => void
}

export function usePlanStream(): PlanStream {
  const [state, dispatch] = useReducer(reducer, INITIAL)
  const controllerRef = useRef<AbortController | null>(null)

  // Do not leave a request in flight when the component goes away.
  useEffect(() => () => controllerRef.current?.abort(), [])

  const submit = useCallback(async (userQuery: string) => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    dispatch({ type: 'submit' })

    try {
      await streamPlan(
        userQuery,
        {
          onStart: (event) => dispatch({ type: 'start', event }),
          onRouted: (event) => dispatch({ type: 'routed', event }),
          onAgent: (event) => dispatch({ type: 'agent', event }),
          onDone: (plan) => dispatch({ type: 'done', plan }),
        },
        controller.signal,
      )
    } catch (error) {
      dispatch({
        type: 'error',
        message:
          error instanceof ApiError ? error.message : 'The planning run failed.',
      })
    }
  }, [])

  const cancel = useCallback(() => {
    controllerRef.current?.abort()
    dispatch({ type: 'cancel' })
  }, [])

  return { ...state, submit, cancel }
}
