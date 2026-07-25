/**
 * LAW-26 — Every Domain Event Must Be Processed Exactly Once
 *
 * Inbox + Idempotency are mandatory for all event consumers.
 * Even if an event is delivered multiple times (at-least-once from Outbox),
 * it must be processed exactly once.
 *
 * Implementation:
 *   1. Consumer receives event with messageId
 *   2. Check processed_messages WHERE messageId + consumerId
 *   3. If exists → skip (already processed)
 *   4. If not → process + INSERT into processed_messages (atomic)
 *   5. ON CONFLICT → skip (race condition handled)
 */
export const LAW_26_DESCRIPTION = `
LAW-26: Every Domain Event Must Be Processed Exactly Once

Inbox pattern (LAW-09) is mandatory for ALL event consumers.

Consumer flow:
  1. Receive event (messageId from Outbox)
  2. BEGIN TRANSACTION
  3. INSERT INTO processed_messages (messageId, consumerId) ON CONFLICT DO NOTHING
  4. If affected_rows = 0 → already processed → skip
  5. If affected_rows = 1 → process event
  6. COMMIT

Guarantees:
  - At-least-once delivery (from Outbox)
  - Exactly-once processing (from Inbox)
  - No duplicate side effects
`
