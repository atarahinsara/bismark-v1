import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { BusinessCodeGenerator, IdempotencyHelper } from '@/lib/shared'
import { DomainException, ValidationException } from '@/lib/shared'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'

/**
 * GET /api/v1/leads
 * List leads with pagination.
 * Requires: crm.read
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'crm.read')

    const tenantId = await getTenantId()
    const params = parseQueryParams(request)

    const [items, total] = await Promise.all([
      db.lead.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      db.lead.count({ where: { tenantId } }),
    ])

    return jsonResponse({
      data: items,
      meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list leads', statusCode: 500 })
  }
}

/**
 * POST /api/v1/leads
 * Create a new CRM lead.
 * Required body: customerName
 * Optional: phone, email, source, assignedTo, notes, metadata
 * Requires: crm.create
 *
 * Audit v3 F-02 fix: replaced `data: { tenantId, ...body }` template pattern
 * with explicit whitelist + BusinessCodeGenerator + validation.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'crm.create')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const rawBody = await request.text()
    const body = rawBody ? JSON.parse(rawBody) : {}
    const tenantId = await getTenantId()

    // Validation — required fields per Prisma schema
    if (!body.customerName) {
      throw new ValidationException('Customer name is required', [
        { field: 'customerName', message: 'Required', code: 'REQUIRED' },
      ])
    }

    // Validate source enum
    if (body.source) {
      const validSources = ['walk_in', 'online', 'referral', 'campaign', 'call_center']
      if (!validSources.includes(body.source)) {
        throw new ValidationException('Invalid source', [
          { field: 'source', message: `Must be one of: ${validSources.join(', ')}`, code: 'INVALID_ENUM' },
        ])
      }
    }

    // Generate business code (LAW-02)
    const leadNumber = await BusinessCodeGenerator.generate('lead', tenantId)

    const item = await db.lead.create({
      data: {
        tenantId,
        leadNumber,
        customerName: body.customerName,
        phone: body.phone ?? null,
        email: body.email ?? null,
        source: body.source ?? 'walk_in',
        status: 'new',
        assignedTo: body.assignedTo ?? null,
        convertedToPartyId: null,
        notes: body.notes ?? null,
        metadata: body.metadata ?? {},
      },
    })

    const responseBody = JSON.stringify({ data: item })
    await IdempotencyHelper.store(request, responseBody, 201, rawBody)
    return new Response(responseBody, { status: 201, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create lead', statusCode: 500 })
  }
}
