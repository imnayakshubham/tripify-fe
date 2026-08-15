/**
 * The streaming half of the API client — POST /plans/stream.
 *
 * EventSource is GET-only and cannot set headers, which would force the
 * identity stub into the query string for this one route. fetchEventSource does
 * POST with headers, so the stream carries exactly the same identity as every
 * axios call.
 */

import { fetchEventSource } from '@microsoft/fetch-event-source'

import { API_BASE_URL, ApiError } from '@/lib/api'
import { getIdentity, identityHeaders } from '@/lib/identity'
import type {
  AgentEvent,
  CreatePlanRequest,
  PlanResponse,
  RoutedEvent,
  StartEvent,
} from '@/types/api'

/** Thrown to stop fetchEventSource retrying — it retries forever otherwise. */
class FatalStreamError extends Error {}

export interface PlanStreamHandlers {
  onStart: (event: StartEvent) => void
  onRouted: (event: RoutedEvent) => void
  onAgent: (event: AgentEvent) => void
  onDone: (plan: PlanResponse) => void
}

/** Read {detail} off a non-200 so a 403 reads as a message, not "stream failed". */
async function describeResponse(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown }
    if (typeof body.detail === 'string') return body.detail
    if (Array.isArray(body.detail)) {
      const messages = body.detail
        .map((item) => (item as { msg?: string }).msg)
        .filter(Boolean)
      if (messages.length > 0) return messages.join('; ')
    }
  } catch {
    // Fall through to the generic message.
  }
  return `The API returned ${response.status}.`
}

/**
 * Runs a plan, invoking `handlers` as each agent lands. Resolves when the
 * server closes the stream; rejects with an ApiError on failure.
 *
 * Abort via `signal`; that resolves rather than rejecting, since a user
 * cancelling is not an error.
 */
export async function streamPlan(
  userQuery: string,
  handlers: PlanStreamHandlers,
  signal: AbortSignal,
): Promise<void> {
  let sawDone = false

  try {
    await fetchEventSource(`${API_BASE_URL}/plans/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...identityHeaders(getIdentity()),
      },
      body: JSON.stringify({ user_query: userQuery } satisfies CreatePlanRequest),
      signal,

      // Without this the stream is torn down whenever the tab is hidden, which
      // for a run that takes the better part of a minute is fatal.
      openWhenHidden: true,

      async onopen(response) {
        const contentType = response.headers.get('content-type') ?? ''
        if (response.ok && contentType.includes('text/event-stream')) return
        throw new FatalStreamError(await describeResponse(response))
      },

      onmessage(message) {
        switch (message.event) {
          case 'start':
            handlers.onStart(JSON.parse(message.data) as StartEvent)
            break
          case 'routed':
            handlers.onRouted(JSON.parse(message.data) as RoutedEvent)
            break
          case 'agent':
            handlers.onAgent(JSON.parse(message.data) as AgentEvent)
            break
          case 'done':
            sawDone = true
            handlers.onDone(JSON.parse(message.data) as PlanResponse)
            break
          case 'error': {
            // The 200 is already sent, so the backend reports failure in-band.
            const { detail } = JSON.parse(message.data) as { detail: string }
            throw new FatalStreamError(detail)
          }
        }
      },

      onclose() {
        // The server closes normally once `done` is sent. Anything else means
        // it went away mid-run.
        if (!sawDone) {
          throw new FatalStreamError('The API closed the connection before the plan finished.')
        }
      },

      // Returning here would make fetchEventSource retry indefinitely.
      onerror(error) {
        throw error
      },
    })
  } catch (error) {
    if (signal.aborted) return

    if (error instanceof FatalStreamError) {
      throw new ApiError(error.message)
    }
    throw new ApiError(
      `Could not reach the API at ${API_BASE_URL}. Is the backend running?`,
    )
  }
}
