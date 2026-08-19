import { Check, HelpCircle, Lightbulb, TriangleAlert } from 'lucide-react'

import { Markdown } from '@/components/Markdown'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  budgetLineCategory,
  CATEGORY_STYLE,
  formatMoney,
  summariseBudget,
  toNumber,
  type BudgetSummary,
} from '@/lib/trip'
import { cn } from '@/lib/utils'
import type { BudgetAssessment, CheaperAlternative, PlanResponse } from '@/types/api'

/** The bar, with a marker showing where the budget sits when we've gone past it. */
function BudgetBar({ summary }: { summary: BudgetSummary }) {
  if (summary.usedPercent === null) return null

  const over = summary.verdict === 'over'
  // When over, the bar is scaled to the total so the budget line sits inside it.
  const budgetMarker = over ? Math.round((100 / summary.usedPercent) * 100) : null

  return (
    <div className="space-y-1">
      <div
        className="relative h-2 w-full overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`${summary.usedPercent}% of budget used`}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all',
            summary.verdict === 'within' && 'bg-success',
            summary.verdict === 'over' && 'bg-destructive',
            summary.verdict === 'unverified' && 'bg-warning',
          )}
          style={{ width: `${Math.min(100, summary.usedPercent)}%` }}
        />
        {budgetMarker !== null && (
          <span
            className="absolute inset-y-0 w-0.5 bg-foreground/70"
            style={{ left: `${budgetMarker}%` }}
          />
        )}
      </div>
      {budgetMarker !== null && (
        <p className="text-[10px] text-muted-foreground" style={{ marginLeft: 0 }}>
          Marker shows your {formatMoney(summary.budget, summary.currency)} limit
        </p>
      )}
    </div>
  )
}

/** What the alternative would actually achieve — checked, not just quoted. */
function Alternative({
  alternative,
  assessment,
  summary,
}: {
  alternative: CheaperAlternative | string
  assessment: BudgetAssessment
  summary: BudgetSummary
}) {
  const description =
    typeof alternative === 'string' ? alternative : (alternative.description ?? '')
  const changes = typeof alternative === 'string' ? [] : (alternative.changes ?? [])
  const closesGap = assessment.alternative_closes_gap
  const resulting = assessment.alternative_resulting_total

  return (
    <div className="space-y-2 rounded-lg bg-warning/10 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold">
          <Lightbulb className="size-3.5 text-warning" />
          Cheaper alternative
        </p>
        {assessment.alternative_estimated_saving !== undefined && (
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            saves ~{formatMoney(assessment.alternative_estimated_saving, summary.currency)}
          </span>
        )}
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>

      {changes.length > 0 && (
        <ul className="space-y-1">
          {changes.map((change, index) => (
            <li key={index} className="flex justify-between gap-2 text-xs">
              <span className="min-w-0 text-muted-foreground">{change.change}</span>
              {toNumber(change.saving) !== null && (
                <span className="shrink-0 tabular-nums text-success">
                  −{formatMoney(change.saving, summary.currency)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Whether the alternative actually closes the gap. */}
      {closesGap === true && resulting !== undefined && (
        <p className="flex items-center gap-1.5 border-t border-warning/20 pt-2 text-xs font-medium text-success">
          <Check className="size-3.5" />
          New total {formatMoney(resulting, summary.currency)} — back within budget
        </p>
      )}
      {closesGap === false && resulting !== undefined && (
        <p className="flex gap-1.5 border-t border-warning/20 pt-2 text-xs font-medium text-destructive">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Still {formatMoney(resulting, summary.currency)} — this does not bring the trip
            within budget.
          </span>
        </p>
      )}
      {closesGap === null && (
        <p className="border-t border-warning/20 pt-2 text-xs text-muted-foreground">
          The saving was not quantified, so this is not confirmed to bring the trip within
          budget.
        </p>
      )}
    </div>
  )
}

export function BudgetPanel({ plan }: { plan: PlanResponse }) {
  const assessment = plan.budget_assessment
  const statedBudget = plan.trip_constraints?.budget_amount

  // A budget was stated but no check exists — say so rather than render nothing.
  if (!assessment && !plan.budget_results) {
    if (statedBudget === null || statedBudget === undefined) return null
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Budget</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="flex gap-2 rounded-lg bg-warning/10 p-3 text-xs leading-relaxed">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
            <span>
              You set a budget of{' '}
              {formatMoney(statedBudget, plan.trip_constraints?.budget_currency ?? '')}, but the
              budget check did not run or failed. This plan has <strong>not</strong> been
              costed against it.
            </span>
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!assessment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Budget</CardTitle>
        </CardHeader>
        <CardContent>
          <Markdown>{plan.budget_results}</Markdown>
        </CardContent>
      </Card>
    )
  }

  const summary = summariseBudget(assessment)
  // Biggest drivers first — that is what you act on when you need to cut.
  const lines = [...(assessment.breakdown ?? [])].sort(
    (a, b) => (toNumber(b.estimate) ?? 0) - (toNumber(a.estimate) ?? 0),
  )
  const largest = Math.max(...lines.map((line) => toNumber(line.estimate) ?? 0), 1)
  const totalOfLines = lines.reduce((sum, line) => sum + (toNumber(line.estimate) ?? 0), 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Budget</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-semibold tabular-nums">
              {formatMoney(summary.total, summary.currency)}
            </span>
            {summary.budget !== null && (
              <span className="text-xs text-muted-foreground">
                of {formatMoney(summary.budget, summary.currency)}
              </span>
            )}
          </div>

          <BudgetBar summary={summary} />

          {summary.verdict === 'within' && (
            <p className="flex items-center gap-1.5 text-xs text-success">
              <Check className="size-3.5" />
              Within budget
              {summary.headroom !== null &&
                ` — ${formatMoney(summary.headroom, summary.currency)} to spare`}
            </p>
          )}

          {summary.verdict === 'over' && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
              <TriangleAlert className="size-3.5" />
              Over budget by {formatMoney(summary.overage, summary.currency)}
              {summary.overagePercent !== null && ` (${summary.overagePercent}% over)`}
            </p>
          )}

          {summary.verdict === 'unverified' && (
            <p className="flex gap-1.5 rounded-md bg-warning/10 px-2 py-1.5 text-xs">
              <HelpCircle className="mt-0.5 size-3.5 shrink-0 text-warning" />
              <span className="text-muted-foreground">
                This estimate could not be checked against your budget
                {assessment.unverified_reason && ` — ${assessment.unverified_reason}`}. Treat
                the total as unverified.
              </span>
            </p>
          )}
        </div>

        {lines.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            {summary.verdict === 'over' && (
              <p className="text-xs font-semibold text-muted-foreground">Biggest drivers</p>
            )}
            <ul className="space-y-2">
              {lines.map((line, index) => {
                const style = CATEGORY_STYLE[budgetLineCategory(line.category)]
                const value = toNumber(line.estimate) ?? 0
                const share = totalOfLines > 0 ? Math.round((value / totalOfLines) * 100) : null

                return (
                  <li key={index} className="space-y-1" title={line.notes || undefined}>
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate capitalize">{line.category}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {formatMoney(line.estimate, summary.currency)}
                        {share !== null && summary.verdict === 'over' && (
                          <span className="ml-1.5 text-[10px]">{share}%</span>
                        )}
                      </span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn('h-full rounded-full', style.dot)}
                        style={{ width: `${Math.max(2, (value / largest) * 100)}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {summary.verdict === 'over' &&
          (assessment.cheaper_alternative ? (
            <Alternative
              alternative={assessment.cheaper_alternative}
              assessment={assessment}
              summary={summary}
            />
          ) : (
            <p className="flex gap-2 rounded-lg bg-destructive/10 p-3 text-xs leading-relaxed">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
              <span>
                No cheaper alternative was produced. Treat this plan as unaffordable as
                specified — shorten the trip, pick a lower-cost destination, or raise the
                budget before booking.
              </span>
            </p>
          ))}

        {assessment.assessment && (
          <p className="border-t pt-3 text-xs leading-relaxed text-muted-foreground">
            {assessment.assessment}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
