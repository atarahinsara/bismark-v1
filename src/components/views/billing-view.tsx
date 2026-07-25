'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  FileText, Plus, Search, Loader2, CheckCircle, XCircle, DollarSign,
  CreditCard, Receipt, AlertCircle,
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
  invoicesApi, paymentsApi, salesOrdersApi,
  type Invoice, type Payment, type SalesOrder,
} from '@/lib/api-client'
import type { ApiError } from '@/lib/api-client'

const invoiceStatusLabels: Record<string, string> = {
  draft: 'پیش‌نویس', issued: 'صادرشده', partially_paid: 'پرداخت جزئی',
  paid: 'پرداخت‌شده', cancelled: 'لغوشده', reversed: 'برگشت‌خورده',
}
const invoiceStatusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary', issued: 'default', partially_paid: 'outline',
  paid: 'default', cancelled: 'destructive', reversed: 'destructive',
}
const paymentStatusLabels: Record<string, string> = {
  pending: 'در انتظار تخصیص', partially_allocated: 'تخصیص جزئی',
  completed: 'تکمیل‌شده', cancelled: 'لغوشده', failed: 'ناموفق',
}
function formatMoney(amount: number, currency = 'IRR') {
  return new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 }).format(amount) + ' ' + (currency === 'IRR' ? 'ریال' : currency)
}

export function BillingView() {
  const [tab, setTab] = useState<'invoices' | 'payments'>('invoices')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [invRes, payRes] = await Promise.all([
        invoicesApi.list(1, 100),
        paymentsApi.list(1, 100),
      ])
      setInvoices(invRes.data)
      setPayments(payRes.data)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const tabs = [
    { key: 'invoices' as const, label: 'فاکتورها', icon: FileText },
    { key: 'payments' as const, label: 'پرداخت‌ها', icon: CreditCard },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">صورتحساب</h1>
          <p className="text-muted-foreground mt-1">Sprint 3.3 — Billing (LAW-19/20/21)</p>
        </div>
        {tab === 'invoices' && <Button onClick={() => setShowInvoiceForm(true)}><Plus className="w-4 h-4 ml-2" /> فاکتور جدید</Button>}
        {tab === 'payments' && <Button onClick={() => setShowPaymentForm(true)}><Plus className="w-4 h-4 ml-2" /> پرداخت جدید</Button>}
      </div>

      <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900">
        <CardContent className="p-3 flex items-center gap-2 text-xs flex-wrap">
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">Billing Flow:</span>
          <Badge variant="outline">Order</Badge> → <Badge variant="outline">Invoice (draft)</Badge> →
          <Badge variant="outline">Issue (LAW-21: immutable)</Badge> →
          <Badge variant="outline">Payment (pending)</Badge> →
          <Badge variant="outline">Allocate (LAW-20)</Badge> →
          <Badge variant="outline">Invoice = Paid</Badge> →
          <Badge variant="outline">Financial Event (LAW-19)</Badge>
        </CardContent>
      </Card>

      <div className="flex gap-2 border-b">
        {tabs.map((t) => {
          const Icon = t.icon
          const active = tab === t.key
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
      ) : tab === 'invoices' ? (
        invoices.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>هنوز فاکتوری ثبت نشده است</p>
          </CardContent></Card>
        ) : (
          <Card><CardContent className="p-0">
            <table className="w-full">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-right p-3 text-sm font-medium">شماره</th>
                  <th className="text-right p-3 text-sm font-medium">مشتری</th>
                  <th className="text-right p-3 text-sm font-medium">مبلغ</th>
                  <th className="text-right p-3 text-sm font-medium">پرداخت‌شده</th>
                  <th className="text-right p-3 text-sm font-medium">مانده</th>
                  <th className="text-right p-3 text-sm font-medium">وضعیت</th>
                  <th className="text-right p-3 text-sm font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedInvoice(inv)}>
                    <td className="p-3 font-mono text-xs">{inv.invoiceNumber}</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{inv.customerPartyId.slice(0, 8)}...</td>
                    <td className="p-3 text-sm font-medium">{formatMoney(inv.totalAmount, inv.currencyCode)}</td>
                    <td className="p-3 text-sm text-emerald-600">{formatMoney(inv.paidAmount, inv.currencyCode)}</td>
                    <td className="p-3 text-sm text-red-600">{formatMoney(inv.balanceDue, inv.currencyCode)}</td>
                    <td className="p-3"><Badge variant={invoiceStatusVariants[inv.status]} className="text-xs">{invoiceStatusLabels[inv.status] || inv.status}</Badge></td>
                    <td className="p-3"><Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedInvoice(inv) }}>مشاهده</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
        )
      ) : (
        payments.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>هنوز پرداختی ثبت نشده است</p>
          </CardContent></Card>
        ) : (
          <Card><CardContent className="p-0">
            <table className="w-full">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-right p-3 text-sm font-medium">شماره</th>
                  <th className="text-right p-3 text-sm font-medium">مشتری</th>
                  <th className="text-right p-3 text-sm font-medium">مبلغ</th>
                  <th className="text-right p-3 text-sm font-medium">روش</th>
                  <th className="text-right p-3 text-sm font-medium">تخصیص</th>
                  <th className="text-right p-3 text-sm font-medium">وضعیت</th>
                  <th className="text-right p-3 text-sm font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedPayment(p)}>
                    <td className="p-3 font-mono text-xs">{p.paymentNumber}</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{p.customerPartyId.slice(0, 8)}...</td>
                    <td className="p-3 text-sm font-medium">{formatMoney(p.amount, p.currencyCode)}</td>
                    <td className="p-3 text-sm">{p.paymentMethod}</td>
                    <td className="p-3 text-xs">{p.allocationCount} فاکتور</td>
                    <td className="p-3"><Badge variant={p.status === 'completed' ? 'default' : p.status === 'pending' ? 'secondary' : 'outline'} className="text-xs">{paymentStatusLabels[p.status] || p.status}</Badge></td>
                    <td className="p-3"><Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedPayment(p) }}>مشاهده</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
        )
      )}

      {showInvoiceForm && <CreateInvoiceForm onClose={() => setShowInvoiceForm(false)} onCreated={() => { setShowInvoiceForm(false); load() }} />}
      {showPaymentForm && <CreatePaymentForm onClose={() => setShowPaymentForm(false)} onCreated={() => { setShowPaymentForm(false); load() }} />}
      {selectedInvoice && <InvoiceDetail invoice={selectedInvoice} onClose={() => { setSelectedInvoice(null); load() }} />}
      {selectedPayment && <PaymentDetail payment={selectedPayment} onClose={() => { setSelectedPayment(null); load() }} />}
    </div>
  )
}

function CreateInvoiceForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [salesOrderId, setSalesOrderId] = useState('')

  useEffect(() => {
    salesOrdersApi.list(1, 100, undefined).then((r) => {
      setOrders(r.data.filter((o) => ['approved', 'shipped', 'partially_shipped', 'completed'].includes(o.status)))
    }).catch(() => {})
  }, [])

  const handleCreate = async () => {
    try {
      await invoicesApi.create({ salesOrderId }, crypto.randomUUID())
      toast.success('فاکتور ایجاد شد')
      onCreated()
    } catch (e) { toast.error((e as ApiError).detail || 'خطا') }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>فاکتور جدید</DialogTitle><DialogDescription>از سفارش فروش ایجاد می‌شود (LAW-02: کد خودکار)</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>سفارش فروش *</Label>
            <select className="w-full h-10 px-3 rounded-md border border-input bg-background" value={salesOrderId} onChange={(e) => setSalesOrderId(e.target.value)}>
              <option value="">انتخاب...</option>
              {orders.map((o) => <option key={o.id} value={o.id}>{o.orderNumber} — {formatMoney(o.totalAmount)}</option>)}
            </select>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>انصراف</Button><Button onClick={handleCreate} disabled={!salesOrderId}>ایجاد</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CreatePaymentForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ customerPartyId: '', amount: '', paymentMethod: 'cash', referenceNumber: '' })

  const handleCreate = async () => {
    try {
      await paymentsApi.create({
        customerPartyId: form.customerPartyId,
        amount: parseFloat(form.amount),
        paymentMethod: form.paymentMethod,
        referenceNumber: form.referenceNumber || undefined,
      }, crypto.randomUUID())
      toast.success('پرداخت ایجاد شد (در انتظار تخصیص — LAW-20)')
      onCreated()
    } catch (e) { toast.error((e as ApiError).detail || 'خطا') }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>پرداخت جدید</DialogTitle><DialogDescription>LAW-20: پرداخت باید تخصیص داده شود</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>شناسه مشتری *</Label><Input value={form.customerPartyId} onChange={(e) => setForm({ ...form, customerPartyId: e.target.value })} placeholder="Party ID" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>مبلغ *</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div className="space-y-2"><Label>روش پرداخت</Label>
              <select className="w-full h-10 px-3 rounded-md border border-input bg-background" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                <option value="cash">نقدی</option><option value="bank_transfer">انتقال بانکی</option>
                <option value="pos">POS</option><option value="online">آنلاین</option>
              </select>
            </div>
          </div>
          <div className="space-y-2"><Label>شماره مرجع</Label><Input value={form.referenceNumber} onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>انصراف</Button><Button onClick={handleCreate} disabled={!form.customerPartyId || !form.amount}>ایجاد</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function InvoiceDetail({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const handleIssue = async () => {
    try {
      const res = await invoicesApi.issue(invoice.id, { issuedBy: 'admin' }, crypto.randomUUID())
      toast.success(res.data.message)
      onClose()
    } catch (e) { toast.error((e as ApiError).detail || 'خطا') }
  }
  const handleCancel = async () => {
    try { await invoicesApi.cancel(invoice.id, { reason: 'Cancelled' }, crypto.randomUUID()); toast.success('فاکتور لغو شد'); onClose() }
    catch (e) { toast.error((e as ApiError).detail || 'خطا') }
  }
  const handleCreditNote = async () => {
    try {
      const res = await invoicesApi.creditNote(invoice.id, { reason: 'Credit note' }, crypto.randomUUID())
      toast.success(res.data.message)
      onClose()
    } catch (e) { toast.error((e as ApiError).detail || 'خطا') }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /> {invoice.invoiceNumber}</DialogTitle></DialogHeader>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <Badge variant={invoiceStatusVariants[invoice.status]}>{invoiceStatusLabels[invoice.status] || invoice.status}</Badge>
          <div className="flex gap-2">
            {invoice.status === 'draft' && <Button size="sm" onClick={handleIssue}><CheckCircle className="w-4 h-4 ml-1" /> صدور</Button>}
            {invoice.status === 'draft' && <Button size="sm" variant="outline" onClick={handleCancel}><XCircle className="w-4 h-4 ml-1" /> لغو</Button>}
            {(invoice.status === 'issued' || invoice.status === 'partially_paid' || invoice.status === 'paid') && <Button size="sm" variant="outline" onClick={handleCreditNote}><Receipt className="w-4 h-4 ml-1" /> صدور سند اعتباری</Button>}
          </div>
        </div>
        <div className="space-y-1 p-3 bg-muted/30 rounded-lg text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">جمع کل:</span><span className="font-mono">{formatMoney(invoice.totalAmount, invoice.currencyCode)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">پرداخت‌شده:</span><span className="font-mono text-emerald-600">{formatMoney(invoice.paidAmount, invoice.currencyCode)}</span></div>
          <div className="flex justify-between font-bold pt-1 border-t mt-1"><span>مانده:</span><span className="font-mono text-red-600">{formatMoney(invoice.balanceDue, invoice.currencyCode)}</span></div>
        </div>
        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
          <CardContent className="p-3 text-xs space-y-1">
            <div><strong>LAW-19:</strong> Journal Entry توسط Financial ایجاد می‌شود (از طریق Event)</div>
            <div><strong>LAW-20:</strong> پرداخت باید به فاکتور تخصیص داده شود</div>
            <div><strong>LAW-21:</strong> پس از صدور، فاکتور غیرقابل ویرایش است</div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}

function PaymentDetail({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [allocAmount, setAllocAmount] = useState('')

  useEffect(() => {
    invoicesApi.list(1, 100, { customerPartyId: payment.customerPartyId }).then((r) => {
      setInvoices(r.data.filter((i) => i.status === 'issued' || i.status === 'partially_paid'))
    }).catch(() => {})
  }, [payment.customerPartyId])

  const handleAllocate = async (invoiceId: string) => {
    try {
      const amount = parseFloat(allocAmount) || 0
      await paymentsApi.allocate(payment.id, {
        allocations: [{ invoiceId, allocatedAmount: amount }],
        allocatedBy: 'admin',
      }, crypto.randomUUID())
      toast.success('تخصیص انجام شد')
      setAllocAmount('')
      onClose()
    } catch (e) { toast.error((e as ApiError).detail || 'خطا') }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" /> {payment.paymentNumber}</DialogTitle></DialogHeader>
        <div className="flex items-center justify-between mb-4">
          <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>{paymentStatusLabels[payment.status] || payment.status}</Badge>
          <span className="text-lg font-bold">{formatMoney(payment.amount, payment.currencyCode)}</span>
        </div>
        {payment.status !== 'completed' && (
          <div>
            <Label className="mb-2 block">تخصیص به فاکتور (LAW-20)</Label>
            <div className="flex gap-2 mb-2">
              <Input type="number" placeholder="مبلغ تخصیص" value={allocAmount} onChange={(e) => setAllocAmount(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">فاکتور صادرشده‌ای برای این مشتری وجود ندارد</p>
              ) : invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-2 border rounded-lg">
                  <div>
                    <div className="font-mono text-xs">{inv.invoiceNumber}</div>
                    <div className="text-xs text-muted-foreground">مانده: {formatMoney(inv.balanceDue)}</div>
                  </div>
                  <Button size="sm" onClick={() => handleAllocate(inv.id)}>تخصیص</Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
