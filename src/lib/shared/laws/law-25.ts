/**
 * LAW-25 — No Cross-Context Synchronous Commands
 *
 * All cross-context communication MUST be asynchronous through Domain Events.
 * No bounded context may directly call another context's Command Service.
 *
 * Pattern:
 *   Context A → Outbox → Event → Inbox → Context B (async)
 *
 * FORBIDDEN:
 *   - Sales calling InventoryCommandService.reserveStock()
 *   - Billing calling FinancialCommandService.createJournalEntry()
 *
 * ALLOWED:
 *   - Sales publishes 'sales_order.approved' event
 *   - Inventory listens and creates reservation (via Inbox)
 */
export const LAW_25_DESCRIPTION = `
LAW-25: No Cross-Context Synchronous Commands

All cross-context = async events only.

Flow:
  Context A (Outbox) → Event Bus → Context B (Inbox → Handler)

FORBIDDEN:
  import { InventoryCommandService } from '@/lib/modules/inventory/...'
  → synchronous call across context boundary

ALLOWED:
  await uow.outbox.append({ eventType: 'sales_order.approved', ... })
  → Inventory's InboxHandler picks it up asynchronously
`
