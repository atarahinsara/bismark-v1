'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  FolderTree, Plus, Edit2, Trash2, ChevronLeft, ChevronDown, ChevronRight,
  Search, RefreshCw, AlertCircle, Loader2, Tag,
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
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
  productCategoriesApi, type ProductCategory,
  productBrandsApi, type ProductBrand,
  productModelsApi, type ProductModel,
  productsApi, type Product,
} from '@/lib/api-client'
import type { ApiError } from '@/lib/api-client'

// ============================================================
// Product Categories (Tree View)
// ============================================================
function CategoryTreeNode({
  category, allCategories, onEdit, onDelete, level = 0,
}: {
  category: ProductCategory
  allCategories: ProductCategory[]
  onEdit: (c: ProductCategory) => void
  onDelete: (c: ProductCategory) => void
  level?: number
}) {
  const [expanded, setExpanded] = useState(true)
  const children = allCategories.filter((c) => c.parentId === category.id)

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2 px-2 hover:bg-muted/50 rounded-lg cursor-pointer group"
        style={{ paddingRight: `${level * 20 + 8}px` }}
      >
        {children.length > 0 ? (
          <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        ) : (
          <div className="w-4" />
        )}
        <FolderTree className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{category.name}</span>
            {!category.isActive && <Badge variant="secondary">غیرفعال</Badge>}
          </div>
          <div className="text-xs text-muted-foreground font-mono">{category.code}</div>
        </div>
        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onEdit(category) }}>
            <Edit2 className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(category) }}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
      {expanded && children.length > 0 && (
        <div>
          {children.map((child) => (
            <CategoryTreeNode
              key={child.id}
              category={child}
              allCategories={allCategories}
              onEdit={onEdit}
              onDelete={onDelete}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CategoriesTab() {
  const [tree, setTree] = useState<ProductCategory[]>([])
  const [flat, setFlat] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ProductCategory | null>(null)
  const [form, setForm] = useState({ name: '', description: '', parentId: '', isActive: true })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [treeRes, flatRes] = await Promise.all([
        productCategoriesApi.list('tree'),
        productCategoriesApi.list('flat'),
      ])
      setTree(treeRes.data)
      setFlat(flatRes.data)
    } catch (e) {
      const err = e as ApiError
      setError(err.detail || 'Failed to load categories')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    try {
      if (editing) {
        await productCategoriesApi.update(editing.id, {
          name: form.name,
          description: form.description || undefined,
          isActive: form.isActive,
          parentId: form.parentId || undefined,
        })
        toast.success('دسته‌بندی به‌روزرسانی شد')
      } else {
        await productCategoriesApi.create({
          name: form.name,
          description: form.description || undefined,
          parentId: form.parentId || undefined,
          isActive: form.isActive,
        })
        toast.success('دسته‌بندی ایجاد شد')
      }
      setShowForm(false)
      setEditing(null)
      setForm({ name: '', description: '', parentId: '', isActive: true })
      load()
    } catch (e) {
      const err = e as ApiError
      toast.error(err.detail || 'خطا در ذخیره‌سازی')
    }
  }

  const handleDelete = async (cat: ProductCategory) => {
    if (!confirm(`حذف "${cat.name}"؟`)) return
    try {
      await productCategoriesApi.delete(cat.id)
      toast.success('دسته‌بندی حذف شد')
      load()
    } catch (e) {
      const err = e as ApiError
      toast.error(err.detail || 'خطا در حذف')
    }
  }

  const handleEdit = (cat: ProductCategory) => {
    setEditing(cat)
    setForm({ name: cat.name, description: cat.description || '', parentId: cat.parentId || '', isActive: cat.isActive })
    setShowForm(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">دسته‌بندی محصولات</h3>
          <p className="text-sm text-muted-foreground">{flat.length} دسته‌بندی</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
            به‌روزرسانی
          </Button>
          <Button size="sm" onClick={() => { setEditing(null); setForm({ name: '', description: '', parentId: '', isActive: true }); setShowForm(true) }}>
            <Plus className="w-4 h-4 ml-2" />
            دسته جدید
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

      <Card>
        <CardContent className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin ml-2" />
              در حال بارگذاری...
            </div>
          ) : tree.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FolderTree className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>هنوز دسته‌بندی ثبت نشده است</p>
              <Button className="mt-3" size="sm" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 ml-2" /> ایجاد دسته
              </Button>
            </div>
          ) : (
            <div>
              {tree.map((cat) => (
                <CategoryTreeNode
                  key={cat.id}
                  category={cat}
                  allCategories={flat}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'ویرایش دسته‌بندی' : 'دسته‌بندی جدید'}</DialogTitle>
            <DialogDescription>
              {editing ? `کد: ${editing.code}` : 'کد کسب‌وکار به‌صورت خودکار تولید می‌شود (LAW-02)'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>نام *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثلاً: الکترونیک" />
            </div>
            <div className="space-y-2">
              <Label>دسته والد</Label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                value={form.parentId}
                onChange={(e) => setForm({ ...form, parentId: e.target.value })}
              >
                <option value="">— بدون والد (ریشه) —</option>
                {flat.filter((c) => c.id !== editing?.id).map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>توضیحات</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div className="flex items-center justify-between">
              <Label>فعال</Label>
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>انصراف</Button>
            <Button onClick={handleSave} disabled={!form.name.trim()}>{editing ? 'به‌روزرسانی' : 'ایجاد'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// Brands Tab
// ============================================================
function BrandsTab() {
  const [brands, setBrands] = useState<ProductBrand[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ProductBrand | null>(null)
  const [form, setForm] = useState({ name: '', nameEn: '', description: '', isActive: true })

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await productBrandsApi.list(1, 100, search)
      setBrands(res.data)
    } catch (e) {
      setError((e as ApiError).detail || 'Failed to load brands')
    } finally { setLoading(false) }
  }, [search])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    try {
      if (editing) {
        await productBrandsApi.update(editing.id, { name: form.name, nameEn: form.nameEn, description: form.description, isActive: form.isActive })
        toast.success('برند به‌روزرسانی شد')
      } else {
        await productBrandsApi.create({ name: form.name, nameEn: form.nameEn, description: form.description, isActive: form.isActive })
        toast.success('برند ایجاد شد')
      }
      setShowForm(false); setEditing(null)
      setForm({ name: '', nameEn: '', description: '', isActive: true })
      load()
    } catch (e) { toast.error((e as ApiError).detail || 'خطا') }
  }

  const handleDelete = async (brand: ProductBrand) => {
    if (!confirm(`حذف "${brand.name}"؟`)) return
    try {
      await productBrandsApi.delete(brand.id)
      toast.success('برند حذف شد')
      load()
    } catch (e) { toast.error((e as ApiError).detail || 'خطا') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">برندها</h3>
          <p className="text-sm text-muted-foreground">{brands.length} برند</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setForm({ name: '', nameEn: '', description: '', isActive: true }); setShowForm(true) }}>
          <Plus className="w-4 h-4 ml-2" /> برند جدید
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="جستجوی برند..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : error ? (
        <Card className="border-destructive"><CardContent className="p-4 text-destructive">{error}</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((brand) => (
            <Card key={brand.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Tag className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">{brand.name}</div>
                      {brand.nameEn && <div className="text-xs text-muted-foreground">{brand.nameEn}</div>}
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                      setEditing(brand); setForm({ name: brand.name, nameEn: brand.nameEn || '', description: brand.description || '', isActive: brand.isActive }); setShowForm(true)
                    }}><Edit2 className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(brand)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
                <div className="text-xs font-mono text-muted-foreground">{brand.code}</div>
                {brand.description && <div className="text-sm text-muted-foreground mt-2">{brand.description}</div>}
                <Badge variant={brand.isActive ? 'default' : 'secondary'} className="mt-2 text-xs">
                  {brand.isActive ? 'فعال' : 'غیرفعال'}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'ویرایش برند' : 'برند جدید'}</DialogTitle>
            <DialogDescription>{editing ? `کد: ${editing.code}` : 'کد کسب‌وکار خودکار تولید می‌شود'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>نام *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>نام انگلیسی</Label><Input value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} /></div>
            <div className="space-y-2"><Label>توضیحات</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
            <div className="flex items-center justify-between"><Label>فعال</Label><Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowForm(false)}>انصراف</Button><Button onClick={handleSave} disabled={!form.name.trim()}>{editing ? 'به‌روزرسانی' : 'ایجاد'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// Models Tab
// ============================================================
function ModelsTab() {
  const [models, setModels] = useState<ProductModel[]>([])
  const [brands, setBrands] = useState<ProductBrand[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', brandId: '', categoryId: '', warrantyMonths: 12, isSerialized: true, description: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [modelsRes, brandsRes, catsRes] = await Promise.all([
        productModelsApi.list(1, 100, search),
        productBrandsApi.list(1, 100),
        productCategoriesApi.list('flat'),
      ])
      setModels(modelsRes.data)
      setBrands(brandsRes.data)
      setCategories(catsRes.data)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [search])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    try {
      await productModelsApi.create(form)
      toast.success('مدل ایجاد شد')
      setShowForm(false)
      setForm({ name: '', brandId: '', categoryId: '', warrantyMonths: 12, isSerialized: true, description: '' })
      load()
    } catch (e) { toast.error((e as ApiError).detail || 'خطا') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h3 className="text-lg font-semibold">مدل‌ها</h3><p className="text-sm text-muted-foreground">{models.length} مدل</p></div>
        <Button size="sm" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 ml-2" /> مدل جدید</Button>
      </div>
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="جستجو..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
      </div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div> : (
        <Card><CardContent className="p-0">
          <table className="w-full">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-right p-3 text-sm font-medium">کد</th>
                <th className="text-right p-3 text-sm font-medium">نام</th>
                <th className="text-right p-3 text-sm font-medium">برند</th>
                <th className="text-right p-3 text-sm font-medium">دسته</th>
                <th className="text-right p-3 text-sm font-medium">گارانتی</th>
                <th className="text-right p-3 text-sm font-medium">سریال</th>
                <th className="text-right p-3 text-sm font-medium">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={m.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{m.modelCode}</td>
                  <td className="p-3 font-medium">{m.name}</td>
                  <td className="p-3 text-sm">{(m as any).brandName || '—'}</td>
                  <td className="p-3 text-sm">{(m as any).categoryName || '—'}</td>
                  <td className="p-3 text-sm">{m.warrantyMonths} ماه</td>
                  <td className="p-3"><Badge variant={m.isSerialized ? 'default' : 'secondary'} className="text-xs">{m.isSerialized ? 'بله' : 'خیر'}</Badge></td>
                  <td className="p-3"><Badge variant={m.status === 'active' ? 'default' : 'secondary'} className="text-xs">{m.status === 'active' ? 'فعال' : m.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
          {models.length === 0 && <div className="text-center py-8 text-muted-foreground">مدلی ثبت نشده است</div>}
        </CardContent></Card>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>مدل جدید</DialogTitle><DialogDescription>کد مدل خودکار تولید می‌شود</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>نام *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>برند *</Label>
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background" value={form.brandId} onChange={(e) => setForm({ ...form, brandId: e.target.value })}>
                  <option value="">انتخاب...</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="space-y-2"><Label>دسته *</Label>
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">انتخاب...</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>مدت گارانتی (ماه)</Label><Input type="number" value={form.warrantyMonths} onChange={(e) => setForm({ ...form, warrantyMonths: +e.target.value })} /></div>
              <div className="flex items-center justify-between pt-6">
                <Label>سریال‌محور</Label><Switch checked={form.isSerialized} onCheckedChange={(v) => setForm({ ...form, isSerialized: v })} />
              </div>
            </div>
            <div className="space-y-2"><Label>توضیحات</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowForm(false)}>انصراف</Button><Button onClick={handleSave} disabled={!form.name || !form.brandId || !form.categoryId}>ایجاد</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// Products Tab
// ============================================================
function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await productsApi.list(1, 100, search)
      setProducts(res.data)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [search])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h3 className="text-lg font-semibold">محصولات</h3><p className="text-sm text-muted-foreground">{products.length} محصول</p></div>
        <Button size="sm"><Plus className="w-4 h-4 ml-2" /> محصول جدید</Button>
      </div>
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="جستجو..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
      </div>
      {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div> : (
        <Card><CardContent className="p-0">
          <table className="w-full">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-right p-3 text-sm font-medium">SKU</th>
                <th className="text-right p-3 text-sm font-medium">نام</th>
                <th className="text-right p-3 text-sm font-medium">برند</th>
                <th className="text-right p-3 text-sm font-medium">مدل</th>
                <th className="text-right p-3 text-sm font-medium">نوع</th>
                <th className="text-right p-3 text-sm font-medium">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{p.sku}</td>
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3 text-sm">{(p as any).brandName || '—'}</td>
                  <td className="p-3 text-sm">{(p as any).modelName || '—'}</td>
                  <td className="p-3"><Badge variant="outline" className="text-xs">{p.productType}</Badge></td>
                  <td className="p-3"><Badge variant={p.status === 'active' ? 'default' : 'secondary'} className="text-xs">{p.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && <div className="text-center py-8 text-muted-foreground">محصولی ثبت نشده است</div>}
        </CardContent></Card>
      )}
    </div>
  )
}

// ============================================================
// Main ProductsView with Tabs
// ============================================================
export function ProductsView() {
  const [tab, setTab] = useState<'categories' | 'brands' | 'models' | 'products'>('categories')

  const tabs = [
    { key: 'categories' as const, label: 'دسته‌بندی‌ها', icon: FolderTree },
    { key: 'brands' as const, label: 'برندها', icon: Tag },
    { key: 'models' as const, label: 'مدل‌ها', icon: Tag },
    { key: 'products' as const, label: 'محصولات', icon: Tag },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">مدیریت محصولات</h1>
        <p className="text-muted-foreground mt-1">Sprint 2.1 — Product Context (Real API)</p>
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

      {tab === 'categories' && <CategoriesTab />}
      {tab === 'brands' && <BrandsTab />}
      {tab === 'models' && <ModelsTab />}
      {tab === 'products' && <ProductsTab />}
    </div>
  )
}
