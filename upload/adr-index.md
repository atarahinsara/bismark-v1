# BISMARK ERP — Architecture Decision Records (ADR) Index

This document indexes all architecture decisions made during the project.

## Architecture Laws (33 Total)

| LAW | Title | ADR | Sprint |
|-----|-------|-----|--------|
| LAW-01 | No Cross-Context JOIN | ADR-001 | Design |
| LAW-02 | Business Codes on all main tables | ADR-002 | Design |
| LAW-03 | No Cross-Context Repository Access | ADR-003 | Design |
| LAW-04 | No Direct Cross-Context Repository Imports | ADR-015 | 2.2B |
| LAW-05 | No Aggregate Quantity as Source of Truth | ADR-020 | 2.2B |
| LAW-06 | Idempotency for Command APIs | ADR-021 | 2.2C |
| LAW-07 | Optimistic Locking for Aggregate Roots | ADR-022 | 2.2C |
| LAW-08 | Outbox Pattern | ADR-023 | 2.2D |
| LAW-09 | Inbox Pattern | ADR-024 | 2.2D |
| LAW-10 | Snapshot Policy | ADR-025 | 2.2D |
| LAW-11 | Transaction Boundary | ADR-026 | 2.2D |
| LAW-12 | Unit of Work | ADR-027 | 2.2D |
| LAW-13 | Financial Integrity | ADR-028 | 3.1 |
| LAW-14 | Immutable Business Documents | ADR-029 | 3.1 |
| LAW-15 | Event Versioning | ADR-030 | 3.1 |
| LAW-16 | No Physical Movement Without Ledger Event | ADR-031 | 3.2 |
| LAW-17 | Reservation Before Shipment | ADR-032 | 3.2 |
| LAW-18 | Shipment Immutable After Shipping | ADR-033 | 3.2 |
| LAW-19 | Only Financial Creates Accounting Entries | ADR-034 | 3.3 |
| LAW-20 | Every Payment Must Be Allocated | ADR-035 | 3.3 |
| LAW-21 | Invoices Immutable After Issue | ADR-036 | 3.3 |
| LAW-22 | No Return Receipt Without Inspection | ADR-037 | 3.4 |
| LAW-23 | Refund Requires Approved Return | ADR-038 | 3.4 |
| LAW-24 | Replacement = Return + New Fulfillment | ADR-039 | 3.4 |
| LAW-25 | No Cross-Context Synchronous Commands | ADR-040 | 3.5 |
| LAW-26 | Every Event Processed Exactly Once | ADR-041 | 3.5 |
| LAW-27 | Long-Running = Saga | ADR-042 | 3.5 |
| LAW-28 | Warranty Activation From Delivery Event | ADR-043 | 4 |
| LAW-29 | Claim Inspection Before Approval | ADR-044 | 4 |
| LAW-30 | Device Timeline From Events | ADR-045 | 4 |
| LAW-31 | No Part Consumption Without Ledger | ADR-046 | 5 |
| LAW-32 | QC Before Delivery | ADR-047 | 5 |
| LAW-33 | Warranty→Service Only Through Events | ADR-048 | 5 |

## Other ADRs

| ADR | Title | Status |
|-----|-------|--------|
| ADR-001 | Tech Stack: Laravel 12 + PostgreSQL + Redis + Next.js + Flutter | Accepted |
| ADR-002 | ERP Core = Unified Identity Provider | Accepted |
| ADR-003 | Multi-Tenant: Shared DB + tenant_id | Accepted |
| ADR-004 | IDs: UUID v7 + BIGINT | Accepted |
| ADR-005 | Workflow: Generic + Typed Registration | Accepted |
| ADR-006 | Rule Engine: Hybrid | Accepted |
| ADR-007 | Audit Retention: 12 online + unlimited archive | Accepted |
| ADR-008 | File Backend: Interface | Accepted |
| ADR-009 | Session: Max 3 + Idle 30min + Absolute 8h | Accepted |
| ADR-010 | Password: Strong + 2FA + Lockout (no expiration) | Accepted |
| ADR-011 | 2FA: TOTP + SMS | Accepted |
| ADR-012 | In-App: WebSocket + REST fallback | Accepted |
| ADR-013 | API Versioning: URL-based /api/v1 | Accepted |
| ADR-014 | i18n: UI + Date + Number + Currency + Timezone | Accepted |
| ADR-015 | Bounded Context Isolation | Accepted |
| ADR-016 | Business Code Generator in Configuration Context | Accepted |
| ADR-017 | Project Law: Critical-only fixes | Accepted |
