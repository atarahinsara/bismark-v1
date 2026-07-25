'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Undo2, Plus, Loader2, CheckCircle, Package, RefreshCw, RotateCw,
  DollarSign, Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  returnsApi, refundsApi, productsApi,
  type ReturnOrder, type Refund, type Product,
} from '@/lib/api-client'
import type { ApiError } from '@/lib/api-client'

const statusLabels: Record<string, string> = {
  draft: 'پیش‌نویس', submitted: 'ارسال‌شده', approved: 'تأییدشده',
  received: 'دریافت‌شده', closed: 'بسته‌شده', cancelled: 'لغوشده',
}
const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary', submitted: 'outline', approved: 'default',
  received: 'default', closed: 'default', cancelled: 'destructive',
}
const refundStatusLabels: Record<string, string> = {
  pending: 'در انتظار', approved: 'تأییدشده', completed: 'تکمیل‌شده', cancelled: 'لغوشده',
}
function formatMoney(amount: number, currency = 'IRR') {
  return new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 }).format(amount) + ' ' + (currency === 'IRR' ? 'ریال' : currency)
}

export function ReturnsView() {
  const [tab, setTab] = useState<'returns' | 'refunds'>('returns')
  const [returns, setReturns] = useState<ReturnOrder[]>([])
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<ReturnOrder | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [retRes, refRes] = await Promise.all([returnsApi.list(1, 100), refundsApi.list(1, 100)])
      setReturns(retRes.data); setRefunds(refRes.data)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">مرجوعی و بازپرداخت</h1>
          <p className="text-muted-foreground mt-1">Sprint 3.4 — Returns & Refunds (LAW-22/23/24)</p>
        </div>
        {tab === 'returns' && <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 ml-2" /> مرجوعی جدید</Button>}
      </div>

      <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900">
        <CardContent className="p-3 flex items-center gap-2 text-xs flex-wrap">
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">Return Flow:</span>
          <Badge variant="outline">Create</Badge> → <Badge variant="outline">Approve (Credit Note auto)</Badge> →
          <Badge variant="outline">Inspect (LAW-22)</Badge> → <Badge variant="outline">Receive (IN Ledger)</Badge> →
          <Badge variant="outline">Refund (LAW-23)</Badge> → <Badge variant="outline">Close</Badge>
        </CardContent>
      </Card>

      <div className="flex gap-2 border-b">
        {[
          { key: 'returns' as const, label: 'مرجوعی‌ها', icon: Undo2 },
          { key: 'refunds' as const, label: 'بازپرداخت‌ها', icon: DollarSign },
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
      ) : tab === 'returns' ? (
        returns.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground"><Undo2 className="w-12 h-12 mx-auto mb-2 opacity-30" /><p>هنوز مرجوعی ثبت نشده است</p></CardContent></Card>
        ) : (
          <Card><CardContent className="p-0">
            <table className="w-full">
              <thead className="border-b bg-muted/30"><tr>
                <th className="text-right p-3 text-sm font-medium">شماره</th>
                <th className="text-right p-3 text-sm font-medium">مشتری</th>
                <th className="text-right p-3 text-sm font-medium">نوع</th>
                <th className="text-right p-3 text-sm font-medium">مبلغ</th>
                <th className="text-right p-3 text-sm font-medium">وضعیت</th>
                <th className="text-right p-3 text-sm font-medium">عملیات</th>
              </tr></thead>
              <tbody>
                {returns.map((r) => (
                  <tr key={r.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(r)}>
                    <td className="p-3 font-mono text-xs">{r.returnNumber}</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{r.customerPartyId.slice(0, 8)}...</td>
                    <td className="p-3"><Badge variant="outline" className="text-xs">{r.returnType}</Badge></td>
                    <td className="p-3 text-sm font-medium">{formatMoney(r.refundAmount, r.currencyCode)}</td>
                    <td className="p-3"><Badge variant={statusVariants[r.status]} className="text-xs">{statusLabels[r.status] || r.status}</Badge></td>
                    <td className="p-3"><Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelected(r) }}>مشاهده</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
        )
      ) : (
        refunds.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground"><DollarSign className="w-12 h-12 mx-auto mb-2 opacity-30" /><p>هنوز بازپرداختی ثبت نشده است</p></CardContent></Card>
        ) : (
          <Card><CardContent className="p-0">
            <table className="w-full">
              <thead className="border-b bg-muted/30"><tr>
                <th className="text-right p-3 text-sm font-medium">شماره</th>
                <th className="text-right p-3 text-sm font-medium">مشتری</th>
                <th className="text-right p-3 text-sm font-medium">مبلغ</th>
                <th className="text-right p-3 text-sm font-medium">روش</th>
                <th className="text-right p-3 text-sm font-medium">وضعیت</th>
              </tr></thead>
              <tbody>
                {refunds.map((r) => (
                  <tr key={r.id} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{r.refundNumber}</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{r.customerPartyId.slice(0, 8)}...</td>
                    <td className="p-3 text-sm font-medium">{formatMoney(r.amount, r.currencyCode)}</td>
                    <td className="p-3 text-sm">{r.refundMethod}</td>
                    <td className="p-3"><Badge variant={r.status === 'completed' ? 'default' : 'secondary'} className="text-xs">{refundStatusLabels[r.status] || r.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
        )
      )}

      {showForm && <CreateReturnForm onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); load() }} />}
      {selected && <ReturnDetail ret={selected} onClose={() => { setSelected(null); load() }} />}
    </div>
  )
}

function CreateReturnForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [products, setProducts] = useState<Product[]>([])
  const [form, setForm] = useState({
    customerPartyId: '', salesOrderId: '', invoiceId: '', returnType: 'refund', reason: '',
    lines: [{ productId: '', quantityReturned: '1', unitPrice: '0', returnReason: '' }],
  })

  useEffect(() => { productsApi.list(1, 100).then((r) => setProducts(r.data)).catch(() => {}) }, [])

  const handleCreate = async () => {
    try {
      await returnsApi.create({
        customerPartyId: form.customerPartyId,
        salesOrderId: form.salesOrderId || undefined,
        invoiceId: form.invoiceId || undefined,
        returnType: form.returnType,
        reason: form.reason || undefined,
        lines: form.lines.map((l) => ({
          productId: l.productId,
          quantityReturned: parseFloat(l.quantityReturned) || 1,
          unitPrice: parseFloat(l.unitPrice) || 0,
          returnReason: l.returnReason || undefined,
        })),
      }, crypto.randomUUID())
      toast.success('مرجوعی ایجاد شد')
      onCreated()
    } catch (e) { toast.error((e as ApiError).detail || 'خطا') }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader><DialogTitle>مرجوعی جدید</DialogTitle><DialogDescription>کد مرجوعی خودکار تولید می‌شود (LAW-02)</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>شناسه مشتری *</Label><Input value={form.customerPartyId} onChange={(e) => setForm({ ...form, customerPartyId: e.target.value })} placeholder="Party ID" /></div>
            <div className="space-y-2"><Label>نوع مرجوعی</Label>
              <select className="w-full h-10 px-3 rounded-md border border-input bg-background" value={form.returnType} onChange={(e) => setForm({ ...form, returnType: e.target.value })}>
                <option value="refund">بازپرداخت</option><option value="replacement">تعویض</option><option value="return_only">فقط مرجوعی</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>سفارش فروش (اختیاری)</Label><Input value={form.salesOrderId} onChange={(e) => setForm({ ...form, salesOrderId: e.target.value })} placeholder="Sales Order ID" /></div>
            <div className="space-y-2"><Label>فاکتور (اختیاری)</Label><Input value={form.invoiceId} onChange={(e) => setForm({ ...form, invoiceId: e.target.value })} placeholder="Invoice ID" /></div>
          </div>
          <div className="space-y-2">
            <Label>ردیف‌های مرجوعی</Label>
            {form.lines.map((line, i) => (
              <div key={i} className="flex gap-2 items-end">
                <div className="flex-1"><select className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm" value={line.productId} onChange={(e) => { const updated = [...form.lines]; updated[i] = { ...line, productId: e.target.value }; setForm({ ...form, lines: updated }) }}>
                  <option value="">انتخاب محصول...</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select></div>
                <div className="w-16"><Input type="number" className="h-9" placeholder="تعداد" value={line.quantityReturned} onChange={(e) => { const updated = [...form.lines]; updated[i] = { ...line, quantityReturned: e.target.value }; setForm({ ...form, lines: updated }) }} /></div>
                <div className="w-24"><Input type="number" className="h-9" placeholder="قیمت" value={line.unitPrice} onChange={(e) => { const updated = [...form.lines]; updated[i] = { ...line, unitPrice: e.target.value }; setForm({ ...form, lines: updated }) }} /></div>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => setForm({ ...form, lines: [...form.lines, { productId: '', quantityReturned: '1', unitPrice: '0', returnReason: '' }] })}><Plus className="w-3 h-3 ml-1" /> ردیف جدید</Button>
          </div>
          <div className="space-y-2"><Label>دلیل مرجوعی</Label><Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>انصراف</Button><Button onClick={handleCreate} disabled={!form.customerPartyId}>ایجاد</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ReturnDetail({ ret, onClose }: { ret: ReturnOrder; onClose: () => void }) {
  const handleApprove = async () => {
    try { const res = await returnsApi.approve(ret.id, { approvedBy: 'admin' }, crypto.randomUUID()); toast.success(res.data.message); onClose() }
    catch (e) { toast.error((e as ApiError).detail || 'خطا') }
  }
  const handleReceive = async () => {
    try {
      const whId = prompt('شناسه انبار برای دریافت کالا؟')
      if (!whId) return
      const res = await returnsApi.receive(ret.id, { warehouseId: whId, receivedBy: 'admin' }, crypto.randomUUID())
      toast.success(res.data.message)
      onClose()
    } catch (e) { toast.error((e as ApiError).detail || 'خطا') }
  }
  const handleClose = async () => {
    try { await returnsApi.close(ret.id, crypto.randomUUID()); toast.success('مرجوعی بسته شد'); onClose() }
    catch (e) { toast.error((e as ApiError).detail || 'خطا') }
  }
  const handleReplacement = async () => {
    try { const res = await returnsApi.createReplacement(ret.id, crypto.randomUUID()); toast.success(res.data.message); onClose() }
    catch (e) { toast.error((e as ApiError).detail || 'خطا') }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Undo2 className="w-5 h-5 text-primary" /> {ret.returnNumber}</DialogTitle></DialogHeader>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <Badge variant={statusVariants[ret.status]}>{statusLabels[ret.status] || ret.status}</Badge>
          <span className="text-lg font-bold">{formatMoney(ret.refundAmount, ret.currencyCode)}</span>
          <div className="flex gap-2">
            {(ret.status === 'draft' || ret.status === 'submitted') && <Button size="sm" onClick={handleApprove}><CheckCircle className="w-4 h-4 ml-1" /> تأیید</Button>}
            {ret.status === 'approved' && <Button size="sm" onClick={handleReceive}><Package className="w-4 h-4 ml-1" /> دریافت</Button>}
            {ret.status === 'received' && <Button size="sm" variant="outline" onClick={handleClose}>بستن</Button>}
            {ret.status === 'received' && <Button size="sm" variant="outline" onClick={handleReplacement}><RotateCw className="w-4 h-4 ml-1" /> تعویض</Button>}
          </div>
        </div>
        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
          <CardContent className="p-3 text-xs space-y-1">
            <div><strong>LAW-22:</strong> قبل از دریافت، بازرسی فیزیکی لازم است</div>
            <div><strong>LAW-23:</strong> بازپرداخت نیاز به مرجوعی تأییدشده دارد</div>
            <div><strong>LAW-24:</strong> تعویض = مرجوعی + سفارش جدید</div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}
