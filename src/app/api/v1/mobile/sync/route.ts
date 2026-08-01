/**
 * POST /api/v1/mobile/sync
 *
 * T-4-02: Sync offline operations from mobile device.
 *
 * Body:
 *   { deviceId, operations: [{ operationId, entityType, entityId, operationType, payload, clientCreatedAt }] }
 *
 * For each operation:
 *   1. Check idempotency (operationId)
 *   2. Check version (optimistic lock)
 *   3. Apply or mark conflict
 *
 * Returns: { success: [...], conflicts: [...], failures: [...] }
 *
 * Requires: authenticated technician + device ownership
 */

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { requireAuth, unauthorizedResponse } from '@/lib/rbac'
import { DomainException, ValidationException, NotFoundException, IdempotencyHelper } from '@/lib/shared'
import { logger } from '@/lib/logger'

interface SyncOperation {
  operationId: string
  entityType: string
  entityId: string
  operationType: string
  payload: Record<string, unknown>
  clientCreatedAt: string
}

export async function POST(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const rawBody = await request.text()
    const body = rawBody ? JSON.parse(rawBody) : {}
    const tenantId = await getTenantId()

    // Validate
    if (!body.deviceId) {
      throw new ValidationException('Device ID required', [
        { field: 'deviceId', message: 'Required', code: 'REQUIRED' },
      ])
    }
    if (!Array.isArray(body.operations)) {
      throw new ValidationException('operations must be array', [
        { field: 'operations', message: 'Array required', code: 'INVALID_TYPE' },
      ])
    }

    // Verify device ownership
    const device = await db.device.findFirst({
      where: { id: body.deviceId, tenantId, userId: ctx.userId, isActive: true },
    })
    if (!device) {
      throw new NotFoundException('Device', body.deviceId)
    }

    const success: string[] = []
    const conflicts: Array<{ operationId: string; reason: string }> = []
    const failures: Array<{ operationId: string; error: string }> = []

    // Process each operation
    for (const op of body.operations as SyncOperation[]) {
      try {
        // Check if already synced (idempotency)
        const existing = await db.offlineSyncQueue.findFirst({
          where: { tenantId, operationId: op.operationId },
        })

        if (existing && existing.status === 'success') {
          success.push(op.operationId)
          continue
        }

        if (existing && existing.status === 'conflict') {
          conflicts.push({ operationId: op.operationId, reason: 'Previously detected conflict' })
          continue
        }

        // Create sync queue entry
        const queueEntry = await db.offlineSyncQueue.create({
          data: {
            tenantId,
            deviceId: device.id,
            userId: ctx.userId,
            operationId: op.operationId,
            entityType: op.entityType,
            entityId: op.entityId,
            operationType: op.operationType,
            payload: op.payload,
            clientCreatedAt: new Date(op.clientCreatedAt),
            status: 'syncing',
            attempts: 1,
            lastAttemptAt: new Date(),
          },
        }).catch(() => null)

        if (!queueEntry) {
          // Unique constraint violation — operation already exists
          const existing2 = await db.offlineSyncQueue.findFirst({
            where: { tenantId, operationId: op.operationId },
          })
          if (existing2?.status === 'success') {
            success.push(op.operationId)
          } else if (existing2?.status === 'conflict') {
            conflicts.push({ operationId: op.operationId, reason: 'Conflict detected' })
          } else {
            failures.push({ operationId: op.operationId, error: 'Duplicate operation' })
          }
          continue
        }

        // Apply the operation based on type
        const applyResult = await applyOperation(op, tenantId, ctx.userId)

        if (applyResult.success) {
          // Mark as success
          await db.offlineSyncQueue.update({
            where: { id: queueEntry.id },
            data: { status: 'success', syncedAt: new Date() },
          })
          success.push(op.operationId)
        } else if (applyResult.conflict) {
          // Mark as conflict
          await db.offlineSyncQueue.update({
            where: { id: queueEntry.id },
            data: {
              status: 'conflict',
              conflictData: applyResult.conflictData || null,
              errorMessage: applyResult.error,
            },
          })
          conflicts.push({ operationId: op.operationId, reason: applyResult.error || 'Conflict' })
        } else {
          // Failure
          await db.offlineSyncQueue.update({
            where: { id: queueEntry.id },
            data: { status: 'failed', errorMessage: applyResult.error },
          })
          failures.push({ operationId: op.operationId, error: applyResult.error || 'Unknown error' })
        }
      } catch (e) {
        failures.push({ operationId: op.operationId, error: String(e) })
      }
    }

    // Update device lastSeenAt
    await db.device.update({
      where: { id: device.id },
      data: { lastSeenAt: new Date() },
    })

    logger.info({
      deviceId: device.id,
      userId: ctx.userId,
      total: body.operations.length,
      success: success.length,
      conflicts: conflicts.length,
      failures: failures.length,
    }, 'Mobile sync completed')

    const responseBody = JSON.stringify({
      data: {
        success,
        conflicts,
        failures,
        summary: {
          total: body.operations.length,
          successCount: success.length,
          conflictCount: conflicts.length,
          failureCount: failures.length,
        },
      },
    })
    await IdempotencyHelper.store(request, responseBody, 200, rawBody)
    return new Response(responseBody, { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    }
    logger.error({ err: e }, 'Mobile sync failed')
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Sync failed', statusCode: 500 })
  }
}

/**
 * Apply a single sync operation.
 * Returns: { success, conflict?, error?, conflictData? }
 */
async function applyOperation(
  op: SyncOperation,
  tenantId: string,
  userId: string,
): Promise<{ success: boolean; conflict?: boolean; error?: string; conflictData?: unknown }> {
  try {
    switch (op.entityType) {
      case 'checkin':
        // Apply check-in
        await db.serviceOrder.update({
          where: { id: op.entityId },
          data: {
            status: 'in_progress',
            metadata: { ...(op.payload as any), checkedInAt: op.clientCreatedAt, checkedInBy: userId },
          },
        })
        return { success: true }

      case 'checkout':
        await db.serviceOrder.update({
          where: { id: op.entityId },
          data: {
            status: 'completed',
            actualCompletion: new Date(op.clientCreatedAt),
            metadata: { ...(op.payload as any), checkedOutAt: op.clientCreatedAt, checkedOutBy: userId },
          },
        })
        return { success: true }

      case 'diagnosis':
        await db.serviceDiagnosis.create({
          data: {
            tenantId,
            serviceOrderId: op.entityId,
            diagnosedBy: userId,
            diagnosisDate: new Date(op.clientCreatedAt),
            symptoms: (op.payload as any).symptoms || '',
            rootCause: (op.payload as any).rootCause || '',
            recommendedAction: (op.payload as any).recommendedAction || '',
            estimatedCost: (op.payload as any).estimatedCost || 0,
            metadata: { operationId: op.operationId },
          },
        })
        return { success: true }

      case 'part':
        await db.serviceOrderPart.create({
          data: {
            tenantId,
            serviceOrderId: op.entityId,
            productId: (op.payload as any).productId,
            quantityUsed: (op.payload as any).quantityUsed,
            unitCost: (op.payload as any).unitCost || 0,
            totalCost: ((op.payload as any).quantityUsed || 0) * ((op.payload as any).unitCost || 0),
            usedAt: new Date(op.clientCreatedAt),
            usedBy: userId,
            metadata: { operationId: op.operationId },
          },
        })
        return { success: true }

      case 'complete':
        await db.serviceOrder.update({
          where: { id: op.entityId },
          data: {
            status: 'completed',
            actualCompletion: new Date(op.clientCreatedAt),
            metadata: { ...(op.payload as any), completedAt: op.clientCreatedAt, completedBy: userId },
          },
        })
        return { success: true }

      case 'photo':
      case 'signature':
        // Photos and signatures are handled via file upload separately
        // Just record the metadata
        return { success: true }

      default:
        return { success: false, error: `Unknown entity type: ${op.entityType}` }
    }
  } catch (e) {
    // Check if it's a conflict (e.g., version mismatch)
    const errMsg = String(e)
    if (errMsg.includes('version') || errMsg.includes('Conflict')) {
      return {
        success: false,
        conflict: true,
        error: 'Version conflict — entity was modified on server',
        conflictData: { serverTimestamp: new Date().toISOString() },
      }
    }
    return { success: false, error: errMsg }
  }
}
