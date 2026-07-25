import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  getTenantId,
  jsonResponse,
  errorResponse,
  parseQueryParams,
} from '@/lib/api-helpers'
import { IdempotencyHelper } from '@/lib/shared'
import {
  DomainException,
  ValidationException,
} from '@/lib/shared'
import { validateTemplate } from '@/lib/modules/notification'

/**
 * GET /api/v1/notification/templates
 * List notification templates (LAW-55: versioned, language-aware).
 *
 * Query params:
 *   page, per_page, status, channel, language, code
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId()
    const params = parseQueryParams(request)
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const channel = url.searchParams.get('channel')
    const language = url.searchParams.get('language')
    const code = url.searchParams.get('code')

    const where: any = { tenantId, deletedAt: null }
    if (status) where.status = status
    if (channel) where.channel = channel
    if (language) where.language = language
    if (code) where.code = code

    const [templates, total] = await Promise.all([
      db.notificationTemplate.findMany({
        where,
        include: { _count: { select: { notifications: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      db.notificationTemplate.count({ where }),
    ])

    return jsonResponse({
      data: templates.map(toDTO),
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
        errors: (e as ValidationException).errors,
      })
    return errorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to list notification templates',
      statusCode: 500,
    })
  }
}

/**
 * POST /api/v1/notification/templates
 * Create a draft notification template (LAW-55: status='draft', version=1).
 *
 * Body: { code, name, language, channel, subjectTemplate?, bodyTemplate,
 *         variablesSchema?, description? }
 */
export async function POST(request: NextRequest) {
  try {
    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    // Read body once as text, then parse manually — see send/route.ts for rationale.
    const rawBody = await request.text()
    const body = JSON.parse(rawBody)

    // Required fields
    const errors: Array<{ field: string; message: string; code: string }> = []
    if (!body.code)
      errors.push({ field: 'code', message: 'Required', code: 'REQUIRED' })
    if (!body.name)
      errors.push({ field: 'name', message: 'Required', code: 'REQUIRED' })
    if (!body.bodyTemplate)
      errors.push({
        field: 'bodyTemplate',
        message: 'Required',
        code: 'REQUIRED',
      })
    if (!body.channel)
      errors.push({
        field: 'channel',
        message: 'Required',
        code: 'REQUIRED',
      })
    if (!body.language)
      errors.push({
        field: 'language',
        message: 'Required',
        code: 'REQUIRED',
      })
    if (errors.length > 0)
      throw new ValidationException('Validation failed', errors)

    const ALLOWED_CHANNELS = ['email', 'sms', 'whatsapp', 'push', 'inapp']
    const ALLOWED_LANGUAGES = ['fa', 'en', 'ar', 'ku']

    if (!ALLOWED_CHANNELS.includes(body.channel))
      throw new ValidationException(
        `Invalid channel: ${body.channel}. Allowed: ${ALLOWED_CHANNELS.join(', ')}`,
        [
          {
            field: 'channel',
            message: `Must be one of: ${ALLOWED_CHANNELS.join(', ')}`,
            code: 'INVALID',
          },
        ],
      )
    if (!ALLOWED_LANGUAGES.includes(body.language))
      throw new ValidationException(
        `Invalid language: ${body.language}. Allowed: ${ALLOWED_LANGUAGES.join(', ')}`,
        [
          {
            field: 'language',
            message: `Must be one of: ${ALLOWED_LANGUAGES.join(', ')}`,
            code: 'INVALID',
          },
        ],
      )

    // LAW-55: email templates must have a subject template
    if (body.channel === 'email' && !body.subjectTemplate)
      throw new ValidationException(
        'Email templates require a subjectTemplate',
        [
          {
            field: 'subjectTemplate',
            message: 'Required for email channel',
            code: 'REQUIRED',
          },
        ],
      )

    // Validate template structure — surface issues as warnings, don't block creation
    const validationIssues = validateTemplate(body.bodyTemplate)
    if (validationIssues.length > 0) {
      console.warn(
        `[notification] template "${body.code}" has validation warnings: ` +
          validationIssues.join('; '),
      )
    }

    const template = await db.notificationTemplate.create({
      data: {
        tenantId,
        code: body.code,
        name: body.name,
        version: 1,
        language: body.language,
        channel: body.channel,
        subjectTemplate: body.subjectTemplate ?? null,
        bodyTemplate: body.bodyTemplate,
        variablesSchema: body.variablesSchema ?? null,
        status: 'draft',
        description: body.description ?? null,
      },
      include: { _count: { select: { notifications: true } } },
    })

    const responseBody = JSON.stringify({
      data: toDTO(template),
      warnings: validationIssues,
    })
    await IdempotencyHelper.store(request, responseBody, 201, rawBody)
    return new Response(responseBody, {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    if (e instanceof DomainException)
      return errorResponse({
        code: e.code,
        message: e.message,
        statusCode: e.statusCode,
        errors: (e as ValidationException).errors,
      })
    return errorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to create notification template',
      statusCode: 500,
    })
  }
}

function toDTO(t: any) {
  return {
    id: t.id,
    code: t.code,
    name: t.name,
    version: t.version,
    language: t.language,
    channel: t.channel,
    subjectTemplate: t.subjectTemplate,
    bodyTemplate: t.bodyTemplate,
    variablesSchema: t.variablesSchema,
    status: t.status,
    effectiveFrom: t.effectiveFrom.toISOString(),
    effectiveTo: t.effectiveTo?.toISOString() ?? null,
    publishedAt: t.publishedAt?.toISOString() ?? null,
    description: t.description,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    notificationCount: t._count?.notifications ?? 0,
  }
}
