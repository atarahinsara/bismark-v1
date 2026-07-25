/**
 * LAW-20 — Every Payment Must Be Allocated
 *
 * No payment is considered final without allocation to one or more invoices.
 * A payment without allocation is in 'pending' status and must be allocated
 * before it becomes 'completed'.
 *
 * Pattern:
 *   POST /payments → creates payment (status: 'pending')
 *   POST /payments/{id}/allocate → allocates to invoices (status: 'completed')
 *
 * Supports:
 *   - Full allocation (payment = invoice amount)
 *   - Partial allocation (payment < invoice → invoice partially paid)
 *   - Multi-invoice allocation (one payment → multiple invoices)
 *   - Overpayment (payment > invoice → credit balance)
 *
 * Payment status transitions:
 *   pending → allocated → completed
 *   pending → cancelled
 */
export const LAW_20_DESCRIPTION = `
LAW-20: Every Payment Must Be Allocated

Payment lifecycle:
  1. POST /payments → status: 'pending' (no allocation yet)
  2. POST /payments/{id}/allocate → allocates to invoices
  3. If fully allocated → status: 'completed'
  4. If partial → status: 'partially_allocated'

Validation:
  - Total allocated amount ≤ payment amount
  - Each invoice allocation ≤ invoice outstanding balance
  - Payment cannot be 'completed' without at least one allocation

Tables:
  - payments (amount, status, method)
  - payment_allocations (payment_id, invoice_id, allocated_amount)
`
