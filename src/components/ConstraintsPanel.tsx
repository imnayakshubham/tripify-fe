import { Lock, Heart } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatMoney } from '@/lib/trip'
import type { TripConstraints } from '@/types/api'

/**
 * What the supervisor understood from the request.
 *
 * Worth showing because it is where a bad plan usually starts: if the hard
 * constraints here are wrong, everything downstream is confidently wrong too.
 */
export function ConstraintsPanel({ constraints }: { constraints: TripConstraints }) {
  const hard = constraints.hard_constraints ?? []
  const soft = constraints.soft_preferences ?? []

  const facts = [
    constraints.origin && ['From', constraints.origin],
    typeof constraints.duration_days === 'number' && [
      'Duration',
      `${constraints.duration_days} days`,
    ],
    typeof constraints.budget_amount === 'number' && [
      'Budget',
      formatMoney(constraints.budget_amount, constraints.budget_currency ?? ''),
    ],
  ].filter(Boolean) as [string, string][]

  if (facts.length === 0 && hard.length === 0 && soft.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">What we understood</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {facts.length > 0 && (
          <dl className="space-y-1.5">
            {facts.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-2 text-xs">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        )}

        {hard.length > 0 && (
          <div className="space-y-1.5 border-t pt-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold">
              <Lock className="size-3 text-muted-foreground" />
              Must not be broken
            </p>
            <ul className="space-y-1">
              {hard.map((item, index) => (
                <li key={index} className="text-xs leading-relaxed text-muted-foreground">
                  — {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {soft.length > 0 && (
          <div className="space-y-1.5 border-t pt-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold">
              <Heart className="size-3 text-muted-foreground" />
              Nice to have
            </p>
            <ul className="space-y-1">
              {soft.map((item, index) => (
                <li key={index} className="text-xs leading-relaxed text-muted-foreground">
                  — {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
