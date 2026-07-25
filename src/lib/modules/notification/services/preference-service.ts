/**
 * Notification Preference Service (LAW-56)
 * ========================================
 *
 * Manages per-user notification preferences: which channels are enabled,
 * preferred language, and quiet-hours windows.
 *
 * Used by the dispatcher (LAW-56) to decide whether a given notification
 * should be sent at all, and on which channel. In the current task the
 * service is a thin CRUD wrapper — the routing logic that consults it
 * lives in a future task.
 *
 * Architecture laws:
 *   LAW-08: Every state change publishes an outbox event
 *   LAW-56: Notification Delivery Must Be Channel-Agnostic (preference-driven)
 */

import { db } from '@/lib/db'
import { UnitOfWork } from '@/lib/shared'

// ============================================================
// Update input (all fields optional — partial update)
// ============================================================

export interface PreferenceUpdateInput {
  emailEnabled?: boolean
  smsEnabled?: boolean
  pushEnabled?: boolean
  whatsappEnabled?: boolean
  inappEnabled?: boolean
  language?: string
  quietHoursStart?: string | null
  quietHoursEnd?: string | null
}

// ============================================================
// Service
// ============================================================

export class PreferenceService {
  /**
   * Get the user's preferences, creating a fresh record with sensible
   * defaults (all channels on except WhatsApp, language=fa) if none exists.
   */
  async getOrCreate(tenantId: string, userId: string): Promise<any> {
    const existing = await db.notificationPreference.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    })
    if (existing) return existing

    // Create with schema defaults (emailEnabled/smsEnabled/pushEnabled/
    // inappEnabled=true, whatsappEnabled=false, language='fa').
    return db.notificationPreference.create({
      data: { tenantId, userId },
    })
  }

  /**
   * Upsert the user's preferences and publish
   * `notification.preference.updated` via the outbox (LAW-08).
   */
  async update(
    tenantId: string,
    userId: string,
    input: PreferenceUpdateInput,
  ): Promise<any> {
    const now = new Date()
    return UnitOfWork.execute(async (uow) => {
      const updated = await uow.tx.notificationPreference.upsert({
        where: { tenantId_userId: { tenantId, userId } },
        create: {
          tenantId,
          userId,
          emailEnabled: input.emailEnabled ?? true,
          smsEnabled: input.smsEnabled ?? true,
          pushEnabled: input.pushEnabled ?? true,
          whatsappEnabled: input.whatsappEnabled ?? false,
          inappEnabled: input.inappEnabled ?? true,
          language: input.language ?? 'fa',
          quietHoursStart: input.quietHoursStart ?? null,
          quietHoursEnd: input.quietHoursEnd ?? null,
        },
        update: {
          ...(input.emailEnabled !== undefined ? { emailEnabled: input.emailEnabled } : {}),
          ...(input.smsEnabled !== undefined ? { smsEnabled: input.smsEnabled } : {}),
          ...(input.pushEnabled !== undefined ? { pushEnabled: input.pushEnabled } : {}),
          ...(input.whatsappEnabled !== undefined
            ? { whatsappEnabled: input.whatsappEnabled }
            : {}),
          ...(input.inappEnabled !== undefined ? { inappEnabled: input.inappEnabled } : {}),
          ...(input.language !== undefined ? { language: input.language } : {}),
          // quietHours may be explicitly null (to clear) — only set when key present
          ...('quietHoursStart' in input ? { quietHoursStart: input.quietHoursStart ?? null } : {}),
          ...('quietHoursEnd' in input ? { quietHoursEnd: input.quietHoursEnd ?? null } : {}),
        },
      })

      await uow.outbox.append({
        tenantId,
        aggregateType: 'NotificationPreference',
        aggregateId: updated.id,
        eventType: 'notification.preference.updated',
        eventVersion: '1.0',
        payload: {
          preferenceId: updated.id,
          userId,
          emailEnabled: updated.emailEnabled,
          smsEnabled: updated.smsEnabled,
          pushEnabled: updated.pushEnabled,
          whatsappEnabled: updated.whatsappEnabled,
          inappEnabled: updated.inappEnabled,
          language: updated.language,
          quietHoursStart: updated.quietHoursStart,
          quietHoursEnd: updated.quietHoursEnd,
          updatedAt: now.toISOString(),
        },
        actorId: userId,
      })

      return updated
    })
  }
}
