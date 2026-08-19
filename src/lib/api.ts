/**
 * The REST half of the API client. Streaming lives in lib/stream.ts — axios is
 * XHR-based in the browser and cannot read a response incrementally.
 */

import axios, { AxiosError } from 'axios'

import { getIdentity, identityHeaders } from '@/lib/identity'
import type {
  AuditRequestSummary,
  InvocationLogEntry,
  MetricsResponse,
  PlanResponse,
} from '@/types/api'

export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

/** One error shape for the UI, whatever the API or the network did. */
export class ApiError extends Error {
  readonly status: number | null

  constructor(message: string, status: number | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }

  /** 403 from require_admin — worth a gentler message than a hard failure. */
  get isForbidden(): boolean {
    return this.status === 403
  }
}

export const UNREACHABLE = `Could not reach the API at ${API_BASE_URL}. Is the backend running?`

/**
 * FastAPI has two error bodies: `{detail: string}` from HTTPException and
 * `{detail: [{loc, msg, type}]}` from a 422. Flatten both. Shared with lib/stream.ts
 * so the REST and SSE clients cannot report the same failure differently.
 */
export function detailMessage(body: unknown, status: number): string {
  const detail = (body as { detail?: unknown } | undefined)?.detail

  if (typeof detail === 'string') return detail

  if (Array.isArray(detail)) {
    const messages = detail.map((item) => (item as { msg?: string }).msg).filter(Boolean)
    if (messages.length > 0) return messages.join('; ')
  }

  return `The API returned ${status}.`
}

const client = axios.create({ baseURL: API_BASE_URL })

client.interceptors.request.use((config) => {
  Object.assign(config.headers, identityHeaders(getIdentity()))
  return config
})

function describe(error: AxiosError): ApiError {
  if (!error.response) return new ApiError(UNREACHABLE)

  const { status, data } = error.response
  return new ApiError(detailMessage(data, status), status)
}

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => Promise.reject(describe(error)),
)

/** Non-admins are scoped to their own rows by the API's SQL, not by us. */
export async function listAuditRequests(limit = 25): Promise<AuditRequestSummary[]> {
  const { data } = await client.get<AuditRequestSummary[]>('/audit/requests', {
    params: { limit },
  })
  return data
}

/**
 * Re-open a finished plan. Replayed from the LangGraph checkpoint, so it is the
 * same shape a live run returns — no second copy to drift out of step.
 */
export async function getPlanResult(planId: string): Promise<PlanResponse> {
  const { data } = await client.get<PlanResponse>(`/plans/${planId}/result`)
  return data
}

/** Admin only. */
export async function listInvocations(limit = 50): Promise<InvocationLogEntry[]> {
  const { data } = await client.get<InvocationLogEntry[]>('/audit/invocations', {
    params: { limit },
  })
  return data
}

/** Admin only. */
export async function getMetrics(windowDays = 7): Promise<MetricsResponse> {
  const { data } = await client.get<MetricsResponse>('/metrics', {
    params: { window_days: windowDays },
  })
  return data
}
