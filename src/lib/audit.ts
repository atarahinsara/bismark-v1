/**
 * RT-HIGH-005: Audit Log Service
 *
 * Immutable audit trail for all sensitive operations.
 * Enforcement: INSERT + SELECT only. No UPDATE or DELETE.
 *
 * The AuditLog table records:
 *   - Who (userId, ipAddress, userAgent)
 *   - What (action, entityType, entityId, changes)
 *   - When (createdAt)
 *   - Where (tenantId, sessionId)
 *   - Why (correlationId for tracing — LAW-61)
 *
 * Usage:
 *   import { auditLog } from '@/lib/audit'
 *   await auditLog.record({
 *     tenantId, userId, action: 'issue', entityType: 'Invoice',
 *     entityId: invoice.id, entityCode: invoice.invoiceNumber,
 *     changes: { before: { status: 'draft' }, after: { status: 'issued' } },
 *     ipAddress, userAgent, correlationId,
 *   })
 */

import { db } from '@/lib/db'

export interface AuditLogInput {
  tenantId: string
  userId?: string
  action: string
  entityType: string
  entityId: string
  entityCode?: string
  changes?: { before?: any; after?: any }
  ipAddress?: string
  userAgent?: string
  correlationId?: string
  sessionId?: string
  metadata?: any
}

class AuditLogService {
  /**
   * Record an audit log entry. INSERT only — cannot be updated or deleted.
   */
  async record(input: AuditLogInput): Promise<void> {
    await db.auditLog.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        entityCode: input.entityCode ?? null,
        changes: input.changes ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        correlationId: input.correlationId ?? null,
        sessionId: input.sessionId ?? null,
        metadata: input.metadata ?? null,
      },
    })
  }

  /**
   * Query audit logs. SELECT only.
   */
  async list(filters: {
    tenantId: string
    entityType?: string
    entityId?: string
    userId?: string
    action?: string
    startTime?: Date
    endTime?: Date
    page?: number
    perPage?: number
  }): Promise<{ data: any[]; total: number }> {
    const page = Math.max(1, filters.page ?? 1)
    const perPage = Math.min(100, Math.max(1, filters.perPage ?? 20))

    const where = {
      tenantId: filters.tenantId,
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
      ...(filters.entityId ? { entityId: filters.entityId } : {}),
      ...(filters.userId ? { userId: filters.userId } : {}),
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.startTime || filters.endTime ? {
        createdAt: {
          ...(filters.startTime ? { gte: filters.startTime } : {}),
          ...(filters.endTime ? { lte: filters.endTime } : {}),
        },
      } : {}),
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      db.auditLog.count({ where }),
    ])

    return { data: logs, total }
  }

  /**
   * Get audit trail for a specific entity.
   */
  async getEntityTrail(tenantId: string, entityType: string, entityId: string): Promise<any[]> {
    return db.auditLog.findMany({
      where: { tenantId, entityType, entityId },
      orderBy: { createdAt: 'asc' },
    })
  }

  /**
   * IMMUTABILITY ENFORCEMENT: These methods intentionally throw.
   * Audit logs can NEVER be updated or deleted.
   */
  async update(): Promise<never> {
    throw new Error('AUDIT_LOG_IMMUTABLE: Audit logs cannot be updated (RT-HIGH-005)')
  }

  async delete(): Promise<never> {
    throw new Error('AUDIT_LOG_IMMUTABLE: Audit logs cannot be deleted (RT-HIGH-005)')
  }

  async deleteMany(): Promise<never> {
    throw new Error('AUDIT_LOG_IMMUTABLE: Audit logs cannot be deleted (RT-HIGH-005)')
  }
}

export const auditLog = new AuditLogService()
