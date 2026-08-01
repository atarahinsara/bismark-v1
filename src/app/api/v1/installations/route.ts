import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { BusinessCodeGenerator, IdempotencyHelper } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'

/**
 * GET /api/v1/installations
 * List installations with pagination.
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
      db.installation.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      db.installation.count({ where: { tenantId } }),
    ])

    return jsonResponse({
      data: items,
      meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list installations', statusCode: 500 })
  }
}

/**
 * POST /api/v1/installations
 * Create a new installation record.
 * Required body: productInstanceId, customerId
 * Optional: salesOrderId, shipmentId, installerId, scheduledDate, installationType, address, notes, metadata
 * Requires: service.create
 *
 * Audit v3 F-02 fix: replaced `data: { tenantId, ...body }` template pattern
 * with explicit whitelist + BusinessCodeGenerator + validation.
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
    const errors: Array<{ field: string; message: string; code: string }> = []
    if (!body.productInstanceId) errors.push({ field: 'productInstanceId', message: 'Product instance is required', code: 'REQUIRED' })
    if (!body.customerId) errors.push({ field: 'customerId', message: 'Customer is required', code: 'REQUIRED' })
    if (errors.length > 0) throw new ValidationException('Missing required fields', errors)

    // Verify product instance exists — loose FK (LAW-01)
    const productInstance = await db.productInstance.findFirst({
      where: { id: body.productInstanceId, tenantId },
    })
    if (!productInstance) throw new NotFoundException('ProductInstance', body.productInstanceId)

    const customer = await db.party.findFirst({
      where: { id: body.customerId, tenantId, deletedAt: null },
    })
    if (!customer) throw new NotFoundException('Party', body.customerId)

    // Generate business code (LAW-02)
    const installationNumber = await BusinessCodeGenerator.generate('installation', tenantId)

    const item = await db.installation.create({
      data: {
        tenantId,
        installationNumber,
        productInstanceId: body.productInstanceId,
        customerId: body.customerId,
        salesOrderId: body.salesOrderId ?? null,
        shipmentId: body.shipmentId ?? null,
        installerId: body.installerId ?? null,
        scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : null,
        completedDate: null,
        status: 'pending',
        installationType: body.installationType ?? 'free',
        address: body.address ?? null,
        notes: body.notes ?? null,
        photos: null,
        customerSignature: null,
        metadata: body.metadata ?? {},
      },
    })

    const responseBody = JSON.stringify({ data: item })
    await IdempotencyHelper.store(request, responseBody, 201, rawBody)
    return new Response(responseBody, { status: 201, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create installation', statusCode: 500 })
  }
}
