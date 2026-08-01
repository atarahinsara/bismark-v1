'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck, Plus, Loader2, CheckCircle, XCircle, Search,
  Clock, Wrench, Send, Eye, RotateCw, History,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import type { ApiError } from '@/lib/api-client'
import { apiFetch } from '@/lib/api-client'

const API_BASE = '/api/v1'

const cardStatusLabels: Record<string, string> = {
  pending: 'در انتظار', active: 'فعال', expired: 'منقضی', voided: 'ابطال‌شده', transferred: 'منتقل‌شده',
}
const claimStatusLabels: Record<string, string> = {
  draft: 'پیش‌نویس', submitted: 'ارسال‌شده', inspection: 'در حال بازرسی',
  approved: 'تأییدشده', rejected: 'ردشده', service_order: 'سفارش تعمیر', closed: 'بسته‌شده',
}

// F-06 fix (Audit v4): use apiFetch (auto-attaches Bearer token) instead of raw fetch.
const fetchAPI = apiFetch

export function WarrantyView() {
  const [tab, setTab] = useState<'cards' | 'claims'>('cards')
  const [cards, setCards] = useState<any[]>([])
  const [claims, setClaims] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCardForm, setShowCardForm] = useState(false)
  const [showClaimForm, setShowClaimForm] = useState(false)
  const [selectedCard, setSelectedCard] = useState<any | null>(null)
  const [selectedClaim, setSelectedClaim] = useState<any | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [cardRes, claimRes] = await Promise.all([
        fetchAPI('/warranty-cards').then((r) => r.json()),
        fetchAPI('/warranty-claims').then((r) => r.json()),
      ])
      setCards(cardRes.data || [])
      setClaims(claimRes.data || [])
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">گارانتی</h1>
          <p className="text-muted-foreground mt-1">Sprint 4 — Warranty Context (LAW-28/29/30)</p>
        </div>
        {tab === 'cards' && <Button onClick={() => setShowCardForm(true)}><Plus className="w-4 h-4 ml-2" /> کارت گارانتی</Button>}
        {tab === 'claims' && <Button onClick={() => setShowClaimForm(true)}><Plus className="w-4 h-4 ml-2" /> ادعای گارانتی</Button>}
      </div>

      <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900">
        <CardContent className="p-3 flex items-center gap-2 text-xs flex-wrap">
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">Laws:</span>
          <Badge variant="outline">LAW-28: Activation from delivery event</Badge>
          <Badge variant="outline">LAW-29: Inspection before approval</Badge>
          <Badge variant="outline">LAW-30: Timeline from events</Badge>
        </CardContent>
      </Card>

      <div className="flex gap-2 border-b">
        {[
          { key: 'cards' as const, label: 'کارت‌های گارانتی', icon: ShieldCheck },
          { key: 'claims' as const, label: 'ادعاهای گارانتی', icon: Wrench },
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
      ) : tab === 'cards' ? (
        cards.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground"><ShieldCheck className="w-12 h-12 mx-auto mb-2 opacity-30" /><p>هنوز کارت گارانتی ثبت نشده است</p></CardContent></Card>
        ) : (
          <Card><CardContent className="p-0">
            <table className="w-full">
              <thead className="border-b bg-muted/30"><tr>
                <th className="text-right p-3 text-sm font-medium">شماره</th>
                <th className="text-right p-3 text-sm font-medium">سریال دستگاه</th>
                <th className="text-right p-3 text-sm font-medium">مشتری</th>
                <th className="text-right p-3 text-sm font-medium">تاریخ فعال‌سازی</th>
                <th className="text-right p-3 text-sm font-medium">تاریخ انقضا</th>
                <th className="text-right p-3 text-sm font-medium">وضعیت</th>
                <th className="text-right p-3 text-sm font-medium">عملیات</th>
              </tr></thead>
              <tbody>
                {cards.map((c) => (
                  <tr key={c.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedCard(c)}>
                    <td className="p-3 font-mono text-xs">{c.warrantyNumber}</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{c.productInstanceId.slice(0, 8)}...</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{c.customerPartyId.slice(0, 8)}...</td>
                    <td className="p-3 text-sm">{c.activationDate ? new Date(c.activationDate).toLocaleDateString('fa-IR') : '—'}</td>
                    <td className="p-3 text-sm">{c.endDate ? new Date(c.endDate).toLocaleDateString('fa-IR') : '—'}</td>
                    <td className="p-3"><Badge variant={c.status === 'active' ? 'default' : c.status === 'expired' ? 'destructive' : 'secondary'} className="text-xs">{cardStatusLabels[c.status] || c.status}</Badge></td>
                    <td className="p-3"><Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedCard(c) }}>مشاهده</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
        )
      ) : (
        claims.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground"><Wrench className="w-12 h-12 mx-auto mb-2 opacity-30" /><p>هنوز ادعای گارانتی ثبت نشده است</p></CardContent></Card>
        ) : (
          <Card><CardContent className="p-0">
            <table className="w-full">
              <thead className="border-b bg-muted/30"><tr>
                <th className="text-right p-3 text-sm font-medium">شماره</th>
                <th className="text-right p-3 text-sm font-medium">کارت گارانتی</th>
                <th className="text-right p-3 text-sm font-medium">نوع</th>
                <th className="text-right p-3 text-sm font-medium">تاریخ</th>
                <th className="text-right p-3 text-sm font-medium">بازرسی</th>
                <th className="text-right p-3 text-sm font-medium">وضعیت</th>
                <th className="text-right p-3 text-sm font-medium">عملیات</th>
              </tr></thead>
              <tbody>
                {claims.map((c) => (
                  <tr key={c.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedClaim(c)}>
                    <td className="p-3 font-mono text-xs">{c.claimNumber}</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{c.warrantyCardId.slice(0, 8)}...</td>
                    <td className="p-3 text-sm">{c.claimType}</td>
                    <td className="p-3 text-sm">{new Date(c.claimDate).toLocaleDateString('fa-IR')}</td>
                    <td className="p-3">{c.isInspected ? <Badge variant="default" className="text-xs">بله</Badge> : <Badge variant="secondary" className="text-xs">خیر</Badge>}</td>
                    <td className="p-3"><Badge variant={c.status === 'approved' ? 'default' : c.status === 'rejected' ? 'destructive' : 'secondary'} className="text-xs">{claimStatusLabels[c.status] || c.status}</Badge></td>
                    <td className="p-3"><Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedClaim(c) }}>مشاهده</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
        )
      )}

      {showCardForm && <CreateCardForm onClose={() => setShowCardForm(false)} onCreated={() => { setShowCardForm(false); load() }} />}
      {showClaimForm && <CreateClaimForm onClose={() => setShowClaimForm(false)} onCreated={() => { setShowClaimForm(false); load() }} />}
      {selectedCard && <CardDetail card={selectedCard} onClose={() => { setSelectedCard(null); load() }} />}
      {selectedClaim && <ClaimDetail claim={selectedClaim} onClose={() => { setSelectedClaim(null); load() }} />}
    </div>
  )
}

function CreateCardForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ productInstanceId: '', customerPartyId: '', warrantyPolicyId: '', salesOrderId: '', notes: '' })
  const handleCreate = async () => {
    try {
      const idemKey = crypto.randomUUID()
      await fetchAPI('/warranty-cards', { method: 'POST', body: JSON.stringify(form), headers: { 'Idempotency-Key': idemKey } })
      toast.success('کارت گارانتی ایجاد شد (در انتظار فعال‌سازی — LAW-28)')
      onCreated()
    } catch (e) { toast.error('خطا') }
  }
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>کارت گارانتی جدید</DialogTitle><DialogDescription>کد خودکار: WAR-... — فعال‌سازی فقط از طریق تحویل محموله (LAW-28)</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>شناسه نمونه محصول *</Label><Input value={form.productInstanceId} onChange={(e) => setForm({ ...form, productInstanceId: e.target.value })} placeholder="Product Instance ID" /></div>
          <div className="space-y-2"><Label>شناسه مشتری *</Label><Input value={form.customerPartyId} onChange={(e) => setForm({ ...form, customerPartyId: e.target.value })} placeholder="Party ID" /></div>
          <div className="space-y-2"><Label>شناسه سیاست گارانتی *</Label><Input value={form.warrantyPolicyId} onChange={(e) => setForm({ ...form, warrantyPolicyId: e.target.value })} placeholder="Policy ID" /></div>
          <div className="space-y-2"><Label>شناسه سفارش فروش (اختیاری)</Label><Input value={form.salesOrderId} onChange={(e) => setForm({ ...form, salesOrderId: e.target.value })} /></div>
          <div className="space-y-2"><Label>توضیحات</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>انصراف</Button><Button onClick={handleCreate} disabled={!form.productInstanceId || !form.customerPartyId || !form.warrantyPolicyId}>ایجاد</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CreateClaimForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ warrantyCardId: '', claimType: 'defect', description: '', defectDescription: '' })
  const handleCreate = async () => {
    try {
      const idemKey = crypto.randomUUID()
      await fetchAPI('/warranty-claims', { method: 'POST', body: JSON.stringify(form), headers: { 'Idempotency-Key': idemKey } })
      toast.success('ادعای گارانتی ثبت شد')
      onCreated()
    } catch (e) { toast.error('خطا') }
  }
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>ادعای گارانتی جدید</DialogTitle><DialogDescription>کد خودکار: WCL-... — نیاز به بازرسی قبل از تأیید (LAW-29)</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>شناسه کارت گارانتی *</Label><Input value={form.warrantyCardId} onChange={(e) => setForm({ ...form, warrantyCardId: e.target.value })} placeholder="Warranty Card ID" /></div>
          <div className="space-y-2"><Label>نوع ادعا</Label>
            <select className="w-full h-10 px-3 rounded-md border border-input bg-background" value={form.claimType} onChange={(e) => setForm({ ...form, claimType: e.target.value })}>
              <option value="defect">نقص</option><option value="damage">آسیب</option><option value="malfunction">خرابی</option><option value="doa">خرابی اولیه (DOA)</option>
            </select>
          </div>
          <div className="space-y-2"><Label>توضیحات *</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
          <div className="space-y-2"><Label>توضیح نقص</Label><Textarea value={form.defectDescription} onChange={(e) => setForm({ ...form, defectDescription: e.target.value })} rows={2} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>انصراف</Button><Button onClick={handleCreate} disabled={!form.warrantyCardId || !form.description}>ایجاد</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CardDetail({ card, onClose }: { card: any; onClose: () => void }) {
  const [detail, setDetail] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAPI(`/warranty-cards/${card.id}`).then((r) => r.json()).then((d) => setDetail(d)).finally(() => setLoading(false))
  }, [card.id])

  const handleActivate = async () => {
    try {
      const idemKey = crypto.randomUUID()
      await fetchAPI(`/warranty-cards/${card.id}/activate`, { method: 'POST', body: '{}', headers: { 'Idempotency-Key': idemKey } })
      toast.success('گارانتی فعال شد')
      onClose()
    } catch (e) { toast.error('خطا') }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" /> {card.warrantyNumber}</DialogTitle></DialogHeader>
        {loading ? <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin" /></div> : detail && (
          <>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <Badge variant={detail.data.status === 'active' ? 'default' : 'secondary'}>{cardStatusLabels[detail.data.status] || detail.data.status}</Badge>
              {detail.data.isExpired && <Badge variant="destructive">منقضی</Badge>}
              {detail.data.isInGrace && <Badge variant="outline">در مهلت اضافی</Badge>}
              {detail.data.status === 'pending' && <Button size="sm" onClick={handleActivate}><CheckCircle className="w-4 h-4 ml-1" /> فعال‌سازی دستی</Button>}
            </div>
            <div className="space-y-2 p-3 bg-muted/30 rounded-lg text-sm">
              {detail.data.startDate && <div className="flex justify-between"><span className="text-muted-foreground">شروع:</span><span>{new Date(detail.data.startDate).toLocaleDateString('fa-IR')}</span></div>}
              {detail.data.endDate && <div className="flex justify-between"><span className="text-muted-foreground">پایان:</span><span>{new Date(detail.data.endDate).toLocaleDateString('fa-IR')}</span></div>}
              {detail.data.graceEndDate && <div className="flex justify-between"><span className="text-muted-foreground">مهلت اضافی:</span><span>{new Date(detail.data.graceEndDate).toLocaleDateString('fa-IR')}</span></div>}
              {detail.data.extendedMonths > 0 && <div className="flex justify-between"><span className="text-muted-foreground">تمدید:</span><span>{detail.data.extendedMonths} ماه</span></div>}
            </div>
            {detail.claims?.length > 0 && (
              <div><Label className="mb-2 block">ادعاها ({detail.claims.length})</Label>
                <div className="space-y-1">{detail.claims.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-2 border rounded-lg"><span className="font-mono text-xs">{c.claimNumber}</span><Badge variant="outline" className="text-xs">{claimStatusLabels[c.status] || c.status}</Badge></div>
                ))}</div>
              </div>
            )}
            <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
              <CardContent className="p-3 text-xs space-y-1">
                <div><strong>LAW-28:</strong> فعال‌سازی فقط از رویداد تحویل محموله</div>
                <div><strong>LAW-30:</strong> تایم‌لاین دستگاه از رویدادها بازسازی می‌شود</div>
              </CardContent>
            </Card>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ClaimDetail({ claim, onClose }: { onClose: () => void; claim: any }) {
  const [inspectForm, setInspectForm] = useState({ defectType: 'mechanical', defectSeverity: 'moderate', isCovered: true, inspectionNotes: '', inspectedBy: 'admin' })

  const handleInspect = async () => {
    try {
      const idemKey = crypto.randomUUID()
      await fetchAPI(`/warranty-claims/${claim.id}/inspect`, { method: 'POST', body: JSON.stringify(inspectForm), headers: { 'Idempotency-Key': idemKey } })
      toast.success('بازرسی ثبت شد (LAW-29)')
      onClose()
    } catch (e) { toast.error('خطا') }
  }
  const handleApprove = async () => {
    try {
      const idemKey = crypto.randomUUID()
      await fetchAPI(`/warranty-claims/${claim.id}/approve`, { method: 'POST', body: JSON.stringify({ approvedBy: 'admin' }), headers: { 'Idempotency-Key': idemKey } })
      toast.success('ادعا تأیید شد — Service از طریق رویداد مطلع می‌شود (LAW-25)')
      onClose()
    } catch (e) { toast.error((e as any)?.detail || 'خطا') }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Wrench className="w-5 h-5 text-primary" /> {claim.claimNumber}</DialogTitle></DialogHeader>
        <div className="flex items-center justify-between mb-4">
          <Badge variant={claim.status === 'approved' ? 'default' : claim.status === 'rejected' ? 'destructive' : 'secondary'}>{claimStatusLabels[claim.status] || claim.status}</Badge>
          <div className="flex gap-2">
            {claim.status === 'submitted' && <Button size="sm" onClick={handleInspect}><Eye className="w-4 h-4 ml-1" /> ثبت بازرسی</Button>}
            {claim.status === 'inspection' && claim.isInspected && <Button size="sm" onClick={handleApprove}><CheckCircle className="w-4 h-4 ml-1" /> تأیید</Button>}
          </div>
        </div>
        <div className="space-y-2 p-3 bg-muted/30 rounded-lg text-sm">
          <div><span className="text-muted-foreground">توضیحات:</span> {claim.description}</div>
          {claim.defectDescription && <div><span className="text-muted-foreground">نقص:</span> {claim.defectDescription}</div>}
          {claim.isInspected && <div><span className="text-muted-foreground">بازرسی:</span> {claim.defectType} / {claim.defectSeverity} / {claim.isCovered ? 'پوشش‌داده‌شده' : 'غیرپوششی'}</div>}
        </div>
        {claim.status === 'submitted' && (
          <div className="space-y-3 p-3 border rounded-lg">
            <Label>فرم بازرسی (LAW-29)</Label>
            <div className="grid grid-cols-2 gap-3">
              <select className="h-9 px-2 rounded-md border border-input bg-background text-sm" value={inspectForm.defectType} onChange={(e) => setInspectForm({ ...inspectForm, defectType: e.target.value })}>
                <option value="mechanical">مکانیکی</option><option value="electrical">الکتریکی</option><option value="cosmetic">ظاهری</option><option value="software">نرم‌افزاری</option>
              </select>
              <select className="h-9 px-2 rounded-md border border-input bg-background text-sm" value={inspectForm.defectSeverity} onChange={(e) => setInspectForm({ ...inspectForm, defectSeverity: e.target.value })}>
                <option value="minor">جزئی</option><option value="moderate">متوسط</option><option value="major">عمده</option><option value="critical">بحرانی</option>
              </select>
            </div>
            <div className="flex items-center gap-2"><input type="checkbox" checked={inspectForm.isCovered} onChange={(e) => setInspectForm({ ...inspectForm, isCovered: e.target.checked })} /><span className="text-sm">توسط گارانتی پوشش داده می‌شود</span></div>
            <Textarea placeholder="یادداشت بازرسی" value={inspectForm.inspectionNotes} onChange={(e) => setInspectForm({ ...inspectForm, inspectionNotes: e.target.value })} rows={2} />
          </div>
        )}
        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
          <CardContent className="p-3 text-xs space-y-1">
            <div><strong>LAW-29:</strong> قبل از تأیید، بازرسی فیزیکی الزامی است</div>
            <div><strong>LAW-25:</strong> تأیید ادعا → رویداد → Service (بدون فراخوانی مستقیم)</div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}
