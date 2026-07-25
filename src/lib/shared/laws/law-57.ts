/**
 * LAW-57 — Notification Delivery Must Be Retryable And Idempotent
 *
 * Re-sending a notification MUST NEVER produce a duplicate message
 * reaching the recipient. Every delivery attempt MUST be:
 *   - Idempotent: identified by (tenantId, idempotencyKey) — re-delivery of
 *     the same logical message returns the same Notification and skips sending
 *   - Retryable: with exponential backoff (1m → 5m → 30m → 2h)
 *   - Bounded: max 4 attempts, then Dead Letter Queue (DLQ)
 *   - Auditable: every attempt recorded as NotificationDelivery
 *     (provider, attempt #, status, response, duration)
 *
 * Idempotency Key composition:
 *   `${templateCode}#${recipientId}#${eventAggregateId}#${eventVersion}`
 * Same key → same Notification → at-most-once actual delivery.
 *
 * Retry Policy (NotificationRetryPolicy):
 *   Attempt 1: immediate
 *   Attempt 2: +1 minute   (backoff: 1m)
 *   Attempt 3: +5 minutes  (backoff: 5m)
 *   Attempt 4: +30 minutes (backoff: 30m)
 *   Attempt 5: +2 hours     (backoff: 2h)
 *   → DLQ: notification.status = 'failed', moved to DLQ for manual inspection
 *
 * State Machine:
 *   pending → queued → sending → sent
 *                       ↓
 *                     failed → retrying → sending → (sent | failed)
 *                                          ↓
 *                                       (max attempts) → DLQ
 *   cancelled (terminal)
 *
 * NotificationDelivery (one row per attempt):
 *   { notificationId, provider, attempt, status, response, durationMs, createdAt }
 *
 * This guarantees the recipient receives the message EXACTLY ONCE even if:
 *   - The queue processor crashes mid-flight and re-runs
 *   - The Outbox dispatcher redelivers the same event
 *   - The Inbox worker re-processes the same message (LAW-26)
 */
export const LAW_57_DESCRIPTION = `
LAW-57: Notification Delivery Must Be Retryable And Idempotent

Every Notification carries: messageId (UUID), idempotencyKey (deterministic).
Re-delivery with same idempotencyKey returns existing Notification (no duplicate send).
Retry: exponential backoff (1m, 5m, 30m, 2h), max 5 attempts.
After max attempts → Dead Letter Queue (manual inspection).
Every attempt recorded as NotificationDelivery (provider, status, response, duration).
`
