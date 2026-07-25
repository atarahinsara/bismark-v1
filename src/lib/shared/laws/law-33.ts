/**
 * LAW-33 — Warranty Approval Creates Service Request Only Through Events
 *
 * When a warranty claim is approved, the Service context creates a
 * Service Request ONLY by consuming the 'warranty.claim.approved' event.
 * No synchronous calls from Warranty to Service.
 *
 * Flow:
 *   Warranty → publishes 'warranty.claim.approved'
 *   → Service Inbox handler receives event
 *   → Creates ServiceRequest (linked to claim)
 *
 * This is a specific application of LAW-25 to the Warranty→Service integration.
 */
export const LAW_33_DESCRIPTION = `
LAW-33: Warranty Approval Creates Service Request Only Through Events

Event flow:
  warranty.claim.approved (Outbox)
    → Service Inbox handler
    → Create ServiceRequest (referenceType: 'warranty_claim', referenceId: claimId)

FORBIDDEN:
  - Warranty calling ServiceCommandService.createRequest()
  - Service querying WarrantyClaim status directly
  - Synchronous Warranty→Service communication
`
