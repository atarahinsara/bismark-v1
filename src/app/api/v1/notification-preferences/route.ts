import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  getTenantId,
  jsonResponse,
  errorResponse,
  parseQueryParams,
} from '@/lib/api-helpers'
import { DomainException } from '@/lib/shared'
import { preferenceService } from '@/lib/modules/notification'

/**
 * GET /api/v1/notification-preferences
 *
 * List all preferences for the tenant, or get one if ?userId=xxx is passed.
 *
 * Query: page, per_page, userId?
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId()
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')

    // Single-user fast path: get-or-create via preferenceService
    if (userId) {
      const pref = await preferenceService.getOrCreate(tenantId, userId)
      return jsonResponse({ data: toDTO(pref) })
    }

    // List all
    const params = parseQueryParams(request)
    const where = { tenantId }
    const [prefs, total] = await Promise.all([
      db.notificationPreference.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      db.notificationPreference.count({ where }),
    ])

    return jsonResponse({
      data: prefs.map(toDTO),
      meta: {
        page: params.page,
        per_page: params.perPage,
        total,
        last_page: Math.ceil(total / params.perPage) || 1,
      },
    })
  } catch (e) {
    if (e instanceof DomainException)
      return errorResponse({
        code: e.code,
        message: e.message,
        statusCode: e.statusCode,
      })
    return errorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch notification preferences',
      statusCode: 500,
    })
  }
}

function toDTO(p: any) {
  return {
    id: p.id,
    tenantId: p.tenantId,
    userId: p.userId,
    emailEnabled: p.emailEnabled,
    smsEnabled: p.smsEnabled,
    pushEnabled: p.pushEnabled,
    whatsappEnabled: p.whatsappEnabled,
    inappEnabled: p.inappEnabled,
    language: p.language,
    quietHoursStart: p.quietHoursStart,
    quietHoursEnd: p.quietHoursEnd,
    metadata: p.metadata,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }
}
