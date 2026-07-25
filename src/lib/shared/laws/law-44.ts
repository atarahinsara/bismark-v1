/**
 * LAW-44 — Every Tax Posting Must Produce Independent Journal Entries
 *
 * Tax posting creates a SEPARATE Journal Entry from the revenue/recievable JE.
 *
 * Revenue JE:  Debit AR, Credit Revenue (net amount)
 * Tax JE:      Debit AR, Credit VAT Payable (tax amount)
 *
 * This separation ensures:
 *   - Tax can be reversed independently (LAW-37)
 *   - Tax reports can query tax JEs directly
 *   - Tax audit trail is clean
 */
export const LAW_44_DESCRIPTION = `
LAW-44: Every Tax Posting Must Produce Independent Journal Entries

Revenue Entry:
  Dr AR (net + tax)
  Cr Revenue (net)
  Cr VAT Payable (tax)  ← this is the tax JE, posted separately

OR (preferred):
  Revenue JE:  Dr AR (net), Cr Revenue (net)
  Tax JE:      Dr AR (tax), Cr VAT Payable (tax)  ← independent

The independent approach allows tax reversal without touching revenue.
`
