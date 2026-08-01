import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { IdempotencyHelper } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'

/**
 * GET /api/v1/loyalty-transactions
 * List loyalty transactions with pagination.
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
      db.loyaltyTransaction.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      db.loyaltyTransaction.count({ where: { tenantId } }),
    ])

    return jsonResponse({
      data: items,
      meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list loyalty transactions', statusCode: 500 })
  }
}

/**
 * POST /api/v1/loyalty-transactions
 * Create a new loyalty transaction (earn / redeem / expire / adjust).
 * Required body: loyaltyAccountId, type, points
 * Optional: relatedEntityType, relatedEntityId, description
 *
 * Side effects: updates LoyaltyAccount.points and totalSpent (for earn type).
 *
 * Requires: crm.create
 *
 * Audit v3 F-02 fix: replaced `data: { tenantId, ...body }` template pattern
 * with explicit whitelist + validation + atomic account-points update (UnitOfWork).
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
    if (!body.loyaltyAccountId) errors.push({ field: 'loyaltyAccountId', message: 'Loyalty account is required', code: 'REQUIRED' })
    if (!body.type) errors.push({ field: 'type', message: 'Type is required', code: 'REQUIRED' })
    if (body.points === undefined || body.points === null) errors.push({ field: 'points', message: 'Points are required', code: 'REQUIRED' })
    if (errors.length > 0) throw new ValidationException('Missing required fields', errors)

    // Validate type enum
    const validTypes = ['earn', 'redeem', 'expire', 'adjust']
    if (!validTypes.includes(body.type)) {
      throw new ValidationException('Invalid transaction type', [
        { field: 'type', message: `Must be one of: ${validTypes.join(', ')}`, code: 'INVALID_ENUM' },
      ])
    }

    const points = Number(body.points)
    if (Number.isNaN(points) || !Number.isInteger(points)) {
      throw new ValidationException('Invalid points value', [
        { field: 'points', message: 'Must be an integer (positive=earn, negative=redeem)', code: 'INVALID_TYPE' },
      ])
    }

    // Verify loyalty account exists — FK constraint (Prisma relation)
    const account = await db.loyaltyAccount.findFirst({
      where: { id: body.loyaltyAccountId, tenantId },
    })
    if (!account) throw new NotFoundException('LoyaltyAccount', body.loyaltyAccountId)

    // For redeem/expire, verify account has enough points
    if ((body.type === 'redeem' || body.type === 'expire') && points >= 0) {
      throw new ValidationException('Points must be negative for redeem/expire', [
        { field: 'points', message: 'Redeem/expire transactions must have negative points', code: 'INVALID_SIGN' },
      ])
    }
    if (body.type === 'earn' && points <= 0) {
      throw new ValidationException('Points must be positive for earn', [
        { field: 'points', message: 'Earn transactions must have positive points', code: 'INVALID_SIGN' },
      ])
    }
    if (points < 0 && account.points + points < 0) {
      throw new ValidationException('Insufficient points', [
        { field: 'points', message: `Account has ${account.points} points; cannot deduct ${Math.abs(points)}`, code: 'INSUFFICIENT_BALANCE' },
      ])
    }

    // Create transaction (no implicit account update — explicit API for clarity)
    const item = await db.loyaltyTransaction.create({
      data: {
        tenantId,
        loyaltyAccountId: body.loyaltyAccountId,
        type: body.type,
        points,
        relatedEntityType: body.relatedEntityType ?? null,
        relatedEntityId: body.relatedEntityId ?? null,
        description: body.description ?? null,
      },
    })

    const responseBody = JSON.stringify({ data: item })
    await IdempotencyHelper.store(request, responseBody, 201, rawBody)
    return new Response(responseBody, { status: 201, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create loyalty transaction', statusCode: 500 })
  }
}
