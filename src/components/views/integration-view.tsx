'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Activity, Send, Inbox as InboxIcon, AlertTriangle, RotateCw,
  Loader2, RefreshCw, Zap, CheckCircle, XCircle, Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { ApiError } from '@/lib/api-client'

const API_BASE = '/api/v1'

interface DashboardData {
  outbox: {
    stats: Array<{ status: string; count: number }>
    total: number
    recent: Array<{
      id: string; eventType: string; eventVersion: string; status: string
      attempts: number; occurredAt: string; publishedAt: string | null; errorMessage: string | null
    }>
  }
  inbox: {
    stats: Array<{ consumerId: string; count: number }>
    total: number
  }
  saga: {
    stats: Array<{ status: string; count: number }>
    active: Array<{
      id: string; sagaDefinitionKey: string; correlationId: string
      status: string; currentStep: number; totalSteps: number; startedAt: string | null
    }>
  }
  deadLetter: {
    count: number
    messages: Array<{ id: string; eventType: string; attempts: number; errorMessage: string | null; createdAt: string }>
  }
  eventCatalog: {
    total: number
    events: Array<{ eventType: string; version: string; publisher: string; consumers: string[]; retryPolicy: string }>
  }
}

export function IntegrationView() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/integration`)
      const json = await res.json()
      setData(json.data)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleProcessOutbox = async () => {
    setProcessing(true)
    try {
      const res = await fetch(`${API_BASE}/integration`, { method: 'POST' })
      const json = await res.json()
      toast.success(`Outbox processed: ${json.data.published} published, ${json.data.failed} failed`)
      load()
    } catch (e) { toast.error('Failed to process outbox') } finally { setProcessing(false) }
  }

  if (loading || !data) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">داشبورد یکپارچگی</h1>
          <p className="text-muted-foreground mt-1">Sprint 3.5 — Integration (LAW-25/26/27)</p>
        </div>
        <Button onClick={handleProcessOutbox} disabled={processing}>
          {processing ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Zap className="w-4 h-4 ml-2" />}
          پردازش Outbox
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Send className="w-5 h-5 text-blue-500" />
              <Badge variant="outline">{data.outbox.total}</Badge>
            </div>
            <div className="text-2xl font-bold">{data.outbox.total}</div>
            <div className="text-xs text-muted-foreground">Outbox Messages</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <InboxIcon className="w-5 h-5 text-emerald-500" />
              <Badge variant="outline">{data.inbox.total}</Badge>
            </div>
            <div className="text-2xl font-bold">{data.inbox.total}</div>
            <div className="text-xs text-muted-foreground">Processed (Inbox)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-5 h-5 text-purple-500" />
              <Badge variant="outline">{data.saga.active.length}</Badge>
            </div>
            <div className="text-2xl font-bold">{data.saga.active.length}</div>
            <div className="text-xs text-muted-foreground">Active Sagas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <Badge variant={data.deadLetter.count > 0 ? 'destructive' : 'outline'}>{data.deadLetter.count}</Badge>
            </div>
            <div className="text-2xl font-bold">{data.deadLetter.count}</div>
            <div className="text-xs text-muted-foreground">Dead Letter Queue</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outbox Status */}
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Send className="w-5 h-5" /> Outbox Status</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.outbox.stats.map((s) => (
                <div key={s.status} className="flex items-center justify-between p-2 rounded-lg border">
                  <div className="flex items-center gap-2">
                    {s.status === 'published' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> :
                     s.status === 'dead_letter' ? <XCircle className="w-4 h-4 text-red-500" /> :
                     <Clock className="w-4 h-4 text-amber-500" />}
                    <span className="text-sm font-medium">{s.status}</span>
                  </div>
                  <Badge variant="outline">{s.count}</Badge>
                </div>
              ))}
              {data.outbox.stats.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No messages</p>}
            </div>
          </CardContent>
        </Card>

        {/* Inbox Status */}
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><InboxIcon className="w-5 h-5" /> Inbox (Processed Messages)</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {data.inbox.stats.map((s) => (
                <div key={s.consumerId} className="flex items-center justify-between p-2 rounded-lg border">
                  <span className="text-sm font-mono">{s.consumerId}</span>
                  <Badge variant="outline">{s.count}</Badge>
                </div>
              ))}
              {data.inbox.stats.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No processed messages yet</p>}
            </div>
          </CardContent>
        </Card>

        {/* Active Sagas */}
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Activity className="w-5 h-5" /> Active Sagas</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {data.saga.active.map((s) => (
                <div key={s.id} className="p-2 rounded-lg border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{s.sagaDefinitionKey}</span>
                    <Badge variant={s.status === 'running' ? 'default' : 'outline'}>{s.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Step {s.currentStep}/{s.totalSteps} • Correlation: {s.correlationId.slice(0, 8)}...
                  </div>
                </div>
              ))}
              {data.saga.active.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No active sagas</p>}
            </div>
          </CardContent>
        </Card>

        {/* Dead Letter Queue */}
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Dead Letter Queue</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {data.deadLetter.messages.map((m) => (
                <div key={m.id} className="p-2 rounded-lg border border-red-200 dark:border-red-900">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-mono">{m.eventType}</span>
                    <Badge variant="destructive">{m.attempts} attempts</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{m.errorMessage}</div>
                </div>
              ))}
              {data.deadLetter.messages.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No dead letter messages 🎉</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Event Catalog */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="w-5 h-5" /> Domain Event Catalog ({data.eventCatalog.total} events)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-[400px]">
            <table className="w-full">
              <thead className="border-b bg-muted/30 sticky top-0">
                <tr>
                  <th className="text-right p-2 text-xs font-medium">Event Type</th>
                  <th className="text-right p-2 text-xs font-medium">Version</th>
                  <th className="text-right p-2 text-xs font-medium">Publisher</th>
                  <th className="text-right p-2 text-xs font-medium">Consumers</th>
                  <th className="text-right p-2 text-xs font-medium">Retry</th>
                </tr>
              </thead>
              <tbody>
                {data.eventCatalog.events.map((e) => (
                  <tr key={e.eventType} className="border-b hover:bg-muted/20">
                    <td className="p-2 font-mono text-xs">{e.eventType}</td>
                    <td className="p-2"><Badge variant="outline" className="text-xs">v{e.version}</Badge></td>
                    <td className="p-2 text-sm">{e.publisher}</td>
                    <td className="p-2">
                      <div className="flex gap-1 flex-wrap">
                        {e.consumers.map((c) => <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>)}
                      </div>
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">{e.retryPolicy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Outbox Messages */}
      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Clock className="w-5 h-5" /> Recent Outbox Messages</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-[300px]">
            <table className="w-full">
              <thead className="border-b bg-muted/30 sticky top-0">
                <tr>
                  <th className="text-right p-2 text-xs font-medium">Event Type</th>
                  <th className="text-right p-2 text-xs font-medium">Version</th>
                  <th className="text-right p-2 text-xs font-medium">Status</th>
                  <th className="text-right p-2 text-xs font-medium">Attempts</th>
                  <th className="text-right p-2 text-xs font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {data.outbox.recent.map((m) => (
                  <tr key={m.id} className="border-b hover:bg-muted/20">
                    <td className="p-2 font-mono text-xs">{m.eventType}</td>
                    <td className="p-2"><Badge variant="outline" className="text-xs">v{m.eventVersion}</Badge></td>
                    <td className="p-2">
                      <Badge variant={m.status === 'published' ? 'default' : m.status === 'dead_letter' ? 'destructive' : 'secondary'} className="text-xs">
                        {m.status}
                      </Badge>
                    </td>
                    <td className="p-2 text-xs">{m.attempts}</td>
                    <td className="p-2 text-xs text-muted-foreground">{new Date(m.occurredAt).toLocaleString('fa-IR')}</td>
                  </tr>
                ))}
                {data.outbox.recent.length === 0 && (
                  <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No messages yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Law Info */}
      <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900">
        <CardContent className="p-3 text-xs space-y-1">
          <div><strong>LAW-25:</strong> تمام ارتباطات بین-Contextی از طریق Event (async) — بدون فراخوانی همزمان</div>
          <div><strong>LAW-26:</strong> تمام Eventها دقیقاً یک‌بار پردازش می‌شوند (Inbox + Idempotency)</div>
          <div><strong>LAW-27:</strong> تمام فرآیندهای طولانی به‌صورت Saga با Compensation پیاده‌سازی می‌شوند</div>
        </CardContent>
      </Card>
    </div>
  )
}
