/**
 * Notification Service — Core Dispatcher + Retry Engine (LAW-55/56/57)
 * =====================================================================
 *
 * The Notification Context's central service. Responsibilities:
 *
 *   dispatch(input)         — render template, dedupe by idempotencyKey,
 *                             create Notification + Queue item, publish
 *                             outbox events (LAW-55 + LAW-57).
 *
 *   processQueueItem(...)   — retry engine. Locks a queue item, calls the
 *                             channel provider, records the delivery, and
 *                             on failure schedules a backoff retry or
 *                             moves the item to the DLQ (LAW-57).
 *
 *   cancel(...)             — terminal cancellation (clears queue items).
 *
 *   retry(...)              — manual retry of a DLQ'd notification.
 *
 *   list / getById / getStats — read-side helpers for the admin UI.
 *
 * Architecture laws:
 *   LAW-08: Every state change publishes an outbox event
 *   LAW-55: Notifications Must Be Template-Based (versioned, language-aware)
 *   LAW-56: Notification Delivery Must Be Channel-Agnostic
 *   LAW-57: Notification Delivery Must Be Retryable And Idempotent
 */

import { db } from '@/lib/db'
import { getTenantId } from '@/lib/api-helpers'
import {
  UnitOfWork,
  NotFoundException,
  BusinessException,
} from '@/lib/shared'
import { renderTemplate } from './template-engine'
import { getProvider } from './providers'
import type {
  Channel,
  DispatchInput,
  DispatchResult,
  NotificationStatus,
} from './types'

// ============================================================
// Backoff schedule (LAW-57)
// ============================================================

/**
 * Retry backoff in seconds, indexed by `attempt - 1`.
 *
 *   attempt 1 fails → wait 60s
 *   attempt 2 fails → wait 300s   (5 min)
 *   attempt 3 fails → wait 1800s  (30 min)
 *   attempt 4 fails → wait 7200s  (2 hours)
 *   attempt 5 fails → DLQ (terminal)
 *
 * maxAttempts defaults to 5 (see dispatch step 6).
 */
const BACKOFF_SCHEDULE_SECONDS = [60, 300, 1800, 7200]

/** Maximum attempts per notification (LAW-57). */
const DEFAULT_MAX_ATTEMPTS = 5

// ============================================================
// Service
// ============================================================

export class NotificationService {
  // ----------------------------------------------------------
  // dispatch (LAW-55 + LAW-57)
  // ----------------------------------------------------------

  /**
   * Render the named template, dedupe by `input.idempotencyKey`, create a
   * Notification + Queue item inside a transaction, and publish outbox
   * events `notification.created` and `notification.queued`.
   *
   * Idempotent: a second call with the same idempotencyKey returns the
   * existing notification with `created: false`.
   */
  async dispatch(input: DispatchInput): Promise<DispatchResult> {
    const tenantId = await getTenantId()

    // 1. Idempotency pre-check (LAW-57)
    const existing = await db.notification.findUnique({
      where: { tenantId_idempotencyKey: { tenantId, idempotencyKey: input.idempotencyKey } },
    })
    if (existing) {
      return {
        notificationId: existing.id,
        status: existing.status as NotificationStatus,
        created: false,
        message: 'idempotent_hit',
      }
    }

    // 2. Find the published template (LAW-55: versioned, language-aware)
    const template = await this.findTemplate(tenantId, input.templateCode, input.language)
    if (!template) {
      throw new NotFoundException('NOTIFICATION_TEMPLATE', input.templateCode)
    }

    // 3. Resolve channel — caller override wins, else template's channel
    const channel: Channel = (input.channel ?? (template.channel as Channel)) as Channel

    // 4. Render (LAW-55: deterministic)
    const rendered = renderTemplate({
      subjectTemplate: template.subjectTemplate,
      bodyTemplate: template.bodyTemplate,
      variables: input.variables,
    })
    if (rendered.warnings.length > 0) {
      console.warn(
        `[notification] template "${template.code}" v${template.version} produced ` +
          `${rendered.warnings.length} warning(s): ${rendered.warnings.join('; ')}`,
      )
    }

    // 5. Persist inside a UoW (LAW-08: outbox events in same transaction)
    const now = new Date()
    const priority = input.priority ?? 100
    const language = input.language ?? template.language

    try {
      const notification = await UnitOfWork.execute(async (uow) => {
        // (a) Create Notification with status=pending
        const notif = await uow.tx.notification.create({
          data: {
            tenantId,
            templateId: template.id,
            templateCode: template.code,
            templateVersion: template.version,
            language,
            recipientId: input.recipientId ?? null,
            recipientName: input.recipientName ?? null,
            recipientAddress: input.recipientAddress,
            channel,
            status: 'pending',
            payload: input.variables as any,
            renderedSubject: rendered.subject,
            renderedBody: rendered.body,
            idempotencyKey: input.idempotencyKey,
          },
        })

        // (b) Create Queue item (LAW-57)
        await uow.tx.notificationQueue.create({
          data: {
            tenantId,
            notificationId: notif.id,
            priority,
            attempt: 0,
            maxAttempts: DEFAULT_MAX_ATTEMPTS,
            nextRetryAt: now,
            inDeadLetter: false,
          },
        })

        // (c) Outbox: notification.created
        await uow.outbox.append({
          tenantId,
          aggregateType: 'Notification',
          aggregateId: notif.id,
          eventType: 'notification.created',
          eventVersion: '1.0',
          payload: {
            notificationId: notif.id,
            templateCode: template.code,
            templateVersion: template.version,
            language,
            channel,
            recipientId: input.recipientId ?? null,
            recipientAddress: input.recipientAddress,
            triggeredByEvent: input.triggeredByEvent ?? null,
            status: 'pending',
          },
          actorId: null,
        })

        // (d) Transition to queued
        const updated = await uow.tx.notification.update({
          where: { id: notif.id },
          data: { status: 'queued', queuedAt: now },
        })

        // (e) Outbox: notification.queued
        await uow.outbox.append({
          tenantId,
          aggregateType: 'Notification',
          aggregateId: notif.id,
          eventType: 'notification.queued',
          eventVersion: '1.0',
          payload: {
            notificationId: notif.id,
            priority,
            maxAttempts: DEFAULT_MAX_ATTEMPTS,
            queuedAt: now.toISOString(),
          },
          actorId: null,
        })

        return updated
      })

      console.log(
        `[notification] dispatched ${template.code} v${template.version} ` +
          `(${channel}) → notification ${notification.id} [queued]`,
      )

      return {
        notificationId: notification.id,
        status: 'queued',
        created: true,
      }
    } catch (err: any) {
      // P2002: unique constraint violation — race condition (another worker
      // created the same idempotencyKey concurrently). Refetch and return
      // as idempotent hit (LAW-57).
      if (err?.code === 'P2002') {
        const raced = await db.notification.findUnique({
          where: {
            tenantId_idempotencyKey: { tenantId, idempotencyKey: input.idempotencyKey },
          },
        })
        if (raced) {
          console.log(
            `[notification] race-condition idempotent hit for key=${input.idempotencyKey}`,
          )
          return {
            notificationId: raced.id,
            status: raced.status as NotificationStatus,
            created: false,
            message: 'idempotent_hit_after_race',
          }
        }
      }
      throw err
    }
  }

  // ----------------------------------------------------------
  // processQueueItem — retry engine (LAW-57)
  // ----------------------------------------------------------

  /**
   * Process a single queue item end-to-end. Called by the queue worker
   * (cron / manual). Behaviour:
   *
   *   - Skip if already locked or in DLQ
   *   - Skip if notification is in a terminal state (sent / cancelled)
   *   - DLQ immediately if next attempt would exceed maxAttempts
   *   - Otherwise: pick provider, create delivery, send
   *     - Success → mark sent (terminal)
   *     - Failure → schedule backoff retry, or DLQ on final attempt
   */
  async processQueueItem(
    queueItemId: string,
    workerId: string,
  ): Promise<{
    status: 'sent' | 'failed' | 'retrying' | 'dead_lettered' | 'skipped'
    message?: string
  }> {
    const now = new Date()

    // 1. Conditional lock (LAW-57: only if not DLQ'd and not locked)
    const lockResult = await db.notificationQueue.updateMany({
      where: { id: queueItemId, inDeadLetter: false, lockedBy: null },
      data: { lockedBy: workerId, lockedAt: now },
    })
    if (lockResult.count === 0) {
      return { status: 'skipped', message: 'already_locked_or_in_dlq' }
    }

    // 2. Load queue item
    const queueItem = await db.notificationQueue.findUnique({
      where: { id: queueItemId },
    })
    if (!queueItem) {
      return { status: 'skipped', message: 'queue_item_not_found' }
    }

    // 3. Load notification; skip + unlock if terminal
    const notification = await db.notification.findUnique({
      where: { id: queueItem.notificationId },
    })
    if (!notification) {
      await this.unlockQueueItem(queueItemId)
      return { status: 'skipped', message: 'notification_not_found' }
    }
    if (notification.status === 'sent' || notification.status === 'cancelled') {
      await this.unlockQueueItem(queueItemId)
      return {
        status: 'skipped',
        message: `notification_${notification.status}`,
      }
    }

    // 4. Compute next attempt; pre-check DLQ (defensive — should rarely fire
    //    because the queue item is normally already in DLQ at this point)
    const newAttempt = queueItem.attempt + 1
    if (newAttempt > queueItem.maxAttempts) {
      await UnitOfWork.execute(async (uow) => {
        await uow.tx.notificationQueue.update({
          where: { id: queueItemId },
          data: {
            inDeadLetter: true,
            deadLetterAt: now,
            deadLetterReason: 'max_attempts_exceeded',
          },
        })
        await uow.tx.notification.update({
          where: { id: notification.id },
          data: { status: 'failed', failedAt: now },
        })
        await uow.outbox.append({
          tenantId: notification.tenantId,
          aggregateType: 'Notification',
          aggregateId: notification.id,
          eventType: 'notification.failed',
          eventVersion: '1.0',
          payload: {
            notificationId: notification.id,
            movedToDLQ: true,
            reason: 'max_attempts_exceeded',
            attempts: queueItem.attempt,
            maxAttempts: queueItem.maxAttempts,
          },
          actorId: null,
        })
      })
      console.error(
        `[notification] DLQ ${notification.id} — max_attempts_exceeded ` +
          `(attempts=${queueItem.attempt}, max=${queueItem.maxAttempts})`,
      )
      return { status: 'dead_lettered', message: 'max_attempts_exceeded' }
    }

    // 5. Pick provider (LAW-56)
    const provider = getProvider(notification.channel as Channel)

    // 6. Create NotificationDelivery row (attempt, sending)
    const delivery = await db.notificationDelivery.create({
      data: {
        tenantId: notification.tenantId,
        notificationId: notification.id,
        provider: provider.name,
        attempt: newAttempt,
        status: 'sending',
        durationMs: 0,
        createdAt: now,
      },
    })

    // 7. Mark notification as sending
    await db.notification.update({
      where: { id: notification.id },
      data: { status: 'sending' },
    })

    // 8. Send via provider (never throws — returns failure result)
    const sendResult = await provider.send({
      to: notification.recipientAddress,
      subject: notification.renderedSubject,
      body: notification.renderedBody,
      variables: (notification.payload as Record<string, any>) ?? {},
    })

    // 9. Success path
    if (sendResult.success) {
      await UnitOfWork.execute(async (uow) => {
        await uow.tx.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: 'sent',
            response: (sendResult.providerResponse as any) ?? null,
            durationMs: sendResult.durationMs,
          },
        })
        await uow.tx.notification.update({
          where: { id: notification.id },
          data: {
            status: 'sent',
            messageId: sendResult.messageId ?? null,
            sentAt: now,
            // Clear any previous error info from earlier failed attempts
            errorCode: null,
            errorMessage: null,
          },
        })
        await uow.tx.notificationQueue.update({
          where: { id: queueItemId },
          data: { attempt: newAttempt },
          // lockedBy/lockedAt left set — terminal state, won't be picked up again
        })
        await uow.outbox.append({
          tenantId: notification.tenantId,
          aggregateType: 'Notification',
          aggregateId: notification.id,
          eventType: 'notification.sent',
          eventVersion: '1.0',
          payload: {
            notificationId: notification.id,
            provider: provider.name,
            attempt: newAttempt,
            messageId: sendResult.messageId ?? null,
            durationMs: sendResult.durationMs,
          },
          actorId: null,
        })
      })
      console.log(
        `[notification] sent ${notification.id} via ${provider.name} ` +
          `(attempt ${newAttempt}/${queueItem.maxAttempts}, ${sendResult.durationMs}ms)`,
      )
      return { status: 'sent' }
    }

    // 10. Failure path
    console.error(
      `[notification] send failed for ${notification.id} via ${provider.name} ` +
        `(attempt ${newAttempt}/${queueItem.maxAttempts}): ${sendResult.errorMessage}`,
    )

    const isFinalAttempt = newAttempt >= queueItem.maxAttempts

    if (isFinalAttempt) {
      // 10a. Move to DLQ
      await UnitOfWork.execute(async (uow) => {
        await uow.tx.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: 'failed',
            errorMessage: sendResult.errorMessage ?? null,
            durationMs: sendResult.durationMs,
          },
        })
        await uow.tx.notificationQueue.update({
          where: { id: queueItemId },
          data: {
            attempt: newAttempt,
            inDeadLetter: true,
            deadLetterAt: now,
            deadLetterReason: sendResult.errorMessage ?? 'unknown_error',
          },
        })
        await uow.tx.notification.update({
          where: { id: notification.id },
          data: {
            status: 'failed',
            failedAt: now,
            errorCode: 'DELIVERY_FAILED',
            errorMessage: sendResult.errorMessage ?? 'unknown_error',
          },
        })
        await uow.outbox.append({
          tenantId: notification.tenantId,
          aggregateType: 'Notification',
          aggregateId: notification.id,
          eventType: 'notification.failed',
          eventVersion: '1.0',
          payload: {
            notificationId: notification.id,
            movedToDLQ: true,
            attempt: newAttempt,
            maxAttempts: queueItem.maxAttempts,
            provider: provider.name,
            errorMessage: sendResult.errorMessage ?? null,
          },
          actorId: null,
        })
      })
      return { status: 'dead_lettered', message: sendResult.errorMessage }
    }

    // 10b. Schedule a backoff retry
    const backoffIndex = Math.min(newAttempt - 1, BACKOFF_SCHEDULE_SECONDS.length - 1)
    const backoffSeconds = BACKOFF_SCHEDULE_SECONDS[backoffIndex]
    const nextRetryAt = new Date(now.getTime() + backoffSeconds * 1000)

    await UnitOfWork.execute(async (uow) => {
      await uow.tx.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'failed',
          errorMessage: sendResult.errorMessage ?? null,
          durationMs: sendResult.durationMs,
        },
      })
      await uow.tx.notificationQueue.update({
        where: { id: queueItemId },
        data: {
          attempt: newAttempt,
          nextRetryAt,
          // Unlock so the worker can pick it up at nextRetryAt
          lockedBy: null,
          lockedAt: null,
        },
      })
      await uow.tx.notification.update({
        where: { id: notification.id },
        data: {
          status: 'retrying',
          errorCode: 'DELIVERY_FAILED',
          errorMessage: sendResult.errorMessage ?? null,
        },
      })
      await uow.outbox.append({
        tenantId: notification.tenantId,
        aggregateType: 'Notification',
        aggregateId: notification.id,
        eventType: 'notification.retrying',
        eventVersion: '1.0',
        payload: {
          notificationId: notification.id,
          attempt: newAttempt,
          maxAttempts: queueItem.maxAttempts,
          nextRetryAt: nextRetryAt.toISOString(),
          backoffSeconds,
          provider: provider.name,
          errorMessage: sendResult.errorMessage ?? null,
        },
        actorId: null,
      })
    })

    console.log(
      `[notification] retrying ${notification.id} in ${backoffSeconds}s ` +
        `(attempt ${newAttempt}/${queueItem.maxAttempts})`,
    )
    return { status: 'retrying', message: `next_retry_in_${backoffSeconds}s` }
  }

  // ----------------------------------------------------------
  // cancel (LAW-57)
  // ----------------------------------------------------------

  /**
   * Cancel a notification that hasn't reached a terminal state.
   * Marks the notification as `cancelled` and pushes its queue items
   * into the DLQ with reason 'cancelled' so they won't be picked up.
   */
  async cancel(
    notificationId: string,
    cancelledBy: string,
    reason: string,
  ): Promise<void> {
    const notification = await db.notification.findUnique({
      where: { id: notificationId },
    })
    if (!notification) {
      throw new NotFoundException('Notification', notificationId)
    }
    if (notification.status === 'sent' || notification.status === 'cancelled') {
      throw new BusinessException(
        `Cannot cancel notification in terminal status: ${notification.status}`,
        'NOTIFICATION_TERMINAL',
        422,
      )
    }

    const now = new Date()
    await UnitOfWork.execute(async (uow) => {
      await uow.tx.notification.update({
        where: { id: notificationId },
        data: {
          status: 'cancelled',
          cancelledAt: now,
          cancelledBy,
          cancelReason: reason,
        },
      })
      // Push all queue items to DLQ with reason 'cancelled' so the worker
      // won't pick them up again.
      await uow.tx.notificationQueue.updateMany({
        where: { notificationId },
        data: {
          inDeadLetter: true,
          deadLetterAt: now,
          deadLetterReason: 'cancelled',
          lockedBy: null,
          lockedAt: null,
        },
      })
      await uow.outbox.append({
        tenantId: notification.tenantId,
        aggregateType: 'Notification',
        aggregateId: notificationId,
        eventType: 'notification.cancelled',
        eventVersion: '1.0',
        payload: {
          notificationId,
          cancelledBy,
          cancelReason: reason,
          cancelledAt: now.toISOString(),
        },
        actorId: cancelledBy,
      })
    })

    console.log(
      `[notification] cancelled ${notificationId} by ${cancelledBy}: ${reason}`,
    )
  }

  // ----------------------------------------------------------
  // retry (LAW-57 — manual retry of DLQ'd)
  // ----------------------------------------------------------

  /**
   * Manually retry a failed or DLQ'd notification. Resets the queue item
   * to attempt=0 and moves the notification back to `queued`.
   *
   * Throws if the notification is in a terminal state (sent / cancelled).
   */
  async retry(notificationId: string): Promise<void> {
    const notification = await db.notification.findUnique({
      where: { id: notificationId },
    })
    if (!notification) {
      throw new NotFoundException('Notification', notificationId)
    }
    if (notification.status === 'sent' || notification.status === 'cancelled') {
      throw new BusinessException(
        `Cannot retry notification in terminal status: ${notification.status}`,
        'NOTIFICATION_TERMINAL',
        422,
      )
    }

    const now = new Date()
    await UnitOfWork.execute(async (uow) => {
      // Reset ALL queue items for this notification
      await uow.tx.notificationQueue.updateMany({
        where: { notificationId },
        data: {
          attempt: 0,
          nextRetryAt: now,
          inDeadLetter: false,
          deadLetterAt: null,
          deadLetterReason: null,
          lockedBy: null,
          lockedAt: null,
        },
      })
      await uow.tx.notification.update({
        where: { id: notificationId },
        data: {
          status: 'queued',
          errorCode: null,
          errorMessage: null,
          failedAt: null,
        },
      })
      await uow.outbox.append({
        tenantId: notification.tenantId,
        aggregateType: 'Notification',
        aggregateId: notificationId,
        eventType: 'notification.retried',
        eventVersion: '1.0',
        payload: {
          notificationId,
          retriedAt: now.toISOString(),
        },
        actorId: null,
      })
    })

    console.log(`[notification] manual retry of ${notificationId}`)
  }

  // ----------------------------------------------------------
  // Read-side: list
  // ----------------------------------------------------------

  async list(filters: {
    tenantId: string
    status?: NotificationStatus
    channel?: Channel
    recipientId?: string
    page?: number
    perPage?: number
  }): Promise<{ data: any[]; total: number }> {
    const page = Math.max(1, filters.page ?? 1)
    const perPage = Math.min(100, Math.max(1, filters.perPage ?? 20))

    const where: any = { tenantId: filters.tenantId }
    if (filters.status) where.status = filters.status
    if (filters.channel) where.channel = filters.channel
    if (filters.recipientId) where.recipientId = filters.recipientId

    const [data, total] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          _count: { select: { deliveries: true } },
        },
      }),
      db.notification.count({ where }),
    ])

    return { data, total }
  }

  // ----------------------------------------------------------
  // Read-side: getById
  // ----------------------------------------------------------

  async getById(tenantId: string, id: string): Promise<any | null> {
    return db.notification.findFirst({
      where: { id, tenantId },
      include: {
        deliveries: { orderBy: { attempt: 'asc' } },
        queueItems: { orderBy: { createdAt: 'asc' } },
        template: {
          select: {
            id: true,
            code: true,
            version: true,
            name: true,
            language: true,
            channel: true,
          },
        },
      },
    })
  }

  // ----------------------------------------------------------
  // Read-side: getStats (dashboard)
  // ----------------------------------------------------------

  async getStats(tenantId: string): Promise<{
    queued: number
    sending: number
    sentToday: number
    failed: number
    retrying: number
    dlq: number
    byChannel: Record<Channel, number>
    successRate: number
    avgDeliveryMs: number | null
  }> {
    const now = new Date()
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    )

    const [
      queued,
      sending,
      sentToday,
      failed,
      retrying,
      dlq,
      byChannelRaw,
      sentTotal,
      avgDelivery,
    ] = await Promise.all([
      db.notification.count({
        where: { tenantId, status: { in: ['pending', 'queued'] } },
      }),
      db.notification.count({ where: { tenantId, status: 'sending' } }),
      db.notification.count({
        where: { tenantId, status: 'sent', sentAt: { gte: todayStart } },
      }),
      db.notification.count({ where: { tenantId, status: 'failed' } }),
      db.notification.count({ where: { tenantId, status: 'retrying' } }),
      db.notificationQueue.count({ where: { tenantId, inDeadLetter: true } }),
      db.notification.groupBy({
        by: ['channel'],
        where: { tenantId },
        _count: true,
      }),
      db.notification.count({ where: { tenantId, status: 'sent' } }),
      db.notificationDelivery.aggregate({
        where: { tenantId, status: 'sent' },
        _avg: { durationMs: true },
      }),
    ])

    // Build the byChannel record — default every channel to 0
    const byChannel: Record<Channel, number> = {
      email: 0,
      sms: 0,
      whatsapp: 0,
      push: 0,
      inapp: 0,
    }
    for (const row of byChannelRaw) {
      byChannel[row.channel as Channel] = row._count
    }

    // successRate = sent / (sent + failed) * 100, rounded to 2 decimals.
    // 0 when no sent+failed (avoids divide-by-zero).
    const denom = sentTotal + failed
    const successRate =
      denom === 0 ? 0 : Math.round((sentTotal / denom) * 10000) / 100

    const avgDeliveryMs = avgDelivery._avg.durationMs ?? null

    return {
      queued,
      sending,
      sentToday,
      failed,
      retrying,
      dlq,
      byChannel,
      successRate,
      avgDeliveryMs,
    }
  }

  // ----------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------

  /**
   * Find the latest published template for `code` with language fallback.
   * Order: input.language (if given) → 'fa' → any.
   *
   * Filters (LAW-55):
   *   - status = 'published'
   *   - effectiveFrom <= now
   *   - effectiveTo IS NULL OR effectiveTo >= now
   *   - deletedAt IS NULL
   * Sort: version DESC (latest published version wins).
   */
  private async findTemplate(
    tenantId: string,
    code: string,
    language?: string,
  ): Promise<any | null> {
    const now = new Date()
    const baseWhere = {
      tenantId,
      code,
      status: 'published',
      deletedAt: null,
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
    }

    // Try preferred language, then 'fa' as a fallback
    const preferredLanguages = language ? [language, 'fa'] : ['fa']
    for (const lang of preferredLanguages) {
      const tpl = await db.notificationTemplate.findFirst({
        where: { ...baseWhere, language: lang },
        orderBy: { version: 'desc' },
      })
      if (tpl) return tpl
    }

    // Final fallback: any language
    return db.notificationTemplate.findFirst({
      where: baseWhere,
      orderBy: { version: 'desc' },
    })
  }

  /** Release the lock on a queue item (used on early-skip paths). */
  private async unlockQueueItem(queueItemId: string): Promise<void> {
    await db.notificationQueue
      .update({
        where: { id: queueItemId },
        data: { lockedBy: null, lockedAt: null },
      })
      .catch(() => {
        // Swallow — best-effort unlock
      })
  }
}
