'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Calculator, Plus, Loader2, Search, CheckCircle, BookOpen,
  Scale, Lock, FileText, TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api-client'

const API_BASE = '/api/v1'
// F-06 fix (Audit v4): use apiFetch (auto-attaches Bearer token) instead of raw fetch.
const fetchAPI = apiFetch

const statusLabels: Record<string, string> = {
  draft: 'پیش‌نویس', posted: 'ثبت‌شده', reversed: 'برگشت‌شده',
}
function formatMoney(amount: number) {
  return new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 }).format(amount) + ' ریال'
}

export function FinancialView() {
  const [tab, setTab] = useState<'entries' | 'trial-balance'>('entries')
  const [entries, setEntries] = useState<any[]>([])
  const [trialBalance, setTrialBalance] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [entryRes, tbRes] = await Promise.all([
        fetchAPI('/journal-entries').then((r) => r.json()),
        fetchAPI('/trial-balance').then((r) => r.json()),
      ])
      setEntries(entryRes.data || [])
      setTrialBalance(tbRes.data)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">هسته حسابداری</h1>
          <p className="text-muted-foreground mt-1">Sprint 6 — Financial / Accounting Core (LAW-34/35/36)</p>
        </div>
        {tab === 'entries' && <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 ml-2" /> سند حسابداری</Button>}
      </div>

      <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900">
        <CardContent className="p-3 flex items-center gap-2 text-xs flex-wrap">
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">Accounting Core:</span>
          <Badge variant="outline">LAW-34: فقط Financial سند ایجاد می‌کند</Badge>
          <Badge variant="outline">LAW-35: هر سند باید متوازن باشد</Badge>
          <Badge variant="outline">LAW-36: دوره بسته = غیرقابل تغییر</Badge>
        </CardContent>
      </Card>

      <div className="flex gap-2 border-b">
        {[
          { key: 'entries' as const, label: 'اسناد حسابداری', icon: BookOpen },
          { key: 'trial-balance' as const, label: 'تراز آزمایشی', icon: Scale },
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
      ) : tab === 'entries' ? (
        entries.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground"><Calculator className="w-12 h-12 mx-auto mb-2 opacity-30" /><p>هنوز سندی ثبت نشده است</p></CardContent></Card>
        ) : (
          <Card><CardContent className="p-0">
            <table className="w-full">
              <thead className="border-b bg-muted/30"><tr>
                <th className="text-right p-3 text-sm font-medium">شماره</th>
                <th className="text-right p-3 text-sm font-medium">تاریخ</th>
                <th className="text-right p-3 text-sm font-medium">توضیحات</th>
                <th className="text-right p-3 text-sm font-medium">بدهکار</th>
                <th className="text-right p-3 text-sm font-medium">بستانکار</th>
                <th className="text-right p-3 text-sm font-medium">منبع</th>
                <th className="text-right p-3 text-sm font-medium">وضعیت</th>
                <th className="text-right p-3 text-sm font-medium">عملیات</th>
              </tr></thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedEntry(e)}>
                    <td className="p-3 font-mono text-xs">{e.entryNumber}</td>
                    <td className="p-3 text-sm">{new Date(e.entryDate).toLocaleDateString('fa-IR')}</td>
                    <td className="p-3 text-sm truncate max-w-xs">{e.description}</td>
                    <td className="p-3 text-sm font-mono">{formatMoney(e.totalDebit)}</td>
                    <td className="p-3 text-sm font-mono">{formatMoney(e.totalCredit)}</td>
                    <td className="p-3 text-xs">{e.sourceType || '—'}</td>
                    <td className="p-3">
                      <Badge variant={e.status === 'posted' ? 'default' : e.status === 'reversed' ? 'destructive' : 'secondary'} className="text-xs">
                        {e.isBalanced ? '✓ ' : '⚠ '}{statusLabels[e.status] || e.status}
                      </Badge>
                    </td>
                    <td className="p-3"><Button size="sm" variant="ghost" onClick={(ev) => { ev.stopPropagation(); setSelectedEntry(e) }}>مشاهده</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
        )
      ) : (
        /* Trial Balance */
        trialBalance ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">کل بدهکار</div><div className="text-xl font-bold font-mono">{formatMoney(trialBalance.summary.totalDebit)}</div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">کل بستانکار</div><div className="text-xl font-bold font-mono">{formatMoney(trialBalance.summary.totalCredit)}</div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">مغایرت</div><div className={`text-xl font-bold font-mono ${trialBalance.summary.difference < 0.01 ? 'text-emerald-600' : 'text-red-600'}`}>{trialBalance.summary.difference < 0.01 ? 'صفر ✓' : formatMoney(trialBalance.summary.difference)}</div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">تعداد حساب‌ها</div><div className="text-xl font-bold">{trialBalance.summary.accountCount}</div></CardContent></Card>
            </div>
            {trialBalance.accounts.length > 0 ? (
              <Card><CardContent className="p-0">
                <table className="w-full">
                  <thead className="border-b bg-muted/30"><tr>
                    <th className="text-right p-3 text-sm font-medium">کد</th>
                    <th className="text-right p-3 text-sm font-medium">نام حساب</th>
                    <th className="text-right p-3 text-sm font-medium">نوع</th>
                    <th className="text-right p-3 text-sm font-medium">بدهکار</th>
                    <th className="text-right p-3 text-sm font-medium">بستانکار</th>
                    <th className="text-right p-3 text-sm font-medium">مانده</th>
                  </tr></thead>
                  <tbody>
                    {trialBalance.accounts.map((a: any, i: number) => (
                      <tr key={i} className="border-b hover:bg-muted/30">
                        <td className="p-3 font-mono text-xs">{a.accountCode}</td>
                        <td className="p-3 text-sm">{a.accountName}</td>
                        <td className="p-3"><Badge variant="outline" className="text-xs">{a.accountType}</Badge></td>
                        <td className="p-3 text-sm font-mono">{formatMoney(a.totalDebit)}</td>
                        <td className="p-3 text-sm font-mono">{formatMoney(a.totalCredit)}</td>
                        <td className="p-3 text-sm font-mono font-bold">{formatMoney(a.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 bg-muted/30">
                    <tr>
                      <td colSpan={3} className="p-3 font-bold">جمع کل</td>
                      <td className="p-3 font-bold font-mono">{formatMoney(trialBalance.summary.totalDebit)}</td>
                      <td className="p-3 font-bold font-mono">{formatMoney(trialBalance.summary.totalCredit)}</td>
                      <td className="p-3 font-bold font-mono">{trialBalance.summary.difference < 0.01 ? '✓ صفر' : formatMoney(trialBalance.summary.difference)}</td>
                    </tr>
                  </tfoot>
                </table>
              </CardContent></Card>
            ) : (
              <Card><CardContent className="p-8 text-center text-muted-foreground"><Scale className="w-12 h-12 mx-auto mb-2 opacity-30" /><p>هنوز سند ثبت‌شده‌ای وجود ندارد</p></CardContent></Card>
            )}
          </div>
        ) : null
      )}

      {showForm && <CreateEntryForm onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); load() }} />}
      {selectedEntry && <EntryDetail entry={selectedEntry} onClose={() => { setSelectedEntry(null); load() }} />}
    </div>
  )
}

function CreateEntryForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    entryDate: new Date().toISOString().split('T')[0],
    description: '',
    lines: [
      { accountId: '', debitAmount: '0', creditAmount: '0', description: '' },
      { accountId: '', debitAmount: '0', creditAmount: '0', description: '' },
    ],
  })
  const [accounts, setAccounts] = useState<any[]>([])

  useEffect(() => {
    fetchAPI('/chart-of-accounts').then((r) => r.json()).then((d) => setAccounts(d.data || [])).catch(() => {})
  }, [])

  const totalDebit = form.lines.reduce((s, l) => s + (parseFloat(l.debitAmount) || 0), 0)
  const totalCredit = form.lines.reduce((s, l) => s + (parseFloat(l.creditAmount) || 0), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01

  const handleCreate = async () => {
    if (!isBalanced) { toast.error('سند متوازن نیست (LAW-35)'); return }
    try {
      await fetchAPI('/journal-entries', {
        method: 'POST', body: JSON.stringify({
          entryDate: form.entryDate, description: form.description,
          lines: form.lines.map(l => ({ accountId: l.accountId, debitAmount: parseFloat(l.debitAmount) || 0, creditAmount: parseFloat(l.creditAmount) || 0, description: l.description })),
          autoPost: true, postedBy: 'admin',
        }),
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      })
      toast.success('سند حسابداری ایجاد و ثبت شد')
      onCreated()
    } catch (e) { toast.error('خطا') }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader><DialogTitle>سند حسابداری جدید</DialogTitle><DialogDescription>LAW-35: سند باید متوازن باشد</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>تاریخ *</Label><Input type="date" value={form.entryDate} onChange={(e) => setForm({ ...form, entryDate: e.target.value })} /></div>
            <div className="space-y-2"><Label>توضیحات *</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <div>
            <Label className="mb-2 block">ردیف‌های سند</Label>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {form.lines.map((line, i) => (
                <div key={i} className="flex gap-2 items-end p-2 border rounded-lg">
                  <div className="flex-1">
                    <select className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm" value={line.accountId} onChange={(e) => { const updated = [...form.lines]; updated[i] = { ...line, accountId: e.target.value }; setForm({ ...form, lines: updated }) }}>
                      <option value="">انتخاب حساب...</option>
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.accountCode} - {a.accountName}</option>)}
                    </select>
                  </div>
                  <div className="w-28"><Input type="number" className="h-9" placeholder="بدهکار" value={line.debitAmount} onChange={(e) => { const updated = [...form.lines]; updated[i] = { ...line, debitAmount: e.target.value, creditAmount: '0' }; setForm({ ...form, lines: updated }) }} /></div>
                  <div className="w-28"><Input type="number" className="h-9" placeholder="بستانکار" value={line.creditAmount} onChange={(e) => { const updated = [...form.lines]; updated[i] = { ...line, creditAmount: e.target.value, debitAmount: '0' }; setForm({ ...form, lines: updated }) }} /></div>
                </div>
              ))}
            </div>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => setForm({ ...form, lines: [...form.lines, { accountId: '', debitAmount: '0', creditAmount: '0', description: '' }] })}><Plus className="w-3 h-3 ml-1" /> ردیف جدید</Button>
          </div>
          <div className="flex justify-between p-3 bg-muted/30 rounded-lg">
            <div><span className="text-sm text-muted-foreground">بدهکار: </span><span className="font-mono font-bold">{formatMoney(totalDebit)}</span></div>
            <div><span className="text-sm text-muted-foreground">بستانکار: </span><span className="font-mono font-bold">{formatMoney(totalCredit)}</span></div>
            <div><span className="text-sm text-muted-foreground">مغایرت: </span><span className={`font-mono font-bold ${isBalanced ? 'text-emerald-600' : 'text-red-600'}`}>{isBalanced ? '✓ صفر' : formatMoney(Math.abs(totalDebit - totalCredit))}</span></div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>انصراف</Button><Button onClick={handleCreate} disabled={!isBalanced || !form.description}>ایجاد و ثبت</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EntryDetail({ entry, onClose }: { entry: any; onClose: () => void }) {
  const [detail, setDetail] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAPI(`/journal-entries/${entry.id}`).then((r) => r.json()).then((d) => setDetail(d)).finally(() => setLoading(false))
  }, [entry.id])

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Calculator className="w-5 h-5 text-primary" /> {entry.entryNumber}</DialogTitle></DialogHeader>
        {loading ? <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin" /></div> : detail && (
          <>
            <div className="flex items-center justify-between mb-4">
              <Badge variant={detail.data.status === 'posted' ? 'default' : 'secondary'}>{statusLabels[detail.data.status] || detail.data.status}</Badge>
              <Badge variant={detail.data.isBalanced ? 'default' : 'destructive'}>{detail.data.isBalanced ? '✓ متوازن' : '⚠ نامتوازن'}</Badge>
            </div>
            <div className="text-sm text-muted-foreground mb-4">{detail.data.description}</div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="border-b bg-muted/30"><tr>
                  <th className="text-right p-2 text-xs font-medium">#</th>
                  <th className="text-right p-2 text-xs font-medium">حساب</th>
                  <th className="text-right p-2 text-xs font-medium">بدهکار</th>
                  <th className="text-right p-2 text-xs font-medium">بستانکار</th>
                </tr></thead>
                <tbody>
                  {detail.lines.map((l: any) => (
                    <tr key={l.id} className="border-b">
                      <td className="p-2 text-xs">{l.lineNumber}</td>
                      <td className="p-2 text-sm"><div className="font-medium">{l.accountName}</div><div className="text-xs text-muted-foreground font-mono">{l.accountCode}</div></td>
                      <td className="p-2 text-sm font-mono">{l.debitAmount > 0 ? formatMoney(l.debitAmount) : '—'}</td>
                      <td className="p-2 text-sm font-mono">{l.creditAmount > 0 ? formatMoney(l.creditAmount) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 bg-muted/30"><tr>
                  <td colSpan={2} className="p-2 font-bold text-sm">جمع</td>
                  <td className="p-2 font-bold font-mono text-sm">{formatMoney(detail.data.totalDebit)}</td>
                  <td className="p-2 font-bold font-mono text-sm">{formatMoney(detail.data.totalCredit)}</td>
                </tr></tfoot>
              </table>
            </div>
            <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
              <CardContent className="p-3 text-xs space-y-1">
                <div><strong>LAW-34:</strong> این سند فقط توسط Financial Context ایجاد شده است</div>
                <div><strong>LAW-35:</strong> جمع بدهکار = جمع بستانکار (متوازن)</div>
                <div><strong>LAW-36:</strong> اگر دوره مالی بسته باشد، ثبت ممکن نیست</div>
              </CardContent>
            </Card>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
