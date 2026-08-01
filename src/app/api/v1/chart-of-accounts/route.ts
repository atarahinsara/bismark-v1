import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { DomainException, NotFoundException } from '@/lib/shared'

/**
 * GET /api/v1/chart-of-accounts
 * List chart of accounts (tree or flat).
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'financial.journal_create')

    const tenantId = await getTenantId()
    const url = new URL(request.url)
    const format = url.searchParams.get('format') ?? 'flat'

    const accounts = await db.chartOfAccount.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: [{ level: 'asc' }, { accountCode: 'asc' }],
    })

    if (format === 'tree') {
      const tree = buildTree(accounts)
      return jsonResponse({ data: tree })
    }

    return jsonResponse({ data: accounts.map(toDTO) })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list accounts', statusCode: 500 })
  }
}

/**
 * POST /api/v1/chart-of-accounts
 * Create a new account.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'financial.journal_create')

    const tenantId = await getTenantId()
    const body = await request.json()

    if (!body.accountCode || !body.accountName || !body.accountType) {
      return errorResponse({ code: 'VALIDATION_FAILED', message: 'accountCode, accountName, accountType required', statusCode: 422 })
    }

    const validTypes = ['asset', 'liability', 'equity', 'revenue', 'expense']
    if (!validTypes.includes(body.accountType)) {
      return errorResponse({ code: 'VALIDATION_FAILED', message: `Invalid accountType: ${validTypes.join(', ')}`, statusCode: 422 })
    }

    const account = await db.chartOfAccount.create({
      data: {
        tenantId,
        accountCode: body.accountCode,
        accountName: body.accountName,
        accountNameEn: body.accountNameEn ?? null,
        accountType: body.accountType,
        parentAccountId: body.parentAccountId ?? null,
        level: body.level ?? 0,
        isPostable: body.isPostable ?? true,
        isControlAccount: body.isControlAccount ?? false,
        isActive: true,
        openingBalance: body.openingBalance ?? 0,
        currencyCode: body.currencyCode ?? 'IRR',
        description: body.description ?? null,
        metadata: {},
      },
    })

    return jsonResponse({ data: toDTO(account) }, 201)
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create account', statusCode: 500 })
  }
}

function toDTO(a: any) {
  return {
    id: a.id, accountCode: a.accountCode, accountName: a.accountName,
    accountNameEn: a.accountNameEn, accountType: a.accountType,
    parentAccountId: a.parentAccountId, level: a.level,
    isPostable: a.isPostable, isControlAccount: a.isControlAccount,
    isActive: a.isActive, openingBalance: a.openingBalance,
    currencyCode: a.currencyCode, description: a.description,
  }
}

function buildTree(accounts: any[]): any[] {
  const map = new Map<string, any>()
  const roots: any[] = []
  for (const a of accounts) { map.set(a.id, { ...toDTO(a), children: [] }) }
  for (const a of accounts) {
    const node = map.get(a.id)!
    if (a.parentAccountId && map.has(a.parentAccountId)) {
      map.get(a.parentAccountId)!.children.push(node)
    } else { roots.push(node) }
  }
  return roots
}
