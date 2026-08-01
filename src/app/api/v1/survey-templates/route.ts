import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { IdempotencyHelper } from '@/lib/shared'
import { DomainException, ValidationException } from '@/lib/shared'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'

/**
 * GET /api/v1/survey-templates
 * List survey templates with pagination.
 * Requires: crm.read
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'crm.read')

    const tenantId = await getTenantId()
    const params = parseQueryParams(request)

    const [items, total] = await Promise.all([
      db.surveyTemplate.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      db.surveyTemplate.count({ where: { tenantId } }),
    ])

    return jsonResponse({
      data: items,
      meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list survey templates', statusCode: 500 })
  }
}

/**
 * POST /api/v1/survey-templates
 * Create a new survey template.
 * Required body: name, type, questions
 * Optional: isActive
 * Requires: crm.create
 *
 * Audit v3 F-02 fix: replaced `data: { tenantId, ...body }` template pattern
 * with explicit whitelist + validation + questions structure check.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'crm.create')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const rawBody = await request.text()
    const body = rawBody ? JSON.parse(rawBody) : {}
    const tenantId = await getTenantId()

    // Validation — required fields per Prisma schema
    const errors: Array<{ field: string; message: string; code: string }> = []
    if (!body.name) errors.push({ field: 'name', message: 'Name is required', code: 'REQUIRED' })
    if (!body.type) errors.push({ field: 'type', message: 'Type is required', code: 'REQUIRED' })
    if (!body.questions || !Array.isArray(body.questions) || body.questions.length === 0) {
      errors.push({ field: 'questions', message: 'Questions (non-empty array) are required', code: 'REQUIRED' })
    }
    if (errors.length > 0) throw new ValidationException('Missing required fields', errors)

    // Validate type enum
    const validTypes = ['post_service', 'post_installation', 'post_purchase', 'periodic']
    if (!validTypes.includes(body.type)) {
      throw new ValidationException('Invalid template type', [
        { field: 'type', message: `Must be one of: ${validTypes.join(', ')}`, code: 'INVALID_ENUM' },
      ])
    }

    // Validate questions structure
    for (let i = 0; i < body.questions.length; i++) {
      const q = body.questions[i]
      if (!q || typeof q !== 'object' || !q.question || !q.type) {
        throw new ValidationException(`Question ${i + 1} is malformed`, [
          { field: `questions[${i}]`, message: 'Each question must have { question, type }', code: 'INVALID_STRUCTURE' },
        ])
      }
    }

    const item = await db.surveyTemplate.create({
      data: {
        tenantId,
        name: body.name,
        type: body.type,
        questions: body.questions,
        isActive: body.isActive ?? true,
      },
    })

    const responseBody = JSON.stringify({ data: item })
    await IdempotencyHelper.store(request, responseBody, 201, rawBody)
    return new Response(responseBody, { status: 201, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create survey template', statusCode: 500 })
  }
}
