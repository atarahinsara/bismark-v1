import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const tenantId = await getTenantId()
    const wh = await db.warehouse.findFirst({
      where: { id: params.id, tenantId, deletedAt: null },
      include: {
        zones: { orderBy: { code: 'asc' } },
        _count: { select: { locations: true } },
      },
    })
    if (!wh) throw new NotFoundException('Warehouse', params.id)
    return jsonResponse({ data: toDTO(wh) })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to fetch warehouse', statusCode: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const tenantId = await getTenantId()
    const body = await request.json()
    const existing = await db.warehouse.findFirst({ where: { id: params.id, tenantId, deletedAt: null } })
    if (!existing) throw new NotFoundException('Warehouse', params.id)

    const updated = await db.warehouse.update({
      where: { id: params.id },
      data: {
        name: body.name?.trim() ?? existing.name,
        warehouseType: body.warehouseType ?? existing.warehouseType,
        address: body.address ?? existing.address,
        isActive: body.isActive ?? existing.isActive,
        isDefault: body.isDefault ?? existing.isDefault,
        capacityCubic: body.capacityCubic ?? existing.capacityCubic,
      },
    })
    return jsonResponse({ data: toDTO(updated) })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to update warehouse', statusCode: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const tenantId = await getTenantId()
    const existing = await db.warehouse.findFirst({ where: { id: params.id, tenantId, deletedAt: null } })
    if (!existing) throw new NotFoundException('Warehouse', params.id)

    // Check for stock items (would be added in Sprint 2.2B)
    const zoneCount = await db.warehouseZone.count({ where: { warehouseId: params.id } })
    if (zoneCount > 0) {
      throw new ValidationException('Cannot delete warehouse with zones', [
        { field: 'zones', message: `Warehouse has ${zoneCount} zones`, code: 'HAS_CHILDREN' },
      ])
    }

    await db.warehouse.update({ where: { id: params.id }, data: { deletedAt: new Date(), isActive: false } })
    return new Response(null, { status: 204 })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to delete warehouse', statusCode: 500 })
  }
}

function toDTO(wh: any) {
  return {
    id: wh.id,
    tenantId: wh.tenantId,
    code: wh.code,
    name: wh.name,
    warehouseType: wh.warehouseType,
    address: wh.address,
    isActive: wh.isActive,
    isDefault: wh.isDefault,
    capacityCubic: wh.capacityCubic,
    zones: wh.zones?.map((z: any) => ({
      id: z.id,
      code: z.code,
      name: z.name,
      zoneType: z.zoneType,
      isActive: z.isActive,
    })) ?? [],
    locationCount: wh._count?.locations ?? 0,
    createdAt: wh.createdAt.toISOString(),
    updatedAt: wh.updatedAt.toISOString(),
  }
}
