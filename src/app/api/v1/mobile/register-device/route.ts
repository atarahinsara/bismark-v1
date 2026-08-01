/**
 * POST /api/v1/mobile/register-device
 *
 * T-4-01: Register a mobile device for a technician.
 *
 * Body:
 *   { deviceType, deviceName?, deviceModel?, osVersion?, appVersion?, pushToken?, deviceFingerprint? }
 *
 * Returns: deviceId (existing if same fingerprint, new otherwise)
 *
 * Requires: authenticated user (technician)
 */

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { requireAuth, unauthorizedResponse } from '@/lib/rbac'
import { DomainException, ValidationException, IdempotencyHelper } from '@/lib/shared'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const rawBody = await request.text()
    const body = rawBody ? JSON.parse(rawBody) : {}
    const tenantId = await getTenantId()

    // Validation
    if (!body.deviceType) {
      throw new ValidationException('Device type required', [
        { field: 'deviceType', message: 'Required (android|ios|pwa)', code: 'REQUIRED' },
      ])
    }

    const validTypes = ['android', 'ios', 'pwa']
    if (!validTypes.includes(body.deviceType)) {
      throw new ValidationException('Invalid device type', [
        { field: 'deviceType', message: `Must be one of: ${validTypes.join(', ')}`, code: 'INVALID_ENUM' },
      ])
    }

    // Generate device fingerprint if not provided
    const fingerprint = body.deviceFingerprint || `${ctx.userId}-${body.deviceType}-${Date.now()}`

    // Upsert device (if same fingerprint, update; otherwise create)
    const device = await db.device.upsert({
      where: {
        tenantId_userId_deviceFingerprint: {
          tenantId,
          userId: ctx.userId,
          deviceFingerprint: fingerprint,
        },
      },
      update: {
        deviceName: body.deviceName ?? null,
        deviceModel: body.deviceModel ?? null,
        osVersion: body.osVersion ?? null,
        appVersion: body.appVersion ?? null,
        pushToken: body.pushToken ?? null,
        lastSeenAt: new Date(),
        isActive: true,
      },
      create: {
        tenantId,
        userId: ctx.userId,
        deviceType: body.deviceType,
        deviceName: body.deviceName ?? null,
        deviceModel: body.deviceModel ?? null,
        osVersion: body.osVersion ?? null,
        appVersion: body.appVersion ?? null,
        pushToken: body.pushToken ?? null,
        deviceFingerprint: fingerprint,
        lastSeenAt: new Date(),
        isActive: true,
        metadata: {},
      },
    })

    logger.info({ deviceId: device.id, userId: ctx.userId, deviceType: body.deviceType }, 'Device registered')

    const responseBody = JSON.stringify({
      data: {
        deviceId: device.id,
        message: 'Device registered successfully',
      },
    })
    await IdempotencyHelper.store(request, responseBody, 201, rawBody)
    return new Response(responseBody, { status: 201, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    }
    logger.error({ err: e }, 'Device registration failed')
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Registration failed', statusCode: 500 })
  }
}
