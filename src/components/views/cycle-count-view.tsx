'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ClipboardCheck, Plus, RefreshCw, AlertCircle, Loader2,
  Play, CheckCircle, ShieldCheck, ArrowRight, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  cycleCountsApi, warehousesApi,
  type CycleCount, type CycleCountLine, type Warehouse,
} from '@/lib/api-client'
import type { ApiError } from '@/lib/api-client'

const statusLabels: Record<string, string> = {
  draft: 'پیش‌نویس',
  in_progress: 'در حال شمارش',
  completed: 'تکمیل‌شده',
  approved: 'تأییدشده',
  adjusted: 'تعدیل‌شده',
  cancelled: 'لغو‌شده',
}

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  in_progress: 'default',
  completed: 'default',
  approved: 'default',
  adjusted: 'default',
  cancelled: 'destructive',
}

const countTypeLabels: Record<string, string> = {
  full: 'کامل',
  cycle: 'دوره‌ای',
  spot: 'نقطه‌ای',
}

// ============================================================
// Cycle Count List
// ============================================================

export function CycleCountView() {
  const [counts, setCounts] = useState<CycleCount[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ warehouseId: '', countType: 'full', notes: '' })
  const [selected, setSelected] = useState<CycleCount | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [countsRes, whRes] = await Promise.all([
        cycleCountsApi.list(1, 100),
        warehousesApi.list(1, 100),
      ])
      setCounts(countsRes.data)
      setWarehouses(whRes.data)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    try {
      const idempotencyKey = crypto.randomUUID()
      await cycleCountsApi.create({
        warehouseId: form.warehouseId,
        countType: form.countType,
        notes: form.notes || undefined,
      }, idempotencyKey)
      toast.success('شمارش ایجاد شد')
      setShowForm(false)
      setForm({ warehouseId: '', countType: 'full', notes: '' })
      load()
    } catch (e) { toast.error((e as ApiError).detail || 'خطا') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">شمارش موجودی</h1>
          <p className="text-muted-foreground mt-1">
            Sprint 2.2D — Cycle Count Aggregate (Count → Variance → Approval → Adjustment → Ledger)
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 ml-2" /> شمارش جدید
        </Button>
      </div>

      {/* Policy Info */}
      <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
        <CardContent className="p-3 flex items-center gap-2 text-sm">
          <ShieldCheck className="w-4 h-4 text-amber-600" />
          <span className="text-amber-700 dark:text-amber-400">
            <strong>Adjustment Policy:</strong> هیچ تعدیل مستقیمی وجود ندارد — تمام تعدیل‌ها از تأیید شمارش عبور می‌کنند.
          </span>
        </CardContent>
      </Card>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : counts.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <ClipboardCheck className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>هنوز شمارشی ثبت نشده است</p>
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <table className="w-full">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-right p-3 text-sm font-medium">شماره</th>
                <th className="text-right p-3 text-sm font-medium">انبار</th>
                <th className="text-right p-3 text-sm font-medium">نوع</th>
                <th className="text-right p-3 text-sm font-medium">ردیف</th>
                <th className="text-right p-3 text-sm font-medium">وضعیت</th>
                <th className="text-right p-3 text-sm font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {counts.map((c) => {
                const wh = warehouses.find((w) => w.id === c.warehouseId)
                return (
                  <tr key={c.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(c as any)}>
                    <td className="p-3 font-mono text-xs">{c.countNumber}</td>
                    <td className="p-3 text-sm">{wh?.name ?? c.warehouseId.slice(0, 8)}</td>
                    <td className="p-3"><Badge variant="outline">{countTypeLabels[c.countType] || c.countType}</Badge></td>
                    <td className="p-3 text-sm">{c.lineCount}</td>
                    <td className="p-3"><Badge variant={statusVariants[c.status]} className="text-xs">{statusLabels[c.status] || c.status}</Badge></td>
                    <td className="p-3">
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelected(c as any) }}>
                        مشاهده
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent></Card>
      )}

      {/* Create Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>شمارش جدید</DialogTitle>
            <DialogDescription>کد شمارش خودکار تولید می‌شود (LAW-02)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>انبار *</Label>
              <select className="w-full h-10 px-3 rounded-md border border-input bg-background" value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}>
                <option value="">انتخاب...</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>نوع شمارش</Label>
              <select className="w-full h-10 px-3 rounded-md border border-input bg-background" value={form.countType} onChange={(e) => setForm({ ...form, countType: e.target.value })}>
                <option value="full">کامل (تمام موجودی)</option>
                <option value="cycle">دوره‌ای (گروه خاص)</option>
                <option value="spot">نقطه‌ای (یک قلم)</option>
              </select>
            </div>
            <div className="space-y-2"><Label>توضیحات</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>انصراف</Button>
            <Button onClick={handleCreate} disabled={!form.warehouseId}>ایجاد</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      {selected && <CycleCountDetail count={selected} warehouses={warehouses} onClose={() => { setSelected(null); load() }} />}
    </div>
  )
}

// ============================================================
// Cycle Count Detail (with workflow actions)
// ============================================================

function CycleCountDetail({ count, warehouses, onClose }: {
  count: CycleCount & { lines?: CycleCountLine[] }
  warehouses: Warehouse[]
  onClose: () => void
}) {
  const [detail, setDetail] = useState<CycleCount & { lines: CycleCountLine[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [countedValues, setCountedValues] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await cycleCountsApi.get(count.id)
      setDetail(res.data)
      // Initialize counted values from existing data
      const vals: Record<string, string> = {}
      res.data.lines?.forEach((l) => {
        if (l.countedQuantity !== null) vals[l.id] = String(l.countedQuantity)
      })
      setCountedValues(vals)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [count.id])

  useEffect(() => { load() }, [load])

  const handleStart = async () => {
    try {
      await cycleCountsApi.start(count.id, { countedBy: 'admin' }, crypto.randomUUID())
      toast.success('شمارش شروع شد')
      load()
    } catch (e) { toast.error((e as ApiError).detail || 'خطا') }
  }

  const handleComplete = async () => {
    if (!detail) return
    try {
      const lines = Object.entries(countedValues).map(([lineId, qty]) => ({
        lineId,
        countedQuantity: parseFloat(qty) || 0,
      }))
      await cycleCountsApi.complete(count.id, { lines }, crypto.randomUUID())
      toast.success('شمارش تکمیل شد')
      load()
    } catch (e) { toast.error((e as ApiError).detail || 'خطا') }
  }

  const handleApprove = async () => {
    if (!confirm('تأیید شمارش و ایجاد تراکنش‌های تعدیل در دفتر کل؟')) return
    try {
      const res = await cycleCountsApi.approve(count.id, { approvedBy: 'admin' }, crypto.randomUUID())
      toast.success(`شمارش تأیید شد — ${res.data.adjustmentsCreated} تعدیل ایجاد شد (مجموع مغایرت: ${res.data.totalVariance})`)
      load()
    } catch (e) { toast.error((e as ApiError).detail || 'خطا') }
  }

  const wh = warehouses.find((w) => w.id === count.warehouseId)

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            {count.countNumber}
          </DialogTitle>
          <DialogDescription>
            انبار: {wh?.name ?? '—'} • نوع: {countTypeLabels[count.countType]}
          </DialogDescription>
        </DialogHeader>

        {/* Status + Actions */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <Badge variant={statusVariants[count.status]}>{statusLabels[count.status] || count.status}</Badge>
          <div className="flex gap-2">
            {count.status === 'draft' && (
              <Button size="sm" onClick={handleStart}><Play className="w-4 h-4 ml-1" /> شروع شمارش</Button>
            )}
            {count.status === 'in_progress' && (
              <Button size="sm" onClick={handleComplete}><CheckCircle className="w-4 h-4 ml-1" /> تکمیل شمارش</Button>
            )}
            {count.status === 'completed' && (
              <Button size="sm" onClick={handleApprove}><ShieldCheck className="w-4 h-4 ml-1" /> تأیید و تعدیل</Button>
            )}
          </div>
        </div>

        {/* Lines Table */}
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : detail && detail.lines ? (
          <div className="border rounded-lg overflow-auto max-h-[400px]">
            <table className="w-full">
              <thead className="border-b bg-muted/30 sticky top-0">
                <tr>
                  <th className="text-right p-2 text-xs font-medium">قلم</th>
                  <th className="text-right p-2 text-xs font-medium">سیستم</th>
                  <th className="text-right p-2 text-xs font-medium">شمارش</th>
                  <th className="text-right p-2 text-xs font-medium">مغایرت</th>
                  <th className="text-right p-2 text-xs font-medium">وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {detail.lines.map((line) => {
                  const variance = line.countedQuantity !== null
                    ? line.countedQuantity - line.systemQuantity
                    : null
                  return (
                    <tr key={line.id} className="border-b hover:bg-muted/20">
                      <td className="p-2 font-mono text-xs">{line.stockItemId.slice(0, 8)}...</td>
                      <td className="p-2 text-sm font-mono">{line.systemQuantity}</td>
                      <td className="p-2">
                        {count.status === 'in_progress' ? (
                          <Input
                            type="number"
                            value={countedValues[line.id] ?? ''}
                            onChange={(e) => setCountedValues({ ...countedValues, [line.id]: e.target.value })}
                            className="h-8 w-20"
                            placeholder={String(line.systemQuantity)}
                          />
                        ) : (
                          <span className="font-mono text-sm">{line.countedQuantity ?? '—'}</span>
                        )}
                      </td>
                      <td className="p-2">
                        {variance !== null && variance !== 0 ? (
                          <Badge variant={variance > 0 ? 'default' : 'destructive'} className="font-mono text-xs">
                            {variance > 0 ? '+' : ''}{variance}
                          </Badge>
                        ) : variance === 0 ? (
                          <Badge variant="secondary" className="text-xs">✓</Badge>
                        ) : '—'}
                      </td>
                      <td className="p-2">
                        {line.isReconciled && <Badge variant="outline" className="text-xs">تعدیل‌شده</Badge>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {/* Info */}
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-xs text-muted-foreground space-y-1">
            <div><strong>LAW-05:</strong> موجودی سیستم از دفتر کل محاسبه می‌شود</div>
            <div><strong>LAW-06:</strong> تمام عملیات Idempotent هستند</div>
            <div><strong>LAW-07:</strong> Optimistic Lock با version field</div>
            <div><strong>LAW-08:</strong> رویدادها در Outbox ثبت می‌شوند</div>
            <div><strong>LAW-11/12:</strong> Transaction در Application Service + Unit of Work</div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}
