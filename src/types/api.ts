/**
 * Mirrors backend/app/schema/api.py.
 *
 * Pydantic serialises an `X | None` field as present-and-null rather than
 * omitting it, so those are modelled `T | null`, not `T?`.
 */

export interface CreatePlanRequest {
  user_query: string
}

export interface AgentContribution {
  agent_name: string
  status: string
  duration_ms: number | null
  summary: string
}

// ------------------------------------------------- structured agent output
//
// The server sends these as loose dicts because they are unvalidated model
// output — it refuses to let a model quirk 500 an otherwise good run. The shape
// is enforced here instead, where being wrong is a compile error rather than a
// failed request. Treat every field as optional and never assume a number is a
// number: a cost may arrive as 1200 or as "£1,200".

export type ActivityCategory =
  | 'transport'
  | 'food'
  | 'sightseeing'
  | 'accommodation'
  | 'activity'
  | 'other'

export type PartOfDay = 'morning' | 'afternoon' | 'evening'

export interface ItinerarySegment {
  part_of_day?: PartOfDay | string
  activity?: string
  category?: ActivityCategory | string
  duration?: string
  /** The brief's "say so when uncertain" rule, as a field. Empty when confident. */
  uncertainty?: string
}

export interface ItineraryDay {
  day?: number
  title?: string
  segments?: ItinerarySegment[]
}

export interface ItineraryPlan {
  summary?: string
  days?: ItineraryDay[]
  uncertainties?: string[]
}

export interface DestinationCandidate {
  destination?: string
  justification?: string
  /** A string like "£1,200", not a number. */
  estimated_cost?: string
  respects_hard_constraints?: boolean
  violated_constraints?: string[]
}

export interface RejectedDestination {
  destination?: string
  reason?: string
}

export interface DestinationChoice {
  recommended_destination?: string
  candidates?: DestinationCandidate[]
  rejected?: RejectedDestination[]
}

export interface BudgetLine {
  category?: string
  estimate?: number | string
  notes?: string
}

export interface BudgetChange {
  change?: string
  saving?: number | string
}

export interface CheaperAlternative {
  description?: string
  changes?: BudgetChange[]
  estimated_saving?: number | string
}

export interface BudgetAssessment {
  currency?: string
  estimated_total?: number | string
  /** The user's stated budget, resolved server-side — not the model's echo. */
  budget_amount?: number | string
  /**
   * Recomputed server-side. Tri-state: true = verified within, false = verified
   * over, null/absent = could not be verified. Never read a missing value as
   * "fine" — that is what let overages through.
   */
  within_budget?: boolean | null
  /** Why the check could not be performed, when within_budget is null. */
  unverified_reason?: string
  overage_amount?: number | string | null
  breakdown?: BudgetLine[]
  /** An older model may still send a plain string here. */
  cheaper_alternative?: CheaperAlternative | string | null
  /** Whether the alternative's savings actually close the gap. null = unknown. */
  alternative_closes_gap?: boolean | null
  alternative_estimated_saving?: number
  alternative_resulting_total?: number
  assessment?: string
}

export interface TripConstraints {
  destination?: string
  origin?: string
  duration_days?: number | null
  budget_amount?: number | null
  budget_currency?: string
  hard_constraints?: string[]
  soft_preferences?: string[]
}

export interface PlanResponse {
  plan_id: string
  status: string
  answer: string
  contributing_agents: string[]
  supervisor_reasoning: string
  destination_results: string
  itinerary: string
  budget_results: string
  trip_constraints: TripConstraints
  // What each agent decided, before it was flattened into the markdown above.
  // null means that agent did not run — the supervisor skips the destination
  // agent when the user already named somewhere.
  destination_choice: DestinationChoice | null
  itinerary_plan: ItineraryPlan | null
  budget_assessment: BudgetAssessment | null
  // Admin-only. The API returns null for ordinary users, which is exactly how
  // the UI decides whether to render the cost block.
  llm_calls: number | null
  input_tokens: number | null
  output_tokens: number | null
  agent_details: AgentContribution[] | null
}

export interface AuditRequestSummary {
  id: string
  user_email: string
  user_query: string
  status: string
  agents: string[]
  model_name: string | null
  llm_calls: number
  input_tokens: number
  output_tokens: number
  duration_ms: number | null
  created_at: string
}

// `AuditRequestDetail` / `AuditInvocation` are deliberately not mirrored here.
// They belong to GET /plans/{id}, which this app never calls — that endpoint
// returns the audit record rather than the plan text, so there is nothing to
// render. See the note in HistoryTab.

export interface InvocationLogEntry {
  request_id: string
  agent_name: string
  status: string
  user_query: string
  duration_ms: number | null
  input_tokens: number
  output_tokens: number
  error_message: string | null
  started_at: string
}

export interface AgentMetrics {
  agent_name: string
  invocations: number
  succeeded: number
  failed: number
  avg_duration_ms: number | null
  p95_duration_ms: number | null
  input_tokens: number
  output_tokens: number
}

export interface MetricsResponse {
  window_days: number
  total_requests: number
  active_users: number
  requests_by_status: Record<string, number>
  llm_calls: number
  input_tokens: number
  output_tokens: number
  agents: AgentMetrics[]
}

// ------------------------------------------------------------------ stream

/** Frames emitted by POST /plans/stream. See backend/app/api/routes.py. */
export interface StartEvent {
  plan_id: string
}

export interface RoutedEvent {
  selected_agents: string[]
  supervisor_reasoning: string
}

export interface AgentEvent {
  agent_name: string
  status: 'succeeded' | 'failed'
  duration_ms: number
}
