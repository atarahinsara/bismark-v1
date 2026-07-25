import { db } from '@/lib/db'
import { getTenantId } from '@/lib/api-helpers'
import crypto from 'crypto'

/**
 * Idempotency Helper — LAW-06 implementation.
 *
 * Ensures that POST operations with the same Idempotency-Key
 * return the same response without re-executing side effects.
 *
 * Usage in API route:
 *   const idempotent = await IdempotencyHelper.check(request)
 *   if (idempotent.cached) return idempotent.response
 *   // ... execute operation ...
 *   await IdempotencyHelper.store(request, response, statusCode)
 *   return response
 */
export class IdempotencyHelper {
  /**
   * Check if this request has been processed before.
   * Returns cached response if found, or a context to store the new response.
   */
  static async check(request: Request): Promise<{
    cached: boolean
    response?: Response
    key?: string
    requestHash?: string
  }> {
    const idempotencyKey = request.headers.get('Idempotency-Key')
    if (!idempotencyKey) {
      // No idempotency key — proceed normally (not idempotent)
      return { cached: false }
    }

    const tenantId = await getTenantId()
    const body = await request.clone().text()
    const requestHash = crypto.createHash('sha256').update(body).digest('hex')
    const endpoint = `${request.method} ${new URL(request.url).pathname}`

    const existing = await db.idempotencyKey.findUnique({
      where: { tenantId_key: { tenantId, key: idempotencyKey } },
    })

    if (!existing) {
      return { cached: false, key: idempotencyKey, requestHash }
    }

    // Key exists — check if same request
    if (existing.requestHash !== requestHash) {
      // Same key, different body — conflict
      return {
        cached: true,
        response: new Response(
          JSON.stringify({
            type: 'https://docs.bismark.api/errors/idempotency-key-reuse',
            title: 'Idempotency Key Reuse',
            status: 409,
            detail: 'This Idempotency-Key was used with a different request body.',
            code: 'IDEMPOTENCY_KEY_REUSE',
            correlation_id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } },
        ),
      }
    }

    // Same key, same body — return cached response
    return {
      cached: true,
      response: new Response(existing.responseBody, {
        status: existing.responseStatus,
        headers: { 'Content-Type': 'application/json' },
      }),
    }
  }

  /**
   * Store the response for future idempotent requests.
   *
   * If `requestBody` is provided, it is used directly as the body for hashing
   * (avoids re-cloning the request stream which throws "TypeError: unusable"
   * after `request.json()` has consumed the body in some runtimes).
   * Otherwise, falls back to `request.clone().text()`.
   */
  static async store(
    request: Request,
    responseBody: string,
    responseStatus: number,
    requestBody?: string,
  ): Promise<void> {
    const idempotencyKey = request.headers.get('Idempotency-Key')
    if (!idempotencyKey) return

    const tenantId = await getTenantId()
    const body = requestBody ?? (await request.clone().text())
    const requestHash = crypto.createHash('sha256').update(body).digest('hex')
    const endpoint = `${request.method} ${new URL(request.url).pathname}`

    await db.idempotencyKey.create({
      data: {
        tenantId,
        key: idempotencyKey,
        endpoint,
        requestHash,
        responseBody,
        responseStatus,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      },
    }).catch(() => {
      // Ignore unique constraint violations (race condition — another request stored first)
    })
  }
}
