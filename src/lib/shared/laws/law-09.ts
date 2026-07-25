/**
 * LAW-09 — Inbox Pattern for Deduplication
 *
 * When consuming events (from Outbox or external sources), the same event
 * may be delivered multiple times (at-least-once semantics). Consumers must
 * deduplicate to avoid processing the same event twice.
 *
 * Solution: maintain a processed_messages table. Before processing an event,
 * check if its ID has already been processed.
 *
 * Flow:
 *   Consumer receives event {
 *     1. Check processed_messages WHERE message_id = ?
 *     2. If exists → skip (already processed)
 *     3. If not exists → process event
 *     4. INSERT INTO processed_messages (message_id, processed_at)
 *   }
 *
 * This enables safe at-least-once delivery from LAW-08 (Outbox).
 *
 * Cleanup:
 *   - processed_messages entries older than 30 days can be purged
 *   - Or keep indefinitely for audit trail
 */
export const LAW_09_DESCRIPTION = `
LAW-09: Inbox Pattern (Consumer-Side Deduplication)

Table: processed_messages
  - id (UUID)
  - message_id (UUID, unique) — the event ID from Outbox
  - consumer_id (string) — identifies which consumer processed it
  - processed_at (timestamp)
  - payload_hash (string) — for debugging

Consumer flow:
  1. Receive event with message_id
  2. BEGIN TRANSACTION
  3. INSERT INTO processed_messages (message_id, consumer_id, ...)
     ON CONFLICT (message_id, consumer_id) DO NOTHING
  4. If insert affected 0 rows → already processed → skip
  5. If insert affected 1 row → process event
  6. COMMIT

Guarantee: each event is processed exactly once per consumer
`
