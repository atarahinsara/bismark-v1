import { db } from '@/lib/db'

/**
 * Saga Manager — LAW-27 implementation.
 *
 * Coordinates long-running business processes across bounded contexts
 * using event-driven step transitions and compensation rules.
 *
 * Pattern:
 *   1. Define saga (steps + compensations)
 *   2. Start saga instance (persisted state)
 *   3. Each step publishes an event → consumer completes → publishes completion event
 *   4. Saga Manager listens for completion events → advance to next step
 *   5. On failure → execute compensations in reverse order
 *
 * Example: Sales Order Fulfillment Saga
 *   Step 1: Reserve Inventory (event: sales_order.approved)
 *   Step 2: Create Shipment (event: inventory.reserved)
 *   Step 3: Create Invoice (event: shipment.shipped)
 *   Step 4: Complete Order (event: payment.received)
 *
 * Compensation:
 *   If step 3 fails → Cancel Shipment, Release Reservation
 */

export interface SagaStep {
  step: number
  name: string
  triggerEvent: string         // event that triggers this step
  completionEvent: string      // event that signals step completion
  compensationAction: string   // action to undo this step
}

export interface SagaDefinition {
  key: string
  name: string
  steps: SagaStep[]
}

// ============================================================
// SAGA DEFINITIONS
// ============================================================

export const SAGA_DEFINITIONS: Record<string, SagaDefinition> = {
  /**
   * Sales Order Fulfillment Saga
   * Triggered when: sales_order.approved
   * Steps:
   *   1. Reserve Inventory (triggered by approval, completed by inventory.reserved)
   *   2. Create Shipment (triggered by inventory.reserved, completed by shipment.created)
   *   3. Ship (triggered by shipment.created, completed by shipment.shipped)
   *   4. Create Invoice (triggered by shipment.shipped, completed by invoice.issued)
   *   5. Complete (triggered by payment.received)
   * Compensation:
   *   - Release reservation
   *   - Cancel shipment
   */
  sales_order_fulfillment: {
    key: 'sales_order_fulfillment',
    name: 'Sales Order Fulfillment',
    steps: [
      {
        step: 1, name: 'reserve_inventory',
        triggerEvent: 'sales_order.approved',
        completionEvent: 'inventory.reserved',
        compensationAction: 'release_reservation',
      },
      {
        step: 2, name: 'create_shipment',
        triggerEvent: 'inventory.reserved',
        completionEvent: 'shipment.created',
        compensationAction: 'cancel_shipment',
      },
      {
        step: 3, name: 'ship_order',
        triggerEvent: 'shipment.created',
        completionEvent: 'shipment.shipped',
        compensationAction: 'cancel_shipment',
      },
      {
        step: 4, name: 'create_invoice',
        triggerEvent: 'shipment.shipped',
        completionEvent: 'invoice.issued',
        compensationAction: 'cancel_invoice',
      },
      {
        step: 5, name: 'complete_order',
        triggerEvent: 'payment.received',
        completionEvent: 'sales_order.completed',
        compensationAction: 'none',
      },
    ],
  },

  /**
   * Return Processing Saga
   * Triggered when: return_order.approved
   * Steps:
   *   1. Receive returned goods (completed by return_order.received)
   *   2. Create Credit Note (completed by credit_note.issued)
   *   3. Process Refund (completed by refund.completed)
   *   4. Close Return (completed by return_order.closed)
   */
  return_processing: {
    key: 'return_processing',
    name: 'Return Processing',
    steps: [
      {
        step: 1, name: 'receive_goods',
        triggerEvent: 'return_order.approved',
        completionEvent: 'return_order.received',
        compensationAction: 'none',
      },
      {
        step: 2, name: 'create_credit_note',
        triggerEvent: 'return_order.received',
        completionEvent: 'credit_note.issued',
        compensationAction: 'cancel_credit_note',
      },
      {
        step: 3, name: 'process_refund',
        triggerEvent: 'credit_note.issued',
        completionEvent: 'refund.completed',
        compensationAction: 'cancel_refund',
      },
      {
        step: 4, name: 'close_return',
        triggerEvent: 'refund.completed',
        completionEvent: 'return_order.closed',
        compensationAction: 'none',
      },
    ],
  },
}

// ============================================================
// SAGA MANAGER
// ============================================================

export class SagaManager {
  /**
   * Start a new saga instance.
   */
  static async startSaga(
    sagaKey: string,
    tenantId: string,
    correlationId: string,
    payload: Record<string, unknown>,
  ): Promise<string> {
    const definition = SAGA_DEFINITIONS[sagaKey]
    if (!definition) throw new Error(`Unknown saga: ${sagaKey}`)

    const instance = await db.sagaInstance.create({
      data: {
        tenantId,
        sagaDefinitionKey: sagaKey,
        correlationId,
        status: 'running',
        currentStep: 0,
        totalSteps: definition.steps.length,
        payload: payload as any,
        startedAt: new Date(),
      },
    })

    // Publish saga.started event (via Outbox — would be done in production)
    console.log(`[SAGA] Started ${sagaKey} for ${correlationId} (instance: ${instance.id})`)

    return instance.id
  }

  /**
   * Advance saga to next step when a completion event is received.
   */
  static async advanceStep(
    sagaInstanceId: string,
    completedEvent: string,
  ): Promise<void> {
    const instance = await db.sagaInstance.findUnique({
      where: { id: sagaInstanceId },
    })
    if (!instance || instance.status !== 'running') return

    const definition = SAGA_DEFINITIONS[instance.sagaDefinitionKey]
    if (!definition) return

    // Find the step that was completed
    const completedStep = definition.steps.find(
      (s) => s.completionEvent === completedEvent,
    )
    if (!completedStep) return

    const nextStep = completedStep.step + 1
    const isLastStep = nextStep > definition.steps.length

    await db.sagaInstance.update({
      where: { id: sagaInstanceId },
      data: {
        currentStep: completedStep.step,
        status: isLastStep ? 'completed' : 'running',
        completedAt: isLastStep ? new Date() : null,
        payload: {
          ...(instance.payload as any),
          lastCompletedStep: completedStep.step,
          lastEvent: completedEvent,
        },
      },
    })

    console.log(`[SAGA] Step ${completedStep.step} completed for ${sagaInstanceId}. ${isLastStep ? 'Saga completed.' : `Next: step ${nextStep}`}`)
  }

  /**
   * Mark saga as failed and trigger compensation.
   */
  static async failSaga(
    sagaInstanceId: string,
    failedStep: number,
    error: string,
  ): Promise<void> {
    const instance = await db.sagaInstance.findUnique({
      where: { id: sagaInstanceId },
    })
    if (!instance) return

    await db.sagaInstance.update({
      where: { id: sagaInstanceId },
      data: {
        status: 'compensating',
        currentStep: failedStep,
        errorMessage: error,
        payload: {
          ...(instance.payload as any),
          failedStep,
          error,
        },
      },
    })

    // Execute compensations in reverse order
    const definition = SAGA_DEFINITIONS[instance.sagaDefinitionKey]
    if (!definition) return

    for (let step = failedStep; step >= 1; step--) {
      const sagaStep = definition.steps[step - 1]
      if (sagaStep.compensationAction === 'none') continue

      console.log(`[SAGA] Compensating step ${step}: ${sagaStep.compensationAction}`)
      // In production: publish compensation event
      // Each context handles its own compensation
    }

    await db.sagaInstance.update({
      where: { id: sagaInstanceId },
      data: { status: 'compensated' },
    })

    console.log(`[SAGA] Saga ${sagaInstanceId} compensated.`)
  }

  /**
   * Get saga instance status.
   */
  static async getStatus(sagaInstanceId: string) {
    return db.sagaInstance.findUnique({ where: { id: sagaInstanceId } })
  }

  /**
   * List all active sagas.
   */
  static async listActive(tenantId?: string) {
    return db.sagaInstance.findMany({
      where: {
        status: { in: ['running', 'compensating'] },
        ...(tenantId ? { tenantId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })
  }
}
