import { verifyToken, extractBearerToken } from '@/lib/auth/jwt'
import { db } from '@/lib/db'

export interface AdminAuthContext {
  userId: string
  tenantId: string
  sessionId: string
  userType: string
  username: string
  roles: string[]
}

export async function getAdminAuth(req: Request): Promise<AdminAuthContext | null> {
  const authHeader = req.headers.get('authorization')
  const token = extractBearerToken(authHeader)
  if (!token) return null

  const payload = verifyToken(token)
  if (!payload) return null

  // Verify session is still active
  const session = await db.session.findFirst({
    where: { id: payload.sessionId, status: 'active' },
    select: { id: true },
  }).catch(() => null)

  if (!session) return null

  return {
    userId: payload.sub,
    tenantId: payload.tenantId,
    sessionId: payload.sessionId,
    userType: payload.userType,
    username: payload.username,
    roles: payload.roles,
  }
}
