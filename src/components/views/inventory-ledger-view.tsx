'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Package, Plus, Search, RefreshCw, AlertCircle, Loader2,
  ArrowDownCircle, ArrowUpCircle, Lock, Unlock, BookOpen,
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
  stockItemsApi, inventoryTransactionsApi, stockReservationsApi,
  warehousesApi, productsApi,
  type StockItem, type InventoryTransaction, type StockReservation,
  type Warehouse, type Product,
} from '@/lib/api-client'
import type { ApiError } from '@/lib/api-client'

// ============================================================
// Stock Items Tab (with derived balances from ledger)
// ============================================================

function StockItemsTab() {
  const [items, setItems] = useState<StockItem[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    warehouseId: '', productId: '', productInstanceId: '', batchNumber: '', status: 'available',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [itemsRes, whRes, prodRes] = await Promise.all([
        stockItemsApi.list(1, 100),
        warehousesApi.list(1, 100),
        productsApi.list(1, 100),
      ])
      setItems(itemsRes.data)
      setWarehouses(whRes.data)
      setProducts(prodRes.data)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    try {
      await stockItemsApi.create({
        warehouseId: form.warehouseId,
        productId: form.productId,
        productInstanceId: form.productInstanceId || undefined,
        batchNumber: form.batchNumber || undefined,
        status: form.status,
      })
      toast.success('موجودی ایجاد شد')
      setShowForm(false)
      setForm({ warehouseId: '', productId: '', productInstanceId: '', batchNumber: '', status: 'available' })
      load()
    } catch (e) { toast.error((e as ApiError).detail || 'خطا') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">اقلام موجودی</h3>
          <p className="text-sm text-muted-foreground">
            {items.length} قلم • موجودی از دفتر کل مشتق می‌شود (LAW-05)
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 ml-2" /> قلم جدید
        </Button>
      </div>

      <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900">
        <CardContent className="p-3 flex items-center gap-2 text-sm">
          <BookOpen className="w-4 h-4 text-emerald-600" />
          <span className="text-emerald-700 dark:text-emerald-400">
            <strong>LAW-05:</strong> موجودی واقعی از <code className="font-mono">InventoryTransaction</code> محاسبه می‌شود، نه از ستون ذخیره‌شده.
          </span>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : items.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>هنوز قلم موجودی ثبت نشده است</p>
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <table className="w-full">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-right p-3 text-sm font-medium">انبار</th>
                <th className="text-right p-3 text-sm font-medium">محصول</th>
                <th className="text-right p-3 text-sm font-medium">بچ</th>
                <th className="text-right p-3 text-sm font-medium">موجودی (دفتر کل)</th>
                <th className="text-right p-3 text-sm font-medium">رزرو شده</th>
                <th className="text-right p-3 text-sm font-medium">قابل دسترس</th>
                <th className="text-right p-3 text-sm font-medium">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const product = products.find((p) => p.id === item.productId)
                return (
                  <tr key={item.id} className="border-b hover:bg-muted/30">
                    <td className="p-3 text-sm">
                      <div className="font-medium">{item.warehouseName}</div>
                      <div className="text-xs text-muted-foreground font-mono">{item.warehouseCode}</div>
                    </td>
                    <td className="p-3 text-sm">
                      <div className="font-medium">{product?.name ?? item.productId.slice(0, 8)}</div>
                      <div className="text-xs text-muted-foreground font-mono">{product?.sku ?? '—'}</div>
                    </td>
                    <td className="p-3 text-sm font-mono">{item.batchNumber ?? '—'}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="font-mono">
                        {item.onHandQuantity ?? 0}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm text-amber-600 font-mono">{item.reservedQuantity}</td>
                    <td className="p-3">
                      <Badge variant={item.isAvailable ? 'default' : 'secondary'} className="font-mono">
                        {item.availableQuantity ?? 0}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge variant={item.status === 'available' ? 'default' : 'secondary'} className="text-xs">
                        {item.status}
                      </Badge>
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
            <DialogTitle>قلم موجودی جدید</DialogTitle>
            <DialogDescription>
              موجودی اولیه از طریق تراکنش دفتر کل (IN) ثبت می‌شود
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>انبار *</Label>
              <select className="w-full h-10 px-3 rounded-md border border-input bg-background" value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}>
                <option value="">انتخاب...</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>محصول *</Label>
              <select className="w-full h-10 px-3 rounded-md border border-input bg-background" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
                <option value="">انتخاب...</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>شماره سریال (اختیاری)</Label><Input value={form.productInstanceId} onChange={(e) => setForm({ ...form, productInstanceId: e.target.value })} placeholder="برای محصولات سریال‌دار" /></div>
              <div className="space-y-2"><Label>شماره بچ (اختیاری)</Label><Input value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>انصراف</Button>
            <Button onClick={handleCreate} disabled={!form.warehouseId || !form.productId}>ایجاد</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// Ledger Tab (Inventory Transactions — append-only)
// ============================================================

const txnTypeLabels: Record<string, { label: string; icon: any; color: string }> = {
  IN: { label: 'ورود', icon: ArrowDownCircle, color: 'text-emerald-600' },
  OUT: { label: 'خروج', icon: ArrowUpCircle, color: 'text-red-600' },
  TRANSFER: { label: 'انتقال', icon: ArrowUpCircle, color: 'text-blue-600' },
  ADJUSTMENT: { label: 'تعدیل', icon: RefreshCw, color: 'text-amber-600' },
  COUNT: { label: 'شمارش', icon: RefreshCw, color: 'text-purple-600' },
  RESERVATION: { label: 'رزرو', icon: Lock, color: 'text-orange-600' },
  RELEASE: { label: 'آزادسازی', icon: Unlock, color: 'text-teal-600' },
}

function LedgerTab() {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    stockItemId: '', transactionType: 'IN', quantity: '', reason: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await inventoryTransactionsApi.list(1, 100)
      setTransactions(res.data)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    try {
      const qty = form.transactionType === 'OUT' || form.transactionType === 'RELEASE'
        ? -Math.abs(+form.quantity)
        : Math.abs(+form.quantity)
      await inventoryTransactionsApi.create({
        stockItemId: form.stockItemId,
        transactionType: form.transactionType as any,
        quantity: qty,
        reason: form.reason,
      })
      toast.success('تراکنش به دفتر کل اضافه شد')
      setShowForm(false)
      setForm({ stockItemId: '', transactionType: 'IN', quantity: '', reason: '' })
      load()
    } catch (e) { toast.error((e as ApiError).detail || 'خطا') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">دفتر کل موجودی</h3>
          <p className="text-sm text-muted-foreground">
            {transactions.length} تراکنش • Append-only (LAW-05)
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 ml-2" /> تراکنش جدید
        </Button>
      </div>

      <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900">
        <CardContent className="p-3 flex items-center gap-2 text-sm">
          <Lock className="w-4 h-4 text-emerald-600" />
          <span className="text-emerald-700 dark:text-emerald-400">
            <strong>Append-Only:</strong> تراکنش‌ها فقط اضافه می‌شوند، هرگز ویرایش یا حذف نمی‌شوند.
          </span>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : transactions.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>هنوز تراکنشی ثبت نشده است</p>
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <table className="w-full">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-right p-3 text-sm font-medium">شماره تراکنش</th>
                <th className="text-right p-3 text-sm font-medium">نوع</th>
                <th className="text-right p-3 text-sm font-medium">قلم</th>
                <th className="text-right p-3 text-sm font-medium">تعداد</th>
                <th className="text-right p-3 text-sm font-medium">دلیل</th>
                <th className="text-right p-3 text-sm font-medium">زمان</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((txn) => {
                const t = txnTypeLabels[txn.transactionType] || { label: txn.transactionType, icon: Package, color: '' }
                const Icon = t.icon
                return (
                  <tr key={txn.id} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{txn.transactionNumber}</td>
                    <td className="p-3">
                      <div className={`flex items-center gap-2 ${t.color}`}>
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{t.label}</span>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{txn.stockItemId.slice(0, 8)}...</td>
                    <td className="p-3">
                      <Badge variant={txn.quantity >= 0 ? 'default' : 'destructive'} className="font-mono">
                        {txn.quantity > 0 ? '+' : ''}{txn.quantity}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">{txn.reason ?? '—'}</td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {new Date(txn.occurredAt).toLocaleString('fa-IR')}
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
            <DialogTitle>تراکنش دفتر کل جدید</DialogTitle>
            <DialogDescription>تراکنش به دفتر کل اضافه می‌شود (Append-only)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>نوع تراکنش *</Label>
              <select className="w-full h-10 px-3 rounded-md border border-input bg-background" value={form.transactionType} onChange={(e) => setForm({ ...form, transactionType: e.target.value })}>
                {Object.entries(txnTypeLabels).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="space-y-2"><Label>شناسه قلم موجودی *</Label><Input value={form.stockItemId} onChange={(e) => setForm({ ...form, stockItemId: e.target.value })} placeholder="Stock Item ID" /></div>
            <div className="space-y-2"><Label>تعداد *</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
            <div className="space-y-2"><Label>دلیل</Label><Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>انصراف</Button>
            <Button onClick={handleCreate} disabled={!form.stockItemId || !form.quantity}>ثبت تراکنش</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// Reservations Tab
// ============================================================

function ReservationsTab() {
  const [reservations, setReservations] = useState<StockReservation[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await stockReservationsApi.list(1, 100)
      setReservations(res.data)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleRelease = async (id: string) => {
    try {
      await stockReservationsApi.release(id)
      toast.success('رزرو آزاد شد')
      load()
    } catch (e) { toast.error((e as ApiError).detail || 'خطا') }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">رزروها</h3>
        <p className="text-sm text-muted-foreground">{reservations.length} رزرو</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : reservations.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <Lock className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>هنوز رزروی ثبت نشده است</p>
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <table className="w-full">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-right p-3 text-sm font-medium">شماره رزرو</th>
                <th className="text-right p-3 text-sm font-medium">قلم</th>
                <th className="text-right p-3 text-sm font-medium">تعداد</th>
                <th className="text-right p-3 text-sm font-medium">انقضا</th>
                <th className="text-right p-3 text-sm font-medium">وضعیت</th>
                <th className="text-right p-3 text-sm font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => (
                <tr key={r.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{r.reservationNumber}</td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">{r.stockItemId.slice(0, 8)}...</td>
                  <td className="p-3"><Badge variant="outline" className="font-mono">{r.reservedQuantity}</Badge></td>
                  <td className="p-3 text-sm">{new Date(r.expiresAt).toLocaleDateString('fa-IR')}</td>
                  <td className="p-3">
                    <Badge variant={r.status === 'active' ? 'default' : 'secondary'} className="text-xs">{r.status}</Badge>
                  </td>
                  <td className="p-3">
                    {r.status === 'active' && (
                      <Button size="sm" variant="outline" onClick={() => handleRelease(r.id)}>
                        <Unlock className="w-3 h-3 ml-1" /> آزادسازی
                      </Button>
                    )}
                  </td>
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
// Main InventoryLedgerView
// ============================================================

export function InventoryLedgerView() {
  const [tab, setTab] = useState<'items' | 'ledger' | 'reservations'>('items')

  const tabs = [
    { key: 'items' as const, label: 'اقلام موجودی', icon: Package },
    { key: 'ledger' as const, label: 'دفتر کل', icon: BookOpen },
    { key: 'reservations' as const, label: 'رزروها', icon: Lock },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">مدیریت موجودی</h1>
        <p className="text-muted-foreground mt-1">
          Sprint 2.2B — Ledger-Based Inventory (LAW-05)
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

      {tab === 'items' && <StockItemsTab />}
      {tab === 'ledger' && <LedgerTab />}
      {tab === 'reservations' && <ReservationsTab />}
    </div>
  )
}
