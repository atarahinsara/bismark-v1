/**
 * GET /api/v1/service-reports/[id]
 * Get a single service report by ID.
 */

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { DomainException, NotFoundException } from '@/lib/shared'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'service.read')

    const { id: reportId } = await params
    const tenantId = await getTenantId()

    const report = await db.serviceReport.findFirst({ where: { id: reportId, tenantId } })
    if (!report) throw new NotFoundException('ServiceReport', reportId)

    return jsonResponse({ data: report })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to get report', statusCode: 500 })
  }
}
