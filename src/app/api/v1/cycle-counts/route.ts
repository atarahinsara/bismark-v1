import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { BusinessCodeGenerator, IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

/**
 * GET /api/v1/cycle-counts
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'inventory.cycle_count')

    const tenantId = await getTenantId()
    const params = parseQueryParams(request)
    const url = new URL(request.url)
    const status = url.searchParams.get('status')

    const where = {
      tenantId,
      deletedAt: null,
      ...(status ? { status } : {}),
    }

    const [counts, total] = await Promise.all([
      db.cycleCount.findMany({
        where,
        include: { _count: { select: { lines: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      db.cycleCount.count({ where }),
    ])

    return jsonResponse({
      data: counts.map(toDTO),
      meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list cycle counts', statusCode: 500 })
  }
}

/**
 * POST /api/v1/cycle-counts
 * Create a new cycle count (Idempotent — LAW-06).
 * Auto-populates lines from current stock items in the warehouse.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'inventory.cycle_count')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json()

    if (!body.warehouseId) throw new ValidationException('Warehouse is required', [
      { field: 'warehouseId', message: 'Required', code: 'REQUIRED' },
    ])

    const validTypes = ['full', 'cycle', 'spot']
    if (body.countType && !validTypes.includes(body.countType)) {
      throw new ValidationException('Invalid count type', [
        { field: 'countType', message: `Must be one of: ${validTypes.join(', ')}`, code: 'INVALID' },
      ])
    }

    const warehouse = await db.warehouse.findFirst({
      where: { id: body.warehouseId, tenantId, deletedAt: null },
    })
    if (!warehouse) throw new NotFoundException('Warehouse', body.warehouseId)

    const countNumber = await BusinessCodeGenerator.generate('stock_count', tenantId)

    // Create cycle count + auto-populate lines from existing stock items
    const count = await UnitOfWork.execute(async (uow) => {
      const cycleCount = await uow.tx.cycleCount.create({
        data: {
          tenantId,
          countNumber,
          warehouseId: body.warehouseId,
          countType: body.countType ?? 'full',
          status: 'draft',
          scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : new Date(),
          notes: body.notes ?? null,
          metadata: {},
        },
      })

      // Auto-populate lines from current stock items
      const stockItems = await uow.tx.stockItem.findMany({
        where: { tenantId, warehouseId: body.warehouseId, deletedAt: null },
      })

      for (const item of stockItems) {
        // Get system quantity from ledger (LAW-05)
        const ledgerSum = await uow.tx.inventoryTransaction.aggregate({
          where: { stockItemId: item.id },
          _sum: { quantity: true },
        })
        const systemQty = ledgerSum._sum.quantity ?? 0

        await uow.tx.cycleCountLine.create({
          data: {
            tenantId,
            cycleCountId: cycleCount.id,
            stockItemId: item.id,
            productId: item.productId,
            productInstanceId: item.productInstanceId,
            batchNumber: item.batchNumber,
            warehouseId: item.warehouseId,
            locationId: item.locationId,
            systemQuantity: systemQty,
          },
        })
      }

      // Outbox event (LAW-08)
      await uow.outbox.append({
        tenantId,
        aggregateType: 'CycleCount',
        aggregateId: cycleCount.id,
        eventType: 'cycle_count.created',
        payload: { countNumber, warehouseId: body.warehouseId, lineCount: stockItems.length },
        actorId: null,
      })

      return cycleCount
    })

    const result = await db.cycleCount.findUnique({
      where: { id: count.id },
      include: { _count: { select: { lines: true } } },
    })

    const responseBody = JSON.stringify({ data: toDTO(result) })

    await IdempotencyHelper.store(request, responseBody, 201, JSON.stringify(body || {}))
    return new Response(responseBody, { status: 201, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    }
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create cycle count', statusCode: 500 })
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
    approvedBy: count.approvedBy,
    adjustedAt: count.adjustedAt?.toISOString() ?? null,
    notes: count.notes,
    version: count.version,
    lineCount: count._count?.lines ?? 0,
    createdAt: count.createdAt.toISOString(),
    updatedAt: count.updatedAt.toISOString(),
  }
}