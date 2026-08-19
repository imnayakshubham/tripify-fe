import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, RefreshCw } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { agentDisplayName, formatDuration } from '@/lib/agents'
import { ApiError, getMetrics, listInvocations } from '@/lib/api'

function Tile({
  label,
  value,
  className,
}: {
  label: string
  value: string | number
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xl font-semibold tabular-nums sm:text-2xl">{value}</p>
      </CardContent>
    </Card>
  )
}

/** One labelled figure inside a mobile card, standing in for a table cell. */
function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] text-muted-foreground uppercase">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}

/**
 * The observability view, and the second half of the role difference: both
 * endpoints below are admin-only in the API (require_admin), so this is a real
 * server-side boundary rather than a hidden tab.
 */
export function AdminView() {
  const metrics = useQuery({ queryKey: ['metrics', 7], queryFn: () => getMetrics(7) })
  const invocations = useQuery({
    queryKey: ['invocations', 50],
    queryFn: () => listInvocations(50),
  })

  const loading = metrics.isPending || invocations.isPending
  const failure = metrics.error ?? invocations.error

  const reload = () => {
    void metrics.refetch()
    void invocations.refetch()
  }

  if (failure) {
    // A 403 is the expected answer for a non-admin, not a breakage.
    const forbidden = failure instanceof ApiError && failure.isForbidden

    return (
      <Alert variant={forbidden ? 'default' : 'destructive'}>
        <AlertCircle />
        <AlertTitle>{forbidden ? 'Admin role required' : 'Could not load metrics'}</AlertTitle>
        <AlertDescription>{failure.message}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Last {metrics.data?.window_days ?? 7} days.
        </p>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
          <RefreshCw className={loading ? 'animate-spin' : undefined} />
          Refresh
        </Button>
      </div>

      {loading && !metrics.data ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        metrics.data && (
          <>
            {/* Two-up on a phone: one-up meant four screens of scrolling for
                four numbers. */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <Tile label="Requests" value={metrics.data.total_requests} />
              <Tile label="Active users" value={metrics.data.active_users} />
              <Tile label="LLM calls" value={metrics.data.llm_calls} />
              <Tile
                label="Tokens in / out"
                value={`${metrics.data.input_tokens} / ${metrics.data.output_tokens}`}
                className="col-span-2 lg:col-span-1"
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Per agent</h3>

              {/* Six columns are unreadable at 375px, so below md each row is a
                  card with its figures labelled. */}
              <div className="grid gap-2 md:hidden">
                {metrics.data.agents.map((agent) => (
                  <div key={agent.agent_name} className="rounded-lg border p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium">
                        {agentDisplayName(agent.agent_name)}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {agent.invocations} calls
                      </span>
                    </div>
                    <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                      <Field
                        label="Failed"
                        value={
                          agent.failed > 0 ? (
                            <span className="text-destructive">{agent.failed}</span>
                          ) : (
                            0
                          )
                        }
                      />
                      <Field label="Avg" value={formatDuration(agent.avg_duration_ms)} />
                      <Field label="p95" value={formatDuration(agent.p95_duration_ms)} />
                      <Field
                        label="Tokens in / out"
                        value={`${agent.input_tokens} / ${agent.output_tokens}`}
                      />
                    </dl>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto rounded-lg border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead className="text-right">Invocations</TableHead>
                      <TableHead className="text-right">Failed</TableHead>
                      <TableHead className="text-right">Avg</TableHead>
                      <TableHead className="text-right">p95</TableHead>
                      <TableHead className="text-right">Tokens in / out</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.data.agents.map((agent) => (
                      <TableRow key={agent.agent_name}>
                        <TableCell>{agentDisplayName(agent.agent_name)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {agent.invocations}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {agent.failed > 0 ? (
                            <span className="text-destructive">{agent.failed}</span>
                          ) : (
                            0
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatDuration(agent.avg_duration_ms)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatDuration(agent.p95_duration_ms)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {agent.input_tokens} / {agent.output_tokens}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Recent agent invocations</h3>
        {loading && !invocations.data ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <>
            <div className="grid gap-2 md:hidden">
              {invocations.data?.map((entry, index) => (
                <div
                  key={`${entry.request_id}-${entry.agent_name}-${index}`}
                  className="space-y-1.5 rounded-lg border p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">
                      {agentDisplayName(entry.agent_name)}
                    </span>
                    <Badge
                      variant={entry.status === 'failed' ? 'destructive' : 'outline'}
                      title={entry.error_message ?? undefined}
                    >
                      {entry.status}
                    </Badge>
                  </div>
                  <p className="text-xs break-words text-muted-foreground">
                    {entry.user_query}
                  </p>
                  <div className="flex justify-between gap-2 text-xs text-muted-foreground tabular-nums">
                    <span>{new Date(entry.started_at).toLocaleString()}</span>
                    <span className="shrink-0">{formatDuration(entry.duration_ms)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Started</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Request</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invocations.data?.map((entry, index) => (
                  <TableRow key={`${entry.request_id}-${entry.agent_name}-${index}`}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(entry.started_at).toLocaleString()}
                    </TableCell>
                    <TableCell>{agentDisplayName(entry.agent_name)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={entry.status === 'failed' ? 'destructive' : 'outline'}
                        title={entry.error_message ?? undefined}
                      >
                        {entry.status}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className="max-w-[12rem] truncate text-xs lg:max-w-xs"
                      title={entry.user_query}
                    >
                      {entry.user_query}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      {formatDuration(entry.duration_ms)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
