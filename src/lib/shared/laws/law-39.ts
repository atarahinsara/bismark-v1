/**
 * LAW-39 — Year Closing Automatically Generates Opening Balances
 *
 * When a Fiscal Year is closed, the system MUST automatically:
 *   1. Calculate closing balances for all accounts
 *   2. Post closing entries (zero out revenue/expense → Retained Earnings)
 *   3. Generate opening balance JE for the next fiscal year
 *
 * Flow:
 *   Close Year → Calculate Balances → Post Closing JE → Create Opening JE → Lock Year
 */
export const LAW_39_DESCRIPTION = `
LAW-39: Year Closing Automatically Generates Opening Balances

On year close:
  1. Calculate closing balances (asset, liability, equity, revenue, expense)
  2. Post Year-End Closing JE:
     - Debit Revenue accounts → zero them out
     - Credit Expense accounts → zero them out
     - Net P&L → Retained Earnings
  3. Create Opening Balance JE for next year:
     - Debit/Credit balance sheet accounts (carried forward)
  4. Lock previous year (status = 'closed')
  5. Publish 'fiscal_year.closed' event
`
