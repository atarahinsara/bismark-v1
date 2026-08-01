import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { IdempotencyHelper } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException, ConflictException } from '@/lib/shared'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'

/**
 * GET /api/v1/loyalty-accounts
 * List loyalty accounts with pagination.
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
      db.loyaltyAccount.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      db.loyaltyAccount.count({ where: { tenantId } }),
    ])

    return jsonResponse({
      data: items,
      meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list loyalty accounts', statusCode: 500 })
  }
}

/**
 * POST /api/v1/loyalty-accounts
 * Create a new loyalty account for a party (one per party).
 * Required body: partyId
 * Optional: tier
 * Requires: crm.create
 *
 * Audit v3 F-02 fix: replaced `data: { tenantId, ...body }` template pattern
 * with explicit whitelist + duplicate check (party can have only one account).
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
    if (!body.partyId) {
      throw new ValidationException('Party is required', [
        { field: 'partyId', message: 'Required', code: 'REQUIRED' },
      ])
    }

    // Verify party exists — loose FK (LAW-01)
    const party = await db.party.findFirst({
      where: { id: body.partyId, tenantId, deletedAt: null },
    })
    if (!party) throw new NotFoundException('Party', body.partyId)

    // Check uniqueness — @@unique([tenantId, partyId])
    const existing = await db.loyaltyAccount.findFirst({
      where: { tenantId, partyId: body.partyId },
    })
    if (existing) {
      throw new ConflictException(`Loyalty account already exists for party ${body.partyId}`)
    }

    const item = await db.loyaltyAccount.create({
      data: {
        tenantId,
        partyId: body.partyId,
        points: 0,
        tier: body.tier ?? 'bronze',
        totalSpent: 0,
        joinedAt: new Date(),
        lastPurchaseAt: null,
      },
    })

    const responseBody = JSON.stringify({ data: item })
    await IdempotencyHelper.store(request, responseBody, 201, rawBody)
    return new Response(responseBody, { status: 201, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create loyalty account', statusCode: 500 })
  }
}
