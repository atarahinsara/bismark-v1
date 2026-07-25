/**
 * LAW-12 — Unit of Work
 *
 * All Repository operations within a business operation MUST execute
 * within a single Unit of Work (transaction).
 *
 * This ensures atomicity: either all changes commit, or none do.
 *
 * Pattern:
 *   await UnitOfWork.execute(async (uow) => {
 *     const transfer = await uow.transfers.findById(id)
 *     await uow.ledger.append(outTxn)
 *     await uow.ledger.append(inTxn)
 *     await uow.outbox.append(event)
 *     // commit happens automatically if no exception
 *   })
 *
 * The UnitOfWork wraps Prisma's $transaction and provides
 * transaction-scoped repository access.
 */
export const LAW_12_DESCRIPTION = `
LAW-12: Unit of Work

All repositories participate in a single transaction per business operation.

Implementation:
  UnitOfWork.execute(async (uow) => {
    await uow.repositoryA.method()
    await uow.repositoryB.method()
    await uow.outbox.append(event)
    // auto-commit on success, auto-rollback on exception
  })

Benefits:
  - Atomicity across multiple repositories
  - Outbox event in same transaction as data change (LAW-08)
  - No partial updates
`
