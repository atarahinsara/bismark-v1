/**
 * LAW-11 — Transaction Boundary
 *
 * No Aggregate or Repository may manage DB transactions.
 * ONLY Application Services are authorized to begin/commit/rollback transactions.
 *
 * Pattern:
 *   Controller → Application Service → (begin txn) → Repository operations → (commit)
 *
 * FORBIDDEN:
 *   - Repository calling db.$transaction()
 *   - Aggregate root calling db.$transaction()
 *   - Repository calling commit/rollback
 *
 * Rationale:
 *   - Transaction scope must match business operation scope
 *   - Multiple repositories may participate in one transaction
 *   - Unit of Work pattern (LAW-12) enforces this
 */
export const LAW_11_DESCRIPTION = `
LAW-11: Transaction Boundary

Only Application Services manage transactions.

FORBIDDEN in Repository:
  db.$transaction(...)
  db.commit()
  db.rollback()

ALLOWED in Application Service:
  class CycleCountCommandService {
    async approve(id) {
      return db.$transaction(async (tx) => {
        await this.cycleCountRepo.update(...)   // uses tx
        await this.ledgerRepo.create(...)       // uses tx
        await this.outboxRepo.create(...)       // uses tx
      })
    }
  }
`
