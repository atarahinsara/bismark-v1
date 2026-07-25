'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Mail, MessageSquare, Phone, Bell, Smartphone, Plus, RefreshCw,
  Eye, Edit2, Send, History, FileText, Loader2,
  CheckCircle, AlertTriangle, Code, ChevronLeft, ChevronRight,
  ChevronDown, MoreHorizontal, Sparkles,
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
import {
  Collapsible, CollapsibleTrigger, CollapsibleContent,
} from '@/components/ui/collapsible'
import { toast } from 'sonner'
import {
  notificationTemplatesApi,
  type NotificationTemplate, type NotificationChannel,
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
  draft: 'پیش‌نویس',
  published: 'منتشر شده',
  disabled: 'غیرفعال',
}

// Custom color pills per spec: draft=amber, published=emerald, disabled=gray
const STATUS_TINT: Record<string, string> = {
  draft: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  published: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  disabled: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
}

const LANGUAGE_LABELS: Record<string, string> = {
  fa: 'فارسی',
  en: 'English',
  ar: 'العربية',
  ku: 'Kurdî',
}

const PER_PAGE = 20

const DEFAULT_PREVIEW_VARIABLES = `{
  "customer": { "name": "علی" },
  "invoice": { "number": "INV-001", "total": "1,200,000" },
  "company": { "name": "BISMARK" },
  "currentDate": "۱۴۰۳/۰۷/۲۵",
  "trackingCode": "TRK-12345",
  "warranty": { "expiry": "۱۴۰۵/۰۷/۲۵" },
  "service": { "number": "SRV-001" }
}`

const VARIABLES_SCHEMA_EXAMPLE =
  '[{"name":"customer.name","type":"string","required":true}]'

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

// ============================================================
// Main View
// ============================================================

export function NotificationTemplatesView() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [lastPage, setLastPage] = useState(1)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('') // '' = all
  const [channelFilter, setChannelFilter] = useState<string>('')
  const [languageFilter, setLanguageFilter] = useState<string>('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  // Dialog state
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorInitial, setEditorInitial] = useState<NotificationTemplate | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<NotificationTemplate | null>(null)
  const [versionsTemplate, setVersionsTemplate] = useState<NotificationTemplate | null>(null)
  const [publishTemplate, setPublishTemplate] = useState<NotificationTemplate | null>(null)

  // Action in-flight flags
  const [seeding, setSeeding] = useState(false)
  const [publishing, setPublishing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await notificationTemplatesApi.list({
        page,
        perPage: PER_PAGE,
        status: statusFilter || undefined,
        channel: channelFilter || undefined,
        language: languageFilter || undefined,
        code: search || undefined,
      })
      setTemplates(res.data)
      setTotal(res.meta.total)
      setLastPage(res.meta.last_page)
    } catch (e) {
      const msg = isApiError(e) ? e.detail : 'خطا در بارگذاری الگوها'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, channelFilter, languageFilter, search])

  useEffect(() => {
    load()
  }, [load])

  const handleApplySearch = () => {
    setPage(1)
    setSearch(searchInput.trim())
  }

  const handleResetPageAnd = (setter: (v: string) => void) => (v: string) => {
    setter(v)
    setPage(1)
  }

  const handleSeedDefaults = async () => {
    setSeeding(true)
    try {
      const idemKey = crypto.randomUUID()
      const res = await notificationTemplatesApi.seedDefaults(idemKey)
      toast.success(res.data?.message ?? 'الگوهای پیش‌فرض بذرگیری شدند')
      await load()
    } catch (e) {
      const msg = isApiError(e) ? e.detail : 'خطا در بذرگیری الگوها'
      toast.error(msg)
    } finally {
      setSeeding(false)
    }
  }

  const handlePublish = async (tpl: NotificationTemplate) => {
    setPublishing(true)
    try {
      const idemKey = crypto.randomUUID()
      await notificationTemplatesApi.publish(tpl.id, idemKey)
      toast.success(`الگوی «${tpl.name}» منتشر شد`)
      setPublishTemplate(null)
      await load()
    } catch (e) {
      const msg = isApiError(e) ? e.detail : 'خطا در انتشار الگو'
      toast.error(msg)
    } finally {
      setPublishing(false)
    }
  }

  const openCreate = () => {
    setEditorInitial(null)
    setEditorOpen(true)
  }

  const openEdit = (tpl: NotificationTemplate) => {
    setEditorInitial(tpl)
    setEditorOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">مدیریت الگوهای اعلان</h1>
          <p className="text-muted-foreground mt-1">
            Sprint 7.3 — LAW-55: نسخه‌بندی‌شده و چندزبانه
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 ml-2" />
            ایجاد الگوی جدید
          </Button>
          <Button variant="outline" onClick={handleSeedDefaults} disabled={seeding}>
            {seeding
              ? <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              : <Sparkles className="w-4 h-4 ml-2" />}
            بذرگیری الگوهای پیش‌فرض
          </Button>
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
            بارگذاری مجدد
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">وضعیت</Label>
              <Select
                value={statusFilter || 'all'}
                onValueChange={handleResetPageAnd((v) => setStatusFilter(v === 'all' ? '' : v))}
              >
                <SelectTrigger><SelectValue placeholder="همه" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه</SelectItem>
                  <SelectItem value="draft">پیش‌نویس</SelectItem>
                  <SelectItem value="published">منتشر شده</SelectItem>
                  <SelectItem value="disabled">غیرفعال</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">کانال</Label>
              <Select
                value={channelFilter || 'all'}
                onValueChange={handleResetPageAnd((v) => setChannelFilter(v === 'all' ? '' : v))}
              >
                <SelectTrigger><SelectValue placeholder="همه" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه</SelectItem>
                  {(Object.keys(CHANNEL_LABELS) as NotificationChannel[]).map((c) => {
                    const Icon = CHANNEL_ICONS[c]
                    return (
                      <SelectItem key={c} value={c}>
                        <span className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5" />
                          {CHANNEL_LABELS[c]}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">زبان</Label>
              <Select
                value={languageFilter || 'all'}
                onValueChange={handleResetPageAnd((v) => setLanguageFilter(v === 'all' ? '' : v))}
              >
                <SelectTrigger><SelectValue placeholder="همه" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه</SelectItem>
                  <SelectItem value="fa">فارسی</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="ku">Kurdî</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">جستجو (کد یا نام)</Label>
              <div className="flex gap-2">
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleApplySearch() }}
                  placeholder="مثلاً invoice.issued"
                  dir="ltr"
                />
                <Button variant="secondary" onClick={handleApplySearch}>جستجو</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            الگوهای اعلان
            <Badge variant="outline">{total.toLocaleString('fa-IR')}</Badge>
          </CardTitle>
          <CardDescription>
            {total.toLocaleString('fa-IR')} الگو • صفحه {page.toLocaleString('fa-IR')} از {lastPage.toLocaleString('fa-IR')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 rounded-md bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              هیچ الگویی یافت نشد — با «ایجاد الگوی جدید» یا «بذرگیری الگوهای پیش‌فرض» شروع کنید.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الگو</TableHead>
                    <TableHead>کانال</TableHead>
                    <TableHead>زبان</TableHead>
                    <TableHead>نسخه</TableHead>
                    <TableHead>وضعیت</TableHead>
                    <TableHead className="text-center">اعلان‌ها</TableHead>
                    <TableHead>ایجاد</TableHead>
                    <TableHead className="text-left">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((t) => {
                    const Icon = CHANNEL_ICONS[t.channel]
                    return (
                      <TableRow key={t.id}>
                        <TableCell>
                          <div className="font-mono text-xs text-foreground" dir="ltr">{t.code}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{t.name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs">{CHANNEL_LABELS[t.channel]}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {LANGUAGE_LABELS[t.language] ?? t.language}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs font-mono">
                            v{t.version.toLocaleString('fa-IR')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_TINT[t.status] ?? ''}`}>
                            {STATUS_LABELS[t.status] ?? t.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-xs font-mono">
                            {(t.notificationCount ?? 0).toLocaleString('fa-IR')}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {timeAgo(t.createdAt)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => openEdit(t)}>
                                <Eye className="w-3.5 h-3.5 ml-2" /> مشاهده / ویرایش
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setPreviewTemplate(t)}>
                                <Send className="w-3.5 h-3.5 ml-2" /> پیش‌نمایش
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setVersionsTemplate(t)}>
                                <History className="w-3.5 h-3.5 ml-2" /> نسخه‌ها
                              </DropdownMenuItem>
                              {t.status === 'draft' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => setPublishTemplate(t)}>
                                    <CheckCircle className="w-3.5 h-3.5 ml-2 text-emerald-600" /> انتشار
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {!loading && templates.length > 0 && (
            <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
              <div className="text-xs text-muted-foreground">
                نمایش {(templates.length).toLocaleString('fa-IR')} الگو در این صفحه •
                مجموع {total.toLocaleString('fa-IR')} الگو
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronRight className="w-4 h-4 ml-1" />
                  قبلی
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= lastPage}
                  onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                >
                  بعدی
                  <ChevronLeft className="w-4 h-4 mr-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Law Info */}
      <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900">
        <CardContent className="p-3 text-xs space-y-1">
          <div>
            <strong>LAW-55:</strong>{' '}
            تمام اعلان‌ها مبتنی بر قالب (template-based) با نسخه‌گذاری و پشتیبانی از چند زبان
          </div>
          <div>
            <strong>Idempotency:</strong>{' '}
            هر عملیات ایجاد، انتشار و پیش‌نمایش با Idempotency-Key یکتا (crypto.randomUUID) اجرا می‌شود
          </div>
        </CardContent>
      </Card>

      {/* Editor Dialog */}
      {editorOpen && (
        <EditorDialog
          initial={editorInitial}
          onClose={() => setEditorOpen(false)}
          onCreated={() => { setEditorOpen(false); load() }}
        />
      )}

      {/* Preview Dialog */}
      {previewTemplate && (
        <PreviewDialog
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
        />
      )}

      {/* Versions Dialog */}
      {versionsTemplate && (
        <VersionsDialog
          template={versionsTemplate}
          onClose={() => setVersionsTemplate(null)}
        />
      )}

      {/* Publish Confirm Dialog */}
      <Dialog
        open={!!publishTemplate}
        onOpenChange={(open) => { if (!open) setPublishTemplate(null) }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              تأیید انتشار
            </DialogTitle>
            <DialogDescription>
              آیا از انتشار این الگو مطمئن هستید؟ نسخه‌های قبلی منتشر شده غیرفعال خواهند شد.
            </DialogDescription>
          </DialogHeader>
          {publishTemplate && (
            <div className="p-3 rounded-lg bg-muted/40 text-sm space-y-1">
              <div>
                <span className="text-muted-foreground">کد: </span>
                <span className="font-mono" dir="ltr">{publishTemplate.code}</span>
              </div>
              <div>
                <span className="text-muted-foreground">نام: </span>
                {publishTemplate.name}
              </div>
              <div>
                <span className="text-muted-foreground">نسخه: </span>
                <span className="font-mono">v{publishTemplate.version.toLocaleString('fa-IR')}</span>
              </div>
              <div>
                <span className="text-muted-foreground">کانال: </span>
                {CHANNEL_LABELS[publishTemplate.channel]}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPublishTemplate(null)}
              disabled={publishing}
            >
              انصراف
            </Button>
            <Button
              onClick={() => publishTemplate && handlePublish(publishTemplate)}
              disabled={publishing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {publishing
                ? <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                : <CheckCircle className="w-4 h-4 ml-2" />}
              انتشار الگو
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// Editor Dialog (Create / prefill from existing)
// ============================================================

function EditorDialog({ initial, onClose, onCreated }: {
  initial: NotificationTemplate | null
  onClose: () => void
  onCreated: () => void
}) {
  const [code, setCode] = useState(initial?.code ?? '')
  const [name, setName] = useState(initial?.name ?? '')
  const [channel, setChannel] = useState<NotificationChannel>(initial?.channel ?? 'email')
  const [language, setLanguage] = useState<string>(initial?.language ?? 'fa')
  const [subject, setSubject] = useState(initial?.subjectTemplate ?? '')
  const [body, setBody] = useState(initial?.bodyTemplate ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [variablesSchema, setVariablesSchema] = useState<string>(
    initial?.variablesSchema ? JSON.stringify(initial.variablesSchema, null, 2) : ''
  )
  const [showHints, setShowHints] = useState(false)
  const [saving, setSaving] = useState(false)

  const subjectRequired = channel === 'email'

  const handleSubmit = async () => {
    if (!code.trim()) { toast.error('کد الگو الزامی است'); return }
    if (!name.trim()) { toast.error('نام الگو الزامی است'); return }
    if (!body.trim()) { toast.error('متن الگو الزامی است'); return }
    if (subjectRequired && !subject.trim()) {
      toast.error('موضوع برای کانال ایمیل الزامی است'); return
    }

    let parsedSchema: any = undefined
    if (variablesSchema.trim()) {
      try {
        parsedSchema = JSON.parse(variablesSchema)
      } catch {
        toast.error('JSON طرح‌واره متغیرها نامعتبر است')
        return
      }
    }

    setSaving(true)
    try {
      const idemKey = crypto.randomUUID()
      const res = await notificationTemplatesApi.create({
        code: code.trim(),
        name: name.trim(),
        channel,
        language,
        subjectTemplate: subjectRequired ? subject.trim() : undefined,
        bodyTemplate: body,
        description: description.trim() || undefined,
        variablesSchema: parsedSchema,
      }, idemKey)

      toast.success(
        `الگوی «${res.data.name}» با نسخه v${res.data.version.toLocaleString('fa-IR')} ایجاد شد`
      )
      if (res.warnings && res.warnings.length > 0) {
        res.warnings.forEach((w) => toast.warning(w))
      }
      onCreated()
    } catch (e) {
      const msg = isApiError(e) ? e.detail : 'خطا در ایجاد الگو'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-primary" />
            {initial ? 'ویرایش الگو (ایجاد نسخه جدید)' : 'ایجاد الگوی جدید'}
          </DialogTitle>
          <DialogDescription>
            {initial
              ? 'فیلدها با مقادیر الگوی انتخابی پر شده‌اند — ثبت، یک الگوی جدید با همان کد ایجاد می‌کند.'
              : 'قالب‌های اعلان با سینتکس Handlebars-like رندر می‌شوند (LAW-55).'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>کد الگو <span className="text-red-500">*</span></Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="invoice.issued"
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <Label>نام الگو <span className="text-red-500">*</span></Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="صدور فاکتور"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>کانال <span className="text-red-500">*</span></Label>
              <Select
                value={channel}
                onValueChange={(v) => setChannel(v as NotificationChannel)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CHANNEL_LABELS) as NotificationChannel[]).map((c) => {
                    const Icon = CHANNEL_ICONS[c]
                    return (
                      <SelectItem key={c} value={c}>
                        <span className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5" />
                          {CHANNEL_LABELS[c]}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>زبان <span className="text-red-500">*</span></Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fa">فارسی</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="ku">Kurdî</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              موضوع {subjectRequired && <span className="text-red-500">*</span>}
            </Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={subjectRequired ? 'فاکتور {{invoice.number}} صادر شد' : 'بدون موضوع برای کانال‌های غیر ایمیل'}
              disabled={!subjectRequired}
              dir="ltr"
            />
            {!subjectRequired && (
              <p className="text-xs text-muted-foreground">
                بدون موضوع برای کانال‌های غیر ایمیل
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>متن الگو <span className="text-red-500">*</span></Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="font-mono text-xs"
              dir="ltr"
              placeholder={'سلام {{customer.name}}،\n\nفاکتور شما به شماره {{invoice.number}} صادر شد.'}
            />
          </div>

          <div className="space-y-1.5">
            <Label>توضیحات (اختیاری)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="توضیح کوتاه درباره کاربرد الگو"
            />
          </div>

          <div className="space-y-1.5">
            <Label>طرح‌واره متغیرها (JSON، اختیاری)</Label>
            <Textarea
              value={variablesSchema}
              onChange={(e) => setVariablesSchema(e.target.value)}
              rows={4}
              className="font-mono text-xs"
              dir="ltr"
              placeholder={VARIABLES_SCHEMA_EXAMPLE}
            />
          </div>

          {/* Live template hints (collapsible) */}
          <Collapsible open={showHints} onOpenChange={setShowHints}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between border rounded-md">
                <span className="flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  راهنمای سینتکس قالب
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showHints ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="rounded-md border bg-muted/30 p-3 space-y-2 text-xs">
                <div className="flex flex-wrap gap-2 items-center">
                  <code
                    className="font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded"
                    dir="ltr"
                  >
                    {'{{customer.name}}'}
                  </code>
                  <span className="text-muted-foreground">— متغیر</span>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <code
                    className="font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded"
                    dir="ltr"
                  >
                    {'{{#if customer.hasAccount}}...{{else}}...{{/if}}'}
                  </code>
                  <span className="text-muted-foreground">— شرطی</span>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <code
                    className="font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded"
                    dir="ltr"
                  >
                    {'{{#each invoice.lines}}{{this.name}}{{/each}}'}
                  </code>
                  <span className="text-muted-foreground">— حلقه</span>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <code
                    className="font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded"
                    dir="ltr"
                  >
                    {'{{@index}}, {{@first}}, {{@last}}'}
                  </code>
                  <span className="text-muted-foreground">— در داخل حلقه</span>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>انصراف</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving
              ? <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              : <Plus className="w-4 h-4 ml-2" />}
            {initial ? 'ایجاد نسخه جدید' : 'ایجاد الگو'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Preview Dialog
// ============================================================

interface PreviewResult {
  subject: string | null
  body: string
  warnings: string[]
  issues: string[]
}

function PreviewDialog({ template, onClose }: {
  template: NotificationTemplate
  onClose: () => void
}) {
  const [variables, setVariables] = useState(DEFAULT_PREVIEW_VARIABLES)
  const [result, setResult] = useState<PreviewResult | null>(null)
  const [loading, setLoading] = useState(false)

  const handlePreview = async () => {
    let parsed: Record<string, any>
    try {
      parsed = JSON.parse(variables)
    } catch {
      toast.error('JSON متغیرها نامعتبر است')
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const idemKey = crypto.randomUUID()
      const res = await notificationTemplatesApi.preview(template.id, parsed, idemKey)
      setResult(res.data)
    } catch (e) {
      const msg = isApiError(e) ? e.detail : 'خطا در پیش‌نمایش الگو'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" /> پیش‌نمایش الگو
          </DialogTitle>
          <DialogDescription>
            <span className="font-mono" dir="ltr">{template.code}</span>{' '}
            — {template.name}{' '}
            (v{template.version.toLocaleString('fa-IR')} • {CHANNEL_LABELS[template.channel]})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>متغیرها (JSON)</Label>
            <Textarea
              value={variables}
              onChange={(e) => setVariables(e.target.value)}
              rows={8}
              className="font-mono text-xs"
              dir="ltr"
            />
          </div>

          <Button onClick={handlePreview} disabled={loading}>
            {loading
              ? <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              : <Eye className="w-4 h-4 ml-2" />}
            پیش‌نمایش
          </Button>

          {result && (
            <div className="space-y-3">
              {/* Validation issues */}
              {result.issues.length > 0 && (
                <div className="rounded-md border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4" />
                    خطاهای اعتبارسنجی ({result.issues.length.toLocaleString('fa-IR')})
                  </div>
                  <ul className="text-xs space-y-1 list-disc pr-5 text-amber-700 dark:text-amber-300">
                    {result.issues.map((iss, i) => (
                      <li key={i} dir="ltr">{iss}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {result.warnings.length > 0 && (
                <div className="rounded-md border border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/30 p-3 space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-orange-700 dark:text-orange-300">
                    <AlertTriangle className="w-4 h-4" />
                    هشدارها ({result.warnings.length.toLocaleString('fa-IR')})
                  </div>
                  <ul className="text-xs space-y-1 list-disc pr-5 text-orange-700 dark:text-orange-300">
                    {result.warnings.map((w, i) => (
                      <li key={i} dir="ltr">{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Rendered subject */}
              {result.subject && (
                <div className="space-y-1.5">
                  <Label>موضوع رندر شده</Label>
                  <div className="p-3 rounded-md border bg-muted/30 text-sm">{result.subject}</div>
                </div>
              )}

              {/* Rendered body */}
              <div className="space-y-1.5">
                <Label>متن رندر شده</Label>
                <pre
                  className="p-3 rounded-md border bg-muted/30 text-xs font-mono whitespace-pre-wrap break-words leading-relaxed"
                  dir="auto"
                >
                  {result.body}
                </pre>
              </div>

              {/* Success footer note */}
              {result.issues.length === 0 && result.warnings.length === 0 && (
                <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                  <CheckCircle className="w-3.5 h-3.5" />
                  پیش‌نمایش بدون خطا یا هشدار رندر شد.
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>بستن</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Versions Dialog (timeline of all versions for same code+language+channel)
// ============================================================

function VersionsDialog({ template, onClose }: {
  template: NotificationTemplate
  onClose: () => void
}) {
  const [versions, setVersions] = useState<NotificationTemplate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await notificationTemplatesApi.versions(template.id)
        if (active) setVersions(res.data)
      } catch (e) {
        const msg = isApiError(e) ? e.detail : 'خطا در بارگذاری نسخه‌ها'
        toast.error(msg)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [template.id])

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" /> نسخه‌های الگو
          </DialogTitle>
          <DialogDescription>
            <span className="font-mono" dir="ltr">{template.code}</span>
            {' — '}
            {CHANNEL_LABELS[template.channel]} / {LANGUAGE_LABELS[template.language] ?? template.language}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : versions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            هیچ نسخه‌ای یافت نشد
          </p>
        ) : (
          <div className="space-y-2">
            {versions.map((v) => {
              const isCurrent = v.id === template.id
              const isPublished = v.status === 'published'
              return (
                <div
                  key={v.id}
                  className={`p-3 rounded-md border ${
                    isCurrent
                      ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20'
                      : isPublished
                        ? 'border-emerald-100 dark:border-emerald-900/50'
                        : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-mono text-xs">
                        v{v.version.toLocaleString('fa-IR')}
                      </Badge>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_TINT[v.status] ?? ''}`}
                      >
                        {STATUS_LABELS[v.status] ?? v.status}
                      </span>
                      {isCurrent && (
                        <Badge
                          variant="outline"
                          className="text-xs text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                        >
                          نسخه جاری
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground font-mono" dir="ltr">
                      {v.id.slice(0, 8)}…
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div className="flex gap-2">
                      <span className="inline-block w-20 flex-shrink-0">معتبر از:</span>
                      <span dir="ltr">{new Date(v.effectiveFrom).toLocaleString('fa-IR')}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="inline-block w-20 flex-shrink-0">معتبر تا:</span>
                      {v.effectiveTo
                        ? <span dir="ltr">{new Date(v.effectiveTo).toLocaleString('fa-IR')}</span>
                        : <span>تا اکنون</span>}
                    </div>
                    {v.publishedAt && (
                      <div className="flex gap-2">
                        <span className="inline-block w-20 flex-shrink-0">منتشر در:</span>
                        <span dir="ltr">{new Date(v.publishedAt).toLocaleString('fa-IR')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>بستن</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
