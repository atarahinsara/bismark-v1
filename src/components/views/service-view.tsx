'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Wrench, Plus, Loader2, Search, CheckCircle, Eye, Send,
  Package, ClipboardCheck, Truck, Settings as SettingsIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api-client'

const API_BASE = '/api/v1'
// F-06 fix (Audit v4): use apiFetch (auto-attaches Bearer token) instead of raw fetch.
const fetchAPI = apiFetch

const reqStatusLabels: Record<string, string> = {
  draft: 'پیش‌نویس', submitted: 'ارسال‌شده', validated: 'تأییدشده', service_order: 'سفارش تعمیر', cancelled: 'لغوشده',
}
const orderStatusLabels: Record<string, string> = {
  open: 'باز', diagnosis: 'در حال تشخیص', waiting_parts: 'در انتظار قطعه', repair: 'در حال تعمیر',
  qc: 'کنترل کیفیت', ready: 'آماده تحویل', delivered: 'تحویل‌شده', closed: 'بسته‌شده', cancelled: 'لغوشده',
}
const orderStatusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  open: 'secondary', diagnosis: 'outline', waiting_parts: 'outline', repair: 'default',
  qc: 'default', ready: 'default', delivered: 'default', closed: 'default', cancelled: 'destructive',
}

export function ServiceView() {
  const [tab, setTab] = useState<'requests' | 'orders'>('requests')
  const [requests, setRequests] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showReqForm, setShowReqForm] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [reqRes, ordRes] = await Promise.all([
        fetchAPI('/service-requests').then((r) => r.json()),
        fetchAPI('/service-orders').then((r) => r.json()),
      ])
      setRequests(reqRes.data || [])
      setOrders(ordRes.data || [])
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">خدمات و تعمیرات</h1>
          <p className="text-muted-foreground mt-1">Sprint 5 — Service Context (LAW-31/32/33)</p>
        </div>
        {tab === 'requests' && <Button onClick={() => setShowReqForm(true)}><Plus className="w-4 h-4 ml-2" /> درخواست خدمت</Button>}
      </div>

      <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900">
        <CardContent className="p-3 flex items-center gap-2 text-xs flex-wrap">
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">Workflow:</span>
          <Badge variant="outline">Request</Badge> → <Badge variant="outline">Order (open)</Badge> →
          <Badge variant="outline">Diagnosis</Badge> → <Badge variant="outline">Repair</Badge> →
          <Badge variant="outline">QC (LAW-32)</Badge> → <Badge variant="outline">Ready</Badge> → <Badge variant="outline">Delivered</Badge>
        </CardContent>
      </Card>

      <div className="flex gap-2 border-b">
        {[
          { key: 'requests' as const, label: 'درخواست‌های خدمت', icon: Send },
          { key: 'orders' as const, label: 'سفارش‌های تعمیر', icon: Wrench },
        ].map((t) => {
          const Icon = t.icon; const active = tab === t.key
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : tab === 'requests' ? (
        requests.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground"><Send className="w-12 h-12 mx-auto mb-2 opacity-30" /><p>هنوز درخواستی ثبت نشده است</p></CardContent></Card>
        ) : (
          <Card><CardContent className="p-0">
            <table className="w-full">
              <thead className="border-b bg-muted/30"><tr>
                <th className="text-right p-3 text-sm font-medium">شماره</th>
                <th className="text-right p-3 text-sm font-medium">مشتری</th>
                <th className="text-right p-3 text-sm font-medium">نوع</th>
                <th className="text-right p-3 text-sm font-medium">اولویت</th>
                <th className="text-right p-3 text-sm font-medium">مشکل</th>
                <th className="text-right p-3 text-sm font-medium">وضعیت</th>
              </tr></thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{r.requestNumber}</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{r.customerPartyId.slice(0, 8)}...</td>
                    <td className="p-3 text-sm">{r.serviceKind}</td>
                    <td className="p-3"><Badge variant="outline" className="text-xs">{r.priority}</Badge></td>
                    <td className="p-3 text-sm truncate max-w-xs">{r.customerProblem}</td>
                    <td className="p-3"><Badge variant="secondary" className="text-xs">{reqStatusLabels[r.status] || r.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
        )
      ) : (
        orders.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground"><Wrench className="w-12 h-12 mx-auto mb-2 opacity-30" /><p>هنوز سفارش تعمیری ثبت نشده است</p></CardContent></Card>
        ) : (
          <Card><CardContent className="p-0">
            <table className="w-full">
              <thead className="border-b bg-muted/30"><tr>
                <th className="text-right p-3 text-sm font-medium">شماره</th>
                <th className="text-right p-3 text-sm font-medium">مشتری</th>
                <th className="text-right p-3 text-sm font-medium">نوع</th>
                <th className="text-right p-3 text-sm font-medium">قطعه</th>
                <th className="text-right p-3 text-sm font-medium">هزینه کل</th>
                <th className="text-right p-3 text-sm font-medium">وضعیت</th>
                <th className="text-right p-3 text-sm font-medium">عملیات</th>
              </tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedOrder(o)}>
                    <td className="p-3 font-mono text-xs">{o.orderNumber}</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{o.customerPartyId.slice(0, 8)}...</td>
                    <td className="p-3 text-sm">{o.serviceKind}</td>
                    <td className="p-3 text-sm">{o.partCount}</td>
                    <td className="p-3 text-sm font-medium">{o.totalCost > 0 ? o.totalCost.toLocaleString('fa-IR') : '—'}</td>
                    <td className="p-3"><Badge variant={orderStatusVariants[o.status]} className="text-xs">{orderStatusLabels[o.status] || o.status}</Badge></td>
                    <td className="p-3"><Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedOrder(o) }}>مشاهده</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
        )
      )}

      {showReqForm && <CreateReqForm onClose={() => setShowReqForm(false)} onCreated={() => { setShowReqForm(false); load() }} />}
      {selectedOrder && <OrderDetail order={selectedOrder} onClose={() => { setSelectedOrder(null); load() }} />}
    </div>
  )
}

function CreateReqForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ customerPartyId: '', productInstanceId: '', customerProblem: '', serviceKind: 'warranty', priority: 'normal', reportedDefect: '' })
  const handleCreate = async () => {
    try {
      await fetchAPI('/service-requests', { method: 'POST', body: JSON.stringify(form), headers: { 'Idempotency-Key': crypto.randomUUID() } })
      toast.success('درخواست خدمت ایجاد شد')
      onCreated()
    } catch (e) { toast.error('خطا') }
  }
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>درخواست خدمت جدید</DialogTitle><DialogDescription>کد خودکار: SR-...</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>شناسه مشتری *</Label><Input value={form.customerPartyId} onChange={(e) => setForm({ ...form, customerPartyId: e.target.value })} /></div>
          <div className="space-y-2"><Label>شناسه نمونه محصول</Label><Input value={form.productInstanceId} onChange={(e) => setForm({ ...form, productInstanceId: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>نوع خدمت</Label><select className="w-full h-10 px-3 rounded-md border border-input bg-background" value={form.serviceKind} onChange={(e) => setForm({ ...form, serviceKind: e.target.value })}>
              <option value="warranty">گارانتی</option><option value="out_of_warranty">خارج از گارانتی</option><option value="paid">پولی</option><option value="recall">فراخوان</option>
            </select></div>
            <div className="space-y-2"><Label>اولویت</Label><select className="w-full h-10 px-3 rounded-md border border-input bg-background" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="low">کم</option><option value="normal">عادی</option><option value="high">زیاد</option><option value="urgent">فوری</option><option value="critical">بحرانی</option>
            </select></div>
          </div>
          <div className="space-y-2"><Label>مشکل اعلامی *</Label><Textarea value={form.customerProblem} onChange={(e) => setForm({ ...form, customerProblem: e.target.value })} rows={2} /></div>
          <div className="space-y-2"><Label>نقص گزارش‌شده</Label><Input value={form.reportedDefect} onChange={(e) => setForm({ ...form, reportedDefect: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>انصراف</Button><Button onClick={handleCreate} disabled={!form.customerPartyId || !form.customerProblem}>ایجاد</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function OrderDetail({ order, onClose }: { order: any; onClose: () => void }) {
  const [diagnoseForm, setDiagnoseForm] = useState({ symptom: '', rootCause: '', recommendedAction: '', confidenceLevel: 'medium' })
  const [qcForm, setQcForm] = useState({ result: 'pass', defectsFound: '', notes: '' })
  const [partForm, setPartForm] = useState({ productId: '', warehouseId: '', quantityUsed: '1', unitCost: '0' })

  const handleDiagnose = async () => {
    try {
      await fetchAPI(`/service-orders/${order.id}/diagnose`, { method: 'POST', body: JSON.stringify({ ...diagnoseForm, technicianId: 'admin' }), headers: { 'Idempotency-Key': crypto.randomUUID() } })
      toast.success('تشخیص ثبت شد')
      onClose()
    } catch (e) { toast.error('خطا') }
  }
  const handleQC = async () => {
    try {
      await fetchAPI(`/service-orders/${order.id}/qc`, { method: 'POST', body: JSON.stringify({ ...qcForm, inspectorId: 'admin', checklist: { items: [] } }), headers: { 'Idempotency-Key': crypto.randomUUID() } })
      toast.success('کنترل کیفیت ثبت شد (LAW-32)')
      onClose()
    } catch (e) { toast.error('خطا') }
  }
  const handleReady = async () => {
    try {
      await fetchAPI(`/service-orders/${order.id}/ready`, { method: 'POST', body: '{}', headers: { 'Idempotency-Key': crypto.randomUUID() } })
      toast.success('آماده تحویل')
      onClose()
    } catch (e) { toast.error((e as any)?.detail || 'خطا') }
  }
  const handleConsumePart = async () => {
    try {
      await fetchAPI(`/service-orders/${order.id}/consume-part`, { method: 'POST', body: JSON.stringify({ ...partForm, quantityUsed: parseFloat(partForm.quantityUsed), unitCost: parseFloat(partForm.unitCost) }), headers: { 'Idempotency-Key': crypto.randomUUID() } })
      toast.success('قطعه مصرف شد — OUT ledger (LAW-31)')
      setPartForm({ productId: '', warehouseId: '', quantityUsed: '1', unitCost: '0' })
    } catch (e) { toast.error('خطا') }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Wrench className="w-5 h-5 text-primary" /> {order.orderNumber}</DialogTitle></DialogHeader>
        <div className="flex items-center justify-between mb-4">
          <Badge variant={orderStatusVariants[order.status]}>{orderStatusLabels[order.status] || order.status}</Badge>
          <div className="flex gap-2">
            {order.status === 'open' && <Button size="sm" onClick={handleDiagnose}><Eye className="w-4 h-4 ml-1" /> تشخیص</Button>}
            {order.status === 'repair' && <Button size="sm" onClick={handleQC}><ClipboardCheck className="w-4 h-4 ml-1" /> کنترل کیفیت</Button>}
            {order.status === 'qc' && <Button size="sm" onClick={handleReady}><CheckCircle className="w-4 h-4 ml-1" /> آماده تحویل</Button>}
          </div>
        </div>

        {/* Parts consumption (LAW-31) */}
        {(order.status === 'repair' || order.status === 'diagnosis' || order.status === 'waiting_parts') && (
          <div className="p-3 border rounded-lg space-y-2">
            <Label>مصرف قطعه (LAW-31: OUT Ledger)</Label>
            <div className="flex gap-2">
              <Input className="flex-1" placeholder="Product ID" value={partForm.productId} onChange={(e) => setPartForm({ ...partForm, productId: e.target.value })} />
              <Input className="flex-1" placeholder="Warehouse ID" value={partForm.warehouseId} onChange={(e) => setPartForm({ ...partForm, warehouseId: e.target.value })} />
              <Input className="w-16" type="number" placeholder="تعداد" value={partForm.quantityUsed} onChange={(e) => setPartForm({ ...partForm, quantityUsed: e.target.value })} />
              <Input className="w-24" type="number" placeholder="قیمت" value={partForm.unitCost} onChange={(e) => setPartForm({ ...partForm, unitCost: e.target.value })} />
              <Button size="sm" onClick={handleConsumePart}><Package className="w-4 h-4 ml-1" /> مصرف</Button>
            </div>
          </div>
        )}

        {/* Diagnose form */}
        {order.status === 'open' && (
          <div className="p-3 border rounded-lg space-y-2">
            <Label>فرم تشخیص</Label>
            <Input placeholder="علامت" value={diagnoseForm.symptom} onChange={(e) => setDiagnoseForm({ ...diagnoseForm, symptom: e.target.value })} />
            <Input placeholder="علت ریشه‌ای" value={diagnoseForm.rootCause} onChange={(e) => setDiagnoseForm({ ...diagnoseForm, rootCause: e.target.value })} />
            <Input placeholder="اقدام پیشنهادی" value={diagnoseForm.recommendedAction} onChange={(e) => setDiagnoseForm({ ...diagnoseForm, recommendedAction: e.target.value })} />
          </div>
        )}

        {/* QC form */}
        {order.status === 'repair' && (
          <div className="p-3 border rounded-lg space-y-2">
            <Label>کنترل کیفیت (LAW-32)</Label>
            <select className="w-full h-10 px-3 rounded-md border border-input bg-background" value={qcForm.result} onChange={(e) => setQcForm({ ...qcForm, result: e.target.value })}>
              <option value="pass">قبول</option><option value="fail">رد</option><option value="conditional">مشروط</option>
            </select>
            <Input placeholder="نقص یافت‌شده" value={qcForm.defectsFound} onChange={(e) => setQcForm({ ...qcForm, defectsFound: e.target.value })} />
            <Input placeholder="یادداشت" value={qcForm.notes} onChange={(e) => setQcForm({ ...qcForm, notes: e.target.value })} />
          </div>
        )}

        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
          <CardContent className="p-3 text-xs space-y-1">
            <div><strong>LAW-31:</strong> مصرف قطعه → OUT InventoryTransaction (بدون کاهش مستقیم موجودی)</div>
            <div><strong>LAW-32:</strong> تحویل نیاز به قبولی QC دارد</div>
            <div><strong>LAW-33:</strong> تأیید گارانتی → Service Request از طریق رویداد</div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}
