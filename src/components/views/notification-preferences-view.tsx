'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Mail, MessageSquare, Phone, Bell, Smartphone, RefreshCw, Save,
  Loader2, CheckCircle, Clock, Volume2, VolumeX, Globe, AlertCircle,
  ChevronLeft, ChevronRight, User, Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  notificationPreferencesApi,
  type NotificationPreference,
} from '@/lib/api-client'
import type { ApiError } from '@/lib/api-client'

// ============================================================
// Constants & helpers
// ============================================================

const LANGUAGE_LABELS: Record<string, string> = {
  fa: 'فارسی', en: 'English', ar: 'العربية', ku: 'Kurdî',
}

type ChannelKey =
  | 'emailEnabled'
  | 'smsEnabled'
  | 'pushEnabled'
  | 'whatsappEnabled'
  | 'inappEnabled'

interface ChannelConfig {
  key: ChannelKey
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

const CHANNELS: ChannelConfig[] = [
  { key: 'emailEnabled', label: 'ایمیل', description: 'دریافت از طریق ایمیل', icon: Mail },
  { key: 'smsEnabled', label: 'پیامک', description: 'دریافت از طریق پیامک', icon: MessageSquare },
  { key: 'pushEnabled', label: 'پوش', description: 'دریافت از طریق پوش', icon: Bell },
  { key: 'whatsappEnabled', label: 'واتساپ', description: 'دریافت از طریق واتساپ', icon: Phone },
  { key: 'inappEnabled', label: 'درون‌برنامه‌ای', description: 'دریافت درون‌برنامه‌ای', icon: Smartphone },
]

const PER_PAGE = 20

function timeAgo(date: string | null): string {
  if (!date) return '—'
  const diff = Date.now() - new Date(date).getTime()
  if (Number.isNaN(diff)) return '—'
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
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('fa-IR')
}

function isApiError(e: unknown): e is ApiError {
  return typeof e === 'object' && e !== null && 'detail' in e && 'status' in e
}

function extractError(e: unknown, fallback: string): string {
  if (isApiError(e)) return e.detail || fallback
  if (e instanceof Error) return e.message || fallback
  return fallback
}

/** Compare editable fields of the saved preference against the in-flight form. */
function isDirty(
  saved: NotificationPreference | null,
  form: Partial<NotificationPreference>,
): boolean {
  if (!saved) return false
  return (
    saved.emailEnabled !== !!form.emailEnabled ||
    saved.smsEnabled !== !!form.smsEnabled ||
    saved.pushEnabled !== !!form.pushEnabled ||
    saved.whatsappEnabled !== !!form.whatsappEnabled ||
    saved.inappEnabled !== !!form.inappEnabled ||
    saved.language !== (form.language ?? 'fa') ||
    (saved.quietHoursStart ?? null) !== (form.quietHoursStart ?? null) ||
    (saved.quietHoursEnd ?? null) !== (form.quietHoursEnd ?? null)
  )
}

/** Snapshot form fields from a freshly loaded preference. */
function snapshot(pref: NotificationPreference): Partial<NotificationPreference> {
  return {
    emailEnabled: pref.emailEnabled,
    smsEnabled: pref.smsEnabled,
    pushEnabled: pref.pushEnabled,
    whatsappEnabled: pref.whatsappEnabled,
    inappEnabled: pref.inappEnabled,
    language: pref.language,
    quietHoursStart: pref.quietHoursStart,
    quietHoursEnd: pref.quietHoursEnd,
  }
}

// ============================================================
// Main view
// ============================================================

export function NotificationPreferencesView() {
  // ---- Self preference editor ----
  const [userIdInput, setUserIdInput] = useState('admin')
  const [preference, setPreference] = useState<NotificationPreference | null>(null)
  const [form, setForm] = useState<Partial<NotificationPreference>>({})
  const [loadingSelf, setLoadingSelf] = useState(false)
  const [saving, setSaving] = useState(false)

  // ---- All preferences list ----
  const [list, setList] = useState<NotificationPreference[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [lastPage, setLastPage] = useState(1)

  const loadList = useCallback(async (p: number) => {
    setListLoading(true)
    try {
      const res = await notificationPreferencesApi.list(p, PER_PAGE)
      setList(res.data)
      setTotal(res.meta.total)
      setLastPage(res.meta.last_page)
    } catch (e) {
      toast.error('بارگذاری فهرست ترجیحات ناموفق بود', {
        description: extractError(e, 'خطای ناشناخته'),
      })
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    loadList(page)
  }, [page, loadList])

  const loadSelf = useCallback(async (uid: string) => {
    const trimmed = uid.trim()
    if (!trimmed) {
      toast.error('شناسه کاربر را وارد کنید')
      return
    }
    setLoadingSelf(true)
    try {
      const res = await notificationPreferencesApi.get(trimmed)
      setPreference(res.data)
      setForm(snapshot(res.data))
      toast.success(`ترجیحات «${trimmed}» بارگذاری شد`)
    } catch (e) {
      toast.error('بارگذاری ترجیحات ناموفق بود', {
        description: extractError(e, 'خطای ناشناخته'),
      })
      setPreference(null)
      setForm({})
    } finally {
      setLoadingSelf(false)
    }
  }, [])

  const handleReloadAll = useCallback(() => {
    loadList(page)
    if (userIdInput.trim()) {
      loadSelf(userIdInput.trim())
    }
  }, [page, userIdInput, loadList, loadSelf])

  const handleSave = useCallback(async () => {
    const trimmed = userIdInput.trim()
    if (!trimmed) {
      toast.error('شناسه کاربر را وارد کنید')
      return
    }
    setSaving(true)
    try {
      const payload: Partial<NotificationPreference> = {
        emailEnabled: !!form.emailEnabled,
        smsEnabled: !!form.smsEnabled,
        pushEnabled: !!form.pushEnabled,
        whatsappEnabled: !!form.whatsappEnabled,
        inappEnabled: !!form.inappEnabled,
        language: form.language ?? 'fa',
        quietHoursStart: form.quietHoursStart?.trim() ? form.quietHoursStart.trim() : null,
        quietHoursEnd: form.quietHoursEnd?.trim() ? form.quietHoursEnd.trim() : null,
      }
      const res = await notificationPreferencesApi.update(
        trimmed,
        payload,
        crypto.randomUUID(),
      )
      setPreference(res.data)
      setForm(snapshot(res.data))
      toast.success('ترجیحات با موفقیت ذخیره شد')
      // Refresh the list so the table reflects the new updatedAt
      loadList(page)
    } catch (e) {
      toast.error('ذخیره ترجیحات ناموفق بود', {
        description: extractError(e, 'خطای ناشناخته'),
      })
    } finally {
      setSaving(false)
    }
  }, [form, userIdInput, page, loadList])

  const handleClearQuietHours = useCallback(() => {
    setForm(f => ({ ...f, quietHoursStart: null, quietHoursEnd: null }))
  }, [])

  const handleEnterKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        loadSelf(userIdInput)
      }
    },
    [userIdInput, loadSelf],
  )

  const dirty = isDirty(preference, form)
  const fromItem = (page - 1) * PER_PAGE + 1
  const toItem = Math.min(page * PER_PAGE, total)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ---------- Header ---------- */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">ترجیحات اعلان</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Sprint 7.3 — LAW-56: انتخاب کانال، زبان و ساعات سکوت توسط کاربر
          </p>
        </div>
        <Button onClick={handleReloadAll} variant="outline" disabled={loadingSelf || listLoading}>
          {loadingSelf || listLoading ? (
            <Loader2 className="w-4 h-4 ml-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 ml-2" />
          )}
          بارگذاری مجدد
        </Button>
      </div>

      {/* ---------- Section 1: Self Preferences ---------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5" />
            ترجیحات من
          </CardTitle>
          <CardDescription>
            یک کاربر را برای مشاهده یا ویرایش ترجیحات اعلان انتخاب کنید.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* User lookup row */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="np-user-id-input">شناسه کاربر</Label>
              <Input
                id="np-user-id-input"
                value={userIdInput}
                onChange={e => setUserIdInput(e.target.value)}
                onKeyDown={handleEnterKey}
                placeholder="مثلاً admin"
                dir="ltr"
                className="font-mono"
              />
            </div>
            <Button onClick={() => loadSelf(userIdInput)} disabled={loadingSelf}>
              {loadingSelf ? (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 ml-2" />
              )}
              بارگذاری
            </Button>
          </div>

          {/* Empty state */}
          {!preference && !loadingSelf && (
            <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
              <User className="w-8 h-8 mb-2 opacity-50" />
              <span>یک شناسه کاربر وارد کرده و «بارگذاری» را بزنید.</span>
            </div>
          )}

          {/* Loading placeholder */}
          {loadingSelf && !preference && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Preference form */}
          {preference && (
            <>
              {dirty && (
                <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>تغییرات ذخیره نشده — برای اعمال، روی «ذخیره» بزنید.</span>
                </div>
              )}

              <Separator />

              {/* Enabled channels */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">کانال‌های فعال</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CHANNELS.map(ch => {
                    const Icon = ch.icon
                    const checked = !!form[ch.key]
                    return (
                      <div
                        key={ch.key}
                        className="flex items-start gap-3 rounded-lg border p-3"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <Label
                              htmlFor={`np-switch-${ch.key}`}
                              className="text-sm font-medium cursor-pointer"
                            >
                              {ch.label}
                            </Label>
                            <Switch
                              id={`np-switch-${ch.key}`}
                              checked={checked}
                              onCheckedChange={v =>
                                setForm(f => ({ ...f, [ch.key]: v }))
                              }
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {ch.description}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <Separator />

              {/* Language */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-sm font-semibold">زبان اعلان</Label>
                </div>
                <Select
                  value={form.language ?? 'fa'}
                  onValueChange={v => setForm(f => ({ ...f, language: v }))}
                >
                  <SelectTrigger className="w-full sm:w-72">
                    <SelectValue placeholder="انتخاب زبان" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fa">فارسی</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                    <SelectItem value="ku">Kurdî</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Quiet hours */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <VolumeX className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">ساعات سکوت</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearQuietHours}
                    disabled={!form.quietHoursStart && !form.quietHoursEnd}
                  >
                    پاک کردن
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  در این بازه زمانی، اعلان‌ها به تعویق می‌افتند (به جز اعلان‌های اضطراری).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="np-quiet-start" className="text-xs">شروع</Label>
                    <Input
                      id="np-quiet-start"
                      type="time"
                      dir="ltr"
                      value={form.quietHoursStart ?? ''}
                      onChange={e =>
                        setForm(f => ({
                          ...f,
                          quietHoursStart: e.target.value || null,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="np-quiet-end" className="text-xs">پایان</Label>
                    <Input
                      id="np-quiet-end"
                      type="time"
                      dir="ltr"
                      value={form.quietHoursEnd ?? ''}
                      onChange={e =>
                        setForm(f => ({
                          ...f,
                          quietHoursEnd: e.target.value || null,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Save row */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>آخرین به‌روزرسانی: {formatDateTime(preference.updatedAt)}</span>
                </div>
                <Button onClick={handleSave} disabled={saving || !dirty}>
                  {saving ? (
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 ml-2" />
                  )}
                  ذخیره
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ---------- Section 2: All Preferences ---------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            همه ترجیحات
          </CardTitle>
          <CardDescription>
            {total.toLocaleString('fa-IR')} مورد • صفحه {page.toLocaleString('fa-IR')} از {lastPage.toLocaleString('fa-IR')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {listLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 rounded-md bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>شناسه کاربر</TableHead>
                  <TableHead>کانال‌های فعال</TableHead>
                  <TableHead>زبان</TableHead>
                  <TableHead>ساعات سکوت</TableHead>
                  <TableHead>به‌روزرسانی</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      هیچ ترجیحی یافت نشد.
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map(p => {
                    const hasQuietHours = !!p.quietHoursStart && !!p.quietHoursEnd
                    const anyChannel =
                      p.emailEnabled ||
                      p.smsEnabled ||
                      p.pushEnabled ||
                      p.whatsappEnabled ||
                      p.inappEnabled
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs" dir="ltr">
                          {p.userId}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {p.emailEnabled && <Mail className="w-3.5 h-3.5 text-muted-foreground" />}
                            {p.smsEnabled && <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />}
                            {p.pushEnabled && <Bell className="w-3.5 h-3.5 text-muted-foreground" />}
                            {p.whatsappEnabled && <Phone className="w-3.5 h-3.5 text-muted-foreground" />}
                            {p.inappEnabled && <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />}
                            {!anyChannel && (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {LANGUAGE_LABELS[p.language] ?? p.language}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs" dir="ltr">
                          {hasQuietHours ? (
                            <span className="font-mono">
                              {p.quietHoursStart} — {p.quietHoursEnd}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {timeAgo(p.updatedAt)}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-xs text-muted-foreground">
              {!listLoading && list.length > 0 ? (
                <>
                  {fromItem.toLocaleString('fa-IR')}–{toItem.toLocaleString('fa-IR')} از{' '}
                  {total.toLocaleString('fa-IR')}
                </>
              ) : (
                <span>&nbsp;</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || listLoading}
              >
                <ChevronRight className="w-4 h-4 ml-1" />
                قبلی
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(lastPage, p + 1))}
                disabled={page >= lastPage || listLoading}
              >
                بعدی
                <ChevronLeft className="w-4 h-4 mr-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ---------- Section 3: LAW-56 info ---------- */}
      <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900">
        <CardContent className="p-4 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300">
            <Volume2 className="w-4 h-4" />
            <span>LAW-56 — ارسال کانال‌اگنوستیک</span>
          </div>
          <p className="text-muted-foreground leading-6">
            هیچ Contextی مستقیماً ایمیل یا SMS ارسال نمی‌کند. تمام Contextها فقط Event منتشر می‌کنند و Notification Context بر اساس ترجیحات کاربر تصمیم می‌گیرد از چه کانالی استفاده کند.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
