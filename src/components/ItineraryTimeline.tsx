import { Clock, Info, TriangleAlert } from 'lucide-react'

import { CategoryTag } from '@/components/CategoryTag'
import { Markdown } from '@/components/Markdown'
import { CATEGORY_STYLE, normaliseCategory } from '@/lib/trip'
import { cn } from '@/lib/utils'
import type { ItineraryDay, ItinerarySegment, PlanResponse } from '@/types/api'

const PART_ORDER: Record<string, number> = { morning: 0, afternoon: 1, evening: 2 }

function sortSegments(segments: ItinerarySegment[]): ItinerarySegment[] {
  return [...segments].sort(
    (a, b) =>
      (PART_ORDER[String(a.part_of_day).toLowerCase()] ?? 9) -
      (PART_ORDER[String(b.part_of_day).toLowerCase()] ?? 9),
  )
}

function Segment({ segment, last }: { segment: ItinerarySegment; last: boolean }) {
  const style = CATEGORY_STYLE[normaliseCategory(segment.category)]

  return (
    <li className="relative flex gap-4 pb-5 last:pb-0">
      {/* Rail: a dot on the line, coloured by category. */}
      {!last && <span className="absolute top-4 left-[5px] h-full w-px bg-border" />}
      <span className={cn('mt-1.5 size-2.5 shrink-0 rounded-full ring-4 ring-background', style.dot)} />

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          {segment.part_of_day && (
            <span className="text-xs font-medium text-muted-foreground capitalize">
              {String(segment.part_of_day)}
            </span>
          )}
          <CategoryTag category={segment.category} />
          {segment.duration && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3" />
              {segment.duration}
            </span>
          )}
        </div>

        <p className="text-sm leading-relaxed">{segment.activity}</p>

        {/* The brief's "must say so when uncertain" rule, made visible. */}
        {segment.uncertainty && (
          <p className="flex gap-1.5 rounded-md bg-warning/10 px-2 py-1.5 text-xs text-muted-foreground">
            <TriangleAlert className="mt-0.5 size-3 shrink-0 text-warning" />
            <span>{segment.uncertainty}</span>
          </p>
        )}
      </div>
    </li>
  )
}

function Day({ day }: { day: ItineraryDay }) {
  const segments = sortSegments(day.segments ?? [])

  return (
    <section className="space-y-3">
      <header className="flex items-baseline gap-3">
        <h4 className="text-sm font-semibold">Day {day.day ?? '?'}</h4>
        {day.title && (
          <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
            {day.title}
          </span>
        )}
        <span className="shrink-0 text-xs text-muted-foreground">
          {segments.length} {segments.length === 1 ? 'stop' : 'stops'}
        </span>
      </header>

      <ol className="pl-1">
        {segments.map((segment, index) => (
          <Segment
            key={`${segment.part_of_day}-${index}`}
            segment={segment}
            last={index === segments.length - 1}
          />
        ))}
      </ol>
    </section>
  )
}

/**
 * The day-by-day plan.
 *
 * Falls back to the markdown rendering when the model's JSON didn't parse — the
 * backend keeps the raw text in `itinerary` precisely so this stays possible.
 */
export function ItineraryTimeline({ plan }: { plan: PlanResponse }) {
  const structured = plan.itinerary_plan
  const days = structured?.days ?? []

  if (days.length === 0) {
    if (!plan.itinerary) return null
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Day by day</h3>
        <Markdown>{plan.itinerary}</Markdown>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold">Day by day</h3>

      {structured?.summary && (
        <p className="text-sm leading-relaxed text-muted-foreground">{structured.summary}</p>
      )}

      <div className="space-y-6">
        {days.map((day, index) => (
          <Day key={day.day ?? index} day={day} />
        ))}
      </div>

      {(structured?.uncertainties?.length ?? 0) > 0 && (
        <div className="space-y-2 rounded-lg border border-dashed p-4">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold">
            <Info className="size-3.5 text-muted-foreground" />
            Check before booking
          </h4>
          <ul className="space-y-1">
            {structured?.uncertainties?.map((item, index) => (
              <li key={index} className="text-xs leading-relaxed text-muted-foreground">
                — {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
