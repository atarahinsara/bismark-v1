import { db } from '@/lib/db'

/**
 * Unit of Work — LAW-12 implementation.
 *
 * Wraps Prisma's $transaction to provide transaction-scoped access.
 * All repositories within a business operation share the same transaction.
 *
 * Usage:
 *   await UnitOfWork.execute(async (uow) => {
 *     await uow.tx.cycleCount.update(...)
 *     await uow.tx.inventoryTransaction.create(...)
 *     await uow.tx.outboxMessage.create(...)
 *   })
 */
export class UnitOfWork {
  /**
   * Execute a function within a database transaction.
   * All Prisma operations using the provided `tx` client are atomic.
   *
   * @param fn - Business operation that uses `uow.tx` for all DB access
   * @returns The result of fn
   */
  static async execute<T>(
    fn: (uow: { tx: typeof db; outbox: OutboxHelper }) => Promise<T>,
  ): Promise<T> {
    return db.$transaction(async (tx) => {
      const uow = {
        tx,
        outbox: new OutboxHelper(tx),
      }
      return fn(uow)
    })
  }
}

/**
 * Outbox Helper — appends events to outbox within the current transaction (LAW-08).
 */
export class OutboxHelper {
  constructor(private tx: typeof db) {}

  async append(event: {
    aggregateType: string
    aggregateId: string
    eventType: string
    eventVersion?: string
    payload: unknown
    tenantId: string
    actorId?: string | null
  }): Promise<void> {
    await this.tx.outboxMessage.create({
      data: {
        tenantId: event.tenantId,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        eventType: event.eventType,
        eventVersion: event.eventVersion ?? '1.0',
        payload: event.payload as any,
        actorId: event.actorId ?? null,
        status: 'pending',
      },
    })
  }
}
