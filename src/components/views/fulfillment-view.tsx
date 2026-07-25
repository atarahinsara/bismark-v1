'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Truck, Plus, Search, Loader2, Package, Box, Send, CheckCircle,
  ClipboardList, MapPin, Clock,
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
  shipmentsApi, salesOrdersApi, warehousesApi,
  type Shipment, type ShipmentLine, type SalesOrder, type Warehouse,
} from '@/lib/api-client'
import type { ApiError } from '@/lib/api-client'

const statusLabels: Record<string, string> = {
  draft: 'پیش‌نویس', picking: 'در حال جمع‌آوری', packing: 'در حال بسته‌بندی',
  shipped: 'ارسال‌شده', delivered: 'تحویل‌شده', returned: 'مرجوع‌شده', cancelled: 'لغو‌شده',
}
const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary', picking: 'outline', packing: 'outline',
  shipped: 'default', delivered: 'default', returned: 'destructive', cancelled: 'destructive',
}

export function FulfillmentView() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<Shipment | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await shipmentsApi.list(1, 100)
      setShipments(res.data)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">fulfillment</h1>
          <p className="text-muted-foreground mt-1">Sprint 3.2 — Fulfillment (LAW-16/17/18)</p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 ml-2" /> محموله جدید</Button>
      </div>

      <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900">
        <CardContent className="p-3 flex items-center gap-2 text-xs flex-wrap">
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">Workflow:</span>
          <Badge variant="outline">Reserve</Badge> → <Badge variant="outline">Pick</Badge> →
          <Badge variant="outline">Pack</Badge> → <Badge variant="outline">Ship (LAW-16: Ledger OUT)</Badge> →
          <Badge variant="outline">Deliver</Badge>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : shipments.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <Truck className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>هنوز محموله‌ای ثبت نشده است</p>
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <table className="w-full">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-right p-3 text-sm font-medium">شماره</th>
                <th className="text-right p-3 text-sm font-medium">سفارش</th>
                <th className="text-right p-3 text-sm font-medium">ردیف</th>
                <th className="text-right p-3 text-sm font-medium">روش ارسال</th>
                <th className="text-right p-3 text-sm font-medium">وضعیت</th>
                <th className="text-right p-3 text-sm font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => (
                <tr key={s.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(s)}>
                  <td className="p-3 font-mono text-xs">{s.shipmentNumber}</td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">{s.salesOrderId?.slice(0, 8) ?? '—'}...</td>
                  <td className="p-3 text-sm">{s.lineCount}</td>
                  <td className="p-3 text-sm">{s.shippingMethod ?? '—'}</td>
                  <td className="p-3"><Badge variant={statusVariants[s.status]} className="text-xs">{statusLabels[s.status] || s.status}</Badge></td>
                  <td className="p-3"><Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelected(s) }}>مشاهده</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      )}

      {showForm && <CreateShipmentForm onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); load() }} />}
      {selected && <ShipmentDetail shipment={selected} onClose={() => { setSelected(null); load() }} />}
    </div>
  )
}

function CreateShipmentForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [form, setForm] = useState({ salesOrderId: '', fromWarehouseId: '', shippingMethod: 'in_house' })

  useEffect(() => {
    Promise.all([
      salesOrdersApi.list(1, 100, undefined).then((r) => setOrders(r.data.filter((o) => o.status === 'approved' || o.status === 'partially_shipped'))),
      warehousesApi.list(1, 100).then((r) => setWarehouses(r.data)),
    ]).catch(() => {})
  }, [])

  const handleCreate = async () => {
    try {
      await shipmentsApi.create(form, crypto.randomUUID())
      toast.success('محموله ایجاد شد')
      onCreated()
    } catch (e) { toast.error((e as ApiError).detail || 'خطا') }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>محموله جدید</DialogTitle>
          <DialogDescription>کد محموله خودکار تولید می‌شود (LAW-02) — LAW-17: نیاز به Reservation</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>سفارش فروش (تأییدشده) *</Label>
            <select className="w-full h-10 px-3 rounded-md border border-input bg-background" value={form.salesOrderId} onChange={(e) => setForm({ ...form, salesOrderId: e.target.value })}>
              <option value="">انتخاب...</option>
              {orders.map((o) => <option key={o.id} value={o.id}>{o.orderNumber}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>انبار مبدا *</Label>
            <select className="w-full h-10 px-3 rounded-md border border-input bg-background" value={form.fromWarehouseId} onChange={(e) => setForm({ ...form, fromWarehouseId: e.target.value })}>
              <option value="">انتخاب...</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>روش ارسال</Label>
            <select className="w-full h-10 px-3 rounded-md border border-input bg-background" value={form.shippingMethod} onChange={(e) => setForm({ ...form, shippingMethod: e.target.value })}>
              <option value="in_house">داخلی</option>
              <option value="courier">پیک</option>
              <option value="post">پست</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>انصراف</Button>
          <Button onClick={handleCreate} disabled={!form.salesOrderId || !form.fromWarehouseId}>ایجاد</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ShipmentDetail({ shipment, onClose }: { shipment: Shipment; onClose: () => void }) {
  const [detail, setDetail] = useState<{ data: Shipment; lines: ShipmentLine[] } | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await shipmentsApi.get(shipment.id)
      setDetail(res)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [shipment.id])

  useEffect(() => { load() }, [load])

  const handlePick = async () => {
    try { await shipmentsApi.pick(shipment.id, { pickedBy: 'admin' }, crypto.randomUUID()); toast.success('جمع‌آوری شد'); load() }
    catch (e) { toast.error((e as ApiError).detail || 'خطا') }
  }
  const handlePack = async () => {
    try { await shipmentsApi.pack(shipment.id, { packedBy: 'admin' }, crypto.randomUUID()); toast.success('بسته‌بندی شد'); load() }
    catch (e) { toast.error((e as ApiError).detail || 'خطا') }
  }
  const handleShip = async () => {
    try {
      const res = await shipmentsApi.ship(shipment.id, { shippedBy: 'admin' }, crypto.randomUUID())
      toast.success(`ارسال شد — ${res.data.ledgerEntriesCreated} تراکنش دفتر کل (LAW-16)`)
      load()
    } catch (e) { toast.error((e as ApiError).detail || 'خطا') }
  }
  const handleDeliver = async () => {
    try { await shipmentsApi.deliver(shipment.id, { deliveredBy: 'admin' }, crypto.randomUUID()); toast.success('تحویل داده شد'); load() }
    catch (e) { toast.error((e as ApiError).detail || 'خطا') }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Truck className="w-5 h-5 text-primary" /> {shipment.shipmentNumber}</DialogTitle>
          <DialogDescription>نسخه: {shipment.version} (LAW-07)</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <Badge variant={statusVariants[shipment.status]}>{statusLabels[shipment.status] || shipment.status}</Badge>
          <div className="flex gap-2">
            {shipment.status === 'draft' && <Button size="sm" onClick={handlePick}><ClipboardList className="w-4 h-4 ml-1" /> جمع‌آوری</Button>}
            {shipment.status === 'picking' && <Button size="sm" onClick={handlePack}><Box className="w-4 h-4 ml-1" /> بسته‌بندی</Button>}
            {shipment.status === 'packing' && <Button size="sm" onClick={handleShip}><Send className="w-4 h-4 ml-1" /> ارسال</Button>}
            {shipment.status === 'shipped' && <Button size="sm" onClick={handleDeliver}><CheckCircle className="w-4 h-4 ml-1" /> تحویل</Button>}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : detail && detail.lines ? (
          <div className="border rounded-lg overflow-auto max-h-[250px]">
            <table className="w-full">
              <thead className="border-b bg-muted/30 sticky top-0">
                <tr>
                  <th className="text-right p-2 text-xs font-medium">#</th>
                  <th className="text-right p-2 text-xs font-medium">محصول</th>
                  <th className="text-right p-2 text-xs font-medium">تعداد</th>
                  <th className="text-right p-2 text-xs font-medium">جمع‌آوری</th>
                  <th className="text-right p-2 text-xs font-medium">بسته‌بندی</th>
                  <th className="text-right p-2 text-xs font-medium">ارسال</th>
                </tr>
              </thead>
              <tbody>
                {detail.lines.map((l) => (
                  <tr key={l.id} className="border-b hover:bg-muted/20">
                    <td className="p-2 text-xs">{l.lineNumber}</td>
                    <td className="p-2 font-mono text-xs">{l.productId.slice(0, 8)}...</td>
                    <td className="p-2 text-sm font-mono">{l.quantity}</td>
                    <td className="p-2 text-xs">{l.quantityPicked}/{l.quantity}</td>
                    <td className="p-2 text-xs">{l.quantityPacked}/{l.quantity}</td>
                    <td className="p-2 text-xs">{l.quantityShipped}/{l.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
          <CardContent className="p-3 text-xs space-y-1">
            <div><strong>LAW-16:</strong> ارسال → ایجاد OUT در دفتر کل (بدون حرکت فیزیکی بدون رویداد دفتر)</div>
            <div><strong>LAW-17:</strong> قبل از ارسال، Reservation باید وجود داشته باشد</div>
            <div><strong>LAW-18:</strong> پس از ارسال، محموله غیرقابل ویرایش است</div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}
