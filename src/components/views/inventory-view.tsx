'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Warehouse as WarehouseIcon, Plus, Edit2, Trash2, Search, RefreshCw,
  AlertCircle, Loader2, MapPin, Layers, ChevronDown, ChevronRight, Box,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
  warehousesApi, type Warehouse, type WarehouseZone,
} from '@/lib/api-client'
import type { ApiError } from '@/lib/api-client'

const warehouseTypeLabels: Record<string, string> = {
  main: 'اصلی',
  branch: 'شعبه',
  service_center: 'مرکز خدمات',
  transit: 'ترانزیت',
  return: 'مرجوعی',
}

const zoneTypeLabels: Record<string, string> = {
  receiving: 'دریافت',
  storage: 'انبارش',
  shipping: 'ارسال',
  returns: 'مرجوعی',
  quarantine: 'قرنطینه',
}

// ============================================================
// Warehouse List + Detail (with Zones)
// ============================================================

function WarehouseCard({
  warehouse, onEdit, onDelete, onView,
}: {
  warehouse: Warehouse
  onEdit: () => void
  onDelete: () => void
  onView: () => void
}) {
  return (
    <Card className="group hover:shadow-md transition-shadow cursor-pointer" onClick={onView}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <WarehouseIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="font-semibold text-base">{warehouse.name}</div>
              <div className="text-xs font-mono text-muted-foreground">{warehouse.code}</div>
            </div>
          </div>
          <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}><Edit2 className="w-3 h-3" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete}><Trash2 className="w-3 h-3" /></Button>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <Badge variant="outline">{warehouseTypeLabels[warehouse.warehouseType] || warehouse.warehouseType}</Badge>
          {warehouse.isDefault && <Badge>پیش‌فرض</Badge>}
          {!warehouse.isActive && <Badge variant="secondary">غیرفعال</Badge>}
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Layers className="w-3 h-3" /> {warehouse.zoneCount} منطقه
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {warehouse.locationCount} موقعیت
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function WarehouseDetail({
  warehouse, onClose,
}: {
  warehouse: Warehouse
  onClose: () => void
}) {
  const [zones, setZones] = useState<WarehouseZone[]>([])
  const [loading, setLoading] = useState(true)
  const [showZoneForm, setShowZoneForm] = useState(false)
  const [zoneForm, setZoneForm] = useState({ name: '', zoneType: 'storage' })

  const loadZones = useCallback(async () => {
    setLoading(true)
    try {
      const res = await warehousesApi.listZones(warehouse.id)
      setZones(res.data)
    } catch (e) {
      toast.error((e as ApiError).detail || 'خطا در بارگذاری مناطق')
    } finally { setLoading(false) }
  }, [warehouse.id])

  useEffect(() => { loadZones() }, [loadZones])

  const handleCreateZone = async () => {
    try {
      await warehousesApi.createZone(warehouse.id, { name: zoneForm.name, zoneType: zoneForm.zoneType })
      toast.success('منطقه ایجاد شد')
      setShowZoneForm(false)
      setZoneForm({ name: '', zoneType: 'storage' })
      loadZones()
    } catch (e) { toast.error((e as ApiError).detail || 'خطا') }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WarehouseIcon className="w-5 h-5 text-primary" />
            {warehouse.name}
          </DialogTitle>
          <DialogDescription>
            کد: <span className="font-mono">{warehouse.code}</span> • نوع: {warehouseTypeLabels[warehouse.warehouseType]}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 rounded-lg border text-center">
              <div className="text-2xl font-bold text-primary">{zones.length}</div>
              <div className="text-xs text-muted-foreground">مناطق</div>
            </div>
            <div className="p-3 rounded-lg border text-center">
              <div className="text-2xl font-bold text-primary">{warehouse.locationCount}</div>
              <div className="text-xs text-muted-foreground">موقعیت‌ها</div>
            </div>
            <div className="p-3 rounded-lg border text-center">
              <div className="text-2xl font-bold text-primary">{warehouse.capacityCubic ?? '—'}</div>
              <div className="text-xs text-muted-foreground">ظرفیت (م³)</div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h4 className="font-semibold">مناطق انبار</h4>
            <Button size="sm" onClick={() => setShowZoneForm(true)}>
              <Plus className="w-4 h-4 ml-2" /> منطقه جدید
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : zones.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Layers className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>هنوز منطقه‌ای تعریف نشده است</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {zones.map((zone) => (
                <div key={zone.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Layers className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{zone.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{zone.code}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {zone.zoneType && <Badge variant="outline" className="text-xs">{zoneTypeLabels[zone.zoneType] || zone.zoneType}</Badge>}
                    <Badge variant={zone.isActive ? 'default' : 'secondary'} className="text-xs">{zone.isActive ? 'فعال' : 'غیرفعال'}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showZoneForm && (
          <Dialog open={showZoneForm} onOpenChange={setShowZoneForm}>
            <DialogContent>
              <DialogHeader><DialogTitle>منطقه جدید</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>نام *</Label><Input value={zoneForm.name} onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })} placeholder="مثلاً: منطقه دریافت" /></div>
                <div className="space-y-2"><Label>نوع منطقه</Label>
                  <select className="w-full h-10 px-3 rounded-md border border-input bg-background" value={zoneForm.zoneType} onChange={(e) => setZoneForm({ ...zoneForm, zoneType: e.target.value })}>
                    {Object.entries(zoneTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowZoneForm(false)}>انصراف</Button>
                <Button onClick={handleCreateZone} disabled={!zoneForm.name.trim()}>ایجاد</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Main InventoryView
// ============================================================

export function InventoryView() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Warehouse | null>(null)
  const [viewing, setViewing] = useState<Warehouse | null>(null)
  const [form, setForm] = useState({
    name: '', warehouseType: 'main', capacityCubic: '', isActive: true, isDefault: false,
  })

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await warehousesApi.list(1, 100, search)
      setWarehouses(res.data)
    } catch (e) {
      setError((e as ApiError).detail || 'Failed to load warehouses')
    } finally { setLoading(false) }
  }, [search])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    try {
      if (editing) {
        await warehousesApi.update(editing.id, {
          name: form.name,
          warehouseType: form.warehouseType,
          capacityCubic: form.capacityCubic ? +form.capacityCubic : null,
          isActive: form.isActive,
          isDefault: form.isDefault,
        })
        toast.success('انبار به‌روزرسانی شد')
      } else {
        await warehousesApi.create({
          name: form.name,
          warehouseType: form.warehouseType,
          capacityCubic: form.capacityCubic ? +form.capacityCubic : null,
          isActive: form.isActive,
          isDefault: form.isDefault,
        })
        toast.success('انبار ایجاد شد')
      }
      setShowForm(false); setEditing(null)
      setForm({ name: '', warehouseType: 'main', capacityCubic: '', isActive: true, isDefault: false })
      load()
    } catch (e) { toast.error((e as ApiError).detail || 'خطا') }
  }

  const handleDelete = async (wh: Warehouse) => {
    if (!confirm(`حذف "${wh.name}"؟`)) return
    try {
      await warehousesApi.delete(wh.id)
      toast.success('انبار حذف شد')
      load()
    } catch (e) { toast.error((e as ApiError).detail || 'خطا') }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">مدیریت انبارها</h1>
        <p className="text-muted-foreground mt-1">Sprint 2.2A — Inventory Structure (Real API)</p>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="جستجوی انبار..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
            به‌روزرسانی
          </Button>
          <Button size="sm" onClick={() => {
            setEditing(null)
            setForm({ name: '', warehouseType: 'main', capacityCubic: '', isActive: true, isDefault: false })
            setShowForm(true)
          }}>
            <Plus className="w-4 h-4 ml-2" /> انبار جدید
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4 flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin ml-2" />
          در حال بارگذاری...
        </div>
      ) : warehouses.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <WarehouseIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>هنوز انباری ثبت نشده است</p>
            <Button className="mt-3" size="sm" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 ml-2" /> ایجاد انبار
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map((wh) => (
            <WarehouseCard
              key={wh.id}
              warehouse={wh}
              onEdit={() => {
                setEditing(wh)
                setForm({
                  name: wh.name,
                  warehouseType: wh.warehouseType,
                  capacityCubic: wh.capacityCubic?.toString() || '',
                  isActive: wh.isActive,
                  isDefault: wh.isDefault,
                })
                setShowForm(true)
              }}
              onDelete={() => handleDelete(wh)}
              onView={() => setViewing(wh)}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Warehouse Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'ویرایش انبار' : 'انبار جدید'}</DialogTitle>
            <DialogDescription>
              {editing ? `کد: ${editing.code}` : 'کد انبار به‌صورت خودکار تولید می‌شود (LAW-02)'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>نام انبار *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثلاً: انبار مرکزی تهران" />
            </div>
            <div className="space-y-2">
              <Label>نوع انبار</Label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                value={form.warehouseType}
                onChange={(e) => setForm({ ...form, warehouseType: e.target.value })}
              >
                {Object.entries(warehouseTypeLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>ظرفیت (متر مکعب)</Label>
              <Input type="number" value={form.capacityCubic} onChange={(e) => setForm({ ...form, capacityCubic: e.target.value })} placeholder="اختیاری" />
            </div>
            <div className="flex items-center justify-between">
              <Label>فعال</Label>
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>انبار پیش‌فرض</Label>
              <Switch checked={form.isDefault} onCheckedChange={(v) => setForm({ ...form, isDefault: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>انصراف</Button>
            <Button onClick={handleSave} disabled={!form.name.trim()}>{editing ? 'به‌روزرسانی' : 'ایجاد'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Warehouse Detail (with Zones) */}
      {viewing && <WarehouseDetail warehouse={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}
