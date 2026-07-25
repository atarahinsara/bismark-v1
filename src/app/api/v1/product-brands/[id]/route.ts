import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const tenantId = await getTenantId()
    const brand = await db.productBrand.findFirst({ where: { id: params.id, tenantId, deletedAt: null } })
    if (!brand) throw new NotFoundException('ProductBrand', params.id)
    return jsonResponse({ data: toDTO(brand) })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to fetch brand', statusCode: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const tenantId = await getTenantId()
    const body = await request.json()
    const existing = await db.productBrand.findFirst({ where: { id: params.id, tenantId, deletedAt: null } })
    if (!existing) throw new NotFoundException('ProductBrand', params.id)

    const updated = await db.productBrand.update({
      where: { id: params.id },
      data: {
        name: body.name?.trim() ?? existing.name,
        nameEn: body.nameEn ?? existing.nameEn,
        description: body.description ?? existing.description,
        isActive: body.isActive ?? existing.isActive,
      },
    })
    return jsonResponse({ data: toDTO(updated) })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to update brand', statusCode: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const tenantId = await getTenantId()
    const existing = await db.productBrand.findFirst({ where: { id: params.id, tenantId, deletedAt: null } })
    if (!existing) throw new NotFoundException('ProductBrand', params.id)

    await db.productBrand.update({ where: { id: params.id }, data: { deletedAt: new Date(), isActive: false } })
    return new Response(null, { status: 204 })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to delete brand', statusCode: 500 })
  }
}

function toDTO(brand: any) {
  return {
    id: brand.id,
    tenantId: brand.tenantId,
    name: brand.name,
    nameEn: brand.nameEn,
    code: brand.code,
    description: brand.description,
    isActive: brand.isActive,
    createdAt: brand.createdAt.toISOString(),
    updatedAt: brand.updatedAt.toISOString(),
  }
}
