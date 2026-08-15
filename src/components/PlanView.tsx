import { useEffect, useRef, useState } from 'react'
import { AlertCircle, ArrowUp, Compass, Square } from 'lucide-react'

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
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
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
            className="rounded-xl border px-4 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
}: {
  stream: PlanStream
  openedPlan: PlanResponse | null
  openedLoading: boolean
  openedError: string | null
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
    void submit(text.trim())
    setQuery('')
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto h-full max-w-4xl px-6 py-6">
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
              <AlertTitle>Could not open that trip</AlertTitle>
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

      <div className="border-t bg-background">
        <form
          className="mx-auto max-w-4xl px-6 py-4"
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

            <div className="absolute right-2 bottom-2">
              {running ? (
                <Button type="button" size="icon-sm" variant="secondary" onClick={cancel}>
                  <Square />
                  <span className="sr-only">Stop</span>
                </Button>
              ) : (
                <Button type="submit" size="icon-sm" disabled={!query.trim()}>
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
