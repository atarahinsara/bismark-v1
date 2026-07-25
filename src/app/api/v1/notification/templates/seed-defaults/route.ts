import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper, DomainException } from '@/lib/shared'

/**
 * POST /api/v1/notification/templates/seed-defaults
 *
 * Seed the 5 default notification templates from the Sprint 7.3 spec so the
 * UI has data to show. Each template is created as already `published`
 * (status='published', version=1, publishedAt=now, effectiveFrom=now).
 *
 * Idempotent at two levels:
 *   1. IdempotencyHelper.check/store (response caching via Idempotency-Key header)
 *   2. Internal pre-check: if a template with the same (code, language, channel)
 *      already exists, it's skipped (re-running is safe).
 *
 * Returns the list of seeded templates (or "already seeded" message).
 */
export async function POST(request: NextRequest) {
  try {
    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    // Read body once as text for idempotency hashing — see send/route.ts for rationale.
    const rawBody = await request.text().catch(() => '')
    const now = new Date()

    interface SeedSpec {
      code: string
      name: string
      channel: string
      language: string
      subjectTemplate: string | null
      bodyTemplate: string
      description: string
      variablesSchema: any
    }

    const SEEDS: SeedSpec[] = [
      {
        code: 'invoice.issued',
        name: 'Invoice Issued (Email / fa)',
        channel: 'email',
        language: 'fa',
        subjectTemplate: 'فاکتور {{invoice.number}} صادر شد',
        bodyTemplate:
          'سلام {{customer.name}}،\n\n' +
          'فاکتور شماره {{invoice.number}} به مبلغ {{invoice.total}} تومان توسط {{company.name}} صادر شد.\n' +
          'تاریخ: {{currentDate}}\n\n' +
          'با تشکر از همراهی شما.',
        description:
          'Email sent to the customer when a new invoice is issued.',
        variablesSchema: [
          { name: 'customer.name', type: 'string', required: true },
          { name: 'invoice.number', type: 'string', required: true },
          { name: 'invoice.total', type: 'string', required: true },
          { name: 'company.name', type: 'string', required: true },
          { name: 'currentDate', type: 'string', required: true },
        ],
      },
      {
        code: 'payment.received',
        name: 'Payment Received (SMS / fa)',
        channel: 'sms',
        language: 'fa',
        subjectTemplate: null,
        bodyTemplate:
          'پرداخت {{invoice.total}} تومان برای فاکتور {{invoice.number}} دریافت شد. {{company.name}}',
        description: 'SMS confirmation when a payment is received.',
        variablesSchema: [
          { name: 'invoice.total', type: 'string', required: true },
          { name: 'invoice.number', type: 'string', required: true },
          { name: 'company.name', type: 'string', required: true },
        ],
      },
      {
        code: 'shipment.delivered',
        name: 'Shipment Delivered (WhatsApp / fa)',
        channel: 'whatsapp',
        language: 'fa',
        subjectTemplate: null,
        bodyTemplate:
          'سلام {{customer.name}}،\n' +
          'محصول شما با کد رهگیری {{trackingCode}} تحویل داده شد.\n' +
          'تاریخ: {{currentDate}}',
        description:
          'WhatsApp message sent to the customer when a shipment is delivered.',
        variablesSchema: [
          { name: 'customer.name', type: 'string', required: true },
          { name: 'trackingCode', type: 'string', required: true },
          { name: 'currentDate', type: 'string', required: true },
        ],
      },
      {
        code: 'service_order.ready',
        name: 'Service Order Ready (Push / fa)',
        channel: 'push',
        language: 'fa',
        subjectTemplate: null,
        bodyTemplate:
          'سرویس شماره {{service.number}} آماده تحویل است. {{customer.name}}',
        description:
          'Push notification when a service order is ready for pickup.',
        variablesSchema: [
          { name: 'service.number', type: 'string', required: true },
          { name: 'customer.name', type: 'string', required: true },
        ],
      },
      {
        code: 'warranty.claim.approved',
        name: 'Warranty Claim Approved (Email / fa)',
        channel: 'email',
        language: 'fa',
        subjectTemplate: 'درخواست گارانتی شما تأیید شد',
        bodyTemplate:
          'سلام {{customer.name}}،\n\n' +
          'درخواست گارانتی شما با کد رهگیری {{trackingCode}} تأیید شد.\n' +
          'تاریخ انقضای گارانتی جدید: {{warranty.expiry}}\n\n' +
          '{{company.name}}',
        description:
          'Email sent when a warranty claim is approved and a new warranty is issued.',
        variablesSchema: [
          { name: 'customer.name', type: 'string', required: true },
          { name: 'warranty.expiry', type: 'string', required: true },
          { name: 'trackingCode', type: 'string', required: true },
          { name: 'company.name', type: 'string', required: true },
        ],
      },
    ]

    const seeded: any[] = []
    const skipped: any[] = []

    for (const spec of SEEDS) {
      // Check if any published/draft version of this code+language+channel exists
      const existing = await db.notificationTemplate.findFirst({
        where: {
          tenantId,
          code: spec.code,
          language: spec.language,
          channel: spec.channel,
          deletedAt: null,
        },
      })
      if (existing) {
        skipped.push({
          code: spec.code,
          language: spec.language,
          channel: spec.channel,
          existingId: existing.id,
          existingStatus: existing.status,
        })
        continue
      }

      const created = await db.notificationTemplate.create({
        data: {
          tenantId,
          code: spec.code,
          name: spec.name,
          version: 1,
          language: spec.language,
          channel: spec.channel,
          subjectTemplate: spec.subjectTemplate,
          bodyTemplate: spec.bodyTemplate,
          variablesSchema: spec.variablesSchema,
          status: 'published',
          effectiveFrom: now,
          publishedAt: now,
          description: spec.description,
        },
      })
      seeded.push({
        id: created.id,
        code: created.code,
        name: created.name,
        version: created.version,
        language: created.language,
        channel: created.channel,
        status: created.status,
        publishedAt: created.publishedAt?.toISOString() ?? null,
      })
    }

    const alreadySeeded = seeded.length === 0 && skipped.length === SEEDS.length

    const responseBody = JSON.stringify({
      data: {
        seeded,
        skipped,
        message: alreadySeeded
          ? 'All default templates were already seeded. No changes made.'
          : `Seeded ${seeded.length} new template(s); skipped ${skipped.length} existing one(s).`,
        totalCount: SEEDS.length,
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
      message: 'Failed to seed default templates',
      statusCode: 500,
    })
  }
}
