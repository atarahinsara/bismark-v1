/**
 * Notification Context — Shared Types (Sprint 7.3)
 * ==================================================
 *
 * Type contracts used across the Notification bounded context:
 *   - Channels (LAW-56: channel-agnostic delivery)
 *   - Provider interface (LAW-56: pluggable transports)
 *   - Dispatch contract (LAW-55: template-based; LAW-57: idempotent)
 *
 * Architecture laws:
 *   LAW-55: Notifications Must Be Template-Based (versioned, language-aware)
 *   LAW-56: Notification Delivery Must Be Channel-Agnostic
 *   LAW-57: Notification Delivery Must Be Retryable And Idempotent
 */

// ============================================================
// Channels & Statuses
// ============================================================

/** Delivery channel — kept in sync with Prisma `Notification.channel`. */
export type Channel = 'email' | 'sms' | 'whatsapp' | 'push' | 'inapp'

/** Notification lifecycle status — kept in sync with `Notification.status`. */
export type NotificationStatus =
  | 'pending'
  | 'queued'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'retrying'
  | 'cancelled'

/** Per-attempt delivery status — kept in sync with `NotificationDelivery.status`. */
export type DeliveryStatus = 'sending' | 'sent' | 'failed'

// ============================================================
// Channel Provider contract (LAW-56)
// ============================================================

/**
 * A channel provider is the transport adapter for a single channel
 * (e.g. SMTP for email, Kavenegar for SMS, Firebase for push).
 *
 * Multiple providers may exist per channel — the Notification Context
 * picks the default per channel, but routing rules can override.
 */
export interface ChannelProvider {
  /** Provider identifier, e.g. 'smtp' | 'ses' | 'kavenegar' | 'firebase' | 'inapp_db'. */
  name: string
  /** Channel this provider serves. */
  channel: Channel
  /** Perform the actual send. Must NEVER throw — return failure instead. */
  send(input: ChannelSendInput): Promise<ChannelSendResult>
}

/** Input passed to a provider's `send` method. Subject is null for non-email channels. */
export interface ChannelSendInput {
  /** Recipient address (email/phone/fcm-token/userId). */
  to: string
  /** Subject line — null for non-email channels (sms/whatsapp/push/inapp). */
  subject: string | null
  /** Already-rendered body — provider should NOT re-render. */
  body: string
  /** Original variables (audit / templating metadata). */
  variables: Record<string, any>
  /** Optional provider-specific metadata. */
  metadata?: Record<string, any>
}

/** Result of a single send attempt. `success=false` is non-fatal — retried by the engine. */
export interface ChannelSendResult {
  success: boolean
  /** Provider-returned message id (nullable on failure). */
  messageId?: string
  /** Raw provider response (audit). */
  providerResponse?: any
  /** Error description on failure. */
  errorMessage?: string
  /** Wall-clock duration of the send attempt. */
  durationMs: number
}

// ============================================================
// Dispatch contract (LAW-55 + LAW-57)
// ============================================================

/**
 * Input for `NotificationService.dispatch`.
 *
 * The caller (a domain context reacting to an event) provides:
 *   - templateCode + variables (LAW-55)
 *   - idempotencyKey (LAW-57 — deterministic dedupe)
 *   - optional channel/language overrides (LAW-56 — preference-driven)
 *   - optional triggeredByEvent for audit
 */
export interface DispatchInput {
  /** Template code, e.g. 'invoice.issued', 'payment.received'. */
  templateCode: string
  /** Override template's channel (preference-driven). */
  channel?: Channel
  /** Override template's language (preference-driven). */
  language?: string
  /** User/party id — used for preference lookup and audit. */
  recipientId?: string
  /** Display name for audit. */
  recipientName?: string
  /** Email / phone / fcm token / userId (for inapp). */
  recipientAddress: string
  /** Variables for template rendering (must already include any date strings). */
  variables: Record<string, any>
  /** LAW-57: deterministic idempotency key — same key = same notification. */
  idempotencyKey: string
  /** Queue priority — higher = sent first. Default 100. */
  priority?: number
  /** Domain event that triggered this notification (audit trail). */
  triggeredByEvent?: string
}

/** Result of `NotificationService.dispatch`. */
export interface DispatchResult {
  notificationId: string
  status: NotificationStatus
  /** false when idempotencyKey hit an existing notification (no-op). */
  created: boolean
  message?: string
}
