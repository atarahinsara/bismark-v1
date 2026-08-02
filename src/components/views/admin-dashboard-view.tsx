'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, Users, Shield, Activity, Monitor, UserCheck, UserX, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface Stats {
  totalUsers: number
  activeUsers: number
  pendingUsers: number
  lockedUsers: number
  totalRoles: number
  totalPermissions: number
  activeSessions: number
  auditLogCount: number
}

interface RecentUser {
  id: string
  username: string
  displayName: string
  email: string | null
  status: string
  createdAt: string
}

interface RecentLog {
  id: string
  action: string
  entityType: string
  ipAddress: string | null
  createdAt: string
  userId: string | null
}

export function AdminDashboardView() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([])
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const token = localStorage.getItem('bismark_access_token')
      const res = await fetch('/api/v1/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) {
        setStats(data.stats)
        setRecentUsers(data.recentUsers || [])
        setRecentLogs(data.recentLogs || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!stats) {
    return <div className="text-center text-muted-foreground py-8">دریافت آمار ناموفق بود</div>
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="کل کاربران"
          value={stats.totalUsers}
          color="text-blue-600"
          bg="bg-blue-500/10"
        />
        <StatCard
          icon={<UserCheck className="h-5 w-5" />}
          label="کاربران فعال"
          value={stats.activeUsers}
          color="text-emerald-600"
          bg="bg-emerald-500/10"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="در انتظار تأیید"
          value={stats.pendingUsers}
          color="text-amber-600"
          bg="bg-amber-500/10"
        />
        <StatCard
          icon={<UserX className="h-5 w-5" />}
          label="قفل‌شده"
          value={stats.lockedUsers}
          color="text-red-600"
          bg="bg-red-500/10"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Shield className="h-5 w-5" />}
          label="کل نقش‌ها"
          value={stats.totalRoles}
          color="text-purple-600"
          bg="bg-purple-500/10"
        />
        <StatCard
          icon={<Shield className="h-5 w-5" />}
          label="کل دسترسی‌ها"
          value={stats.totalPermissions}
          color="text-indigo-600"
          bg="bg-indigo-500/10"
        />
        <StatCard
          icon={<Monitor className="h-5 w-5" />}
          label="نشست‌های فعال"
          value={stats.activeSessions}
          color="text-cyan-600"
          bg="bg-cyan-500/10"
        />
        <StatCard
          icon={<Activity className="h-5 w-5" />}
          label="لاگ‌های ممیزی"
          value={stats.auditLogCount}
          color="text-orange-600"
          bg="bg-orange-500/10"
        />
      </div>

      {/* Recent Users + Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Users */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                کاربران اخیر
              </CardTitle>
              <Link href="/admin/users">
                <Button variant="ghost" size="sm">همه</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">هیچ کاربری موجود نیست</p>
            ) : (
              <div className="space-y-2">
                {recentUsers.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 rounded-lg border p-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {u.displayName?.charAt(0) || u.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{u.displayName || u.username}</div>
                      <div className="text-xs text-muted-foreground truncate">{u.email || u.username}</div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        u.status === 'active' ? 'text-emerald-600' :
                        u.status === 'pending' ? 'text-amber-600' :
                        u.status === 'locked' ? 'text-red-600' : ''
                      }
                    >
                      {u.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                فعالیت‌های اخیر
              </CardTitle>
              <Link href="/admin/audit-logs">
                <Button variant="ghost" size="sm">همه</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">هیچ فعالیتی ثبت نشده است</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 rounded-lg border p-2">
                    <Activity className="h-3.5 w-3.5 mt-1 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">
                        <span className="font-medium">{log.action}</span>
                        <span className="text-muted-foreground"> — {log.entityType}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        {log.ipAddress && <span>{log.ipAddress}</span>}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(log.createdAt).toLocaleString('fa-IR')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color, bg }: { icon: React.ReactNode; label: string; value: number; color: string; bg: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-2xl font-bold mt-1">{value}</span>
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg} ${color}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
