import { ChevronDown, FileText } from 'lucide-react'

import { AgentTrail } from '@/components/AgentTrail'
import { BudgetPanel } from '@/components/BudgetPanel'
import { ConstraintsPanel } from '@/components/ConstraintsPanel'
import { DestinationPanel } from '@/components/DestinationPanel'
import { ItineraryTimeline } from '@/components/ItineraryTimeline'
import { Markdown } from '@/components/Markdown'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Card, CardContent } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

import { TripHero } from '@/components/TripHero'
import type { PipelineStep } from '@/hooks/usePlanStream'
import type { PlanResponse } from '@/types/api'

/** The three markdown blobs, kept for transparency and as the parse fallback. */
function RawAgentOutput({ plan }: { plan: PlanResponse }) {
  const sections = [
    { label: 'Destination', body: plan.destination_results },
    { label: 'Itinerary', body: plan.itinerary },
    { label: 'Budget', body: plan.budget_results },
  ].filter((section) => section.body)

  if (sections.length === 0) return null

  return (
    <Accordion type="single" collapsible className="rounded-lg border px-4">
      {sections.map((section) => (
        <AccordionItem key={section.label} value={section.label}>
          <AccordionTrigger className="text-sm">
            Raw output — {section.label} agent
          </AccordionTrigger>
          <AccordionContent>
            <Markdown>{section.body}</Markdown>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

function hasTripContent(plan: PlanResponse): boolean {
  const constraints = plan.trip_constraints ?? {}

  return Boolean(
    plan.destination_choice ||
    plan.itinerary_plan ||
    plan.budget_assessment ||
    plan.destination_results ||
    plan.itinerary ||
    plan.budget_results ||
    constraints.destination ||
    typeof constraints.duration_days === 'number',
  )
}

export function PlanResult({
  plan,
  steps,
}: {
  plan: PlanResponse
  steps?: PipelineStep[]
}) {
  if (!hasTripContent(plan)) {
    return (
      <div className="space-y-6">
        {plan.answer && (
          <Card>
            <CardContent className="pt-6">
              <Markdown>{plan.answer}</Markdown>
            </CardContent>
          </Card>
        )}

        <AgentTrail
          agents={plan.contributing_agents}
          steps={steps}
          reasoning={plan.supervisor_reasoning}
        />
      </div>
    )
  }

  const hasItinerary = Boolean(plan.itinerary_plan?.days?.length || plan.itinerary)

  return (
    <div className="space-y-6">
      <TripHero plan={plan} />

      <AgentTrail
        agents={plan.contributing_agents}
        steps={steps}
        reasoning={plan.supervisor_reasoning}
      />

      {/* @3xl is 48rem of the well PlanView measures, not of the viewport — a
          viewport breakpoint can't see the sidebar collapsing. */}
      <div className="grid gap-4 @3xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] @3xl:gap-6">
        {/* Context for the decision: what we understood, where, and what it costs. */}
        <aside className="space-y-4 @3xl:sticky @3xl:top-6 @3xl:self-start">
          <ConstraintsPanel constraints={plan.trip_constraints ?? {}} />
          <DestinationPanel plan={plan} />
          <BudgetPanel plan={plan} />
        </aside>

        {/* Gated: ItineraryTimeline returns null with no days, and an ungated Card
            leaves an empty bordered box behind. */}
        {hasItinerary && (
          <div className="min-w-0">
            <Card>
              <CardContent className="pt-6">
                <ItineraryTimeline plan={plan} />
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {plan.answer && (
        <Collapsible>
          <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium hover:bg-muted/50">
            <FileText className="size-4 text-muted-foreground" />
            Full write-up
            <ChevronDown className="ml-auto size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 py-4">
            <Markdown>{plan.answer}</Markdown>
          </CollapsibleContent>
        </Collapsible>
      )}

      <RawAgentOutput plan={plan} />
    </div>
  )
}
