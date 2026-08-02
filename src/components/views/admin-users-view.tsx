'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users, Search, ChevronLeft, ChevronRight, Shield, Mail, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface User {
  id: string
  username: string
  displayName: string
  email: string | null
  status: string
  isActive: boolean
  userType: string
  lastLoginAt: string | null
  emailVerifiedAt: string | null
  createdAt: string
  userRoles: { role: { key: string; name: string } }[]
}

export function AdminUsersView() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('bismark_access_token')
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      params.set('page', String(page))
      params.set('limit', '20')

      const res = await fetch(`/api/v1/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) {
        setUsers(data.users || [])
        setTotal(data.pagination?.total || 0)
        setTotalPages(data.pagination?.totalPages || 1)
      } else {
        toast.error(data.error || 'خطا در دریافت کاربران')
      }
    } catch {
      toast.error('خطای شبکه')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, page])

  useEffect(() => {
    const timer = setTimeout(fetchUsers, 300)
    return () => clearTimeout(timer)
  }, [fetchUsers])

  function getStatusBadge(status: string) {
    const colors: Record<string, string> = {
      active: 'text-emerald-600 border-emerald-500/30',
      pending: 'text-amber-600 border-amber-500/30',
      locked: 'text-red-600 border-red-500/30',
      suspended: 'text-orange-600 border-orange-500/30',
    }
    return <Badge variant="outline" className={colors[status] || ''}>{status}</Badge>
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
                placeholder="جستجوی نام کاربری، ایمیل، نام..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-10"
              />
            </div>
            <div className="flex gap-1">
              {['', 'active', 'pending', 'locked', 'suspended'].map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={statusFilter === s ? 'default' : 'outline'}
                  onClick={() => { setStatusFilter(s); setPage(1) }}
                >
                  {s === '' ? 'همه' : s === 'active' ? 'فعال' : s === 'pending' ? 'در انتظار' : s === 'locked' ? 'قفل‌شده' : 'معلق'}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            کاربران ({total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>هیچ کاربری یافت نشد</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>کاربر</TableHead>
                      <TableHead>ایمیل</TableHead>
                      <TableHead>نقش‌ها</TableHead>
                      <TableHead>وضعیت</TableHead>
                      <TableHead>آخرین ورود</TableHead>
                      <TableHead>تاریخ ثبت</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                              {u.displayName?.charAt(0) || u.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium">{u.displayName || u.username}</div>
                              <div className="text-xs text-muted-foreground">@{u.username}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {u.email ? (
                            <span className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              {u.email}
                              {u.emailVerifiedAt && <span className="text-emerald-500">✓</span>}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {u.userRoles?.map((ur, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                <Shield className="h-2.5 w-2.5 ml-1" />
                                {ur.role.name}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(u.status)}</TableCell>
                        <TableCell>
                          {u.lastLoginAt ? (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {new Date(u.lastLoginAt).toLocaleDateString('fa-IR')}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">هرگز</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(u.createdAt).toLocaleDateString('fa-IR')}
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
                    صفحه {page} از {totalPages} — {total} کاربر
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
