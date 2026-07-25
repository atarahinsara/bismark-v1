/**
 * LAW-27 — Every Long-Running Business Process Must Be a Saga
 *
 * No distributed transactions between bounded contexts.
 * Long-running workflows (spanning multiple contexts) must be coordinated
 * through a Saga (Process Manager) with compensation rules.
 *
 * Example: Sales Order Fulfillment Saga
 *   1. Reserve Inventory (Inventory Context)
 *   2. Create Shipment (Fulfillment Context)
 *   3. Create Invoice (Billing Context)
 *   4. Receive Payment (Billing Context)
 *   5. Complete Order (Sales Context)
 *
 * If step 3 fails:
 *   → Compensate: Cancel Shipment, Release Reservation
 *
 * Saga states are persisted (SagaInstance table) for recovery.
 */
export const LAW_27_DESCRIPTION = `
LAW-27: Every Long-Running Business Process Must Be a Saga

NO distributed transactions across contexts.

Saga pattern:
  - Saga Definition (steps + compensation)
  - Saga Instance (state machine, persisted)
  - Event-driven step transitions
  - Compensation on failure

Tables:
  - saga_definitions (template: steps, compensations)
  - saga_instances (runtime: current_step, status, payload)

Status: pending → running → completed | failed | compensating | compensated

Recovery:
  - On restart, Saga Manager resumes from last persisted step
  - Failed steps trigger compensation in reverse order
`
