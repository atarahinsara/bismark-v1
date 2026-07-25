import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper, DomainException, NotFoundException } from '@/lib/shared'
import { renderTemplate, validateTemplate } from '@/lib/modules/notification'

interface RouteCtx {
  params: Promise<{ id: string }>
}

/**
 * POST /api/v1/notification/templates/{id}/preview
 *
 * Render a template with sample variables (no DB write).
 *
 * Body: { variables: {} }
 *
 * Returns:
 *   - subject (string | null)
 *   - body (string)
 *   - warnings (string[] — from the renderer)
 *   - validationIssues (string[] — from validateTemplate)
 */
export async function POST(request: NextRequest, { params }: RouteCtx) {
  try {
    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const { id } = await params

    const template = await db.notificationTemplate.findFirst({
      where: { id, tenantId, deletedAt: null },
    })
    if (!template) throw new NotFoundException('NotificationTemplate', id)

    // Read body once as text, then parse manually — see send/route.ts for rationale.
    const rawBody = await request.text()
    let body: any = {}
    try {
      body = rawBody ? JSON.parse(rawBody) : {}
    } catch {
      /* invalid JSON — keep {} */
    }
    const variables =
      body.variables && typeof body.variables === 'object'
        ? body.variables
        : {}

    // Render (deterministic — LAW-55)
    const rendered = renderTemplate({
      subjectTemplate: template.subjectTemplate,
      bodyTemplate: template.bodyTemplate,
      variables,
    })

    // Also run validateTemplate so the UI can surface structural issues
    const validationIssues = validateTemplate(template.bodyTemplate)
    if (template.subjectTemplate) {
      const subjectIssues = validateTemplate(template.subjectTemplate)
      for (const issue of subjectIssues) {
        validationIssues.push(`[subject] ${issue}`)
      }
    }

    const responseBody = JSON.stringify({
      data: {
        templateId: template.id,
        code: template.code,
        version: template.version,
        language: template.language,
        channel: template.channel,
        subject: rendered.subject,
        body: rendered.body,
        warnings: rendered.warnings,
        validationIssues,
      },
    })
    await IdempotencyHelper.store(request, responseBody, 200, rawBody)
    return new Response(responseBody, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
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
      message: 'Failed to preview template',
      statusCode: 500,
    })
  }
}
