/**
 * LAW-35 — Every Journal Entry Must Balance
 *
 * Every Journal Entry MUST have sum(debit) = sum(credit).
 * If unbalanced, the transaction MUST rollback.
 *
 * This is the fundamental rule of double-entry accounting.
 *
 * Implementation:
 *   1. Before committing a JournalEntry, validate:
 *      SUM(lines.debitAmount) === SUM(lines.creditAmount)
 *   2. If not balanced → throw ValidationException → rollback
 *   3. Store isBalanced as a computed field (generated column)
 *
 * Each line has either debit OR credit (not both):
 *   debitAmount > 0 → debit line
 *   creditAmount > 0 → credit line
 *   NOT (debitAmount > 0 AND creditAmount > 0)
 */
export const LAW_35_DESCRIPTION = `
LAW-35: Every Journal Entry Must Balance

Validation:
  total_debit = SUM(lines.debitAmount)
  total_credit = SUM(lines.creditAmount)
  IF total_debit != total_credit → REJECT (rollback)

Line rules:
  - Each line has debit XOR credit (not both, not neither)
  - debitAmount > 0 → debit line
  - creditAmount > 0 → credit line
  - CHECK: NOT (debitAmount > 0 AND creditAmount > 0)
  - CHECK: debitAmount >= 0 AND creditAmount >= 0

Journal Entry:
  - totalDebit = computed from lines
  - totalCredit = computed from lines
  - isBalanced = (totalDebit === totalCredit) — generated column
`
