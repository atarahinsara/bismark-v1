import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { BusinessCodeGenerator } from '@/lib/shared/helpers/business-code-generator'
import { DomainException, ValidationException } from '@/lib/shared'
import type { ProductCategory } from '@/lib/types'

/**
 * GET /api/v1/product-categories
 * List product categories (tree or flat) with filtering.
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId()
    const params = parseQueryParams(request)
    const url = new URL(request.url)
    const format = url.searchParams.get('format') ?? 'tree' // tree|flat

    const where = {
      tenantId,
      deletedAt: null,
      ...(params.search ? { name: { contains: params.search } } : {}),
    }

    if (format === 'flat') {
      const categories = await db.productCategory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      })
      return jsonResponse({ data: categories.map(toDTO) })
    }

    // Tree format
    const all = await db.productCategory.findMany({
      where,
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    })

    const tree = buildTree(all)
    return jsonResponse({ data: tree })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list categories', statusCode: 500 })
  }
}

/**
 * POST /api/v1/product-categories
 * Create a new product category (business code auto-generated).
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

    // Generate business code (LAW-02: never manual)
    const businessCode = await BusinessCodeGenerator.generate('product_category', tenantId)

    // Determine level + path from parent
    let level = 0
    let path = `/${businessCode}`
    if (body.parentId) {
      const parent = await db.productCategory.findFirst({
        where: { id: body.parentId, tenantId, deletedAt: null },
      })
      if (!parent) {
        throw new ValidationException('Parent category not found', [
          { field: 'parentId', message: 'Parent category not found', code: 'NOT_FOUND' },
        ])
      }
      level = parent.level + 1
      path = `${parent.path}/${businessCode}`
    }

    const category = await db.productCategory.create({
      data: {
        tenantId,
        name: body.name.trim(),
        code: businessCode,
        parentId: body.parentId ?? null,
        level,
        path,
        isActive: body.isActive ?? true,
        description: body.description ?? null,
        attributes: body.attributes ?? [],
      },
    })

    return jsonResponse({ data: toDTO(category) }, 201)
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    }
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create category', statusCode: 500 })
  }
}

// ============================================================
// Helpers
// ============================================================

function toDTO(cat: any): ProductCategory {
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

function buildTree(categories: any[]): any[] {
  const map = new Map<string, any>()
  const roots: any[] = []

  for (const cat of categories) {
    map.set(cat.id, { ...toDTO(cat), children: [] })
  }

  for (const cat of categories) {
    const node = map.get(cat.id)!
    if (cat.parentId && map.has(cat.parentId)) {
      map.get(cat.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}
