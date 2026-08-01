/**
 * GET /api/v1/bank-accounts
 * POST /api/v1/bank-accounts
 *
 * T-3-05: Bank Account management for reconciliation.
 *
 * Requires: financial.read (GET), financial.journal_create (POST)
 */

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { IdempotencyHelper } from '@/lib/shared'
import { DomainException, ValidationException, ConflictException } from '@/lib/shared'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'financial.read')

    const tenantId = await getTenantId()
    const params = parseQueryParams(request)

    const [items, total] = await Promise.all([
      db.bankAccount.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      db.bankAccount.count({ where: { tenantId } }),
    ])

    return jsonResponse({
      data: items,
      meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list bank accounts', statusCode: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'financial.journal_create')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const rawBody = await request.text()
    const body = rawBody ? JSON.parse(rawBody) : {}
    const tenantId = await getTenantId()

    // Validation
    const errors: Array<{ field: string; message: string; code: string }> = []
    if (!body.accountName) errors.push({ field: 'accountName', message: 'Required', code: 'REQUIRED' })
    if (!body.accountNumber) errors.push({ field: 'accountNumber', message: 'Required', code: 'REQUIRED' })
    if (!body.bankName) errors.push({ field: 'bankName', message: 'Required', code: 'REQUIRED' })
    if (errors.length > 0) throw new ValidationException('Missing required fields', errors)

    // Check uniqueness
    const existing = await db.bankAccount.findFirst({
      where: { tenantId, accountNumber: body.accountNumber },
    })
    if (existing) {
      throw new ConflictException(`Bank account with number ${body.accountNumber} already exists`)
    }

    const item = await db.bankAccount.create({
      data: {
        tenantId,
        accountName: body.accountName,
        accountNumber: body.accountNumber,
        bankName: body.bankName,
        branchCode: body.branchCode ?? null,
        iban: body.iban ?? null,
        currencyCode: body.currencyCode ?? 'IRR',
        chartOfAccountId: body.chartOfAccountId ?? null,
        openingBalance: body.openingBalance ?? 0,
        currentBalance: body.openingBalance ?? 0,
        isActive: body.isActive ?? true,
        metadata: body.metadata ?? {},
      },
    })

    logger.info({ bankAccountId: item.id, userId: ctx.userId }, 'Bank account created')

    const responseBody = JSON.stringify({ data: item })
    await IdempotencyHelper.store(request, responseBody, 201, rawBody)
    return new Response(responseBody, { status: 201, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    }
    logger.error({ err: e }, 'Bank account creation failed')
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create bank account', statusCode: 500 })
  }
}
