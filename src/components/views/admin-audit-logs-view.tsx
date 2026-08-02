'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Activity, Search, ChevronLeft, ChevronRight, Clock, Globe } from 'lucide-react'
import { toast } from 'sonner'

interface AuditLog {
  id: string
  action: string
  entityType: string
  entityId: string
  ipAddress: string | null
  userAgent: string | null
  metadata: unknown
  createdAt: string
  userId: string | null
}

export function AdminAuditLogsView() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('bismark_access_token')
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      params.set('page', String(page))
      params.set('limit', '50')

      const res = await fetch(`/api/v1/admin/audit-logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) {
        setLogs(data.logs || [])
        setTotal(data.pagination?.total || 0)
        setTotalPages(data.pagination?.totalPages || 1)
      } else {
        toast.error(data.error || 'خطا در دریافت لاگ‌ها')
      }
    } catch {
      toast.error('خطای شبکه')
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => {
    const timer = setTimeout(fetchLogs, 300)
    return () => clearTimeout(timer)
  }, [fetchLogs])

  function getActionColor(action: string) {
    if (action.includes('create') || action.includes('activate')) return 'text-emerald-600 border-emerald-500/30'
    if (action.includes('delete') || action.includes('cancel')) return 'text-red-600 border-red-500/30'
    if (action.includes('update') || action.includes('change')) return 'text-blue-600 border-blue-500/30'
    if (action.includes('approve') || action.includes('issue')) return 'text-purple-600 border-purple-500/30'
    return 'text-muted-foreground'
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="جستجوی عملیات، ماژول..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => { setSearch(''); setPage(1) }}>
              پاک کردن فیلتر
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            لاگ‌های ممیزی ({total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>هیچ لاگی یافت نشد</p>
              <p className="text-xs mt-1">فعالیت‌های کاربران در سیستم اینجا ثبت می‌شوند</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>عملیات</TableHead>
                      <TableHead>ماژول</TableHead>
                      <TableHead>شناسه موجودی</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>زمان</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Badge variant="outline" className={getActionColor(log.action)}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-medium">{log.entityType}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{log.entityId.slice(0, 12)}...</TableCell>
                        <TableCell>
                          {log.ipAddress ? (
                            <span className="flex items-center gap-1 text-xs">
                              <Globe className="h-3 w-3 text-muted-foreground" />
                              {log.ipAddress}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(log.createdAt).toLocaleString('fa-IR')}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-muted-foreground">
                    صفحه {page} از {totalPages} — {total} لاگ
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                      قبلی
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      بعدی
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
