import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { BusinessCodeGenerator } from '@/lib/shared/helpers/business-code-generator'
import { DomainException, ValidationException } from '@/lib/shared'

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId()
    const params = parseQueryParams(request)

    const where = {
      tenantId,
      deletedAt: null,
      ...(params.search ? { name: { contains: params.search } } : {}),
    }

    const [brands, total] = await Promise.all([
      db.productBrand.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      db.productBrand.count({ where }),
    ])

    return jsonResponse({
      data: brands.map(toDTO),
      meta: {
        page: params.page,
        per_page: params.perPage,
        total,
        last_page: Math.ceil(total / params.perPage) || 1,
      },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list brands', statusCode: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantId()
    const body = await request.json()

    if (!body.name?.trim()) {
      throw new ValidationException('Name is required', [
        { field: 'name', message: 'Name is required', code: 'REQUIRED' },
      ])
    }

    const businessCode = await BusinessCodeGenerator.generate('product_brand', tenantId)

    const brand = await db.productBrand.create({
      data: {
        tenantId,
        name: body.name.trim(),
        nameEn: body.nameEn ?? null,
        code: businessCode,
        manufacturerPartyId: body.manufacturerPartyId ?? null,
        description: body.description ?? null,
        isActive: body.isActive ?? true,
        metadata: {},
      },
    })

    return jsonResponse({ data: toDTO(brand) }, 201)
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    }
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create brand', statusCode: 500 })
  }
}

function toDTO(brand: any) {
  return {
    id: brand.id,
    tenantId: brand.tenantId,
    name: brand.name,
    nameEn: brand.nameEn,
    code: brand.code,
    manufacturerPartyId: brand.manufacturerPartyId,
    description: brand.description,
    isActive: brand.isActive,
    createdAt: brand.createdAt.toISOString(),
    updatedAt: brand.updatedAt.toISOString(),
  }
}
