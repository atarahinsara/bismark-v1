import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * GET /api/v1/cycle-counts/{id}
 * Show cycle count with all lines (including computed variance).
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'inventory.cycle_count')

    const tenantId = await getTenantId()
    const count = await db.cycleCount.findFirst({
      where: { id: params.id, tenantId, deletedAt: null },
      include: { lines: true },
    })
    if (!count) throw new NotFoundException('CycleCount', params.id)

    return jsonResponse({ data: { ...toDTO(count), lines: count.lines.map(lineToDTO) } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to fetch cycle count', statusCode: 500 })
  }
}

function toDTO(count: any) {
  return {
    id: count.id,
    countNumber: count.countNumber,
    warehouseId: count.warehouseId,
    countType: count.countType,
    status: count.status,
    scheduledDate: count.scheduledDate.toISOString(),
    startedAt: count.startedAt?.toISOString() ?? null,
    completedAt: count.completedAt?.toISOString() ?? null,
    approvedAt: count.approvedAt?.toISOString() ?? null,
    adjustedAt: count.adjustedAt?.toISOString() ?? null,
    notes: count.notes,
    version: count.version,
  }
}

function lineToDTO(line: any) {
  const variance = line.countedQuantity !== null
    ? line.countedQuantity - line.systemQuantity
    : null
  return {
    id: line.id,
    stockItemId: line.stockItemId,
    productId: line.productId,
    productInstanceId: line.productInstanceId,
    batchNumber: line.batchNumber,
    systemQuantity: line.systemQuantity,
    countedQuantity: line.countedQuantity,
    variance, // computed, not stored as truth (LAW-05)
    isReconciled: line.isReconciled,
    varianceReason: line.varianceReason,
    countedAt: line.countedAt?.toISOString() ?? null,
  }
}
