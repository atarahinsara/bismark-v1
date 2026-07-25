'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Clock, Send, CheckCircle, XCircle, RotateCw, AlertTriangle,
  Loader2, RefreshCw, Mail, MessageSquare, Phone, Bell, Smartphone,
  Zap, Plus, Activity,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  notificationsApi, notificationTemplatesApi, notificationQueueApi,
  type NotificationStats, type Notification, type NotificationTemplate,
  type NotificationChannel,
} from '@/lib/api-client'
import type { ApiError } from '@/lib/api-client'

// ============================================================
// Constants
// ============================================================

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  email: 'ایمیل', sms: 'پیامک', whatsapp: 'واتساپ', push: 'پوش', inapp: 'درون‌برنامه‌ای',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'در انتظار', queued: 'در صف', sending: 'در حال ارسال',
  sent: 'ارسال شد', failed: 'خطا', retrying: 'در حال تلاش مجدد', cancelled: 'لغو شد',
}

const CHANNEL_COLORS: Record<NotificationChannel, { bar: string; text: string; tint: string }> = {
  email:    { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', tint: 'bg-emerald-50 dark:bg-emerald-950/20' },
  sms:      { bar: 'bg-teal-500',    text: 'text-teal-600 dark:text-teal-400',       tint: 'bg-teal-50 dark:bg-teal-950/20' },
  whatsapp: { bar: 'bg-lime-500',    text: 'text-lime-600 dark:text-lime-400',       tint: 'bg-lime-50 dark:bg-lime-950/20' },
  push:     { bar: 'bg-amber-500',   text: 'text-amber-600 dark:text-amber-400',     tint: 'bg-amber-50 dark:bg-amber-950/20' },
  inapp:    { bar: 'bg-rose-500',    text: 'text-rose-600 dark:text-rose-400',       tint: 'bg-rose-50 dark:bg-rose-950/20' },
}

const CHANNEL_ICONS: Record<NotificationChannel, typeof Mail> = {
  email: Mail, sms: MessageSquare, whatsapp: Phone, push: Smartphone, inapp: Bell,
}

const CHANNEL_ORDER: NotificationChannel[] = ['email', 'sms', 'whatsapp', 'push', 'inapp']

// Subtle background tint per stat card (NO blue for backgrounds per LAW/convention)
const STAT_TINTS: Record<string, { icon: string; bg: string }> = {
  amber:   { icon: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-950/20' },
  blue:    { icon: 'text-blue-500',    bg: 'bg-muted/40' }, // blue allowed for icons only
  emerald: { icon: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
  red:     { icon: 'text-red-500',     bg: 'bg-red-50 dark:bg-red-950/20' },
  orange:  { icon: 'text-orange-500',  bg: 'bg-orange-50 dark:bg-orange-950/20' },
}

const DEFAULT_VARIABLES = `{
  "customer": { "name": "علی" },
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

function isApiError(e: unknown): e is ApiError {
  return typeof e === 'object' && e !== null && 'detail' in e && 'status' in e
}

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'sent') return 'default'
  if (status === 'failed') return 'destructive'
  if (status === 'cancelled') return 'outline'
  return 'secondary'
}

function truncate(s: string, n = 24): string {
  return s.length > n ? `${s.slice(0, n)}…` : s
}

// ============================================================
// Main View
// ============================================================

export function NotificationDashboardView() {
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [recent, setRecent] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [showTestDialog, setShowTestDialog] = useState(false)
  const seededRef = useRef(false)

  const loadStats = useCallback(async () => {
    try {
      const res = await notificationsApi.stats()
      setStats(res.data)
    } catch (e) { console.error('Failed to load notification stats', e) }
  }, [])

  const loadRecent = useCallback(async () => {
    try {
      const res = await notificationsApi.list({ perPage: 8 })
      setRecent(res.data)
    } catch (e) { console.error('Failed to load recent notifications', e) }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    await Promise.all([loadStats(), loadRecent()])
    setLoading(false)
  }, [loadStats, loadRecent])

  // Auto-seed default templates once on mount (idempotent — silent on failure)
  useEffect(() => {
    if (seededRef.current) return
    seededRef.current = true
    ;(async () => {
      try {
        await notificationTemplatesApi.seedDefaults('auto-seed-on-mount-v1')
      } catch (e) {
        // silent — seed-defaults is idempotent; failure is non-blocking
      }
      await load()
    })()
  }, [load])

  const handleProcessQueue = async () => {
    setProcessing(true)
    try {
      const idemKey = crypto.randomUUID()
      const res = await notificationQueueApi.process({ batchSize: 20 }, idemKey)
      toast.success(`${res.data.processed.toLocaleString('fa-IR')} آیتم از صف پردازش شد`)
      await Promise.all([loadStats(), loadRecent()])
    } catch (e) {
      const msg = isApiError(e) ? e.detail : 'خطا در پردازش صف'
      toast.error(msg)
    } finally {
      setProcessing(false)
    }
  }

  if (loading || !stats) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  const maxChannelCount = Math.max(
    ...CHANNEL_ORDER.map((c) => stats.byChannel[c] ?? 0),
    1, // avoid divide-by-zero when all channels are empty
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">داشبورد اعلان‌ها</h1>
          <p className="text-muted-foreground mt-1">
            Sprint 7.3 — Notification Center (LAW-55/56/57)
          </p>
        </div>
        <Button onClick={load} variant="outline" disabled={processing}>
          <RefreshCw className="w-4 h-4 ml-2" />
          بارگذاری مجدد
        </Button>
      </div>

      {/* Stats Cards (6) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={Clock}        label="در صف"           value={stats.queued}    tint="amber" />
        <StatCard icon={Send}         label="در حال ارسال"    value={stats.sending}   tint="blue" />
        <StatCard icon={CheckCircle}  label="ارسال‌شده امروز" value={stats.sentToday} tint="emerald" />
        <StatCard icon={XCircle}      label="خطا"             value={stats.failed}    tint="red" />
        <StatCard icon={RotateCw}     label="تلاش مجدد"       value={stats.retrying}  tint="orange" />
        <StatCard icon={AlertTriangle} label="صف مرده (DLQ)"  value={stats.dlq}       tint="red" />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="w-5 h-5" /> اقدامات سریع
          </CardTitle>
          <CardDescription>عملیات‌های رایج روی مرکز اعلان</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleProcessQueue} disabled={processing}>
              {processing
                ? <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                : <Zap className="w-4 h-4 ml-2" />}
              پردازش صف
            </Button>
            <Button variant="outline" onClick={load}>
              <RefreshCw className="w-4 h-4 ml-2" />
              بارگذاری مجدد آمار
            </Button>
            <Button variant="secondary" onClick={() => setShowTestDialog(true)}>
              <Plus className="w-4 h-4 ml-2" />
              ارسال اعلان آزمایشی
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Two side-by-side cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Success Rate & Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5" /> نرخ موفقیت و عملکرد
            </CardTitle>
            <CardDescription>نمای کلی عملکرد تحویل اعلان‌ها</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Big success rate with progress bar */}
            <div>
              <div className="flex items-end justify-between mb-2">
                <span className="text-sm text-muted-foreground">نرخ موفقیت</span>
                <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {stats.successRate.toLocaleString('fa-IR')}٪
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-l from-emerald-500 to-teal-500 transition-all"
                  style={{ width: `${Math.min(Math.max(stats.successRate, 0), 100)}%` }}
                />
              </div>
            </div>

            {/* Average delivery time */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <span className="text-sm text-muted-foreground">میانگین زمان تحویل</span>
              <span className="text-sm font-mono font-semibold">
                {stats.avgDeliveryMs != null
                  ? `${stats.avgDeliveryMs.toLocaleString('fa-IR')} میلی‌ثانیه`
                  : '—'}
              </span>
            </div>

            {/* Breakdown by channel (small badges) */}
            <div>
              <div className="text-sm text-muted-foreground mb-2">تفکیک بر اساس کانال</div>
              <div className="space-y-1.5">
                {CHANNEL_ORDER.map((c) => {
                  const Icon = CHANNEL_ICONS[c]
                  const count = stats.byChannel[c] ?? 0
                  return (
                    <div key={c} className="flex items-center justify-between p-2 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${CHANNEL_COLORS[c].text}`} />
                        <span className="text-sm">{CHANNEL_LABELS[c]}</span>
                      </div>
                      <Badge variant="outline">{count.toLocaleString('fa-IR')}</Badge>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right: Channel Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Send className="w-5 h-5" /> توزیع کانال‌ها
            </CardTitle>
            <CardDescription>نسبت تعداد اعلان‌ها در هر کانال</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {CHANNEL_ORDER.map((c) => {
              const Icon = CHANNEL_ICONS[c]
              const count = stats.byChannel[c] ?? 0
              const widthPct = (count / maxChannelCount) * 100
              return (
                <div key={c} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${CHANNEL_COLORS[c].text}`} />
                      <span className="font-medium">{CHANNEL_LABELS[c]}</span>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">
                      {count.toLocaleString('fa-IR')}
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${CHANNEL_COLORS[c].bar}`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              )
            })}
            {CHANNEL_ORDER.every((c) => (stats.byChannel[c] ?? 0) === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                هنوز اعلانی در هیچ کانالی ثبت نشده است
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Notifications (8 most recent) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" /> اعلان‌های اخیر
          </CardTitle>
          <CardDescription>۸ اعلان آخر در سامانه</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-[400px]">
            <table className="w-full">
              <thead className="border-b bg-muted/30 sticky top-0">
                <tr>
                  <th className="text-right p-2 text-xs font-medium">کد قالب</th>
                  <th className="text-right p-2 text-xs font-medium">کانال</th>
                  <th className="text-right p-2 text-xs font-medium">گیرنده</th>
                  <th className="text-right p-2 text-xs font-medium">وضعیت</th>
                  <th className="text-right p-2 text-xs font-medium">زمان</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((n) => {
                  const Icon = CHANNEL_ICONS[n.channel]
                  return (
                    <tr key={n.id} className="border-b hover:bg-muted/20">
                      <td className="p-2 font-mono text-xs">{n.templateCode}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-1.5">
                          <Icon className={`w-3.5 h-3.5 ${CHANNEL_COLORS[n.channel].text}`} />
                          <span className="text-xs">{CHANNEL_LABELS[n.channel]}</span>
                        </div>
                      </td>
                      <td className="p-2 font-mono text-xs text-muted-foreground" dir="ltr">
                        {truncate(n.recipientAddress)}
                      </td>
                      <td className="p-2">
                        <Badge variant={statusBadgeVariant(n.status)} className="text-xs">
                          {STATUS_LABELS[n.status] ?? n.status}
                        </Badge>
                      </td>
                      <td className="p-2 text-xs text-muted-foreground">{timeAgo(n.createdAt)}</td>
                    </tr>
                  )
                })}
                {recent.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted-foreground">
                      هنوز اعلانی ثبت نشده است
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Law Info */}
      <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900">
        <CardContent className="p-3 text-xs space-y-1">
          <div><strong>LAW-55:</strong> تمام اعلان‌ها مبتنی بر قالب (template-based) با نسخه‌گذاری و snapshot در زمان dispatch</div>
          <div><strong>LAW-56:</strong> کانال‌محور (channel-agnostic) — ایمیل، پیامک، واتساپ، پوش، درون‌برنامه‌ای + preference per user</div>
          <div><strong>LAW-57:</strong> قابل‌تلاش مجدد (retryable) و Idempotent با صف اولویت‌دار، DLQ و Idempotency-Key</div>
        </CardContent>
      </Card>

      {/* Send Test Notification Dialog */}
      {showTestDialog && (
        <SendTestDialog
          onClose={() => setShowTestDialog(false)}
          onSent={() => {
            setShowTestDialog(false)
            Promise.all([loadStats(), loadRecent()])
          }}
        />
      )}
    </div>
  )
}

// ============================================================
// Sub-components
// ============================================================

function StatCard({ icon: Icon, label, value, tint }: {
  icon: typeof Clock
  label: string
  value: number
  tint: keyof typeof STAT_TINTS
}) {
  const t = STAT_TINTS[tint]
  return (
    <Card className={t.bg}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Icon className={`w-5 h-5 ${t.icon}`} />
        </div>
        <div className="text-2xl font-bold">{value.toLocaleString('fa-IR')}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </CardContent>
    </Card>
  )
}

function SendTestDialog({ onClose, onSent }: {
  onClose: () => void
  onSent: () => void
}) {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [loadingTpl, setLoadingTpl] = useState(true)
  const [templateCode, setTemplateCode] = useState<string>('')
  const [recipient, setRecipient] = useState('')
  const [variables, setVariables] = useState(DEFAULT_VARIABLES)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await notificationTemplatesApi.list({ perPage: 50, status: 'published' })
        if (!active) return
        setTemplates(res.data)
        if (res.data.length > 0) setTemplateCode(res.data[0].code)
      } catch (e) {
        // ignore — user can still type a template code manually
      } finally {
        if (active) setLoadingTpl(false)
      }
    })()
    return () => { active = false }
  }, [])

  const handleSend = async () => {
    if (!templateCode) { toast.error('قالب را انتخاب کنید'); return }
    if (!recipient.trim()) { toast.error('آدرس گیرنده الزامی است'); return }

    let parsedVars: Record<string, any>
    try {
      parsedVars = JSON.parse(variables)
    } catch {
      toast.error('JSON متغیرها نامعتبر است')
      return
    }

    setSending(true)
    try {
      const idemKey = crypto.randomUUID()
      const res = await notificationsApi.send({
        templateCode,
        recipientAddress: recipient.trim(),
        variables: parsedVars,
      }, idemKey)

      if (res.data.created) {
        toast.success(`اعلان با شناسه ${res.data.notificationId.slice(0, 8)}… ساخته شد`)
      } else {
        toast.message('اعلان از قبل وجود داشت (Idempotent)', {
          description: `شناسه: ${res.data.notificationId.slice(0, 8)}…`,
        })
      }
      onSent()
    } catch (e) {
      const msg = isApiError(e) ? e.detail : 'خطا در ارسال اعلان'
      toast.error(msg)
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            ارسال اعلان آزمایشی
          </DialogTitle>
          <DialogDescription>
            اعلان با قالب انتخابی برای گیرنده مشخص‌شده ارسال می‌شود (LAW-55/57 — Idempotent)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>قالب اعلان</Label>
            {loadingTpl ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground h-9">
                <Loader2 className="w-4 h-4 animate-spin" /> بارگذاری قالب‌ها…
              </div>
            ) : templates.length === 0 ? (
              <p className="text-sm text-muted-foreground h-9 flex items-center">
                قالب منتشرشده‌ای یافت نشد — ابتدا seed-defaults را اجرا کنید.
              </p>
            ) : (
              <Select value={templateCode} onValueChange={setTemplateCode}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="انتخاب قالب" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.code}>
                      {t.code} — {t.name} ({CHANNEL_LABELS[t.channel]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label>آدرس گیرنده</Label>
            <Input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="example@mail.com یا 09123456789"
              dir="ltr"
            />
          </div>

          <div className="space-y-2">
            <Label>متغیرها (JSON)</Label>
            <Textarea
              value={variables}
              onChange={(e) => setVariables(e.target.value)}
              rows={8}
              dir="ltr"
              className="font-mono text-xs"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>انصراف</Button>
          <Button onClick={handleSend} disabled={sending || !templateCode || !recipient.trim()}>
            {sending
              ? <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              : <Send className="w-4 h-4 ml-2" />}
            ارسال
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
