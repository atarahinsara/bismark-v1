/**
 * LAW-30 — Device Timeline Is Reconstructed From Immutable Domain Events
 *
 * The Device Timeline is a PROJECTION built from Domain Events.
 * It is NOT stored as a separate entity or computed via cross-context JOINs.
 *
 * Events that contribute to timeline:
 *   - product_instance.created
 *   - shipment.shipped
 *   - shipment.delivered
 *   - warranty.activated
 *   - warranty.extended
 *   - warranty.claim.submitted
 *   - warranty.claim.approved
 *   - service_order.started
 *   - service_order.completed
 *   - return_order.received
 *
 * The timeline query reads from outbox_messages WHERE aggregateId = deviceId
 * (or referenceId = deviceId) and constructs the timeline dynamically.
 *
 * FORBIDDEN:
 *   - Storing timeline as a table
 *   - Using cross-context JOINs to build timeline
 *   - Timeline that can be edited or deleted
 */
export const LAW_30_DESCRIPTION = `
LAW-30: Device Timeline Is Reconstructed From Immutable Domain Events

Timeline = SELECT * FROM outbox_messages
           WHERE aggregateId = ? OR payload->>'deviceId' = ?
           ORDER BY occurredAt ASC

NOT:
  - A stored "device_timeline" table
  - A cross-context JOIN query
  - An editable entity

The timeline is always derived from the event log (Outbox).
This ensures complete audit trail and no data duplication.
`
