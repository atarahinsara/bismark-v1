/**
 * GET /api/v1/technician-jobs/[id]
 * Get a single technician job by ID.
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

    const { id: jobId } = await params
    const tenantId = await getTenantId()

    const job = await db.technicianJob.findFirst({ where: { id: jobId, tenantId } })
    if (!job) throw new NotFoundException('TechnicianJob', jobId)

    return jsonResponse({ data: job })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to get job', statusCode: 500 })
  }
}
