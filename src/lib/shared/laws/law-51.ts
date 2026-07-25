/**
 * LAW-51 — Notifications Are Event-Driven And Never Sent Directly From Domain Logic
 *
 * Domain logic NEVER calls NotificationService.send() directly.
 * Instead, domain events are published (via Outbox), and the Notification
 * context consumes them via Inbox and sends the appropriate notification.
 *
 * Flow:
 *   Sales → publishes 'sales_order.approved'
 *   → Notification Inbox handler receives event
 *   → Looks up template + recipient
 *   → Sends notification (email/SMS/push/in-app)
 *
 * FORBIDDEN:
 *   notificationService.sendWelcomeEmail(customerId)  // in Sales context
 *
 * ALLOWED:
 *   uow.outbox.append({ eventType: 'sales_order.approved', ... })
 *   → Notification handler picks it up asynchronously
 */
export const LAW_51_DESCRIPTION = `
LAW-51: Notifications Are Event-Driven

Domain logic → publishes event → Notification consumes → sends.
No direct notification calls from domain contexts.
Templates mapped to events in Notification configuration.
`
