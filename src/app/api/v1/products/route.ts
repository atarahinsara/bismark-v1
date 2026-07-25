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
    const modelId = url.searchParams.get('model_id')

    const where = {
      tenantId,
      deletedAt: null,
      ...(params.search ? { name: { contains: params.search } } : {}),
      ...(modelId ? { modelId } : {}),
    }

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        include: { model: { include: { brand: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      db.product.count({ where }),
    ])

    return jsonResponse({
      data: products.map(toDTO),
      meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list products', statusCode: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantId()
    const body = await request.json()

    if (!body.name?.trim()) throw new ValidationException('Name is required', [{ field: 'name', message: 'Name is required', code: 'REQUIRED' }])
    if (!body.modelId) throw new ValidationException('Model is required', [{ field: 'modelId', message: 'Model is required', code: 'REQUIRED' }])

    const model = await db.productModel.findFirst({ where: { id: body.modelId, tenantId, deletedAt: null } })
    if (!model) throw new NotFoundException('ProductModel', body.modelId)

    const sku = body.sku?.trim() || await BusinessCodeGenerator.generate('product', tenantId)

    const product = await db.product.create({
      data: {
        tenantId,
        modelId: body.modelId,
        sku,
        name: body.name.trim(),
        productType: body.productType ?? 'serialized',
        barcodeValue: body.barcodeValue ?? null,
        unitOfMeasure: body.unitOfMeasure ?? 'piece',
        weightGrams: body.weightGrams ?? null,
        description: body.description ?? null,
        status: body.status ?? 'active',
        attributes: body.attributes ?? {},
        metadata: {},
      },
      include: { model: { include: { brand: true } } },
    })

    return jsonResponse({ data: toDTO(product) }, 201)
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create product', statusCode: 500 })
  }
}

function toDTO(product: any) {
  return {
    id: product.id,
    tenantId: product.tenantId,
    modelId: product.modelId,
    modelName: product.model?.name ?? null,
    brandName: product.model?.brand?.name ?? null,
    sku: product.sku,
    name: product.name,
    productType: product.productType,
    barcodeValue: product.barcodeValue,
    unitOfMeasure: product.unitOfMeasure,
    status: product.status,
    description: product.description,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  }
}
