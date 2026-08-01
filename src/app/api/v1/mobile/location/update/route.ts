/**
 * POST /api/v1/mobile/location/update
 *
 * T-4-05 (support): Update technician GPS location during active job.
 *
 * Body: { latitude, longitude, accuracy?, speed?, heading?, serviceOrderId? }
 *
 * Requires: authenticated technician
 */

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, getCustomerPartyId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { requireAuth, unauthorizedResponse } from '@/lib/rbac'
import { DomainException, ValidationException, IdempotencyHelper } from '@/lib/shared'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const rawBody = await request.text()
    const body = rawBody ? JSON.parse(rawBody) : {}

    // Validation
    if (typeof body.latitude !== 'number' || typeof body.longitude !== 'number') {
      throw new ValidationException('GPS coordinates required', [
        { field: 'latitude', message: 'Number required', code: 'REQUIRED' },
        { field: 'longitude', message: 'Number required', code: 'REQUIRED' },
      ])
    }

    const partyId = await getCustomerPartyId(ctx.userId, tenantId)
    if (!partyId) {
      return errorResponse({ code: 'TECHNICIAN_NOT_LINKED', message: 'User not linked to a Party', statusCode: 400 })
    }

    // Store location (transient data — cleaned up periodically)
    const location = await db.technicianLocation.create({
      data: {
        tenantId,
        technicianId: partyId,
        serviceOrderId: body.serviceOrderId || null,
        latitude: body.latitude,
        longitude: body.longitude,
        accuracy: body.accuracy ?? null,
        speed: body.speed ?? null,
        heading: body.heading ?? null,
        recordedAt: new Date(),
      },
    })

    const responseBody = JSON.stringify({
      data: {
        locationId: location.id,
        recordedAt: location.recordedAt.toISOString(),
      },
    })
    await IdempotencyHelper.store(request, responseBody, 200, rawBody)
    return new Response(responseBody, { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    }
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Location update failed', statusCode: 500 })
  }
}
