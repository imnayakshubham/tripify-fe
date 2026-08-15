/**
 * Agent naming.
 *
 * `@audited` in backend/app/agents/base.py appends either "<name>" or
 * "<name> (failed)" to contributing_agents, so the suffix is the only signal
 * that an agent failed — a partially-failed chain still returns HTTP 200.
 */

const FAILED_SUFFIX = ' (failed)'

export function isFailedAgent(label: string): boolean {
  return label.endsWith(FAILED_SUFFIX)
}

/** "destination_agent (failed)" -> "Destination" */
export function agentDisplayName(label: string): string {
  return label
    .replace(FAILED_SUFFIX, '')
    .replace(/_agent$/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

export function formatDuration(ms: number | null): string {
  if (ms === null) return '—'
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}
