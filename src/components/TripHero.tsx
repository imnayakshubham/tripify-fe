import { CalendarDays, Check, HelpCircle, MapPin, TriangleAlert, Wallet } from 'lucide-react'

import { formatMoney, hueFromText, summariseBudget } from '@/lib/trip'
import { cn } from '@/lib/utils'
import type { PlanResponse } from '@/types/api'

function Chip({
  icon: Icon,
  children,
  tone = 'plain',
}: {
  icon: typeof MapPin
  children: React.ReactNode
  tone?: 'plain' | 'good' | 'bad' | 'warn'
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur-sm',
        tone === 'plain' && 'bg-white/15 text-white',
        tone === 'good' && 'bg-white/90 text-emerald-700',
        tone === 'bad' && 'bg-white/90 text-red-700',
        tone === 'warn' && 'bg-white/90 text-amber-700',
      )}
    >
      <Icon className="size-3.5" />
      {children}
    </span>
  )
}

/**
 * The one-glance answer: where, how long, what it costs, and whether that fits.
 *
 * The banner is a gradient seeded from the destination name rather than a photo
 * — no network request, and it can never show the wrong city.
 */
export function TripHero({ plan }: { plan: PlanResponse }) {
  const constraints = plan.trip_constraints ?? {}
  const destination =
    plan.destination_choice?.recommended_destination ||
    constraints.destination ||
    'Your trip'

  const days = constraints.duration_days
  const budget = plan.budget_assessment ? summariseBudget(plan.budget_assessment) : null

  const hue = hueFromText(destination)

  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <div
        className="relative px-6 py-8 sm:px-8 sm:py-10"
        style={{
          backgroundImage: `linear-gradient(135deg,
            oklch(0.55 0.16 ${hue}) 0%,
            oklch(0.45 0.14 ${(hue + 40) % 360}) 55%,
            oklch(0.36 0.11 ${(hue + 80) % 360}) 100%)`,
        }}
      >
        <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-white/70 uppercase">
          <MapPin className="size-3.5" />
          Recommended trip
        </div>

        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {destination}
        </h2>

        <div className="mt-4 flex flex-wrap gap-2">
          {typeof days === 'number' && (
            <Chip icon={CalendarDays}>
              {days} {days === 1 ? 'day' : 'days'}
            </Chip>
          )}

          {budget !== null && budget.total !== null && (
            <Chip icon={Wallet}>
              {formatMoney(budget.total, budget.currency)}
              {budget.budget !== null && (
                <span className="text-white/70">
                  {' '}
                  of {formatMoney(budget.budget, budget.currency)}
                </span>
              )}
            </Chip>
          )}

          {/* Not gated on budget !== null: an overage detected from the user's
              own constraints must show even when the model omitted the figure. */}
          {budget !== null && budget.verdict === 'within' && (
            <Chip icon={Check} tone="good">
              Within budget
              {budget.headroom !== null &&
                ` · ${formatMoney(budget.headroom, budget.currency)} spare`}
            </Chip>
          )}
          {budget !== null && budget.verdict === 'over' && (
            <Chip icon={TriangleAlert} tone="bad">
              Over by {formatMoney(budget.overage, budget.currency)}
              {budget.overagePercent !== null && ` · ${budget.overagePercent}%`}
            </Chip>
          )}
          {budget !== null && budget.verdict === 'unverified' && (
            <Chip icon={HelpCircle} tone="warn">
              Budget not verified
            </Chip>
          )}
        </div>
      </div>
    </div>
  )
}
