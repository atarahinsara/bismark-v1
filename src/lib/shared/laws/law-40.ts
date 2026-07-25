/**
 * LAW-40 — Subledger Must Reconcile With General Ledger
 *
 * The sum of all AR sub-ledger balances MUST equal the AR Control Account
 * balance in the General Ledger. Same for AP.
 *
 * If out of balance → system is in error state, must be investigated.
 *
 * Reconciliation check:
 *   AR: SUM(customer balances) === GL balance of AR Control Account
 *   AP: SUM(vendor balances) === GL balance of AP Control Account
 */
export const LAW_40_DESCRIPTION = `
LAW-40: Subledger Must Reconcile With General Ledger

AR Control Account (GL) = SUM(all customer open balances)
AP Control Account (GL) = SUM(all vendor open balances)

If mismatch → 'Out Of Balance' status → investigation required.
Reconciliation runs automatically (nightly) + on-demand.
`
