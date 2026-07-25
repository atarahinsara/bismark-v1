/**
 * LAW-56 — Notification Delivery Must Be Channel-Agnostic
 *
 * No bounded context (Sales, Warranty, Service, Financial, ...) may call
 * Email, SMS, WhatsApp, Push or In-App providers directly.
 *
 * Bounded contexts ONLY publish domain events (via Outbox — LAW-08).
 * The Notification context is the SOLE owner of channel selection and
 * provider invocation. It receives events via Inbox (LAW-09), looks up
 * the matching Template + Recipient + Preference, and dispatches the
 * notification through the appropriate channel.
 *
 * Why:
 *   - Decoupling: Sales should not know whether a notification goes via SMS or Email
 *   - Preference honoring: Notification Context consults NotificationPreference
 *     (opt-in/opt-out, quiet hours, language) before sending
 *   - Centralized retry / DLQ (LAW-57)
 *   - Centralized audit (every delivery attempt recorded)
 *   - Provider swap (Kavenegar → Twilio) without touching domain contexts
 *
 * FORBIDDEN (in Sales/Warranty/Service/Financial):
 *   await smsProvider.send(customer.phone, 'Order ready')
 *   await emailService.send(customer.email, '...', '...')
 *
 * ALLOWED (in any context):
 *   await uow.outbox.append({
 *     eventType: 'service_order.ready',
 *     payload: { orderId, customerPartyId },
 *   })
 *
 * The Notification Context then:
 *   Inbox receives 'service_order.ready'
 *   → maps event → template code 'service_order.ready' (channel: push)
 *   → consults recipient preference (LAW-56)
 *   → enqueues NotificationQueue item
 *   → Channel Provider sends (LAW-57)
 */
export const LAW_56_DESCRIPTION = `
LAW-56: Notification Delivery Must Be Channel-Agnostic

Domain contexts publish events only.
Notification Context decides channel + provider + retry.
No direct Email/SMS/WhatsApp/Push calls from domain logic.
Channel selection honors NotificationPreference (opt-in, quiet hours, language).
`
