import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { BusinessCodeGenerator, IdempotencyHelper } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException, OptimisticLockConflictException } from '@/lib/shared'

/**
 * GET /api/v1/stock-transfers
 * List stock transfers.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'inventory.transfer')

    const tenantId = await getTenantId()
    const params = parseQueryParams(request)
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const transferType = url.searchParams.get('transfer_type')

    const where = {
      tenantId,
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(transferType ? { transferType } : {}),
    }

    const [transfers, total] = await Promise.all([
      db.stockTransfer.findMany({
        where,
        include: { _count: { select: { lines: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      db.stockTransfer.count({ where }),
    ])

    return jsonResponse({
      data: transfers.map(toDTO),
      meta: {
        page: params.page,
        per_page: params.perPage,
        total,
        last_page: Math.ceil(total / params.perPage) || 1,
      },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list transfers', statusCode: 500 })
  }
}

/**
 * POST /api/v1/stock-transfers
 * Create a new stock transfer (Idempotent — LAW-06).
 *
 * Transfer types:
 *   - warehouse: move between warehouses (creates OUT + IN ledger entries on ship)
 *   - zone: move between zones within same warehouse
 *   - bin: move between bins within same location
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'inventory.transfer')

    // LAW-06: Idempotency check
    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) {
      return idempotent.response
    }

    const tenantId = await getTenantId()
    const body = await request.json()

    // Validation
    if (!body.transferType) throw new ValidationException('Transfer type is required', [
      { field: 'transferType', message: 'Required: warehouse|zone|bin', code: 'REQUIRED' },
    ])
    if (!body.fromWarehouseId) throw new ValidationException('Source warehouse is required', [
      { field: 'fromWarehouseId', message: 'Required', code: 'REQUIRED' },
    ])

    const validTypes = ['warehouse', 'zone', 'bin']
    if (!validTypes.includes(body.transferType)) {
      throw new ValidationException('Invalid transfer type', [
        { field: 'transferType', message: `Must be one of: ${validTypes.join(', ')}`, code: 'INVALID' },
      ])
    }

    // For warehouse transfer, toWarehouseId is required
    if (body.transferType === 'warehouse' && !body.toWarehouseId) {
      throw new ValidationException('Destination warehouse required for warehouse transfer', [
        { field: 'toWarehouseId', message: 'Required for warehouse transfer', code: 'REQUIRED' },
      ])
    }

    // Verify source warehouse
    const fromWarehouse = await db.warehouse.findFirst({
      where: { id: body.fromWarehouseId, tenantId, deletedAt: null },
    })
    if (!fromWarehouse) throw new NotFoundException('Warehouse', body.fromWarehouseId)

    // Verify destination warehouse (if warehouse transfer)
    if (body.toWarehouseId) {
      const toWarehouse = await db.warehouse.findFirst({
        where: { id: body.toWarehouseId, tenantId, deletedAt: null },
      })
      if (!toWarehouse) throw new NotFoundException('Warehouse', body.toWarehouseId)
      if (body.toWarehouseId === body.fromWarehouseId) {
        throw new ValidationException('Source and destination must be different', [
          { field: 'toWarehouseId', message: 'Cannot transfer to same warehouse', code: 'SAME_WAREHOUSE' },
        ])
      }
    }

    // Generate business code
    const transferNumber = await BusinessCodeGenerator.generate('stock_transfer', tenantId)

    const transfer = await db.stockTransfer.create({
      data: {
        tenantId,
        transferNumber,
        transferType: body.transferType,
        fromWarehouseId: body.fromWarehouseId,
        toWarehouseId: body.toWarehouseId ?? null,
        fromLocationId: body.fromLocationId ?? null,
        toLocationId: body.toLocationId ?? null,
        fromBinId: body.fromBinId ?? null,
        toBinId: body.toBinId ?? null,
        status: 'draft',
        expectedArrival: body.expectedArrival ? new Date(body.expectedArrival) : null,
        notes: body.notes ?? null,
        metadata: {},
      },
      include: { _count: { select: { lines: true } } },
    })

    const response = jsonResponse({ data: toDTO(transfer) }, 201)
    const responseBody = await response.clone().text()

    // LAW-06: Store idempotency
    await IdempotencyHelper.store(request, responseBody, 201)

    return response
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    }
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create transfer', statusCode: 500 })
  }
}

function toDTO(transfer: any) {
  return {
    id: transfer.id,
    tenantId: transfer.tenantId,
    transferNumber: transfer.transferNumber,
    transferType: transfer.transferType,
    fromWarehouseId: transfer.fromWarehouseId,
    toWarehouseId: transfer.toWarehouseId,
    fromLocationId: transfer.fromLocationId,
    toLocationId: transfer.toLocationId,
    fromBinId: transfer.fromBinId,
    toBinId: transfer.toBinId,
    status: transfer.status,
    transferDate: transfer.transferDate.toISOString(),
    expectedArrival: transfer.expectedArrival?.toISOString() ?? null,
    actualArrival: transfer.actualArrival?.toISOString() ?? null,
    notes: transfer.notes,
    version: transfer.version,
    lineCount: transfer._count?.lines ?? 0,
    createdAt: transfer.createdAt.toISOString(),
    updatedAt: transfer.updatedAt.toISOString(),
  }
}
