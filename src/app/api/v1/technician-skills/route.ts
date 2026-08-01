import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { IdempotencyHelper } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException, ConflictException } from '@/lib/shared'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'

/**
 * GET /api/v1/technician-skills
 * List technician skills with pagination.
 * Requires: service.read
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'service.read')

    const tenantId = await getTenantId()
    const params = parseQueryParams(request)

    const [items, total] = await Promise.all([
      db.technicianSkill.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      db.technicianSkill.count({ where: { tenantId } }),
    ])

    return jsonResponse({
      data: items,
      meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list technician skills', statusCode: 500 })
  }
}

/**
 * POST /api/v1/technician-skills
 * Create a new technician skill record.
 * Required body: technicianId
 * Optional: productCategoryId, skillLevel, certifiedAt, certifiedBy
 * Requires: service.create
 *
 * Audit v3 F-02 fix: replaced `data: { tenantId, ...body }` template pattern
 * with explicit whitelist + uniqueness check (technician + productCategory).
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'service.create')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const rawBody = await request.text()
    const body = rawBody ? JSON.parse(rawBody) : {}
    const tenantId = await getTenantId()

    // Validation — required fields per Prisma schema
    if (!body.technicianId) {
      throw new ValidationException('Technician is required', [
        { field: 'technicianId', message: 'Required', code: 'REQUIRED' },
      ])
    }

    // Validate skillLevel enum
    if (body.skillLevel) {
      const validLevels = ['junior', 'intermediate', 'senior', 'expert']
      if (!validLevels.includes(body.skillLevel)) {
        throw new ValidationException('Invalid skill level', [
          { field: 'skillLevel', message: `Must be one of: ${validLevels.join(', ')}`, code: 'INVALID_ENUM' },
        ])
      }
    }

    // Verify technician (Party) exists — loose FK (LAW-01)
    const technician = await db.party.findFirst({
      where: { id: body.technicianId, tenantId, deletedAt: null },
    })
    if (!technician) throw new NotFoundException('Party', body.technicianId)

    // Check uniqueness — @@unique([tenantId, technicianId, productCategoryId])
    // NOTE: productCategoryId may be null; in SQLite, NULL != NULL, so two records with null are allowed.
    // We additionally check existence here to enforce one-skill-per-technician-per-category semantics.
    const existing = await db.technicianSkill.findFirst({
      where: {
        tenantId,
        technicianId: body.technicianId,
        productCategoryId: body.productCategoryId ?? null,
      },
    })
    if (existing) {
      throw new ConflictException(`Skill already exists for technician ${body.technicianId}`)
    }

    const item = await db.technicianSkill.create({
      data: {
        tenantId,
        technicianId: body.technicianId,
        productCategoryId: body.productCategoryId ?? null,
        skillLevel: body.skillLevel ?? 'junior',
        certifiedAt: body.certifiedAt ? new Date(body.certifiedAt) : null,
        certifiedBy: body.certifiedBy ?? null,
      },
    })

    const responseBody = JSON.stringify({ data: item })
    await IdempotencyHelper.store(request, responseBody, 201, rawBody)
    return new Response(responseBody, { status: 201, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create technician skill', statusCode: 500 })
  }
}
