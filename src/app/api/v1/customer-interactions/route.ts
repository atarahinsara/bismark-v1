import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { IdempotencyHelper } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'

/**
 * GET /api/v1/customer-interactions
 * List customer interactions with pagination.
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
      db.customerInteraction.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      db.customerInteraction.count({ where: { tenantId } }),
    ])

    return jsonResponse({
      data: items,
      meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list customer interactions', statusCode: 500 })
  }
}

/**
 * POST /api/v1/customer-interactions
 * Create a new customer interaction log.
 * Required body: partyId, subject, notes
 * Optional: channel, direction, interactionAt, handledBy, metadata
 * Requires: crm.create
 *
 * Audit v3 F-02 fix: replaced `data: { tenantId, ...body }` template pattern
 * with explicit whitelist + validation.
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
    const errors: Array<{ field: string; message: string; code: string }> = []
    if (!body.partyId) errors.push({ field: 'partyId', message: 'Party is required', code: 'REQUIRED' })
    if (!body.subject) errors.push({ field: 'subject', message: 'Subject is required', code: 'REQUIRED' })
    if (!body.notes) errors.push({ field: 'notes', message: 'Notes are required', code: 'REQUIRED' })
    if (errors.length > 0) throw new ValidationException('Missing required fields', errors)

    // Validate enums
    if (body.channel) {
      const validChannels = ['phone', 'email', 'sms', 'in_person', 'social']
      if (!validChannels.includes(body.channel)) {
        throw new ValidationException('Invalid channel', [
          { field: 'channel', message: `Must be one of: ${validChannels.join(', ')}`, code: 'INVALID_ENUM' },
        ])
      }
    }
    if (body.direction) {
      const validDirs = ['inbound', 'outbound']
      if (!validDirs.includes(body.direction)) {
        throw new ValidationException('Invalid direction', [
          { field: 'direction', message: `Must be one of: ${validDirs.join(', ')}`, code: 'INVALID_ENUM' },
        ])
      }
    }

    // Verify party exists — loose FK (LAW-01)
    const party = await db.party.findFirst({
      where: { id: body.partyId, tenantId, deletedAt: null },
    })
    if (!party) throw new NotFoundException('Party', body.partyId)

    const item = await db.customerInteraction.create({
      data: {
        tenantId,
        partyId: body.partyId,
        channel: body.channel ?? 'phone',
        direction: body.direction ?? 'inbound',
        subject: body.subject,
        notes: body.notes,
        interactionAt: body.interactionAt ? new Date(body.interactionAt) : new Date(),
        handledBy: body.handledBy ?? null,
        metadata: body.metadata ?? {},
      },
    })

    const responseBody = JSON.stringify({ data: item })
    await IdempotencyHelper.store(request, responseBody, 201, rawBody)
    return new Response(responseBody, { status: 201, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create customer interaction', statusCode: 500 })
  }
}
