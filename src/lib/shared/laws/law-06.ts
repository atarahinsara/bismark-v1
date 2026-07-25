/**
 * LAW-06 — Idempotency for Command APIs
 *
 * All operations with financial or inventory effects MUST be idempotent.
 * If a request is sent twice (due to timeout, retry, etc.), it must NOT
 * execute the side effect twice.
 *
 * Implementation:
 *   Client sends `Idempotency-Key: <uuid>` header
 *   Server stores (key, request_hash, response) in idempotency_keys table
 *   If same key arrives again, return cached response with HTTP 200
 *
 * Required for:
 *   - Inventory Transactions (POST /inventory-transactions)
 *   - Payments (POST /payments)
 *   - Warranty Activation (POST /warranty-cards/{id}/activate)
 *   - Shipments (POST /shipments)
 *   - Invoices (POST /sales-invoices)
 *   - Service Orders (POST /service-orders)
 *   - Any POST that mutates state with business impact
 *
 * Flow:
 *   1. Client sends POST with Idempotency-Key header
 *   2. Server checks idempotency_keys table
 *      a. If exists and request_hash matches → return cached response (200)
 *      b. If exists and request_hash differs → 409 Conflict (key reuse)
 *      c. If not exists → proceed, store response, return 201
 *   3. Idempotency keys expire after 24 hours
 */
export const LAW_06_DESCRIPTION = `
LAW-06: Idempotency for Command APIs

Header: Idempotency-Key: <uuid-v4>

Database: idempotency_keys (key, tenant_id, request_hash, response_body, response_status, expires_at)

Behavior:
  - First request with key → execute, cache response, return original status
  - Duplicate request (same key, same body) → return cached response with 200
  - Key reuse (same key, different body) → 409 Conflict

Required endpoints:
  POST /inventory-transactions
  POST /payments
  POST /warranty-cards/{id}/activate
  POST /shipments
  POST /sales-invoices
  POST /service-orders
  POST /stock-reservations
  POST /stock-transfers
`
