/**
 * LAW-15 — Event Versioning
 *
 * All Domain Events MUST include a version field to enable future
 * contract evolution without breaking consumers.
 *
 * Versioning scheme: Semantic versioning (MAJOR.MINOR)
 *   - MAJOR: breaking change (consumer must update)
 *   - MINOR: backward-compatible addition (consumer can ignore new fields)
 *
 * Consumers check version and decide how to handle:
 *   - Same major version → process normally
 *   - Different major version → may need transformation or skip
 *
 * The version is stored in outbox_messages.event_version and included
 * in webhook payloads as 'version'.
 *
 * Implementation:
 *   class SalesOrderCreated extends DomainEvent {
 *     eventVersion(): string { return '1.0' }
 *   }
 *
 *   // When adding a new field (backward-compatible):
 *   eventVersion(): string { return '1.1' }
 *
 *   // When changing a field type (breaking):
 *   eventVersion(): string { return '2.0' }
 */
export const LAW_15_DESCRIPTION = `
LAW-15: Event Versioning

All Domain Events have eventVersion() returning 'MAJOR.MINOR'.

Stored in:
  - outbox_messages.event_version
  - webhook payload: { version: "1.0", ... }

Versioning rules:
  1.0 → initial version
  1.1 → added optional field (backward compatible)
  2.0 → changed field type or removed field (breaking)

Consumer behavior:
  if (event.majorVersion === 1) → process normally
  if (event.majorVersion === 2) → may need transformation
  if (event.majorVersion > 2)   → skip or alert

This enables:
  - Smooth schema evolution
  - Multiple consumer versions coexisting
  - Rollback safety (old consumers still work with v1 events)
`
