import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { BusinessCodeGenerator } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

/**
 * GET /api/v1/warehouses
 * List warehouses (paginated, filterable).
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId()
    const params = parseQueryParams(request)
    const url = new URL(request.url)
    const warehouseType = url.searchParams.get('warehouse_type')

    const where = {
      tenantId,
      deletedAt: null,
      ...(params.search ? { name: { contains: params.search } } : {}),
      ...(warehouseType ? { warehouseType } : {}),
    }

    const [warehouses, total] = await Promise.all([
      db.warehouse.findMany({
        where,
        include: { _count: { select: { zones: true, locations: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      db.warehouse.count({ where }),
    ])

    return jsonResponse({
      data: warehouses.map(toDTO),
      meta: {
        page: params.page,
        per_page: params.perPage,
        total,
        last_page: Math.ceil(total / params.perPage) || 1,
      },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list warehouses', statusCode: 500 })
  }
}

/**
 * POST /api/v1/warehouses
 * Create a new warehouse (business code auto-generated).
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantId()
    const body = await request.json()

    // Validation
    if (!body.name?.trim()) {
      throw new ValidationException('Name is required', [
        { field: 'name', message: 'Name is required', code: 'REQUIRED' },
      ])
    }

    const validTypes = ['main', 'branch', 'service_center', 'transit', 'return']
    if (body.warehouseType && !validTypes.includes(body.warehouseType)) {
      throw new ValidationException('Invalid warehouse type', [
        { field: 'warehouseType', message: `Must be one of: ${validTypes.join(', ')}`, code: 'INVALID' },
      ])
    }

    // Generate business code (LAW-02: always via BusinessCodeGeneratorService)
    const code = await BusinessCodeGenerator.generate('warehouse', tenantId)

    const warehouse = await db.warehouse.create({
      data: {
        tenantId,
        code,
        name: body.name.trim(),
        warehouseType: body.warehouseType ?? 'main',
        branchId: body.branchId ?? null,
        serviceCenterId: body.serviceCenterId ?? null,
        partyId: body.partyId ?? null,
        address: body.address ?? null,
        isActive: body.isActive ?? true,
        isDefault: body.isDefault ?? false,
        capacityCubic: body.capacityCubic ?? null,
        metadata: {},
      },
      include: { _count: { select: { zones: true, locations: true } } },
    })

    return jsonResponse({ data: toDTO(warehouse) }, 201)
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    }
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create warehouse', statusCode: 500 })
  }
}

function toDTO(wh: any) {
  return {
    id: wh.id,
    tenantId: wh.tenantId,
    code: wh.code,
    name: wh.name,
    warehouseType: wh.warehouseType,
    branchId: wh.branchId,
    serviceCenterId: wh.serviceCenterId,
    partyId: wh.partyId,
    address: wh.address,
    isActive: wh.isActive,
    isDefault: wh.isDefault,
    capacityCubic: wh.capacityCubic,
    zoneCount: wh._count?.zones ?? 0,
    locationCount: wh._count?.locations ?? 0,
    createdAt: wh.createdAt.toISOString(),
    updatedAt: wh.updatedAt.toISOString(),
  }
}
