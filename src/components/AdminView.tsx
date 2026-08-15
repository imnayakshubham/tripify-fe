import { useCallback } from 'react'
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
import { useApiResource } from '@/hooks/useApiResource'
import { agentDisplayName, formatDuration } from '@/lib/agents'
import { getMetrics, listInvocations } from '@/lib/api'

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  )
}

/**
 * The observability view, and the second half of the role difference: both
 * endpoints below are admin-only in the API (require_admin), so this is a real
 * server-side boundary rather than a hidden tab.
 */
export function AdminView() {
  const loadMetrics = useCallback(() => getMetrics(7), [])
  const loadInvocations = useCallback(() => listInvocations(50), [])

  const metrics = useApiResource(loadMetrics, [])
  const invocations = useApiResource(loadInvocations, [])

  const loading = metrics.loading || invocations.loading
  const error = metrics.error ?? invocations.error

  const reload = () => {
    metrics.reload()
    invocations.reload()
  }

  if (error) {
    return (
      <Alert variant={metrics.forbidden ? 'default' : 'destructive'}>
        <AlertCircle />
        <AlertTitle>
          {metrics.forbidden ? 'Admin role required' : 'Could not load metrics'}
        </AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Tile label="Requests" value={metrics.data.total_requests} />
              <Tile label="Active users" value={metrics.data.active_users} />
              <Tile label="LLM calls" value={metrics.data.llm_calls} />
              <Tile
                label="Tokens in / out"
                value={`${metrics.data.input_tokens} / ${metrics.data.output_tokens}`}
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Per agent</h3>
              <div className="overflow-x-auto rounded-lg border">
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
          <div className="overflow-x-auto rounded-lg border">
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
                    <TableCell className="max-w-xs truncate text-xs" title={entry.user_query}>
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
        )}
      </div>
    </div>
  )
}
