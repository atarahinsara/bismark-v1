'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ShoppingCart, Plus, Search, RefreshCw, AlertCircle, Loader2,
  CheckCircle, XCircle, FileText, Trash2, Plus as PlusIcon, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  salesOrdersApi, productsApi, type SalesOrder, type SalesOrderLine,
  type Product,
} from '@/lib/api-client'
import type { ApiError } from '@/lib/api-client'

const statusLabels: Record<string, string> = {
  draft: 'پیش‌نویس',
  pending_approval: 'در انتظار تأیید',
  approved: 'تأییدشده',
  rejected: 'ردشده',
  invoiced: 'فاکتورشده',
  shipped: 'ارسال‌شده',
  partially_shipped: 'ارسال جزئی',
  completed: 'تکمیل‌شده',
  cancelled: 'لغو‌شده',
}

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  pending_approval: 'outline',
  approved: 'default',
  rejected: 'destructive',
  invoiced: 'default',
  shipped: 'default',
  partially_shipped: 'outline',
  completed: 'default',
  cancelled: 'destructive',
}

const paymentLabels: Record<string, string> = {
  unpaid: 'پرداخت‌نشده',
  partial: 'پرداخت جزئی',
  paid: 'پرداخت‌شده',
}

function formatMoney(amount: number, currency: string = 'IRR') {
  return new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 }).format(amount) + ' ' + (currency === 'IRR' ? 'ریال' : currency)
}

// ============================================================
// Sales Orders List
// ============================================================

export function SalesView() {
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<SalesOrder | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await salesOrdersApi.list(1, 100)
      setOrders(res.data)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">سفارشات فروش</h1>
          <p className="text-muted-foreground mt-1">
            Sprint 3.1 — Sales Foundation (15 Laws enforced)
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 ml-2" /> سفارش جدید
        </Button>
      </div>

      {/* Laws info */}
      <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900">
        <CardContent className="p-3 flex items-center gap-2 text-xs flex-wrap">
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">قوانین اعمال‌شده:</span>
          <Badge variant="outline">LAW-06 Idempotent</Badge>
          <Badge variant="outline">LAW-07 Optimistic Lock</Badge>
          <Badge variant="outline">LAW-08 Outbox</Badge>
          <Badge variant="outline">LAW-11 Txn Boundary</Badge>
          <Badge variant="outline">LAW-12 Unit of Work</Badge>
          <Badge variant="outline">LAW-13 No JE</Badge>
          <Badge variant="outline">LAW-14 Immutable</Badge>
          <Badge variant="outline">LAW-15 Event v1.0</Badge>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="جستجوی سفارش..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : orders.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>هنوز سفارشی ثبت نشده است</p>
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <table className="w-full">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-right p-3 text-sm font-medium">شماره</th>
                <th className="text-right p-3 text-sm font-medium">مشتری</th>
                <th className="text-right p-3 text-sm font-medium">تاریخ</th>
                <th className="text-right p-3 text-sm font-medium">مبلغ</th>
                <th className="text-right p-3 text-sm font-medium">پرداخت</th>
                <th className="text-right p-3 text-sm font-medium">وضعیت</th>
                <th className="text-right p-3 text-sm font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(o)}>
                  <td className="p-3 font-mono text-xs">{o.orderNumber}</td>
                  <td className="p-3 text-sm font-mono text-muted-foreground">{o.customerPartyId.slice(0, 8)}...</td>
                  <td className="p-3 text-sm">{new Date(o.orderDate).toLocaleDateString('fa-IR')}</td>
                  <td className="p-3 text-sm font-medium">{formatMoney(o.totalAmount, o.currencyCode)}</td>
                  <td className="p-3"><Badge variant="outline" className="text-xs">{paymentLabels[o.paymentStatus] || o.paymentStatus}</Badge></td>
                  <td className="p-3"><Badge variant={statusVariants[o.status]} className="text-xs">{statusLabels[o.status] || o.status}</Badge></td>
                  <td className="p-3">
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelected(o) }}>مشاهده</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      )}

      {/* Create Form */}
      {showForm && <CreateOrderForm onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); load() }} />}

      {/* Detail */}
      {selected && <OrderDetail order={selected} onClose={() => { setSelected(null); load() }} />}
    </div>
  )
}

// ============================================================
// Create Order Form (multi-line)
// ============================================================

function CreateOrderForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [products, setProducts] = useState<Product[]>([])
  const [customerPartyId, setCustomerPartyId] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<Array<{
    productId: string
    quantityOrdered: string
    unitPrice: string
    discountPercent: string
    taxPercent: string
  }>>([{ productId: '', quantityOrdered: '1', unitPrice: '0', discountPercent: '0', taxPercent: '9' }])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    productsApi.list(1, 100).then((res) => setProducts(res.data)).catch(() => {})
  }, [])

  const addLine = () => {
    setLines([...lines, { productId: '', quantityOrdered: '1', unitPrice: '0', discountPercent: '0', taxPercent: '9' }])
  }

  const removeLine = (i: number) => {
    setLines(lines.filter((_, idx) => idx !== i))
  }

  const updateLine = (i: number, field: string, value: string) => {
    const updated = [...lines]
    updated[i] = { ...updated[i], [field]: value }
    setLines(updated)
  }

  const calculateTotal = () => {
    return lines.reduce((sum, l) => {
      const qty = parseFloat(l.quantityOrdered) || 0
      const price = parseFloat(l.unitPrice) || 0
      const disc = parseFloat(l.discountPercent) || 0
      const tax = parseFloat(l.taxPercent) || 0
      const subtotal = qty * price
      const afterDisc = subtotal * (1 - disc / 100)
      const withTax = afterDisc * (1 + tax / 100)
      return sum + withTax
    }, 0)
  }

  const handleSave = async () => {
    if (!customerPartyId.trim()) {
      toast.error('شناسه مشتری الزامی است')
      return
    }
    if (lines.some((l) => !l.productId)) {
      toast.error('تمام ردیف‌ها باید محصول داشته باشند')
      return
    }

    setSaving(true)
    try {
      const idempotencyKey = crypto.randomUUID()
      await salesOrdersApi.create({
        customerPartyId: customerPartyId.trim(),
        notes: notes || undefined,
        lines: lines.map((l) => ({
          productId: l.productId,
          quantityOrdered: parseFloat(l.quantityOrdered) || 1,
          unitPrice: parseFloat(l.unitPrice) || 0,
          discountPercent: parseFloat(l.discountPercent) || 0,
          taxPercent: parseFloat(l.taxPercent) || 0,
        })),
      }, idempotencyKey)
      toast.success('سفارش ایجاد شد')
      onCreated()
    } catch (e) {
      toast.error((e as ApiError).detail || 'خطا در ایجاد سفارش')
    } finally { setSaving(false) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>سفارش فروش جدید</DialogTitle>
          <DialogDescription>کد سفارش خودکار تولید می‌شود (LAW-02) — Idempotent (LAW-06)</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer */}
          <div className="space-y-2">
            <Label>شناسه مشتری (Party ID) *</Label>
            <Input value={customerPartyId} onChange={(e) => setCustomerPartyId(e.target.value)} placeholder="مثلاً: 01920000-2000-..." />
          </div>

          {/* Lines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>ردیف‌های سفارش</Label>
              <Button size="sm" variant="outline" onClick={addLine}><PlusIcon className="w-3 h-3 ml-1" /> ردیف جدید</Button>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {lines.map((line, i) => (
                <div key={i} className="flex gap-2 items-end p-2 border rounded-lg">
                  <div className="flex-1">
                    <Label className="text-xs">محصول</Label>
                    <select className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm" value={line.productId} onChange={(e) => updateLine(i, 'productId', e.target.value)}>
                      <option value="">انتخاب...</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                    </select>
                  </div>
                  <div className="w-16">
                    <Label className="text-xs">تعداد</Label>
                    <Input type="number" className="h-9" value={line.quantityOrdered} onChange={(e) => updateLine(i, 'quantityOrdered', e.target.value)} />
                  </div>
                  <div className="w-24">
                    <Label className="text-xs">قیمت</Label>
                    <Input type="number" className="h-9" value={line.unitPrice} onChange={(e) => updateLine(i, 'unitPrice', e.target.value)} />
                  </div>
                  <div className="w-16">
                    <Label className="text-xs">تخفیف%</Label>
                    <Input type="number" className="h-9" value={line.discountPercent} onChange={(e) => updateLine(i, 'discountPercent', e.target.value)} />
                  </div>
                  <div className="w-16">
                    <Label className="text-xs">مالیات%</Label>
                    <Input type="number" className="h-9" value={line.taxPercent} onChange={(e) => updateLine(i, 'taxPercent', e.target.value)} />
                  </div>
                  {lines.length > 1 && (
                    <Button size="icon" variant="ghost" className="h-9 w-9 text-destructive" onClick={() => removeLine(i)}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-end p-3 bg-muted/30 rounded-lg">
            <div className="text-left">
              <div className="text-sm text-muted-foreground">مجموع کل</div>
              <div className="text-xl font-bold text-primary">{formatMoney(calculateTotal())}</div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>توضیحات</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>انصراف</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : null}
            ایجاد سفارش
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Order Detail (with approve/cancel)
// ============================================================

function OrderDetail({ order, onClose }: { order: SalesOrder; onClose: () => void }) {
  const [detail, setDetail] = useState<SalesOrder & { lines: SalesOrderLine[] } | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await salesOrdersApi.get(order.id)
      setDetail(res.data)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [order.id])

  useEffect(() => { load() }, [load])

  const handleApprove = async () => {
    try {
      const idempotencyKey = crypto.randomUUID()
      const res = await salesOrdersApi.approve(order.id, { approvedBy: 'admin' }, idempotencyKey)
      toast.success(res.data.message || 'سفارش تأیید شد')
      load()
    } catch (e) { toast.error((e as ApiError).detail || 'خطا') }
  }

  const handleCancel = async () => {
    if (!confirm('لغو سفارش؟')) return
    try {
      const idempotencyKey = crypto.randomUUID()
      await salesOrdersApi.cancel(order.id, { reason: 'Cancelled by user' }, idempotencyKey)
      toast.success('سفارش لغو شد')
      load()
    } catch (e) { toast.error((e as ApiError).detail || 'خطا') }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            {order.orderNumber}
          </DialogTitle>
          <DialogDescription>
            نسخه: {order.version} (LAW-07) • {new Date(order.orderDate).toLocaleDateString('fa-IR')}
          </DialogDescription>
        </DialogHeader>

        {/* Status + Actions */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex gap-2">
            <Badge variant={statusVariants[order.status]}>{statusLabels[order.status] || order.status}</Badge>
            <Badge variant="outline">{paymentLabels[order.paymentStatus] || order.paymentStatus}</Badge>
          </div>
          <div className="flex gap-2">
            {(order.status === 'draft' || order.status === 'pending_approval') && (
              <Button size="sm" onClick={handleApprove}><CheckCircle className="w-4 h-4 ml-1" /> تأیید</Button>
            )}
            {order.status !== 'completed' && order.status !== 'cancelled' && (
              <Button size="sm" variant="outline" onClick={handleCancel}><XCircle className="w-4 h-4 ml-1" /> لغو</Button>
            )}
          </div>
        </div>

        {/* Lines */}
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : detail && detail.lines ? (
          <div className="border rounded-lg overflow-auto max-h-[300px]">
            <table className="w-full">
              <thead className="border-b bg-muted/30 sticky top-0">
                <tr>
                  <th className="text-right p-2 text-xs font-medium">#</th>
                  <th className="text-right p-2 text-xs font-medium">محصول</th>
                  <th className="text-right p-2 text-xs font-medium">تعداد</th>
                  <th className="text-right p-2 text-xs font-medium">قیمت</th>
                  <th className="text-right p-2 text-xs font-medium">تخفیف</th>
                  <th className="text-right p-2 text-xs font-medium">مالیات</th>
                  <th className="text-right p-2 text-xs font-medium">جمع</th>
                </tr>
              </thead>
              <tbody>
                {detail.lines.map((line) => (
                  <tr key={line.id} className="border-b hover:bg-muted/20">
                    <td className="p-2 text-xs">{line.lineNumber}</td>
                    <td className="p-2 font-mono text-xs">{line.productId.slice(0, 8)}...</td>
                    <td className="p-2 text-sm font-mono">{line.quantityOrdered}</td>
                    <td className="p-2 text-sm font-mono">{formatMoney(line.unitPrice)}</td>
                    <td className="p-2 text-xs">{line.discountPercent}%</td>
                    <td className="p-2 text-xs">{line.taxPercent}%</td>
                    <td className="p-2 text-sm font-medium font-mono">{formatMoney(line.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {/* Totals */}
        {detail && (
          <div className="space-y-1 p-3 bg-muted/30 rounded-lg text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">جمع کل:</span><span className="font-mono">{formatMoney(detail.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">تخفیف:</span><span className="font-mono text-red-600">- {formatMoney(detail.discountAmount)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">مالیات:</span><span className="font-mono">{formatMoney(detail.taxAmount)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">ارسال:</span><span className="font-mono">{formatMoney(detail.shippingAmount)}</span></div>
            <div className="flex justify-between font-bold pt-1 border-t mt-1"><span>مبلغ نهایی:</span><span className="font-mono text-primary">{formatMoney(detail.totalAmount, detail.currencyCode)}</span></div>
          </div>
        )}

        {/* LAW-13/14 Info */}
        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
          <CardContent className="p-3 text-xs space-y-1">
            <div><strong>LAW-13:</strong> این ماژول Journal Entry ایجاد نمی‌کند — Financial از طریق Event مسئول ثبت حسابداری است</div>
            <div><strong>LAW-14:</strong> پس از تأیید، سفارش غیرقابل ویرایش است — اصلاح با لغو + سفارش جدید</div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}
