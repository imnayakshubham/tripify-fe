import { Ban, Star } from 'lucide-react'

import { Markdown } from '@/components/Markdown'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PlanResponse } from '@/types/api'

/**
 * Why this destination — including the ones that were ruled out.
 *
 * The rejected list is the visible evidence for the brief's hardest rule:
 * destination.py filters out any candidate the model flagged as breaking a hard
 * constraint *before* choosing, and records why. Showing it is the difference
 * between claiming the rule is enforced and demonstrating it.
 */
export function DestinationPanel({ plan }: { plan: PlanResponse }) {
  const choice = plan.destination_choice

  if (!choice) {
    if (!plan.destination_results) return null
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Destination</CardTitle>
        </CardHeader>
        <CardContent>
          <Markdown>{plan.destination_results}</Markdown>
        </CardContent>
      </Card>
    )
  }

  const candidates = choice.candidates ?? []
  const rejected = choice.rejected ?? []
  const recommended = choice.recommended_destination

  const alternatives = candidates.filter(
    (candidate) => candidate.destination !== recommended,
  )
  const winner = candidates.find((candidate) => candidate.destination === recommended)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Why this destination</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {winner && (
          <div className="space-y-1.5 rounded-lg bg-success/10 p-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Star className="size-3.5 text-success" />
              {winner.destination}
            </p>
            {winner.justification && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {winner.justification}
              </p>
            )}
            {winner.estimated_cost && (
              <p className="text-xs text-muted-foreground">
                Rough cost: {winner.estimated_cost}
              </p>
            )}
          </div>
        )}

        {alternatives.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Also considered</p>
            {alternatives.map((candidate, index) => (
              <div key={index} className="space-y-1 border-l-2 pl-3">
                <p className="text-xs font-medium">{candidate.destination}</p>
                {candidate.justification && (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {candidate.justification}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {rejected.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Ban className="size-3.5" />
              Ruled out
            </p>
            {rejected.map((entry, index) => (
              <div key={index} className="text-xs leading-relaxed">
                <span className="font-medium">{entry.destination}</span>
                {entry.reason && (
                  <span className="text-muted-foreground"> — {entry.reason}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
