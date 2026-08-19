import { useEffect, useRef, useState } from 'react'
import { AlertCircle, ArrowUp, Compass, MessageSquarePlus, Square } from 'lucide-react'

import { AgentPipeline } from '@/components/AgentPipeline'
import { PlanResult } from '@/components/PlanResult'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import type { PlanStream } from '@/hooks/usePlanStream'
import type { PlanResponse } from '@/types/api'

const EXAMPLES = [
  'A five day trip somewhere warm in Europe for under 1500 pounds',
  'Four days in Lisbon in October, no flights over 3 hours',
  'A week in Japan for two on a 4000 pound budget, food focused',
]

function useElapsed(running: boolean): number {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!running) return
    setElapsed(0)
    const started = Date.now()
    const timer = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - started) / 1000)),
      1000,
    )
    return () => window.clearInterval(timer)
  }, [running])

  return elapsed
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    // svh, not dvh: the block must not re-centre itself while the on-screen
    // keyboard is opening.
    <div className="flex min-h-[60svh] flex-col items-center justify-center gap-6 text-center">
      <div className="space-y-2">
        <Compass className="mx-auto size-8 text-muted-foreground" />
        <h2 className="text-xl font-semibold tracking-tight">Where do you want to go?</h2>
      </div>

      <div className="flex w-full max-w-lg flex-col gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => onPick(example)}
            className="rounded-xl border px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  )
}

export function PlanView({
  stream,
  openedPlan,
  openedLoading,
  openedError,
  onNewTrip,
}: {
  stream: PlanStream
  openedPlan: PlanResponse | null
  openedLoading: boolean
  openedError: string | null
  onNewTrip: () => void
}) {
  const [query, setQuery] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const { phase, steps, supervisorReasoning, plan, error, submit, cancel } = stream
  const running = phase === 'running'
  const elapsed = useElapsed(running)

  // The result is long; start at the top of each new one rather than wherever
  // the previous scroll position happened to be.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [plan, openedPlan])

  const shown = plan ?? openedPlan
  const idle = phase === 'idle' && !shown && !openedLoading && !openedError

  function run(text: string) {
    if (!text.trim() || running) return
    // Continue the plan on screen so a follow-up refines it; "new trip" clears
    // `shown`, which is what starts a fresh thread.
    void submit(text.trim(), shown?.plan_id)
    setQuery('')
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {/* @container so PlanResult splits on the width of the well it actually
            has, which also changes when the sidebar collapses — something no
            viewport breakpoint can see. */}
        <div className="mx-auto @container max-w-4xl px-4 py-4 sm:px-6 sm:py-6">
          {idle && <EmptyState onPick={run} />}

          {openedLoading && (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          )}

          {openedError && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Something Went Wrong</AlertTitle>
              <AlertDescription>{openedError}</AlertDescription>
            </Alert>
          )}

          {running && (
            <AgentPipeline steps={steps} reasoning={supervisorReasoning} elapsed={elapsed} />
          )}

          {phase === 'error' && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>The planning run failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!running && shown && <PlanResult plan={shown} steps={steps} />}
        </div>
      </div>

      {/* pb clears the iPhone home indicator; relative anchors the FAB to the
          top edge of the composer whatever height the textarea has grown to. */}
      <div className="relative border-t bg-background pb-[env(safe-area-inset-bottom)]">
        {!idle && (
          <Button
            type="button"
            size="icon-lg"
            onClick={onNewTrip}
            className="absolute right-4 bottom-full mb-3 rounded-full shadow-lg md:hidden"
          >
            <MessageSquarePlus />
            <span className="sr-only">New trip</span>
          </Button>
        )}

        <form
          className="mx-auto max-w-4xl px-4 py-3 sm:px-6 sm:py-4"
          onSubmit={(event) => {
            event.preventDefault()
            run(query)
          }}
        >
          <div className="relative rounded-2xl border bg-card shadow-sm focus-within:ring-1 focus-within:ring-ring">
            <Textarea
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Describe the trip you want…"
              rows={1}
              disabled={running}
              className="max-h-40 min-h-[3rem] resize-none border-0 bg-transparent py-3.5 pr-14 pl-4 shadow-none focus-visible:ring-0"
              onKeyDown={(event) => {
                // Enter sends, Shift+Enter makes a new line.
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  run(query)
                }
              }}
            />

            {/* size-9 on mobile: icon-sm is 28px, well under a 44px target, and
                this is the most-used control on a phone. */}
            <div className="absolute right-2 bottom-2">
              {running ? (
                <Button
                  type="button"
                  size="icon-sm"
                  variant="secondary"
                  onClick={cancel}
                  className="size-9 sm:size-7"
                >
                  <Square />
                  <span className="sr-only">Stop</span>
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="icon-sm"
                  disabled={!query.trim()}
                  className="size-9 sm:size-7"
                >
                  <ArrowUp />
                  <span className="sr-only">Plan this trip</span>
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
