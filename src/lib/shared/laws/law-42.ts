/**
 * LAW-42 — Customer/Vendor Balance Is Derived
 *
 * Customer and vendor balances are NEVER stored as a column.
 * They are always derived from:
 *   SUM(debit JE lines for party) - SUM(credit JE lines for party) - SUM(allocations)
 *
 * This is a specific application of LAW-05 (No Aggregate Quantity as Source of Truth)
 * to the AR/AP sub-ledger.
 *
 * Query:
 *   balance = SUM(JE lines where partyId = customer AND account = AR)
 *           - SUM(allocations where customerId = customer)
 *
 * No 'balance' column on CustomerAccount or VendorAccount.
 */
export const LAW_42_DESCRIPTION = `
LAW-42: Customer/Vendor Balance Is Derived

FORBIDDEN:
  CustomerAccount { balance: number }  ← Source of Truth violation
  VendorAccount { balance: number }    ← Source of Truth violation

REQUIRED:
  Balance = derived from JE lines (partyId) + allocations
  Computed on read (like stock balance from ledger — LAW-05)
`
