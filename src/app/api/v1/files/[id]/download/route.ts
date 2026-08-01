/**
 * GET /api/v1/files/[id]/download
 *
 * Download a file using a signed URL token.
 *
 * T-2-20: Verifies HMAC signature + expiry.
 * No authentication header required (token is the auth).
 *
 * Query: ?token=<signed_url_token>
 */

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { errorResponse } from '@/lib/api-helpers'
import { logger } from '@/lib/logger'

function getSigningKey(): string {
  return process.env.JWT_SECRET || process.env.FILE_URL_SECRET || 'bismark-dev-file-url-secret'
}

interface SignedPayload {
  fileId: string
  tenantId: string
  exp: number
}

/**
 * Verify a signed URL token.
 * Returns the payload if valid, null otherwise.
 */
async function verifySignedToken(token: string): Promise<SignedPayload | null> {
  try {
    const [payloadB64, sigB64] = token.split('.')
    if (!payloadB64 || !sigB64) return null

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(getSigningKey()),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    )

    const signature = Buffer.from(sigB64, 'base64url')
    const isValid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(payloadB64))
    if (!isValid) return null

    const payload: SignedPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'))

    // Check expiry
    if (Date.now() > payload.exp) return null

    return payload
  } catch {
    return null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: fileId } = await params
    const url = new URL(request.url)
    const token = url.searchParams.get('token')

    if (!token) {
      return errorResponse({ code: 'MISSING_TOKEN', message: 'Token required', statusCode: 401 })
    }

    // Verify token
    const payload = await verifySignedToken(token)
    if (!payload) {
      return errorResponse({ code: 'TOKEN_INVALID', message: 'Token invalid or expired', statusCode: 401 })
    }

    // Verify file ID matches
    if (payload.fileId !== fileId) {
      return errorResponse({ code: 'TOKEN_MISMATCH', message: 'Token does not match file', statusCode: 403 })
    }

    // Find file
    const file = await db.fileAttachment.findFirst({
      where: { id: fileId, tenantId: payload.tenantId },
    })

    if (!file) {
      return errorResponse({ code: 'NOT_FOUND', message: 'File not found', statusCode: 404 })
    }

    // Check virus scan status
    if (file.virusScanStatus === 'infected') {
      return errorResponse({ code: 'FILE_INFECTED', message: 'File is quarantined (virus infected)', statusCode: 403 })
    }

    // Read file from storage (sandbox: local filesystem)
    const fs = await import('fs/promises')
    const path = await import('path')
    const fullPath = path.join(process.cwd(), 'upload', payload.tenantId, file.entityType, file.entityId, path.basename(file.filePath))

    try {
      const fileBuffer = await fs.readFile(fullPath)

      logger.info({ fileId: file.id, fileName: file.fileName }, 'File downloaded via signed URL')

      return new Response(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': file.mimeType,
          'Content-Length': String(file.fileSize),
          'Content-Disposition': `attachment; filename="${file.fileName}"`,
          'Cache-Control': 'private, no-cache',
        },
      })
    } catch {
      return errorResponse({ code: 'FILE_NOT_FOUND', message: 'File not found on disk', statusCode: 404 })
    }
  } catch (e) {
    logger.error({ err: e }, 'File download failed')
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Download failed', statusCode: 500 })
  }
}
