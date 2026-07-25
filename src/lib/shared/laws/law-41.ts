/**
 * LAW-41 — Every Allocation Must Be Reversible
 *
 * No allocation is permanent. Unallocating creates a reversal allocation
 * that restores the open balance on both the invoice and payment sides.
 *
 * Flow:
 *   Allocate: Invoice A ← Payment B (reduces both open balances)
 *   Unallocate: Creates reversal allocation (restores both open balances)
 *
 * Allocations are append-only (like ledger entries — LAW-05 pattern).
 */
export const LAW_41_DESCRIPTION = `
LAW-41: Every Allocation Must Be Reversible

Allocation = append-only record linking payment to invoice.
Unallocation = reversal allocation (negative amount).

No UPDATE or DELETE on allocation records.
Reversal creates new record with amount = -original.amount.
`
