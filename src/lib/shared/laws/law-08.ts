/**
 * LAW-08 — Outbox Pattern for Reliable Event Publishing
 *
 * Domain Events must be published reliably. If a DB transaction commits
 * but the event publish fails, data becomes inconsistent.
 *
 * Solution: write events to outbox_messages table IN THE SAME TRANSACTION
 * as the aggregate change. A background worker publishes them asynchronously.
 *
 * Flow:
 *   DB Transaction {
 *     UPDATE aggregate
 *     INSERT INTO outbox_messages (event data)
 *     COMMIT
 *   }
 *   ↓
 *   Worker (polls every 5s) {
 *     SELECT * FROM outbox_messages WHERE published_at IS NULL
 *     FOR EACH message:
 *       Publish to Event Bus / Webhook
 *       UPDATE outbox_messages SET published_at = now()
 *   }
 *
 * Guarantees:
 *   - At-least-once delivery (messages may be delivered twice — see LAW-09)
 *   - No lost events (events are persisted before commit)
 *   - Ordering preserved within a single transaction
 *
 * Retry Policy:
 *   - Exponential backoff: 2^attempt seconds
 *   - Max 8 attempts
 *   - After max attempts → Dead Letter Queue (manual intervention)
 */
export const LAW_08_DESCRIPTION = `
LAW-08: Outbox Pattern

Table: outbox_messages
  - id (UUID)
  - aggregate_type (string)
  - aggregate_id (UUID)
  - event_type (string)
  - event_version (string)
  - payload (JSON)
  - tenant_id (UUID)
  - actor_id (UUID)
  - occurred_at (timestamp)
  - published_at (timestamp, nullable)
  - attempts (int)
  - next_retry_at (timestamp)
  - created_at (timestamp)

Worker: ProcessOutbox job runs every 5 seconds
  - Batch: 100 unpublished messages
  - Publish to: EventBus listeners + Webhook subscribers
  - On success: set published_at
  - On failure: increment attempts, set next_retry_at (exponential backoff)
  - After 8 attempts: move to Dead Letter Queue
`
