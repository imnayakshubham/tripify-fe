import { AlertCircle, Check, Circle, Loader2 } from 'lucide-react'

import { agentDisplayName, formatDuration } from '@/lib/agents'
import { cn } from '@/lib/utils'
import type { PipelineStep } from '@/hooks/usePlanStream'

const ICONS = {
  pending: <Circle className="size-4 text-muted-foreground/40" />,
  running: <Loader2 className="size-4 animate-spin text-primary" />,
  succeeded: <Check className="size-4 text-emerald-600" />,
  failed: <AlertCircle className="size-4 text-destructive" />,
}

/**
 * Live agent activity, driven by the SSE stream.
 *
 * Every step here is real: the chain comes from the supervisor's own
 * `selected_agents`, and a step only settles when the backend says that node
 * finished. Nothing is simulated on a timer.
 */
export function AgentPipeline({
  steps,
  reasoning,
  elapsed,
}: {
  steps: PipelineStep[]
  reasoning: string
  elapsed?: number
}) {
  if (steps.length === 0) return null

  const settled = steps.filter(
    (step) => step.status === 'succeeded' || step.status === 'failed',
  ).length

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">Agents are working…</p>
        <p className="text-xs tabular-nums text-muted-foreground">
          {settled}/{steps.length}
          {elapsed !== undefined && ` · ${elapsed}s`}
        </p>
      </div>

      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${(settled / Math.max(steps.length, 1)) * 100}%` }}
        />
      </div>

      <ol className="space-y-2">
        {steps.map((step) => (
          <li key={step.agent} className="flex items-center gap-2.5 text-sm">
            {ICONS[step.status]}
            <span
              className={cn(
                step.status === 'pending' && 'text-muted-foreground',
                step.status === 'running' && 'font-medium',
              )}
            >
              {agentDisplayName(step.agent)}
            </span>
            {step.durationMs !== null && (
              <span className="text-xs text-muted-foreground">
                {formatDuration(step.durationMs)}
              </span>
            )}
          </li>
        ))}
      </ol>

      {reasoning && (
        <p className="border-t pt-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Routing decision:</span> {reasoning}
        </p>
      )}
    </div>
  )
}
