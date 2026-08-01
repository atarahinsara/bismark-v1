import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { IdempotencyHelper } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'

/**
 * GET /api/v1/surveys
 * List surveys with pagination.
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
      db.survey.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      db.survey.count({ where: { tenantId } }),
    ])

    return jsonResponse({
      data: items,
      meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list surveys', statusCode: 500 })
  }
}

/**
 * POST /api/v1/surveys
 * Create a new survey submission.
 * Required body: surveyType, customerId, answers
 * Optional: surveyTemplateId, relatedEntityType, relatedEntityId, overallRating, npsScore
 * Requires: crm.create
 *
 * Audit v3 F-02 fix: replaced `data: { tenantId, ...body }` template pattern
 * with explicit whitelist + validation + answers structure check.
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
    if (!body.surveyType) errors.push({ field: 'surveyType', message: 'Survey type is required', code: 'REQUIRED' })
    if (!body.customerId) errors.push({ field: 'customerId', message: 'Customer is required', code: 'REQUIRED' })
    if (!body.answers || !Array.isArray(body.answers) || body.answers.length === 0) {
      errors.push({ field: 'answers', message: 'Answers (non-empty array) are required', code: 'REQUIRED' })
    }
    if (errors.length > 0) throw new ValidationException('Missing required fields', errors)

    // Validate surveyType enum
    const validTypes = ['post_service', 'post_installation', 'post_purchase', 'periodic']
    if (!validTypes.includes(body.surveyType)) {
      throw new ValidationException('Invalid survey type', [
        { field: 'surveyType', message: `Must be one of: ${validTypes.join(', ')}`, code: 'INVALID_ENUM' },
      ])
    }

    // Validate answers structure
    for (let i = 0; i < body.answers.length; i++) {
      const a = body.answers[i]
      if (!a || typeof a !== 'object' || !a.question || a.answer === undefined) {
        throw new ValidationException(`Answer ${i + 1} is malformed`, [
          { field: `answers[${i}]`, message: 'Each answer must have { question, answer }', code: 'INVALID_STRUCTURE' },
        ])
      }
    }

    // Validate overallRating range
    if (body.overallRating !== undefined && body.overallRating !== null) {
      const r = Number(body.overallRating)
      if (Number.isNaN(r) || r < 1 || r > 5) {
        throw new ValidationException('Invalid overall rating', [
          { field: 'overallRating', message: 'Must be an integer between 1 and 5', code: 'OUT_OF_RANGE' },
        ])
      }
    }

    // Verify customer (Party) exists — loose FK (LAW-01)
    const customer = await db.party.findFirst({
      where: { id: body.customerId, tenantId, deletedAt: null },
    })
    if (!customer) throw new NotFoundException('Party', body.customerId)

    // Verify template exists if provided
    if (body.surveyTemplateId) {
      const template = await db.surveyTemplate.findFirst({
        where: { id: body.surveyTemplateId, tenantId },
      })
      if (!template) throw new NotFoundException('SurveyTemplate', body.surveyTemplateId)
    }

    const item = await db.survey.create({
      data: {
        tenantId,
        surveyTemplateId: body.surveyTemplateId ?? null,
        surveyType: body.surveyType,
        relatedEntityType: body.relatedEntityType ?? null,
        relatedEntityId: body.relatedEntityId ?? null,
        customerId: body.customerId,
        answers: body.answers,
        overallRating: body.overallRating ?? null,
        npsScore: body.npsScore ?? null,
        submittedAt: new Date(),
        status: 'submitted',
      },
    })

    const responseBody = JSON.stringify({ data: item })
    await IdempotencyHelper.store(request, responseBody, 201, rawBody)
    return new Response(responseBody, { status: 201, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create survey', statusCode: 500 })
  }
}
