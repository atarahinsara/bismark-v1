/**
 * POST /api/v1/mobile/jobs/[id]/check-in
 *
 * T-4-05: Technician check-in at customer location.
 *
 * Body: { latitude, longitude, accuracy? }
 *
 * Records GPS location + updates service order status to 'in_progress'.
 *
 * Requires: authenticated technician + service.create (job ownership verified)
 */

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, getCustomerPartyId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { DomainException, ValidationException, NotFoundException, ConflictException, IdempotencyHelper } from '@/lib/shared'
import { logger } from '@/lib/logger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'service.create')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const { id: serviceOrderId } = await params
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

    if (body.latitude < -90 || body.latitude > 90) {
      throw new ValidationException('Invalid latitude', [
        { field: 'latitude', message: 'Must be -90 to 90', code: 'OUT_OF_RANGE' },
      ])
    }

    if (body.longitude < -180 || body.longitude > 180) {
      throw new ValidationException('Invalid longitude', [
        { field: 'longitude', message: 'Must be -180 to 180', code: 'OUT_OF_RANGE' },
      ])
    }

    // Get technician party ID
    const partyId = await getCustomerPartyId(ctx.userId, tenantId)
    if (!partyId) {
      return errorResponse({ code: 'TECHNICIAN_NOT_LINKED', message: 'User not linked to a Party', statusCode: 400 })
    }

    // Find service order
    const serviceOrder = await db.serviceOrder.findFirst({
      where: { id: serviceOrderId, tenantId, deletedAt: null },
      include: { assignments: true },
    })

    if (!serviceOrder) {
      throw new NotFoundException('ServiceOrder', serviceOrderId)
    }

    // Verify technician is assigned to this job
    const isAssigned = serviceOrder.assignments.some(
      (a) => a.technicianPartyId === partyId && a.status === 'active',
    )
    if (!isAssigned) {
      return errorResponse({ code: 'NOT_ASSIGNED', message: 'You are not assigned to this job', statusCode: 403 })
    }

    // Check state — must not already be in_progress or completed
    if (serviceOrder.status === 'completed' || serviceOrder.status === 'closed') {
      throw new ConflictException(`Job already ${serviceOrder.status}`)
    }

    // Record technician location
    const location = await db.technicianLocation.create({
      data: {
        tenantId,
        technicianId: partyId,
        serviceOrderId,
        latitude: body.latitude,
        longitude: body.longitude,
        accuracy: body.accuracy ?? null,
        recordedAt: new Date(),
      },
    })

    // Update service order status
    const updated = await db.serviceOrder.update({
      where: { id: serviceOrderId },
      data: {
        status: 'in_progress',
        metadata: {
          ...(serviceOrder as any).metadata,
          checkedInAt: new Date().toISOString(),
          checkedInBy: ctx.userId,
          checkInLocation: { lat: body.latitude, lng: body.longitude },
        },
      },
    })

    // Emit outbox event
    await db.outboxMessage.create({
      data: {
        tenantId,
        aggregateType: 'ServiceOrder',
        aggregateId: serviceOrderId,
        eventType: 'technician.checked_in',
        eventVersion: '1.0',
        payload: {
          serviceOrderId,
          technicianId: partyId,
          location: { lat: body.latitude, lng: body.longitude },
          checkedInAt: new Date().toISOString(),
        },
        actorId: ctx.userId,
        status: 'pending',
      },
    })

    logger.info({
      serviceOrderId,
      technicianId: partyId,
      userId: ctx.userId,
      location: { lat: body.latitude, lng: body.longitude },
    }, 'Technician checked in')

    const responseBody = JSON.stringify({
      data: {
        message: 'Check-in successful',
        serviceOrderId,
        status: 'in_progress',
        locationId: location.id,
        checkedInAt: new Date().toISOString(),
      },
    })
    await IdempotencyHelper.store(request, responseBody, 200, rawBody)
    return new Response(responseBody, { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    }
    logger.error({ err: e }, 'Check-in failed')
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Check-in failed', statusCode: 500 })
  }
}
