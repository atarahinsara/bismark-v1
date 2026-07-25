import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { BusinessCodeGenerator } from '@/lib/shared/helpers/business-code-generator'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId()
    const params = parseQueryParams(request)
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brand_id')
    const categoryId = url.searchParams.get('category_id')

    const where = {
      tenantId,
      deletedAt: null,
      ...(params.search ? { name: { contains: params.search } } : {}),
      ...(brandId ? { brandId } : {}),
      ...(categoryId ? { categoryId } : {}),
    }

    const [models, total] = await Promise.all([
      db.productModel.findMany({
        where,
        include: { brand: true, category: true },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      db.productModel.count({ where }),
    ])

    return jsonResponse({
      data: models.map(toDTO),
      meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list models', statusCode: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantId()
    const body = await request.json()

    if (!body.name?.trim()) throw new ValidationException('Name is required', [{ field: 'name', message: 'Name is required', code: 'REQUIRED' }])
    if (!body.brandId) throw new ValidationException('Brand is required', [{ field: 'brandId', message: 'Brand is required', code: 'REQUIRED' }])
    if (!body.categoryId) throw new ValidationException('Category is required', [{ field: 'categoryId', message: 'Category is required', code: 'REQUIRED' }])

    const brand = await db.productBrand.findFirst({ where: { id: body.brandId, tenantId, deletedAt: null } })
    if (!brand) throw new NotFoundException('ProductBrand', body.brandId)

    const category = await db.productCategory.findFirst({ where: { id: body.categoryId, tenantId, deletedAt: null } })
    if (!category) throw new NotFoundException('ProductCategory', body.categoryId)

    const modelCode = await BusinessCodeGenerator.generate('product_model', tenantId)

    const model = await db.productModel.create({
      data: {
        tenantId,
        brandId: body.brandId,
        categoryId: body.categoryId,
        name: body.name.trim(),
        modelCode,
        description: body.description ?? null,
        warrantyMonths: body.warrantyMonths ?? 12,
        isSerialized: body.isSerialized ?? true,
        attributes: body.attributes ?? {},
        status: body.status ?? 'active',
        metadata: {},
      },
      include: { brand: true, category: true },
    })

    return jsonResponse({ data: toDTO(model) }, 201)
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create model', statusCode: 500 })
  }
}

function toDTO(model: any) {
  return {
    id: model.id,
    tenantId: model.tenantId,
    brandId: model.brandId,
    categoryId: model.categoryId,
    brandName: model.brand?.name ?? null,
    categoryName: model.category?.name ?? null,
    name: model.name,
    modelCode: model.modelCode,
    description: model.description,
    warrantyMonths: model.warrantyMonths,
    isSerialized: model.isSerialized,
    attributes: model.attributes ?? {},
    status: model.status,
    createdAt: model.createdAt.toISOString(),
    updatedAt: model.updatedAt.toISOString(),
  }
}
