import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

interface Params {
  params: { id: string }
}

/**
 * GET /api/v1/product-categories/{id}
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'product.create')

    const tenantId = await getTenantId()
    const category = await db.productCategory.findFirst({
      where: { id: params.id, tenantId, deletedAt: null },
    })

    if (!category) throw new NotFoundException('ProductCategory', params.id)

    return jsonResponse({ data: toDTO(category) })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to fetch category', statusCode: 500 })
  }
}

/**
 * PATCH /api/v1/product-categories/{id}
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'product.create')

    const tenantId = await getTenantId()
    const body = await request.json()

    const existing = await db.productCategory.findFirst({
      where: { id: params.id, tenantId, deletedAt: null },
    })
    if (!existing) throw new NotFoundException('ProductCategory', params.id)

    if (body.parentId && body.parentId !== existing.parentId) {
      if (body.parentId === params.id) {
        throw new ValidationException('Category cannot be its own parent', [
          { field: 'parentId', message: 'Category cannot be its own parent', code: 'CYCLE' },
        ])
      }
    }

    const updated = await db.productCategory.update({
      where: { id: params.id },
      data: {
        name: body.name?.trim() ?? existing.name,
        description: body.description ?? existing.description,
        isActive: body.isActive ?? existing.isActive,
        attributes: body.attributes ?? existing.attributes,
        parentId: body.parentId ?? existing.parentId,
      },
    })

    return jsonResponse({ data: toDTO(updated) })
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    }
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to update category', statusCode: 500 })
  }
}

/**
 * DELETE /api/v1/product-categories/{id} (soft delete)
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'product.create')

    const tenantId = await getTenantId()
    const existing = await db.productCategory.findFirst({
      where: { id: params.id, tenantId, deletedAt: null },
    })
    if (!existing) throw new NotFoundException('ProductCategory', params.id)

    const childrenCount = await db.productCategory.count({
      where: { parentId: params.id, tenantId, deletedAt: null },
    })
    if (childrenCount > 0) {
      throw new ValidationException('Cannot delete category with children', [
        { field: 'parentId', message: `Category has ${childrenCount} children`, code: 'HAS_CHILDREN' },
      ])
    }

    await db.productCategory.update({
      where: { id: params.id },
      data: { deletedAt: new Date(), isActive: false },
    })

    return new Response(null, { status: 204 })
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    }
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to delete category', statusCode: 500 })
  }
}

function toDTO(cat: any) {
  return {
    id: cat.id,
    tenantId: cat.tenantId,
    name: cat.name,
    code: cat.code,
    parentId: cat.parentId,
    level: cat.level,
    path: cat.path,
    isActive: cat.isActive,
    description: cat.description,
    attributes: cat.attributes ?? [],
    createdAt: cat.createdAt.toISOString(),
    updatedAt: cat.updatedAt.toISOString(),
  }
}
