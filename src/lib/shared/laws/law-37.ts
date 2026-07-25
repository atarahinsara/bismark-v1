/**
 * LAW-37 — Only Reversal May Correct Posted Journal Entries
 *
 * Posted Journal Entries are immutable. No edit or delete allowed.
 * Corrections MUST use Reversal Journal Entries.
 *
 * Flow:
 *   Posted JE → Reverse → New Reversal JE → Original marked as 'reversed'
 *
 * FORBIDDEN:
 *   - PATCH /journal-entries/{id} after status = 'posted'
 *   - DELETE /journal-entries/{id} after status = 'posted'
 */
export const LAW_37_DESCRIPTION = `
LAW-37: Only Reversal May Correct Posted Journal Entries

Posted JE = immutable (LAW-14 applied to Financial).
Correction = create Reversal JE (mirror entry with swapped debit/credit).
Original JE.status → 'reversed', reversedById → reversal JE ID.
`
