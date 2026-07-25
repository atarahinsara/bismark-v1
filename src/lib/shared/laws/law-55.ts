/**
 * LAW-55 — Notifications Must Be Template-Based
 *
 * No notification may contain hardcoded text.
 * Every notification MUST be rendered from a versioned, language-aware
 * NotificationTemplate (subject + body) using a deterministic Template Engine.
 *
 * Why:
 *   - Consistency: every recipient gets the same wording for the same event
 *   - Localization: fa / en / ar / ku supported per template
 *   - Versioning: templates can evolve without losing audit history
 *   - Brand: marketing/legal can change wording centrally
 *   - Compliance: every rendered message is reproducible from its template
 *
 * FORBIDDEN:
 *   await email.send({
 *     subject: 'Welcome ' + user.name,
 *     body: 'Your invoice ' + invoice.number + ' is ready.',
 *   })
 *
 * ALLOWED:
 *   await notificationService.dispatch({
 *     templateCode: 'invoice.issued',
 *     language: 'fa',
 *     channel: 'email',
 *     variables: { customer: { name }, invoice: { number, total } },
 *   })
 */
export const LAW_55_DESCRIPTION = `
LAW-55: Notifications Must Be Template-Based

Every notification is rendered from a versioned NotificationTemplate.
Templates support variables ({{invoice.number}}), conditionals ({{#if}}), loops ({{#each}}).
Templates are language-aware (fa / en / ar / ku).
Templates have effectiveFrom / effectiveTo (LAW-50 style versioning).
The exact template version used is recorded on each Notification (audit).
`
