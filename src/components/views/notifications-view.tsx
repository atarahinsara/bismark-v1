'use client'

import { useState, useEffect, useCallback, type ReactNode } from 'react'
import {
  Mail, MessageSquare, Phone, Bell, Smartphone, Plus, RefreshCw,
  Eye, Send, RotateCw, Ban, Loader2, CheckCircle, XCircle, Clock,
  AlertTriangle, ChevronLeft, ChevronRight, Copy, Zap, Inbox as InboxIcon,
  Activity, AlertOctagon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  notificationsApi, notificationQueueApi, notificationTemplatesApi,
  type Notification, type NotificationDelivery, type NotificationQueueItem,
  type NotificationQueueList, type NotificationChannel, type NotificationTemplate,
} from '@/lib/api-client'
import type { ApiError } from '@/lib/api-client'

// ============================================================
// Constants
// ============================================================

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  email: 'ایمیل',
  sms: 'پیامک',
  whatsapp: 'واتساپ',
  push: 'پوش',
  inapp: 'درون‌برنامه‌ای',
}

const CHANNEL_ICONS: Record<NotificationChannel, any> = {
  email: Mail,
  sms: MessageSquare,
  whatsapp: Phone,
  push: Smartphone,
  inapp: Bell,
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'در انتظار',
  queued: 'در صف',
  sending: 'در حال ارسال',
  sent: 'ارسال شد',
  failed: 'خطا',
  retrying: 'تلاش مجدد',
  cancelled: 'لغو شد',
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  queued: 'secondary',
  sending: 'default',
  sent: 'default',
  failed: 'destructive',
  retrying: 'secondary',
  cancelled: 'outline',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-amber-500',
  queued: 'text-amber-500',
  sending: 'text-blue-500',
  sent: 'text-emerald-500',
  failed: 'text-red-500',
  retrying: 'text-orange-500',
  cancelled: 'text-muted-foreground',
}

const PER_PAGE = 15

// Terminal statuses (cannot retry / cancel)
const TERMINAL_STATUSES = new Set(['sent', 'failed', 'cancelled'])
const CANCELABLE_STATUSES = new Set(['pending', 'queued', 'sending', 'retrying'])
const RETRYABLE_STATUSES = new Set(['failed', 'retrying'])

const DEFAULT_SEND_VARIABLES = `{
  "customer": { "name": "علی رضایی" },
  "invoice": { "number": "INV-001", "total": "1,200,000" },
  "company": { "name": "BISMARK" },
  "currentDate": "۱۴۰۳/۰۷/۲۵",
  "trackingCode": "TRK-12345",
  "warranty": { "expiry": "۱۴۰۵/۰۷/۲۵" },
  "service": { "number": "SRV-001" }
}`

// ============================================================
// Helpers
// ============================================================

function timeAgo(date: string | null): string {
  if (!date) return '—'
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'همین الان'
  if (minutes < 60) return `${minutes.toLocaleString('fa-IR')} دقیقه پیش`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours.toLocaleString('fa-IR')} ساعت پیش`
  const days = Math.floor(hours / 24)
  return `${days.toLocaleString('fa-IR')} روز پیش`
}

function formatDateTime(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' })
}

function isApiError(e: unknown): e is ApiError {
  return typeof e === 'object' && e !== null && 'detail' in e && 'status' in e
}

function extractError(e: unknown, fallback = 'خطای ناشناخته'): string {
  if (isApiError(e)) return e.detail || fallback
  if (e instanceof Error) return e.message
  return fallback
}

function truncate(s: string | null | undefined, n = 24): string {
  if (!s) return '—'
  return s.length > n ? `${s.slice(0, n)}…` : s
}

function toPersianNumber(n: number): string {
  return n.toLocaleString('fa-IR')
}

// ============================================================
// Small sub-components
// ============================================================

function ChannelBadge({ channel, withLabel = true }: { channel: NotificationChannel; withLabel?: boolean }) {
  const Icon = CHANNEL_ICONS[channel] || Bell
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="w-4 h-4 text-muted-foreground" />
      {withLabel && <span className="text-xs">{CHANNEL_LABELS[channel] || channel}</span>}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_VARIANTS[status] || 'secondary'} className="text-xs">
      {STATUS_LABELS[status] || status}
    </Badge>
  )
}

function DeliveryStatusIcon({ status }: { status: NotificationDelivery['status'] }) {
  if (status === 'sent') return <CheckCircle className="w-4 h-4 text-emerald-500" />
  if (status === 'failed') return <XCircle className="w-4 h-4 text-red-500" />
  return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
}

// ============================================================
// Main View
// ============================================================

export function NotificationsView() {
  // ----- Notifications list state -----
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [channelFilter, setChannelFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  // ----- Detail dialog state -----
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [retryingId, setRetryingId] = useState<string | null>(null)

  // ----- Send dialog state -----
  const [sendOpen, setSendOpen] = useState(false)
  const [sendDialogKey, setSendDialogKey] = useState(0)
  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)

  // ----- Cancel dialog state -----
  const [cancelTarget, setCancelTarget] = useState<Notification | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelledBy, setCancelledBy] = useState('admin')
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  // ----- Queue monitor state -----
  const [queueReady, setQueueReady] = useState<NotificationQueueList[]>([])
  const [queueDlq, setQueueDlq] = useState<NotificationQueueList[]>([])
  const [queueLoading, setQueueLoading] = useState(false)
  const [processingQueue, setProcessingQueue] = useState(false)
  const [retryingDlq, setRetryingDlq] = useState(false)

  // ============================================================
  // Load notifications list
  // ============================================================
  const loadNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const params: { page: number; perPage: number; status?: string; channel?: string } = {
        page,
        perPage: PER_PAGE,
      }
      if (statusFilter !== 'all') params.status = statusFilter
      if (channelFilter !== 'all') params.channel = channelFilter
      const res = await notificationsApi.list(params)
      setNotifications(res.data)
      setTotal(res.meta.total)
      setLastPage(res.meta.last_page)
    } catch (e) {
      toast.error('بارگذاری اعلان‌ها ناموفق بود', { description: extractError(e) })
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, channelFilter])

  // ============================================================
  // Load queue (ready/pending + dlq) — parallel
  // ============================================================
  const loadQueue = useCallback(async () => {
    setQueueLoading(true)
    try {
      const [readyRes, dlqRes] = await Promise.all([
        notificationQueueApi.list({ status: 'pending', perPage: 10 }),
        notificationQueueApi.list({ status: 'dlq', perPage: 10 }),
      ])
      setQueueReady(readyRes.data)
      setQueueDlq(dlqRes.data)
    } catch (e) {
      toast.error('بارگذاری صف ناموفق بود', { description: extractError(e) })
    } finally {
      setQueueLoading(false)
    }
  }, [])

  // ============================================================
  // Load templates (for send dialog) — lazy, on dialog open
  // ============================================================
  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true)
    try {
      const res = await notificationTemplatesApi.list({ perPage: 50, status: 'published' })
      setTemplates(res.data)
    } catch (e) {
      toast.error('بارگذاری الگوها ناموفق بود', { description: extractError(e) })
    } finally {
      setTemplatesLoading(false)
    }
  }, [])

  useEffect(() => { loadNotifications() }, [loadNotifications])
  useEffect(() => { loadQueue() }, [loadQueue])

  // ============================================================
  // Detail open — fetch full notification with deliveries + queueItems
  // ============================================================
  const openDetail = useCallback(async (n: Notification) => {
    setDetailOpen(true)
    setSelectedNotification(null)
    setDetailLoading(true)
    try {
      const res = await notificationsApi.get(n.id)
      setSelectedNotification(res.data)
    } catch (e) {
      toast.error('دریافت جزئیات اعلان ناموفق بود', { description: extractError(e) })
      // Fallback to the row data so dialog is still useful
      setSelectedNotification(n)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const refreshDetail = useCallback(async (id: string) => {
    try {
      const res = await notificationsApi.get(id)
      setSelectedNotification(res.data)
    } catch {
      // silent — toast already shown on action
    }
  }, [])

  // ============================================================
  // Retry handler
  // ============================================================
  const handleRetry = useCallback(async (n: Notification) => {
    setRetryingId(n.id)
    try {
      const res = await notificationsApi.retry(n.id, crypto.randomUUID())
      toast.success('درخواست تلاش مجدد ثبت شد', {
        description: `${STATUS_LABELS[res.data.status] || res.data.status} — ${res.data.message}`,
      })
      if (detailOpen && selectedNotification?.id === n.id) {
        await refreshDetail(n.id)
      }
      loadNotifications()
      loadQueue()
    } catch (e) {
      toast.error('تلاش مجدد ناموفق بود', { description: extractError(e) })
    } finally {
      setRetryingId(null)
    }
  }, [detailOpen, selectedNotification, refreshDetail, loadNotifications, loadQueue])

  // ============================================================
  // Cancel handler
  // ============================================================
  const handleCancel = useCallback(async () => {
    if (!cancelTarget) return
    if (!cancelReason.trim()) {
      toast.error('دلیل لغو الزامی است')
      return
    }
    setCancellingId(cancelTarget.id)
    try {
      await notificationsApi.cancel(
        cancelTarget.id,
        { reason: cancelReason.trim(), cancelledBy: cancelledBy.trim() || 'admin' },
        crypto.randomUUID(),
      )
      toast.success('اعلان لغو شد')
      setCancelTarget(null)
      setCancelReason('')
      setCancelledBy('admin')
      if (detailOpen && selectedNotification?.id === cancelTarget.id) {
        await refreshDetail(cancelTarget.id)
      }
      loadNotifications()
      loadQueue()
    } catch (e) {
      toast.error('لغو اعلان ناموفق بود', { description: extractError(e) })
    } finally {
      setCancellingId(null)
    }
  }, [cancelTarget, cancelReason, cancelledBy, detailOpen, selectedNotification, refreshDetail, loadNotifications, loadQueue])

  // ============================================================
  // Send handler
  // ============================================================
  const handleSend = useCallback(async (form: {
    templateCode: string
    recipientName: string
    recipientAddress: string
    variables: string
    priority: number
    triggeredByEvent: string
  }) => {
    if (!form.templateCode) { toast.error('انتخاب الگو الزامی است'); return }
    if (!form.recipientAddress.trim()) { toast.error('آدرس گیرنده الزامی است'); return }
    let parsed: Record<string, any> = {}
    try {
      parsed = form.variables.trim() ? JSON.parse(form.variables) : {}
    } catch {
      toast.error('JSON متغیرها نامعتبر است')
      return
    }
    try {
      const res = await notificationsApi.send(
        {
          templateCode: form.templateCode,
          recipientName: form.recipientName.trim() || undefined,
          recipientAddress: form.recipientAddress.trim(),
          variables: parsed,
          priority: form.priority,
          triggeredByEvent: form.triggeredByEvent.trim() || undefined,
        },
        crypto.randomUUID(),
      )
      if (res.data.created) {
        toast.success('اعلان ارسال شد', {
          description: `وضعیت: ${STATUS_LABELS[res.data.status] || res.data.status}`,
        })
      } else {
        toast.message('اعلان از قبل وجود داشت (Idempotent)', {
          description: res.data.message,
        })
      }
      setSendOpen(false)
      loadNotifications()
      loadQueue()
    } catch (e) {
      toast.error('ارسال اعلان ناموفق بود', { description: extractError(e) })
    }
  }, [loadNotifications, loadQueue])

  // ============================================================
  // Process queue (manual)
  // ============================================================
  const handleProcessQueue = useCallback(async () => {
    setProcessingQueue(true)
    try {
      const res = await notificationQueueApi.process(
        { batchSize: 20 },
        crypto.randomUUID(),
      )
      toast.success('پردازش صف انجام شد', {
        description: `${toPersianNumber(res.data.processed)} آیتم پردازش شد`,
      })
      loadQueue()
      loadNotifications()
    } catch (e) {
      toast.error('پردازش صف ناموفق بود', { description: extractError(e) })
    } finally {
      setProcessingQueue(false)
    }
  }, [loadQueue, loadNotifications])

  // ============================================================
  // Retry All DLQ
  // ============================================================
  const handleRetryAllDlq = useCallback(async () => {
    if (queueDlq.length === 0) {
      toast.message('صف مرده خالی است')
      return
    }
    setRetryingDlq(true)
    let ok = 0
    let fail = 0
    await Promise.all(
      queueDlq.map(async (item) => {
        try {
          await notificationsApi.retry(item.notificationId, crypto.randomUUID())
          ok += 1
        } catch {
          fail += 1
        }
      }),
    )
    toast.success('تلاش مجدد صف مرده انجام شد', {
      description: `موفق: ${toPersianNumber(ok)} • ناموفق: ${toPersianNumber(fail)}`,
    })
    setRetryingDlq(false)
    loadQueue()
    loadNotifications()
  }, [queueDlq, loadQueue, loadNotifications])

  // ============================================================
  // Filter / pagination helpers
  // ============================================================
  const resetPageAnd = (fn: () => void) => {
    setPage(1)
    fn()
  }

  const reloadAll = () => {
    loadNotifications()
    loadQueue()
  }

  // ============================================================
  // Render
  // ============================================================
  return (
    <div className="space-y-6">
      {/* ----- Header ----- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">مرکز اعلان‌ها</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Sprint 7.3 — LAW-56/57: ارسال کانال‌اگنوستیک + Idempotent
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => { setSendDialogKey((k) => k + 1); setSendOpen(true) }}>
            <Plus className="w-4 h-4 ml-1" />
            ارسال اعلان جدید
          </Button>
          <Button variant="outline" onClick={reloadAll} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ml-1 ${loading ? 'animate-spin' : ''}`} />
            بارگذاری مجدد
          </Button>
        </div>
      </div>

      {/* ----- Two-column layout ----- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ----- LEFT: Notifications list ----- */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  لیست اعلان‌ها
                </CardTitle>
                <CardDescription className="mt-1">
                  {toPersianNumber(total)} اعلان • صفحه {toPersianNumber(page)} از {toPersianNumber(Math.max(lastPage, 1))}
                </CardDescription>
              </div>
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={statusFilter}
                  onValueChange={(v) => resetPageAnd(() => setStatusFilter(v))}
                >
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="وضعیت" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                    <SelectItem value="pending">در انتظار</SelectItem>
                    <SelectItem value="queued">در صف</SelectItem>
                    <SelectItem value="sending">در حال ارسال</SelectItem>
                    <SelectItem value="sent">ارسال شد</SelectItem>
                    <SelectItem value="failed">خطا</SelectItem>
                    <SelectItem value="retrying">تلاش مجدد</SelectItem>
                    <SelectItem value="cancelled">لغو شد</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={channelFilter}
                  onValueChange={(v) => resetPageAnd(() => setChannelFilter(v))}
                >
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="کانال" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه کانال‌ها</SelectItem>
                    <SelectItem value="email">ایمیل</SelectItem>
                    <SelectItem value="sms">پیامک</SelectItem>
                    <SelectItem value="whatsapp">واتساپ</SelectItem>
                    <SelectItem value="push">پوش</SelectItem>
                    <SelectItem value="inapp">درون‌برنامه‌ای</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">الگو</TableHead>
                    <TableHead className="text-xs">کانال</TableHead>
                    <TableHead className="text-xs">گیرنده</TableHead>
                    <TableHead className="text-xs">وضعیت</TableHead>
                    <TableHead className="text-xs">ایجاد</TableHead>
                    <TableHead className="text-xs text-left">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={`sk-${i}`}>
                        <TableCell colSpan={6}>
                          <div className="h-8 rounded-md bg-muted/40 animate-pulse" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : notifications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-sm">
                        هیچ اعلانی یافت نشد
                      </TableCell>
                    </TableRow>
                  ) : (
                    notifications.map((n) => (
                      <TableRow
                        key={n.id}
                        className="cursor-pointer hover:bg-muted/30"
                        onClick={() => openDetail(n)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs">{n.templateCode}</span>
                            <Badge variant="outline" className="text-[10px] font-mono">
                              v{toPersianNumber(n.templateVersion)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <ChannelBadge channel={n.channel} />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            {n.recipientName ? (
                              <span className="text-xs">{n.recipientName}</span>
                            ) : null}
                            <span className="text-[11px] text-muted-foreground font-mono" dir="ltr">
                              {truncate(n.recipientAddress, 28)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={n.status} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {timeAgo(n.createdAt)}
                        </TableCell>
                        <TableCell className="text-left" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Activity className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem onClick={() => openDetail(n)}>
                                <Eye className="w-4 h-4 ml-2" />
                                مشاهده جزئیات
                              </DropdownMenuItem>
                              {RETRYABLE_STATUSES.has(n.status) && (
                                <DropdownMenuItem
                                  onClick={() => handleRetry(n)}
                                  disabled={retryingId === n.id}
                                >
                                  {retryingId === n.id ? (
                                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                                  ) : (
                                    <RotateCw className="w-4 h-4 ml-2" />
                                  )}
                                  تلاش مجدد
                                </DropdownMenuItem>
                              )}
                              {CANCELABLE_STATUSES.has(n.status) && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setCancelTarget(n)
                                      setCancelReason('')
                                      setCancelledBy('admin')
                                    }}
                                    className="text-red-600 focus:text-red-700"
                                  >
                                    <Ban className="w-4 h-4 ml-2" />
                                    لغو اعلان
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-3">
              <div className="text-xs text-muted-foreground">
                {toPersianNumber(notifications.length)} از {toPersianNumber(total)} مورد
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                >
                  <ChevronRight className="w-4 h-4 ml-1" />
                  قبلی
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                  disabled={page >= lastPage || loading}
                >
                  بعدی
                  <ChevronLeft className="w-4 h-4 mr-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ----- RIGHT: Queue + DLQ monitor ----- */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <InboxIcon className="w-5 h-5" />
              مانیتور صف
            </CardTitle>
            <CardDescription>صف آماده ارسال و صف مرده</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="ready" className="w-full">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="ready">
                  <Clock className="w-4 h-4 ml-1" />
                  آماده ارسال
                </TabsTrigger>
                <TabsTrigger value="dlq">
                  <AlertOctagon className="w-4 h-4 ml-1" />
                  صف مرده
                </TabsTrigger>
              </TabsList>

              {/* Ready / Pending tab */}
              <TabsContent value="ready" className="mt-3 space-y-3">
                <Button
                  onClick={handleProcessQueue}
                  disabled={processingQueue || queueLoading}
                  className="w-full"
                  variant="default"
                >
                  {processingQueue ? (
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 ml-2" />
                  )}
                  پردازش دستی (۲۰ آیتم)
                </Button>
                <ScrollArea className="h-[400px] pr-2">
                  {queueLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : queueReady.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      صف آماده ارسال خالی است
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {queueReady.map((item) => (
                        <QueueItemCard key={item.id} item={item} variant="ready" />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* DLQ tab */}
              <TabsContent value="dlq" className="mt-3 space-y-3">
                <Button
                  onClick={handleRetryAllDlq}
                  disabled={retryingDlq || queueLoading || queueDlq.length === 0}
                  className="w-full"
                  variant="default"
                >
                  {retryingDlq ? (
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  ) : (
                    <RotateCw className="w-4 h-4 ml-2" />
                  )}
                  تلاش مجدد همه ({toPersianNumber(queueDlq.length)})
                </Button>
                <ScrollArea className="h-[400px] pr-2">
                  {queueLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : queueDlq.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      صف مرده خالی است 🎉
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {queueDlq.map((item) => (
                        <QueueItemCard key={item.id} item={item} variant="dlq" />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* ----- Detail Dialog ----- */}
      <Dialog open={detailOpen} onOpenChange={(o) => {
        setDetailOpen(o)
        if (!o) setSelectedNotification(null)
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>جزئیات اعلان</span>
              {selectedNotification && (
                <>
                  <StatusBadge status={selectedNotification.status} />
                  <Badge variant="outline" className="text-xs">
                    <ChannelBadge channel={selectedNotification.channel} />
                  </Badge>
                </>
              )}
            </DialogTitle>
            <DialogDescription className="font-mono text-xs" dir="ltr">
              {selectedNotification ? truncate(selectedNotification.id, 40) : 'در حال بارگذاری…'}
            </DialogDescription>
          </DialogHeader>

          {detailLoading || !selectedNotification ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="flex-1 pr-2">
              <div className="space-y-4">
                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoBlock label="الگو">
                    <span className="font-mono">{selectedNotification.templateCode}</span>
                    {' '}
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      v{toPersianNumber(selectedNotification.templateVersion)}
                    </Badge>
                    {' '}
                    <Badge variant="outline" className="text-[10px]">
                      {selectedNotification.language}
                    </Badge>
                  </InfoBlock>
                  <InfoBlock label="گیرنده">
                    <div className="flex flex-col">
                      <span>{selectedNotification.recipientName || '—'}</span>
                      <span className="text-xs font-mono text-muted-foreground" dir="ltr">
                        {selectedNotification.recipientAddress}
                      </span>
                    </div>
                  </InfoBlock>
                  <InfoBlock label="Idempotency Key">
                    <span className="font-mono text-xs truncate" dir="ltr">
                      {selectedNotification.idempotencyKey || '—'}
                    </span>
                  </InfoBlock>
                  <InfoBlock label="Message ID">
                    <span className="font-mono text-xs" dir="ltr">
                      {selectedNotification.messageId || '—'}
                    </span>
                  </InfoBlock>
                  <InfoBlock label="ایجاد">
                    <span className="text-xs">{formatDateTime(selectedNotification.createdAt)}</span>
                  </InfoBlock>
                  <InfoBlock label="در صف">
                    <span className="text-xs">{formatDateTime(selectedNotification.queuedAt)}</span>
                  </InfoBlock>
                  <InfoBlock label="ارسال">
                    <span className={`text-xs ${selectedNotification.sentAt ? 'text-emerald-600' : ''}`}>
                      {formatDateTime(selectedNotification.sentAt)}
                    </span>
                  </InfoBlock>
                  <InfoBlock label="خطا">
                    <span className={`text-xs ${selectedNotification.failedAt ? 'text-red-600' : ''}`}>
                      {formatDateTime(selectedNotification.failedAt)}
                    </span>
                  </InfoBlock>
                </div>

                <Separator />

                {/* Rendered Subject */}
                {selectedNotification.renderedSubject && (
                  <div>
                    <Label className="text-xs text-muted-foreground">موضوع رندر شده</Label>
                    <div className="mt-1 p-2 rounded-md border bg-muted/30 text-sm">
                      {selectedNotification.renderedSubject}
                    </div>
                  </div>
                )}

                {/* Rendered Body */}
                <div>
                  <Label className="text-xs text-muted-foreground">بدنه رندر شده</Label>
                  <pre
                    dir="auto"
                    className="mt-1 p-3 rounded-md border bg-muted/30 max-h-60 overflow-auto text-xs font-mono whitespace-pre-wrap break-words"
                  >
                    {selectedNotification.renderedBody || '—'}
                  </pre>
                </div>

                {/* Payload */}
                {selectedNotification.payload != null && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                      Payload (JSON)
                    </summary>
                    <pre
                      dir="ltr"
                      className="mt-2 p-3 rounded-md border bg-muted/30 max-h-40 overflow-auto text-xs font-mono"
                    >
                      {JSON.stringify(selectedNotification.payload, null, 2)}
                    </pre>
                  </details>
                )}

                {/* Error info */}
                {selectedNotification.status === 'failed' && (
                  <div className="p-3 rounded-md border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span className="font-medium text-red-700 dark:text-red-400">خطای ارسال</span>
                    </div>
                    <div className="text-xs text-red-700 dark:text-red-400 space-y-1">
                      <div>
                        <strong>کد خطا:</strong>{' '}
                        <span className="font-mono">{selectedNotification.errorCode || '—'}</span>
                      </div>
                      <div>
                        <strong>پیام:</strong> {selectedNotification.errorMessage || '—'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Cancel info */}
                {selectedNotification.status === 'cancelled' && (
                  <div className="p-3 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Ban className="w-4 h-4 text-amber-600" />
                      <span className="font-medium text-amber-700 dark:text-amber-400">اعلان لغو شد</span>
                    </div>
                    <div className="text-xs text-amber-700 dark:text-amber-400 space-y-1">
                      <div><strong>لغو توسط:</strong> {selectedNotification.cancelledBy || '—'}</div>
                      <div><strong>دلیل:</strong> {selectedNotification.cancelReason || '—'}</div>
                      <div><strong>زمان:</strong> {formatDateTime(selectedNotification.cancelledAt)}</div>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Deliveries Timeline */}
                <div>
                  <Label className="text-xs text-muted-foreground">زمان‌بندی تحویل‌ها</Label>
                  <DeliveryTimeline deliveries={selectedNotification.deliveries || []} />
                </div>

                <Separator />

                {/* Queue Items */}
                <div>
                  <Label className="text-xs text-muted-foreground">آیتم‌های صف</Label>
                  <QueueItemsList items={selectedNotification.queueItems || []} />
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  {RETRYABLE_STATUSES.has(selectedNotification.status) && (
                    <Button
                      variant="default"
                      onClick={() => handleRetry(selectedNotification)}
                      disabled={retryingId === selectedNotification.id}
                    >
                      {retryingId === selectedNotification.id ? (
                        <Loader2 className="w-4 h-4 ml-1 animate-spin" />
                      ) : (
                        <RotateCw className="w-4 h-4 ml-1" />
                      )}
                      تلاش مجدد
                    </Button>
                  )}
                  {CANCELABLE_STATUSES.has(selectedNotification.status) && (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setCancelTarget(selectedNotification)
                        setCancelReason('')
                        setCancelledBy('admin')
                      }}
                    >
                      <Ban className="w-4 h-4 ml-1" />
                      لغو
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setDetailOpen(false)}>
                    بستن
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* ----- Send Dialog ----- */}
      <SendDialog
        key={sendDialogKey}
        open={sendOpen}
        onOpenChange={(o) => {
          setSendOpen(o)
          if (o) loadTemplates()
        }}
        templates={templates}
        templatesLoading={templatesLoading}
        onSubmit={handleSend}
      />

      {/* ----- Cancel Dialog ----- */}
      <Dialog open={!!cancelTarget} onOpenChange={(o) => {
        if (!o) {
          setCancelTarget(null)
          setCancelReason('')
          setCancelledBy('admin')
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-600" />
              لغو اعلان
            </DialogTitle>
            <DialogDescription>
              {cancelTarget && (
                <>
                  اعلان <span className="font-mono" dir="ltr">{truncate(cancelTarget.id, 24)}</span> لغو خواهد شد.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">دلیل لغو</Label>
              <Textarea
                className="mt-1"
                rows={3}
                placeholder="مثلاً: درخواست کاربر، اشتباه در محتوا…"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">لغو توسط</Label>
              <Input
                className="mt-1"
                value={cancelledBy}
                onChange={(e) => setCancelledBy(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>
              انصراف
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancellingId !== null || !cancelReason.trim()}
            >
              {cancellingId ? (
                <Loader2 className="w-4 h-4 ml-1 animate-spin" />
              ) : (
                <Ban className="w-4 h-4 ml-1" />
              )}
              تأیید لغو
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----- Law Info Card ----- */}
      <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900">
        <CardContent className="p-3 text-xs space-y-1">
          <div><strong>LAW-55:</strong> تمام اعلان‌ها بر اساس الگوهای نسخه‌بندی‌شده و چندزبانه رندر می‌شوند.</div>
          <div><strong>LAW-56:</strong> ارسال کانال‌اگنوستیک — یک الگو می‌تواند روی ایمیل/پیامک/واتساپ/پوش/درون‌برنامه‌ای ارسال شود.</div>
          <div><strong>LAW-57:</strong> تمام عملیات‌ها Idempotent هستند (Idempotency-Key در send/retry/cancel/process).</div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// InfoBlock — labeled cell in detail grid
// ============================================================
function InfoBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div>{children}</div>
    </div>
  )
}

// ============================================================
// QueueItemCard — for queue monitor right column
// ============================================================
function QueueItemCard({
  item,
  variant,
}: {
  item: NotificationQueueList
  variant: 'ready' | 'dlq'
}) {
  const notif = item.notification
  const Icon = notif ? CHANNEL_ICONS[notif.channel] : Bell
  return (
    <div
      className={`p-2.5 rounded-md border text-xs ${
        variant === 'dlq'
          ? 'border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900'
          : 'border-border bg-muted/20'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono truncate" dir="ltr">
          {notif?.templateCode || '—'}
        </span>
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Icon className="w-3 h-3" />
          {notif ? CHANNEL_LABELS[notif.channel] : '—'}
        </span>
      </div>
      <div className="text-[11px] text-muted-foreground font-mono truncate" dir="ltr">
        {notif?.recipientAddress || '—'}
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[11px]">
          تلاش: {toPersianNumber(item.attempt)}/{toPersianNumber(item.maxAttempts)}
        </span>
        {variant === 'ready' ? (
          <span className="text-[10px] text-muted-foreground">
            {item.lockedBy ? `قفل: ${truncate(item.lockedBy, 8)}` : `اولویت: ${toPersianNumber(item.priority)}`}
          </span>
        ) : (
          <Badge variant="destructive" className="text-[10px]">DLQ</Badge>
        )}
      </div>
      {variant === 'dlq' && item.deadLetterReason && (
        <div className="mt-1.5 text-[10px] text-red-700 dark:text-red-400 truncate" title={item.deadLetterReason}>
          {item.deadLetterReason}
        </div>
      )}
      {variant === 'ready' && item.nextRetryAt && (
        <div className="mt-1.5 text-[10px] text-muted-foreground">
          تلاش بعدی: {formatDateTime(item.nextRetryAt)}
        </div>
      )}
    </div>
  )
}

// ============================================================
// DeliveryTimeline — vertical timeline of deliveries
// ============================================================
function DeliveryTimeline({ deliveries }: { deliveries: NotificationDelivery[] }) {
  if (deliveries.length === 0) {
    return <p className="text-xs text-muted-foreground mt-2">هیچ تحویلی ثبت نشده است.</p>
  }
  const sorted = [...deliveries].sort((a, b) => a.attempt - b.attempt)
  return (
    <ol className="mt-2 space-y-3 border-r-2 border-muted pr-4">
      {sorted.map((d) => (
        <li key={d.id} className="relative">
          <span className="absolute -right-[22px] top-1 flex items-center justify-center w-5 h-5 rounded-full bg-background border">
            <DeliveryStatusIcon status={d.status} />
          </span>
          <div className="p-2 rounded-md border bg-muted/20 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium">تلاش {toPersianNumber(d.attempt)}</span>
              <Badge variant="outline" className="text-[10px] font-mono">{d.provider}</Badge>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>{formatDateTime(d.createdAt)}</span>
              <span>{toPersianNumber(d.durationMs)}ms</span>
            </div>
            {d.status === 'failed' && d.errorMessage && (
              <div className="text-[11px] text-red-700 dark:text-red-400 break-words">
                {d.errorMessage}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}

// ============================================================
// QueueItemsList — list of NotificationQueueItem in detail dialog
// ============================================================
function QueueItemsList({ items }: { items: NotificationQueueItem[] }) {
  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground mt-2">هیچ آیتم صفی ثبت نشده است.</p>
  }
  return (
    <div className="mt-2 space-y-2">
      {items.map((q) => (
        <div
          key={q.id}
          className={`p-2 rounded-md border text-xs ${
            q.inDeadLetter
              ? 'border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900'
              : 'bg-muted/20'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[10px]" dir="ltr">{truncate(q.id, 20)}</span>
            <div className="flex items-center gap-1">
              {q.inDeadLetter && (
                <Badge variant="destructive" className="text-[10px]">DLQ</Badge>
              )}
              <Badge variant="outline" className="text-[10px]">
                اولویت: {toPersianNumber(q.priority)}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1 text-muted-foreground">
            <div>تلاش: {toPersianNumber(q.attempt)}/{toPersianNumber(q.maxAttempts)}</div>
            <div>ایجاد: {formatDateTime(q.createdAt)}</div>
            {!q.inDeadLetter && q.nextRetryAt && (
              <div className="col-span-2">تلاش بعدی: {formatDateTime(q.nextRetryAt)}</div>
            )}
            {q.inDeadLetter && q.deadLetterReason && (
              <div className="col-span-2 text-red-700 dark:text-red-400 break-words">
                دلیل: {q.deadLetterReason}
              </div>
            )}
            {q.lockedBy && (
              <div className="col-span-2 font-mono text-[10px]" dir="ltr">
                قفل توسط: {q.lockedBy}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// SendDialog — compose & send a new notification
// ============================================================
function SendDialog({
  open,
  onOpenChange,
  templates,
  templatesLoading,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  templates: NotificationTemplate[]
  templatesLoading: boolean
  onSubmit: (form: {
    templateCode: string
    recipientName: string
    recipientAddress: string
    variables: string
    priority: number
    triggeredByEvent: string
  }) => void
}) {
  const [templateCode, setTemplateCode] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [recipientAddress, setRecipientAddress] = useState('')
  const [variables, setVariables] = useState(DEFAULT_SEND_VARIABLES)
  const [priority, setPriority] = useState(100)
  const [triggeredByEvent, setTriggeredByEvent] = useState('manual')

  const handleSubmit = () => {
    onSubmit({
      templateCode,
      recipientName,
      recipientAddress,
      variables,
      priority,
      triggeredByEvent,
    })
  }

  const selectedTemplate = templates.find((t) => t.code === templateCode)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            ارسال اعلان جدید
          </DialogTitle>
          <DialogDescription>
            یک الگوی منتشر شده انتخاب کرده و گیرنده + متغیرها را پر کنید.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-4">
            {/* Template select */}
            <div>
              <Label className="text-xs">الگو</Label>
              {templatesLoading ? (
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  در حال بارگذاری الگوها…
                </div>
              ) : (
                <Select value={templateCode} onValueChange={setTemplateCode}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="انتخاب الگو" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.length === 0 ? (
                      <SelectItem value="_none" disabled>هیچ الگوی منتشر شده‌ای وجود ندارد</SelectItem>
                    ) : (
                      templates.map((t) => (
                        <SelectItem key={t.id} value={t.code}>
                          <span className="font-mono">{t.code}</span>{' '}
                          <span className="text-xs text-muted-foreground">
                            ({CHANNEL_LABELS[t.channel]} • v{toPersianNumber(t.version)} • {t.language})
                          </span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
              {selectedTemplate && (
                <div className="mt-1.5 text-xs text-muted-foreground">
                  {selectedTemplate.name}
                  {selectedTemplate.description && ` — ${selectedTemplate.description}`}
                </div>
              )}
            </div>

            {/* Recipient */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">نام گیرنده (اختیاری)</Label>
                <Input
                  className="mt-1"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="مثلاً علی رضایی"
                />
              </div>
              <div>
                <Label className="text-xs">آدرس گیرنده (الزامی)</Label>
                <Input
                  className="mt-1"
                  dir="ltr"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  placeholder="email@example.com / 0912…"
                />
              </div>
            </div>

            {/* Variables JSON */}
            <div>
              <Label className="text-xs">متغیرها (JSON)</Label>
              <Textarea
                dir="ltr"
                className="mt-1 font-mono text-xs"
                rows={8}
                value={variables}
                onChange={(e) => setVariables(e.target.value)}
              />
            </div>

            {/* Priority + Triggered-by-event */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">اولویت</Label>
                <Input
                  type="number"
                  className="mt-1"
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value) || 0)}
                  min={0}
                  max={1000}
                />
              </div>
              <div>
                <Label className="text-xs">رویداد راه‌انداز (اختیاری)</Label>
                <Input
                  className="mt-1"
                  dir="ltr"
                  value={triggeredByEvent}
                  onChange={(e) => setTriggeredByEvent(e.target.value)}
                  placeholder="manual / invoice.paid / …"
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="mt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            انصراف
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!templateCode || !recipientAddress.trim()}
          >
            <Send className="w-4 h-4 ml-1" />
            ارسال
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
