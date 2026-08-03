/**
 * BISMARK ERP — Audit Log Helper
 * 
 * Wraps API route handlers to automatically log all actions.
 * Usage:
 *   export const POST = withAudit('auth.login', 'auth', (req, ctx) => { ... })
 */

import { db } from '@/lib/db'
import type { NextRequest } from 'next/server'

export interface AuditContext {
  userId?: string
  tenantId?: string
  sessionId?: string
  ipAddress?: string
  userAgent?: string
}

/**
 * Log an audit event.
 */
export async function logAudit(params: {
  tenantId: string
  userId?: string
  action: string
  entityType: string
  entityId: string
  entityCode?: string
  changes?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  sessionId?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        entityCode: params.entityCode || null,
        changes: params.changes || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        sessionId: params.sessionId || null,
        metadata: params.metadata || {},
      },
    })
  } catch (err) {
    // Don't fail the request if audit logging fails
    console.error('[audit] Failed to log:', err)
  }
}

/**
 * Extract IP and user agent from request.
 */
export function getRequestInfo(req: NextRequest | Request): { ipAddress: string; userAgent: string } {
  const headers = new Headers(req.headers)
  return {
    ipAddress: headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               headers.get('x-real-ip') || 
               'unknown',
    userAgent: headers.get('user-agent') || 'unknown',
  }
}
