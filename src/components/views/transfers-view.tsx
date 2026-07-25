'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ArrowRightLeft, Plus, Search, RefreshCw, AlertCircle, Loader2,
  Package, Send, CheckCircle, Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  stockTransfersApi, movementsApi, warehousesApi,
  type StockTransfer, type Movement, type Warehouse,
} from '@/lib/api-client'
import type { ApiError } from '@/lib/api-client'

const transferTypeLabels: Record<string, string> = {
  warehouse: 'بین انبار',
  zone: 'بین منطقه',
  bin: 'بین قفسه',
}

const statusLabels: Record<string, string> = {
  draft: 'پیش‌نویس',
  in_transit: 'در حال انتقال',
  received: 'دریافت‌شده',
  partial: 'جزئی',
  cancelled: 'لغو‌شده',
}

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  in_transit: 'default',
  received: 'default',
  partial: 'outline',
  cancelled: 'destructive',
}

// ============================================================
// Transfers Tab
// ============================================================

function TransfersTab() {
  const [transfers, setTransfers] = useState<StockTransfer[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    transferType: 'warehouse',
    fromWarehouseId: '',
    toWarehouseId: '',
    notes: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [transfersRes, whRes] = await Promise.all([
        stockTransfersApi.list(1, 100),
        warehousesApi.list(1, 100),
      ])
      setTransfers(transfersRes.data)
      setWarehouses(whRes.data)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    try {
      // LAW-06: Generate Idempotency-Key
      const idempotencyKey = crypto.randomUUID()
      await stockTransfersApi.create({
        transferType: form.transferType,
        fromWarehouseId: form.fromWarehouseId,
        toWarehouseId: form.toWarehouseId || undefined,
        notes: form.notes || undefined,
      }, idempotencyKey)
      toast.success('انتقال ایجاد شد')
      setShowForm(false)
      setForm({ transferType: 'warehouse', fromWarehouseId: '', toWarehouseId: '', notes: '' })
      load()
    } catch (e) { toast.error((e as ApiError).detail || 'خطا') }
  }

  const handleShip = async (id: string) => {
    try {
      const idempotencyKey = crypto.randomUUID()
      const res = await stockTransfersApi.ship(id, idempotencyKey)
      toast.success(`انتقال ارسال شد (${res.data.ledgerEntriesCreated} تراکنش دفتر کل)`)
      load()
    } catch (e) { toast.error((e as ApiError).detail || 'خطا') }
  }

  const handleReceive = async (id: string) => {
    try {
      const idempotencyKey = crypto.randomUUID()
      const res = await stockTransfersApi.receive(id, idempotencyKey)
      toast.success(`انتقال دریافت شد (${res.data.ledgerEntriesCreated} تراکنش دفتر کل)`)
      load()
    } catch (e) { toast.error((e as ApiError).detail || 'خطا') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">انتقالات موجودی</h3>
          <p className="text-sm text-muted-foreground">{transfers.length} انتقال</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 ml-2" /> انتقال جدید
        </Button>
      </div>

      <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900">
        <CardContent className="p-3 flex items-center gap-2 text-sm">
          <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
          <span className="text-emerald-700 dark:text-emerald-400">
            <strong>LAW-06 (Idempotency):</strong> تمام انتقال‌ها با <code className="font-mono">Idempotency-Key</code> ارسال می‌شوند — تکرار درخواست، تکرار اثر ندارد.
          </span>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : transfers.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <ArrowRightLeft className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>هنوز انتقالی ثبت نشده است</p>
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <table className="w-full">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-right p-3 text-sm font-medium">شماره</th>
                <th className="text-right p-3 text-sm font-medium">نوع</th>
                <th className="text-right p-3 text-sm font-medium">مبدا</th>
                <th className="text-right p-3 text-sm font-medium">مقصد</th>
                <th className="text-right p-3 text-sm font-medium">ردیف</th>
                <th className="text-right p-3 text-sm font-medium">وضعیت</th>
                <th className="text-right p-3 text-sm font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((t) => {
                const fromWh = warehouses.find((w) => w.id === t.fromWarehouseId)
                const toWh = warehouses.find((w) => w.id === t.toWarehouseId)
                return (
                  <tr key={t.id} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{t.transferNumber}</td>
                    <td className="p-3"><Badge variant="outline">{transferTypeLabels[t.transferType] || t.transferType}</Badge></td>
                    <td className="p-3 text-sm">{fromWh?.name ?? t.fromWarehouseId.slice(0, 8)}</td>
                    <td className="p-3 text-sm">{toWh?.name ?? '—'}</td>
                    <td className="p-3 text-sm">{t.lineCount}</td>
                    <td className="p-3"><Badge variant={statusVariants[t.status]} className="text-xs">{statusLabels[t.status] || t.status}</Badge></td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        {t.status === 'draft' && (
                          <Button size="sm" variant="outline" onClick={() => handleShip(t.id)}>
                            <Send className="w-3 h-3 ml-1" /> ارسال
                          </Button>
                        )}
                        {t.status === 'in_transit' && (
                          <Button size="sm" variant="outline" onClick={() => handleReceive(t.id)}>
                            <CheckCircle className="w-3 h-3 ml-1" /> دریافت
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent></Card>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>انتقال جدید</DialogTitle>
            <DialogDescription>کد انتقال خودکار تولید می‌شود (LAW-02)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>نوع انتقال</Label>
              <select className="w-full h-10 px-3 rounded-md border border-input bg-background" value={form.transferType} onChange={(e) => setForm({ ...form, transferType: e.target.value })}>
                <option value="warehouse">بین انبار</option>
                <option value="zone">بین منطقه</option>
                <option value="bin">بین قفسه</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>انبار مبدا *</Label>
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background" value={form.fromWarehouseId} onChange={(e) => setForm({ ...form, fromWarehouseId: e.target.value })}>
                  <option value="">انتخاب...</option>
                  {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>انبار مقصد {form.transferType === 'warehouse' ? '*' : ''}</Label>
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background" value={form.toWarehouseId} onChange={(e) => setForm({ ...form, toWarehouseId: e.target.value })}>
                  <option value="">انتخاب...</option>
                  {warehouses.filter((w) => w.id !== form.fromWarehouseId).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2"><Label>توضیحات</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>انصراف</Button>
            <Button onClick={handleCreate} disabled={!form.fromWarehouseId || (form.transferType === 'warehouse' && !form.toWarehouseId)}>ایجاد</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// Movement History Tab
// ============================================================

function MovementsTab() {
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await movementsApi.list(1, 100)
      setMovements(res.data)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">تاریخچه حرکت‌ها</h3>
        <p className="text-sm text-muted-foreground">{movements.length} حرکت ثبت‌شده</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : movements.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <Clock className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>هنوز حرکتی ثبت نشده است</p>
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <table className="w-full">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-right p-3 text-sm font-medium">شماره</th>
                <th className="text-right p-3 text-sm font-medium">نوع</th>
                <th className="text-right p-3 text-sm font-medium">محصول</th>
                <th className="text-right p-3 text-sm font-medium">تعداد</th>
                <th className="text-right p-3 text-sm font-medium">مرجع</th>
                <th className="text-right p-3 text-sm font-medium">زمان</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{m.movementNumber}</td>
                  <td className="p-3"><Badge variant="outline" className="text-xs">{m.movementType}</Badge></td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">{m.productId.slice(0, 8)}...</td>
                  <td className="p-3">
                    <Badge variant={m.quantity >= 0 ? 'default' : 'destructive'} className="font-mono text-xs">
                      {m.quantity > 0 ? '+' : ''}{m.quantity}
                    </Badge>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{m.referenceType ?? '—'}</td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(m.occurredAt).toLocaleString('fa-IR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      )}
    </div>
  )
}

// ============================================================
// Main TransfersView
// ============================================================

export function TransfersView() {
  const [tab, setTab] = useState<'transfers' | 'movements'>('transfers')

  const tabs = [
    { key: 'transfers' as const, label: 'انتقالات', icon: ArrowRightLeft },
    { key: 'movements' as const, label: 'تاریخچه حرکت‌ها', icon: Clock },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">انتقالات موجودی</h1>
        <p className="text-muted-foreground mt-1">
          Sprint 2.2C — Multi-Warehouse Transfer + Idempotency (LAW-06) + Optimistic Lock (LAW-07)
        </p>
      </div>

      <div className="flex gap-2 border-b">
        {tabs.map((t) => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'transfers' && <TransfersTab />}
      {tab === 'movements' && <MovementsTab />}
    </div>
  )
}
