import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * GET /api/v1/warehouses/{id}/zones
 * List zones in a warehouse.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const tenantId = await getTenantId()
    const wh = await db.warehouse.findFirst({ where: { id: params.id, tenantId, deletedAt: null } })
    if (!wh) throw new NotFoundException('Warehouse', params.id)

    const zones = await db.warehouseZone.findMany({
      where: { warehouseId: params.id },
      include: { _count: { select: { locations: true } } },
      orderBy: { code: 'asc' },
    })

    return jsonResponse({ data: zones.map(toDTO) })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list zones', statusCode: 500 })
  }
}

/**
 * POST /api/v1/warehouses/{id}/zones
 * Create a zone in a warehouse.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const tenantId = await getTenantId()
    const body = await request.json()

    const wh = await db.warehouse.findFirst({ where: { id: params.id, tenantId, deletedAt: null } })
    if (!wh) throw new NotFoundException('Warehouse', params.id)

    if (!body.name?.trim()) {
      throw new ValidationException('Name is required', [
        { field: 'name', message: 'Name is required', code: 'REQUIRED' },
      ])
    }

    // Zone code: WH-LOC-{NN} (uses location business code, but zone has its own simple code)
    const zoneCount = await db.warehouseZone.count({ where: { warehouseId: params.id } })
    const zoneCode = `${wh.code}-Z${String(zoneCount + 1).padStart(2, '0')}`

    const zone = await db.warehouseZone.create({
      data: {
        tenantId,
        warehouseId: params.id,
        code: zoneCode,
        name: body.name.trim(),
        zoneType: body.zoneType ?? 'storage',
        isActive: body.isActive ?? true,
      },
    })

    return jsonResponse({ data: toDTO(zone) }, 201)
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create zone', statusCode: 500 })
  }
}

function toDTO(zone: any) {
  return {
    id: zone.id,
    warehouseId: zone.warehouseId,
    code: zone.code,
    name: zone.name,
    zoneType: zone.zoneType,
    isActive: zone.isActive,
    locationCount: zone._count?.locations ?? 0,
    createdAt: zone.createdAt.toISOString(),
    updatedAt: zone.updatedAt.toISOString(),
  }
}
