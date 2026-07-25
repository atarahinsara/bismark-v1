/**
 * BISMARK ERP — Notification Context (Sprint 7.3)
 * ================================================
 *
 * Public surface for the Notification bounded context.
 *
 * Architecture laws enforced here:
 *   LAW-55: Notifications Must Be Template-Based (versioned, language-aware)
 *   LAW-56: Notification Delivery Must Be Channel-Agnostic
 *   LAW-57: Notification Delivery Must Be Retryable And Idempotent
 *
 * Public exports:
 *   - Template Engine (LAW-55) — deterministic renderer
 *   - Channel Providers (LAW-56) — pluggable transports per channel
 *   - Notification Service (LAW-55 + LAW-57) — dispatcher + retry engine
 *   - Preference Service (LAW-56) — per-user opt-in/opt-out, language
 *
 * Reserved for future tasks:
 *   - Notification contracts (./contracts/ — empty for now)
 *   - Queue worker / cron adapter (consumes NotificationService.processQueueItem)
 *   - Routing policy (consults NotificationPreference to pick channel/language)
 */

export * from './services/template-engine'
export * from './services/types'
export * from './services/providers'
export * from './services/notification-service'
export * from './services/preference-service'

import { NotificationService } from './services/notification-service'
import { PreferenceService } from './services/preference-service'

/** Singleton NotificationService instance for the sandbox. */
export const notificationService = new NotificationService()

/** Singleton PreferenceService instance for the sandbox. */
export const preferenceService = new PreferenceService()
