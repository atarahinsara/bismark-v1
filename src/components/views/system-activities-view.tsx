'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, Trash2, Eye, Search, Activity, Globe, Clock, User, Monitor, Smartphone, Tablet } from 'lucide-react'
import { toast } from 'sonner'

interface ActivityLog {
  id: string
  action: string
  entityType: string
  entityId: string
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  userId: string | null
  user?: { username: string; displayName: string } | null
}

export function SystemActivitiesView() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('bismark_access_token')
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      params.set('page', String(page))
      params.set('limit', '20')
      const res = await fetch(`/api/v1/admin/audit-logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) {
        setLogs(data.logs || [])
        setTotal(data.pagination?.total || 0)
        setTotalPages(data.pagination?.totalPages || 1)
      }
    } catch {
      toast.error('خطا در دریافت فعالیت‌ها')
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => {
    const timer = setTimeout(fetchLogs, 300)
    return () => clearTimeout(timer)
  }, [fetchLogs])

  function parseUserAgent(ua: string | null) {
    if (!ua) return { browser: 'Unknown', os: 'Unknown', icon: <Monitor className="h-4 w-4" /> }
    let browser = 'Unknown', os = 'Unknown'
    if (ua.includes('Firefox')) browser = 'Firefox'
    else if (ua.includes('Edg')) browser = 'Edge'
    else if (ua.includes('Chrome')) browser = 'Chrome'
    else if (ua.includes('Safari')) browser = 'Safari'
    if (ua.includes('Windows')) os = 'Windows'
    else if (ua.includes('Mac OS')) os = 'macOS'
    else if (ua.includes('Linux')) os = 'Linux'
    else if (ua.includes('Android')) os = 'Android'
    else if (ua.includes('iOS') || ua.includes('iPhone')) os = 'iOS'
    const isMobile = ua.includes('Mobile')
    const isTablet = ua.includes('Tablet') || ua.includes('iPad')
    const icon = isMobile ? <Smartphone className="h-4 w-4" /> : isTablet ? <Tablet className="h-4 w-4" /> : <Monitor className="h-4 w-4" />
    return { browser, os, icon }
  }

  function getActionColor(action: string) {
    if (action.includes('login') || action.includes('register')) return 'text-emerald-600 border-emerald-500/30'
    if (action.includes('delete') || action.includes('cancel')) return 'text-red-600 border-red-500/30'
    if (action.includes('update') || action.includes('change')) return 'text-blue-600 border-blue-500/30'
    if (action.includes('verify')) return 'text-purple-600 border-purple-500/30'
    return 'text-muted-foreground'
  }

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          <h2 className="text-lg font-semibold">لیست فعالیت‌های سیستم</h2>
        </div>
        {selected.size > 0 && (
          <Button variant="outline" size="sm" className="text-red-600 border-red-500/30" onClick={() => { setLogs(l => l.filter(x => !selected.has(x.id))); setSelected(new Set()); toast.success('حذف شد') }}>
            <Trash2 className="h-4 w-4" /> حذف موارد انتخاب‌شده ({selected.size})
          </Button>
        )}
      </div>
      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="جستجو بر اساس مرورگر، IP، عملیات..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pr-10" />
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : logs.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <Activity className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm text-muted-foreground">هیچ فعالیتی ثبت نشده است</p>
          <p className="text-xs text-muted-foreground mt-1">فعالیت‌های کاربران (ورود، ثبت‌نام، تغییرات) اینجا نمایش داده می‌شوند</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const ua = parseUserAgent(log.userAgent)
            return (
              <div key={log.id} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/30 transition-colors">
                <input type="checkbox" checked={selected.has(log.id)} onChange={() => toggleSelect(log.id)} className="h-4 w-4 rounded border-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {ua.icon}
                    <span className="text-sm font-medium truncate">{ua.browser} on {ua.os}</span>
                    <Badge variant="outline" className={`text-xs ${getActionColor(log.action)}`}>{log.action}</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {log.ipAddress && <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{log.ipAddress}</span>}
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(log.createdAt).toLocaleString('fa-IR')}</span>
                    <span className="flex items-center gap-1"><User className="h-3 w-3" />{log.user?.username || log.userId?.slice(0, 8) || 'سیستم'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><Eye className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>صفحه {page} از {totalPages} — {total} فعالیت</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>قبلی</Button>
            <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>بعدی</Button>
          </div>
        </div>
      )}
    </div>
  )
}
