import { AlertCircle, Check, ChevronRight } from 'lucide-react'

import { FAILED_SUFFIX, agentDisplayName, formatDuration, isFailedAgent } from '@/lib/agents'
import { cn } from '@/lib/utils'
import type { PipelineStep } from '@/hooks/usePlanStream'

/**
 * The agent chain in the order it ran. A partially-failed run still returns HTTP 200,
 * so a failed agent has to stay visible here.
 */
export function AgentTrail({
  agents,
  steps = [],
  reasoning,
}: {
  agents: string[]
  steps?: PipelineStep[]
  reasoning?: string
}) {
  if (agents.length === 0) return null

  const durationFor = (agent: string) =>
    steps.find((step) => step.agent === agent.replace(FAILED_SUFFIX, ''))?.durationMs ?? null

  return (
    <div className="space-y-2 rounded-lg border bg-card p-3">
      <p className="text-xs font-medium text-muted-foreground">Agents that contributed</p>

      <ol className="flex flex-wrap items-center gap-1">
        {agents.map((agent, index) => {
          const failed = isFailedAgent(agent)
          const duration = durationFor(agent)

          return (
            <li key={agent} className="flex items-center gap-1">
              {index > 0 && <ChevronRight className="size-3 text-muted-foreground/50" />}
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium',
                  failed ? 'bg-destructive/10 text-destructive' : 'bg-muted',
                )}
              >
                {failed ? (
                  <AlertCircle className="size-3" />
                ) : (
                  <Check className="size-3 text-success" />
                )}
                {agentDisplayName(agent)}
                {failed && ' failed'}
                {duration !== null && (
                  <span className="text-muted-foreground tabular-nums">
                    {formatDuration(duration)}
                  </span>
                )}
              </span>
            </li>
          )
        })}
      </ol>

      {reasoning && (
        <p className="border-t pt-2 text-xs leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Routing decision:</span> {reasoning}
        </p>
      )}
    </div>
  )
}
