/**
 * LAW-07 — Optimistic Locking for Aggregate Roots
 *
 * All Aggregate Root entities MUST have a `version` field for optimistic
 * concurrency control. This prevents lost updates when two clients modify
 * the same entity simultaneously.
 *
 * Implementation:
 *   - Every aggregate root has `version Int @default(1)`
 *   - On PATCH, client sends `If-Match: <version>` header
 *   - Update query: `WHERE id = ? AND version = ?` with `version + 1`
 *   - If 0 rows updated → 409 Conflict (ETag mismatch)
 *
 * Flow:
 *   1. Client GET /resource/{id} → receives version=7 in response
 *   2. Client PATCH /resource/{id} with header If-Match: 7
 *   3. Server: UPDATE ... WHERE id=? AND version=7, SET version=8
 *   4. If 0 rows updated → version mismatch → 409 Conflict
 *
 * Benefits:
 *   - No long-held locks (unlike pessimistic locking)
 *   - Detects concurrent modifications
 *   - Scales well with many readers
 */
export const LAW_07_DESCRIPTION = `
LAW-07: Optimistic Locking for Aggregate Roots

Required field: version Int @default(1) on all aggregate roots

Header: If-Match: <current_version>

Update pattern:
  UPDATE resource SET ..., version = version + 1
  WHERE id = ? AND version = ?
  
  If affected_rows = 0 → 409 Conflict (OPTIMISTIC_LOCK_FAILED)

Applies to:
  - StockItem, Warehouse, Location, Bin
  - Product, ProductModel, ProductBrand, ProductCategory
  - Party, Branch
  - SalesOrder, SalesInvoice, Shipment
  - WarrantyCard, ServiceOrder
  - JournalEntry, Payment
  - All aggregate roots
`
