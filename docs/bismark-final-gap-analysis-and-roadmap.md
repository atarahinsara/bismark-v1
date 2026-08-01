# BISMARK — Final Gap Analysis, Target Architecture & Phased Implementation Plan

> **سند مرجع توسعه بعدی پروژه BISMARK**
> **مبنای تحلیل:** بررسی واقعی Repository (schema.prisma, src/app/api, src/lib, tests, docker, CI)
> **قانون:** فقط تحلیل. هیچ کدنویسی، هیچ Migration، هیچ Package جدید.
> **تاریخ تولید:** بر اساس Audit v4 (82/100) + Gap Analysis قبلی

---

## فهرست بخش‌ها

1. Executive Summary
2. Current State
3. Existing Capabilities
4. Master Prompt Mapping
5. Gap Analysis
6. Target State
7. Domain Gap
8. Database Gap
9. API Gap
10. Security Gap
11. Mobile Gap
12. Technician Gap
13. Dispatch & SLA Gap
14. Customer 360 Gap
15. CRM Gap
16. Reporting & BI Gap
17. Infrastructure Gap
18. Observability Gap
19. Testing Gap
20. Production Readiness
21. Target Architecture
22. Architecture Decisions
23. Anti-Overengineering Review
24. Phased Roadmap
25. Phase-by-Phase Exit Gates
26. Risk Matrix
27. Final Readiness Score
28. Final Recommendation

---

## 1. Executive Summary

پروژه BISMARK در وضعیت فعلی یک **Core ERP Backend** قوی است با معماری DDD + Event-Driven که هسته اصلی Domain را به‌خوبی پوشش می‌دهد. اما برای تبدیل شدن به **Enterprise Business Platform کامل** که در Master Prompt تعریف شده، فاصله‌های واقعی در ۴ محور اصلی وجود دارد:

### چهار محور فاصله

1. **Production Foundation** — SQLite، بدون Backup/DR/PITR، بدون Observability (P0)
2. **Technician Mobile Platform** — Backend ناقص، Mobile Product کاملاً مفقود (P1)
3. **Business Intelligence** — Reporting فقط ۶ route مالی، BI Layer مفقود (P1)
4. **CRM & Customer 360** — فقط Lead + Interaction، Opportunity/Campaign/Journey مفقود (P2)

### اعداد کلیدی (Verified)

| شاخص | مقدار واقعی |
|------|-------------|
| Prisma Models | 116 |
| API Routes | 154 |
| Routes با RBAC | 148/154 (96%) |
| UI Views | 17 |
| Architecture Laws | 54 (LAW-04 تا LAW-57) |
| Domain Events | 46 |
| Saga Definitions | 2 (sales_order_fulfillment, return_processing) |
| Unit Test Files | 5 |
| Regression Tests | 53 (Audit v4) |
| Domain Modules | 2 (notification, product) |
| Mobile Routes | 0 |
| Device Models | 0 |
| Backup Scripts | 0 |
| Observability Tools | 0 |
| Audit Score (v4) | 82/100 |

### پاسخ به ۱۰ سؤال کلیدی

1. **فاصله از سیستم هدف:** ~40% (Core کامل، Enterprise extensions مفقود)
2. **ارزشمند و قابل استفاده فعلی:** Core ERP (Sales, Service, Warranty, Inventory, Finance, Notifications)
3. **نباید دوباره ساخته شوند:** RBAC, Tenant, Outbox/Inbox, Saga, Ledger, Audit, Workflow, Rules, 54 LAW
4. **بزرگ‌ترین Gap:** Technician Mobile + Offline Sync
5. **بزرگ‌ترین Risk:** نبود Backup/DR برای Production
6. **اولین Phase بعدی:** Phase 2 — Production Foundation
7. **قبل از Production لازم است:** PostgreSQL, Backup, PITR, Observability, CI/CD کامل
8. **قابل انتقال به V2:** AI, Marketing Automation, Advanced BI, Microservices split
9. **آیا Architecture قابل حفظ است؟** بله — Modular Monolith + DDD + Event-Driven صحیح است
10. **آیا مسیر درست است؟** بله — Foundation قوی، فقط Execution باقی مانده

---

## 2. Current State

### وضعیت واقعی پروژه (Verified)

| Component | Status | Detail |
|-----------|--------|--------|
| **Architecture** | ✅ Complete | Modular Monolith + DDD + Event-Driven (Outbox/Inbox/Saga) |
| **Domains (Modules)** | 🟡 Partial | فقط 2 module سازمان‌یافته (notification, product)؛ سایر domains در routes پخش هستند |
| **Bounded Contexts** | ✅ Logical | 18 BC منطقی موجود (Identity, Product, Inventory, Sales, Billing, Warranty, Service, Financial, Notification, Workflow, Rule, CRM, Service-Center, Procurement, Marketing, Loyalty, File, Multi-Company) |
| **Database** | 🔴 SQLite | `provider = "sqlite"`، PostgreSQL schema آماده اما فعال نه |
| **Models** | ✅ 116 model | شامل 24 gap model از Phase 1A |
| **API Routes** | ✅ 154 route | 148 با RBAC، 6 public (auth + health) |
| **Authentication** | ✅ Complete | JWT HMAC-SHA256 + scrypt (N=16384) + Session Revocation (globalThis cache) |
| **Authorization (RBAC)** | ✅ Strong | 52+ permission، 6 role، requirePermission در 148 route |
| **Events** | ✅ Complete | 46 event در catalog + Outbox/Inbox + ProcessedMessages |
| **Outbox** | ✅ Works | OutboxMessage + Dispatcher + Retry + DLQ + 5s poll |
| **Inbox** | ✅ Works | InboxWorker + ProcessedMessages (exactly-once) |
| **Saga** | ✅ Framework | 2 definition (sales_order_fulfillment, return_processing) |
| **Workers** | ✅ Running | run-workers.ts با 3 loop (outbox, inbox, notification) |
| **Frontend** | 🟡 Partial | 17 view،但仍 1503-line monolithic page.tsx + 425-line mock-data.ts (باقی‌مانده) |
| **Customer Portal** | 🟡 Backend | 6 route اصلاح‌شده با Party resolution، UI محدود |
| **Representative Portal** | 🔴 Missing | هیچ panel جداگانه‌ای موجود نیست |
| **Service Management** | ✅ Core | ServiceRequest, ServiceOrder, Diagnosis, Part, Labor, QC |
| **Warranty** | ✅ Complete | Card, Claim, Policy, Extension, Transfer, Activate |
| **Accounting** | 🟡 Partial | GL + AR/AP + Tax، اما Cost Center/Settlement/Reconciliation ساده |
| **Inventory** | ✅ Complete | Ledger Pattern + Stock Item + Reservation + Transfer + Cycle Count + Snapshot |
| **Reporting** | 🟡 Partial | 6 route مالی (dashboard, balance-sheet, profit-loss, cash-flow, equity, trial-balance) |
| **CRM** | 🔴 Minimal | فقط Lead + CustomerInteraction |
| **Testing** | 🟡 Partial | 5 unit test + 53 regression، No integration/E2E/load |
| **Deployment** | 🟡 Partial | Dockerfile + docker-compose (اصلاح‌شده)، CI/CD ناقص |
| **Infrastructure** | 🔴 Missing | بدون Redis, Object Storage, Monitoring, IaC |
| **Security** | 🟡 Strong | JWT + RBAC + Rate Limit + 12 Headers + Session Revocation، اما بدون MFA/PII Encryption |
| **Observability** | 🔴 Missing | فقط Health Check + Audit Log، بدون OpenTelemetry/Prometheus |
| **Backup** | 🔴 Missing | هیچ backup script یا PITR |
| **Disaster Recovery** | 🔴 Missing | هیچ DR Plan یا Restore Test |
| **Mobile** | 🔴 Missing | 0 route، 0 model، 0 app directory |
| **Offline Sync** | 🔴 Missing | 0 model (Device, OfflineSyncQueue) |

---

## 3. Existing Capabilities — DO NOT REDESIGN

این قابلیت‌ها در Repository موجود و working هستند. **نباید دوباره طراحی شوند.**

### Foundation (Architecture)

1. ✅ **Multi-Tenant** — همه 116 مدل tenantId دارند + Tenant model
2. ✅ **RBAC** — 52+ Permission + 6 Role + requirePermission/requireAnyPermission/requireAllPermissions در 148 route
3. ✅ **JWT Authentication** — HMAC-SHA256 + scrypt (N=16384) + 15min access + 7day refresh
4. ✅ **Session Revocation** — isSessionActive() با globalThis cache + invalidateSessionCache() در logout
5. ✅ **Rate Limiting** — In-memory sliding window (5 req/min برای auth)
6. ✅ **12 Security Headers** — CSP, HSTS, X-Frame-Options, etc. در middleware
7. ✅ **Idempotency** — IdempotencyKey + IdempotencyHelper (107 POST route)
8. ✅ **Optimistic Locking** — version field در همه Aggregate Roots (LAW-07)
9. ✅ **Audit Log** — AuditLog model + immutable enforcement (throw on update/delete)
10. ✅ **Correlation ID** — X-Correlation-Id در همه responses (LAW-61)

### Domain Patterns

11. ✅ **Ledger Pattern** — InventoryTransaction + StockBalanceSnapshot (LAW-05)
12. ✅ **Double-Entry Accounting** — JournalEntry + JournalEntryLine با totalDebit==totalCredit (LAW-35)
13. ✅ **Outbox Pattern** — OutboxMessage + Dispatcher + Retry + DLQ (LAW-08)
14. ✅ **Inbox Pattern** — ProcessedMessages + exactly-once (LAW-26)
15. ✅ **Saga Pattern** — saga-manager.ts با 2 definition (sales_order_fulfillment, return_processing)
16. ✅ **Event-Driven** — 46 event در catalog + Event Bus + cross-context handlers
17. ✅ **CQRS Lite** — Separation در service layer (product-query-service نمونه)
18. ✅ **UnitOfWork** — LAW-12، transaction-scoped access
19. ✅ **Business Code Generator** — LAW-02، 47 تعریف کد (PRT, SO, INV, PAY, WAR, etc.)
20. ✅ **Snapshot Pattern** — SnapshotPolicy + SnapshotScheduler + SnapshotWorker (LAW-10)

### Workflow & Rules

21. ✅ **Workflow Engine** — WorkflowDefinition (states/transitions JSON) + WorkflowInstance + WorkflowHistory + transition validation
22. ✅ **Rule Engine** — RuleSet + RuleDefinition (conditionDsl + actionDsl) + RuleExecution + RuleAuditStep
23. ✅ **Rule DSL** — `{ all: [...], any: [...] }` conditions + `{ type: "requireApproval"|"allow"|"notify"|"escalate" }` actions

### Core Domains

24. ✅ **Identity** — User, Role, Permission, UserRole, RolePermission, Session
25. ✅ **Organization** — Tenant, Branch, Company (Multi-Company)
26. ✅ **Customer/Party** — Party (person|organization) + Customer Portal (6 route)
27. ✅ **Product** — Product, ProductModel, ProductBrand, ProductCategory, ProductInstance (Serial)
28. ✅ **Inventory** — Warehouse, WarehouseZone, Location, Bin, StockItem, InventoryTransaction, StockReservation, StockTransfer, StockBalance, StockBalanceSnapshot, CycleCount, PickList
29. ✅ **Sales** — Quote, SalesOrder, SalesOrderLine, Shipment, ShipmentLine, Invoice, InvoiceLine, Payment, PaymentAllocation, CreditNote, ReturnOrder, Refund
30. ✅ **Warranty** — WarrantyCard, WarrantyClaim, WarrantyPolicy, WarrantyExtension, WarrantyTransfer
31. ✅ **Service** — ServiceRequest, ServiceOrder, ServiceOrderLine, ServiceOrderPart, ServiceOrderLabor, ServiceDiagnosis, ServiceQualityCheck, TechnicianAssignment, Appointment
32. ✅ **Financial** — ChartOfAccount, FiscalYear, FiscalPeriod, JournalEntry, JournalEntryLine, TaxCode, TaxRule, TaxCalculation, TaxPosting, CostCenter, ARTransaction, APTransaction, ARAllocation, APAllocation
33. ✅ **Procurement** — PurchaseOrder, PurchaseOrderLine, GoodsReceipt, GoodsReceiptLine
34. ✅ **Notification** — NotificationTemplate, Notification, NotificationDelivery, NotificationPreference, NotificationQueue + 5 Channel Provider + Template Engine (Handlebars-style)
35. ✅ **CRM Lite** — Lead, CustomerInteraction, LoyaltyAccount, LoyaltyTransaction, Complaint, Survey, SurveyTemplate
36. ✅ **Service Operations** — SLAPolicy, SLATracker, TechnicianSkill, TechnicianAvailability, TechnicianPerformance, Installation
37. ✅ **File Management** — FileAttachment با virusScanStatus field
38. ✅ **Marketing Lite** — Promotion, Coupon, CommissionRule, CommissionTransaction, PriceList, PriceListLine

### Infrastructure

39. ✅ **PostgreSQL Schema Ready** — prisma/schema.postgres.prisma آماده
40. ✅ **Migration Script** — scripts/migrate-to-postgres.sh با rollback path
41. ✅ **Docker** — Dockerfile + docker-compose.production.yml (اصلاح‌شده با worker service)
42. ✅ **Worker Process** — run-workers.ts با 3 loop (outbox + inbox + notification)
43. ✅ **Tick Endpoint** — /api/v1/system/tick برای manual trigger

---

## 4. Master Prompt Mapping

تطبیق 34 قابلیت Master Prompt با وضعیت واقعی Repository:

| # | Capability | موجود | ناقص | مفقود | وضعیت فعلی | Gap |
|---|-----------|-------|------|-------|-----------|-----|
| 1 | Sales | ✅ | — | — | ✅ Complete (Quote→Order→Payment→Invoice→Shipment→Return→Refund) | کم |
| 2 | Customer | ✅ | 🟡 UI | — | Backend کامل، UI محدود | متوسط |
| 3 | Representative | 🟡 | 🔴 Panel | — | Backend موجود، Representative Panel مفقود | متوسط |
| 4 | Technician | 🟡 Backend | 🔴 Mobile | — | TechnicianSkill/Availability/Performance موجود، Mobile مفقود | زیاد |
| 5 | Service | ✅ | 🟡 Dispatch | — | ServiceRequest/Order/Part/Labor/QC موجود، Dispatch Engine نه | متوسط |
| 6 | Warranty | ✅ | — | — | Complete (Card/Claim/Policy/Extension/Transfer) | کم |
| 7 | Inventory | ✅ | — | — | Complete (Ledger + Reservation + Transfer + Cycle Count) | کم |
| 8 | Accounting | 🟡 | 🔴 Cost Center, Settlement, Reconciliation | — | GL + AR/AP + Tax موجود، پیشرفته نه | متوسط |
| 9 | CRM | 🟡 | 🔴 Opportunity, Campaign, Task, Pipeline, Follow-up | — | فقط Lead + Interaction | زیاد |
| 10 | Customer 360 | 🔴 | — | ✅ | هیچ Projection موجود نیست | زیاد |
| 11 | Dispatch | 🟡 Data | 🔴 Algorithm | — | مدل‌های داده موجود، الگوریتم نه | متوسط |
| 12 | SLA | ✅ | 🟡 Enforcement | — | SLAPolicy/Tracker موجود، Escalation نه | کم |
| 13 | Reporting | 🟡 | 🔴 Dynamic, BI, Projections | — | 6 route مالی، dynamic report builder نه | زیاد |
| 14 | BI | 🔴 | — | ✅ | هیچ BI Layer | زیاد |
| 15 | Notifications | ✅ | 🟡 WhatsApp | — | 5 channel (email/sms/whatsapp/push/inapp) + Template Engine | کم |
| 16 | Files | 🟡 | 🔴 Signed URL, ClamAV, Retention | — | FileAttachment موجود، enterprise features نه | متوسط |
| 17 | Search | 🟡 | 🔴 FTS, Elasticsearch | — | فقط PostgreSQL LIKE | متوسط |
| 18 | Mobile | 🔴 | — | ✅ | 0 route, 0 model, 0 app | زیاد |
| 19 | Offline Sync | 🔴 | — | ✅ | 0 model (Device, OfflineSyncQueue) | زیاد |
| 20 | Authentication | ✅ | 🔴 MFA, OTP | — | JWT + scrypt + Session Revocation | کم |
| 21 | Authorization | ✅ | — | — | RBAC با 52+ permission | کم |
| 22 | Audit | ✅ | 🟡 Coverage | — | Model + immutable، فقط 3 route instrumented | کم |
| 23 | Events | ✅ | — | — | 46 event + catalog | کم |
| 24 | Outbox | ✅ | — | — | Complete با Retry + DLQ | کم |
| 25 | Inbox | ✅ | — | — | Complete با exactly-once | کم |
| 26 | Saga | ✅ | 🟡 More Definitions | — | Framework + 2 definition | کم |
| 27 | Observability | 🔴 | — | ✅ | فقط Health Check | زیاد |
| 28 | Backup | 🔴 | — | ✅ | هیچ | بحرانی |
| 29 | DR | 🔴 | — | ✅ | هیچ | بحرانی |
| 30 | CI/CD | 🟡 | 🔴 IaC, Staging | — | ci-cd.yml ناقص | زیاد |
| 31 | Infrastructure | 🔴 | — | ✅ | بدون Redis/Object Storage/Monitoring | زیاد |
| 32 | Automation | 🟡 | 🔴 Scheduler, Triggers | — | Workflow + Rule Engine موجود، Scheduler نه | متوسط |
| 33 | AI | 🔴 | — | ✅ | هیچ | زیاد |
| 34 | Security Enterprise | 🟡 | 🔴 MFA, PII, Device, Secrets | — | JWT + RBAC + Rate Limit + Headers | متوسط |

---

## 5. Gap Analysis

### Gap Registry (16 Gap اصلی)

| ID | Gap | Severity | Phase | Complexity |
|----|-----|----------|-------|------------|
| G-01 | Production Database (PostgreSQL) | P0 | 2 | متوسط |
| G-02 | Backup + PITR + Restore Test | P0 | 2 | متوسط |
| G-03 | Disaster Recovery Plan | P0 | 2 | متوسط |
| G-04 | Observability (Logs/Metrics/Tracing) | P0 | 2 | متوسط |
| G-05 | CI/CD کامل + IaC | P1 | 2 | زیاد |
| G-06 | Redis (Rate Limit + Cache + Session) | P1 | 2 | کم |
| G-07 | Technician Mobile (Flutter) | P1 | 4 | بسیار زیاد |
| G-08 | Offline Sync Engine | P1 | 4 | بسیار زیاد |
| G-09 | Dispatch Engine | P1 | 6 | زیاد |
| G-10 | SLA Escalation Engine | P2 | 6 | متوسط |
| G-11 | Customer 360 Projection | P2 | 8 | متوسط |
| G-12 | CRM Complete (Opportunity/Campaign/Task) | P2 | 8 | زیاد |
| G-13 | Reporting & BI Layer | P2 | 7 | زیاد |
| G-14 | Customer Portal UI | P2 | 5 | متوسط |
| G-15 | Representative Portal UI | P2 | 5 | متوسط |
| G-16 | MFA + PII Encryption + Secrets Mgmt | P2 | 2 | متوسط |

### Gap Detail Format (نمونه برای G-01)

```text
Gap: G-01 — Production Database (PostgreSQL)
Current State: SQLite (file:/home/z/my-project/db/custom.db) — single-writer, no concurrency
Target State: PostgreSQL 16+ with connection pooling
Business Impact: 10 concurrent writes → 60% timeout (proven by Audit v3)
Technical Impact: SQLite bottleneck برای Production
Dependencies: None (schema.postgres.prisma آماده است)
Priority: P0 — Production Blocker
Estimated Complexity: متوسط (schema آماده، فقط deploy + migrate)
Required Changes:
  - Deploy PostgreSQL 16
  - Set DATABASE_URL=postgresql://...
  - Run scripts/migrate-to-postgres.sh
  - Verify all routes
Acceptance Criteria:
  - 100 concurrent writes → 0% timeout
  - All 154 routes functional
  - All 5 unit test + 53 regression test PASS
```

(سایر Gap‌ها در بخش‌های تخصصی زیر به‌تفصیل آمده‌اند)

---

## 6. Target State

### BISMARK Enterprise Platform — Target

BISMARK باید به یک **Business Platform یکپارچه** تبدیل شود با:

```text
                    BISMARK Enterprise Platform
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   Core ERP              Mobile Platform         Intelligence
        │                     │                     │
  ┌─────┴─────┐         ┌─────┴─────┐         ┌─────┴─────┐
  │ Identity  │         │ Technician│         │ Reporting │
  │ Sales     │         │   App     │         │    BI     │
  │ Service   │         │ (Flutter) │         │ Analytics │
  │ Warranty  │         │  Offline  │         │    AI     │
  │ Inventory │         │  Sync     │         │           │
  │ Finance   │         └───────────┘         └───────────┘
  │ CRM       │
  │ Dispatch  │
  └───────────┘
```

### Target Architecture Principles

1. **KEEP** Modular Monolith (نه Microservices در V1)
2. **KEEP** DDD + Event-Driven (Outbox/Inbox/Saga)
3. **KEEP** Next.js برای Web (Admin + Customer + Representative)
4. **ADD** Flutter برای Technician Mobile (Android + iOS)
5. **ADD** PostgreSQL + Redis برای Production
6. **ADD** Observability Stack (OpenTelemetry + Prometheus + Grafana)
7. **ADD** Backup + DR + PITR
8. **ADD** Projection Layer برای Customer 360 + Reporting
9. **ADD** Dispatch Engine با Skill/Distance/Workload scoring
10. **DEFER** AI, Marketing Automation, Advanced BI به V2

### چه چیزی تغییر نمی‌کند (Architecture Freeze)

- Domain Model (116 model موجود)
- Database Ownership (هر Aggregate یک Owner)
- Core Architecture (Modular Monolith + DDD)
- Security Model (JWT + RBAC + Tenant)
- Event Model (Outbox/Inbox/Saga + 46 event)
- Accounting Model (Double-Entry + Ledger)
- Inventory Model (Ledger Pattern)

### چه چیزی تغییر می‌کند

- Database Engine: SQLite → PostgreSQL
- Cache: In-memory → Redis
- Mobile: هیچ → Flutter
- Observability: console.log → OpenTelemetry
- Backup: هیچ → WAL Archive + PITR
- Reporting: OLTP direct → Projections + Materialized Views
- CRM: Lead only → Full Pipeline

---

## 7. Domain Gap

### Existing Domains (18 Bounded Contexts)

| Domain | Models | Routes | Status |
|--------|--------|--------|--------|
| Identity | 5 (User, Role, Permission, UserRole, RolePermission, Session) | 4 (auth) | ✅ Complete |
| Organization | 3 (Tenant, Branch, Company) | 0 (در seed) | 🟡 Partial |
| Customer/Party | 1 (Party) | 6 (customer portal) | 🟡 Backend |
| Product | 5 (Product, Model, Brand, Category, Instance) | 9 | ✅ Complete |
| Inventory | 11 (Warehouse, Zone, Location, Bin, StockItem, etc.) | 18 | ✅ Complete |
| Sales | 12 (Quote, SalesOrder, Shipment, Invoice, Payment, etc.) | 22 | ✅ Complete |
| Warranty | 5 (Card, Claim, Policy, Extension, Transfer) | 5 | ✅ Complete |
| Service | 8 (Request, Order, Diagnosis, Part, Labor, QC, Assignment, Appointment) | 8 | ✅ Complete |
| Financial | 14 (ChartOfAccount, FiscalYear, JournalEntry, Tax, AR/AP, etc.) | 17 | 🟡 Partial |
| Procurement | 4 (PurchaseOrder, Line, GoodsReceipt, Line) | 2 | 🟡 Backend |
| Notification | 5 (Template, Notification, Delivery, Preference, Queue) | 16 | ✅ Complete |
| CRM Lite | 7 (Lead, Interaction, Loyalty, Complaint, Survey, etc.) | 18 | 🟡 Minimal |
| Service Ops | 6 (SLAPolicy, Tracker, TechnicianSkill, Availability, Performance, Installation) | 6 | 🟡 Backend |
| File | 1 (FileAttachment) | 1 | 🟡 Basic |
| Marketing Lite | 5 (Promotion, Coupon, CommissionRule, CommissionTransaction, PriceList) | 6 | 🟡 Backend |
| Workflow | 3 (Definition, Instance, History) | 5 | ✅ Complete |
| Rule | 4 (RuleSet, RuleDefinition, RuleExecution, RuleAuditStep) | 4 | ✅ Complete |
| Multi-Company | 1 (Company) | 1 | 🟡 Backend |

### Domain Gaps

| Domain | Missing |
|--------|---------|
| Customer 360 | Projection Model + Read API |
| CRM | Opportunity, Campaign, Task, FollowUp, Segment, Journey |
| Dispatch | DispatchService + AssignmentEngine + ScoringAlgorithm |
| Notification | WhatsApp Business (فعلاً evolution/meta_cloud placeholder) |
| File | Signed URL, ClamAV integration, Retention Policy |
| AI | Predictive Maintenance, Demand Forecast, Anomaly Detection |
| Mobile | Device, OfflineSyncQueue, MobileSync models |

---

## 8. Database Gap

### Existing Models (116)

(همان فهرست Section 2)

### New Models Required

| Model | Purpose | Owner Domain | Phase |
|-------|---------|--------------|-------|
| `Device` | ثبت دستگاه موبایل تکنسین (device_id, platform, push_token) | Identity | 4 |
| `OfflineSyncQueue` | صف تغییرات offline تکنسین | Mobile | 4 |
| `SyncConflict` | conflicted sync records | Mobile | 4 |
| `MobileJobSnapshot` | snapshot مأموریت برای offline access | Mobile | 4 |
| `TechnicianLocation` | GPS tracking تکنسین در مأموریت | Service | 4 |
| `Opportunity` | فرصت فروش (Lead → Opportunity → Quote) | CRM | 8 |
| `Campaign` | کمپین بازاریابی | Marketing | 8 |
| `CampaignTarget` | مخاطبان کمپین | Marketing | 8 |
| `Task` | task کاربر | CRM | 8 |
| `FollowUp` | follow-up روی Lead/Opportunity | CRM | 8 |
| `CustomerSegment` | segmentation مشتری (RFM) | CRM | 8 |
| `CustomerJourneyEvent` | event در journey مشتری | CRM | 8 |
| `Customer360View` | Projection برای Customer 360 | Customer 360 | 8 |
| `SalesProjection` | daily/monthly sales aggregation | Reporting | 7 |
| `ServiceProjection` | service KPIs aggregation | Reporting | 7 |
| `TechnicianScore` | امتیاز تکنسین برای Dispatch | Dispatch | 6 |
| `EscalationRule` | قوانین escalation | SLA | 6 |
| `EscalationLog` | log escalation‌ها | SLA | 6 |
| `ScheduledJob` | cron-style scheduled tasks | Automation | 9 |
| `JobExecutionLog` | log اجرای scheduled jobs | Automation | 9 |
| `RefreshToken` (اگر جدا از Session) | refresh token rotation | Identity | 2 |
| `SecurityEvent` | log رویدادهای امنیتی | Security | 2 |
| `PIIEncryptionKey` | مدیریت کلیدهای PII encryption | Security | 2 |

### Models Modification

| Model | Change | Reason |
|-------|--------|--------|
| `User` | Add `mfaEnabled`, `mfaSecret`, `lastMfaAt` | MFA support |
| `User` | Add `piiEncryptionKeyId` | PII encryption |
| `Party` | Add `piiDataEncrypted` (JSON encrypted) | PII protection |
| `Session` | Add `deviceFingerprint` (اگر موجود نه) | Device binding |
| `AuditLog` | Add `piiAccessed` flag | PII audit |
| `FileAttachment` | Add `signedUrlExpiresAt`, `retentionExpiresAt` | Signed URL + Retention |

### Table: Entity Gap Summary

| Entity Category | Existing | Missing | Modify | New |
|-----------------|----------|---------|--------|-----|
| Identity | 6 | 2 (RefreshToken, SecurityEvent) | 1 (User for MFA) | 3 |
| Customer/CRM | 7 | 7 (Opportunity, Campaign, etc.) | 1 (Party PII) | 8 |
| Service/Dispatch | 8 | 3 (TechnicianLocation, TechnicianScore, Escalation*) | 0 | 3 |
| Mobile | 0 | 4 (Device, OfflineSyncQueue, SyncConflict, MobileJobSnapshot) | 0 | 4 |
| Reporting | 0 | 2 (SalesProjection, ServiceProjection) | 0 | 2 |
| Automation | 0 | 2 (ScheduledJob, JobExecutionLog) | 0 | 2 |
| File | 1 | 0 | 1 (FileAttachment signed URL) | 0 |
| **TOTAL** | 22 | 20 | 3 | 22 |

---

## 9. API Gap

### Existing API Routes (154)

(همان فهرست Section 2)

### API Categories Status

| Category | Existing | Status |
|----------|----------|--------|
| Auth | 4 (login, logout, refresh, me) | ✅ |
| Customer Portal | 6 | ✅ (اصلاح‌شده) |
| Sales | 22 (orders, invoices, payments, shipments, returns, refunds, quotes) | ✅ |
| Inventory | 18 (stock, transfers, cycle counts, movements) | ✅ |
| Product | 9 (products, brands, categories, models) | ✅ |
| Service | 8 (requests, orders, diagnose, qc, parts) | ✅ |
| Warranty | 5 (cards, claims, activate, inspect, approve) | ✅ |
| Financial | 17 (journal, chart, fiscal, tax, AR/AP, reconciliation, trial-balance) | 🟡 |
| Reporting | 6 (dashboard, balance-sheet, profit-loss, cash-flow, equity, trial-balance) | 🟡 |
| Notification | 16 | ✅ |
| Workflow + Rules | 9 | ✅ |
| CRM Lite | 18 (leads, interactions, loyalty, complaints, surveys, appointments, installations) | 🟡 |
| Procurement | 2 (purchase-orders, goods-receipts) | 🟡 |
| System | 3 (health, stats, tick) | ✅ |
| Files | 1 | 🟡 |
| Marketing | 6 (promotions, coupons, commissions) | 🟡 |
| Mobile | 0 | 🔴 |
| Dispatch | 0 | 🔴 |
| Customer 360 | 0 | 🔴 |
| Representative Portal | 0 | 🔴 |

### Missing API Routes

#### Mobile API (Phase 4)

```text
POST   /api/v1/mobile/register-device        — ثبت Device
POST   /api/v1/mobile/sync                    — Sync Queue
GET    /api/v1/mobile/assignments             — مأموریت‌های assigned
GET    /api/v1/mobile/jobs/[id]               — جزئیات Job
POST   /api/v1/mobile/jobs/[id]/accept        — قبول مأموریت
POST   /api/v1/mobile/jobs/[id]/check-in      — Check-in با GPS
POST   /api/v1/mobile/jobs/[id]/diagnosis     — Diagnosis
POST   /api/v1/mobile/jobs/[id]/parts         — قطعات مصرفی
POST   /api/v1/mobile/jobs/[id]/labor         — اجرت
POST   /api/v1/mobile/jobs/[id]/photos        — عکس قبل/بعد
POST   /api/v1/mobile/jobs/[id]/signature     — امضای مشتری
POST   /api/v1/mobile/jobs/[id]/complete      — تکمیل
POST   /api/v1/mobile/jobs/[id]/reject        — رد مأموریت
GET    /api/v1/mobile/technician/skills       — مهارت‌ها
GET    /api/v1/mobile/technician/schedule     — برنامه هفتگی
POST   /api/v1/mobile/location/update         — GPS update
```

#### Dispatch API (Phase 6)

```text
POST   /api/v1/dispatch/assign                — تخصیص دستی
POST   /api/v1/dispatch/auto-assign           — تخصیص خودکار
POST   /api/v1/dispatch/reassign              — تخصیص مجدد
GET    /api/v1/dispatch/candidates/[requestId] — لیست candidate technicians
GET    /api/v1/dispatch/score/[technicianId]/[requestId] — امتیاز تکنسین
POST   /api/v1/dispatch/bulk-assign           — تخصیص گروهی
GET    /api/v1/dispatch/workload              — workload همه تکنسین‌ها
```

#### Customer 360 API (Phase 8)

```text
GET    /api/v1/customers/[id]/360             — نمای 360 درجه
GET    /api/v1/customers/[id]/journey         — customer journey
GET    /api/v1/customers/[id]/clv             — Customer Lifetime Value
GET    /api/v1/customers/[id]/recommendations — پیشنهاد cross-sell/upsell
GET    /api/v1/customers/segments             — segments
POST   /api/v1/customers/segments/refresh     — re-segment
```

#### CRM API (Phase 8)

```text
CRUD   /api/v1/opportunities                  — مدیریت opportunities
POST   /api/v1/opportunities/[id]/stage       — تغییر stage
CRUD   /api/v1/campaigns                      — مدیریت campaigns
POST   /api/v1/campaigns/[id]/launch          — اجرای کمپین
GET    /api/v1/campaigns/[id]/metrics         — metrics
CRUD   /api/v1/tasks                          — task management
CRUD   /api/v1/follow-ups                     — follow-ups
GET    /api/v1/pipeline/summary               — sales pipeline summary
```

#### Reporting API (Phase 7)

```text
GET    /api/v1/reports/sales/daily
GET    /api/v1/reports/sales/monthly
GET    /api/v1/reports/sales/by-product
GET    /api/v1/reports/sales/by-branch
GET    /api/v1/reports/sales/by-representative
GET    /api/v1/reports/sales/by-city
GET    /api/v1/reports/service/sla-breach
GET    /api/v1/reports/service/first-time-fix
GET    /api/v1/reports/service/technician-performance
GET    /api/v1/reports/service/parts-consumption
GET    /api/v1/reports/warranty/cost
GET    /api/v1/reports/customer/satisfaction
GET    /api/v1/reports/executive/dashboard
POST   /api/v1/reports/dynamic/query          — dynamic report builder
POST   /api/v1/reports/export                 — PDF/Excel/CSV export
POST   /api/v1/reports/schedule               — scheduled report
```

#### Representative Portal API (Phase 5)

```text
GET    /api/v1/representative/dashboard       — KPIs نماینده
GET    /api/v1/representative/customers       — مشتریان نماینده
GET    /api/v1/representative/orders          — سفارش‌های نماینده
GET    /api/v1/representative/commissions     — پورسانت
GET    /api/v1/representative/inventory       — موجودی قابل فروش
GET    /api/v1/representative/receivables     — مطالبات
POST   /api/v1/representative/quick-sale      — فروش سریع
```

#### Automation API (Phase 9)

```text
CRUD   /api/v1/scheduler/jobs                 — scheduled jobs
POST   /api/v1/scheduler/jobs/[id]/run        — manual trigger
GET    /api/v1/scheduler/executions           — execution log
POST   /api/v1/automation/triggers            — trigger definitions
GET    /api/v1/automation/rules               — automation rules
```

### API Security Hardening Needed

| API | Issue | Fix |
|-----|-------|-----|
| All 154 routes | Session check اضافه شد (F-01) ✅ | None |
| Customer Portal | Party resolution اضافه شد (F-03) ✅ | None |
| File Upload | No virus scan | Add ClamAV integration (Phase 2) |
| All routes | No PII logging | Add PII redaction in logs (Phase 2) |
| Mobile APIs | (new) | Device binding + scope to technician |

---

## 10. Security Gap

### Current Security (Strong)

| Item | Status | Evidence |
|------|--------|----------|
| JWT (HMAC-SHA256) | ✅ | edge-jwt.ts با Web Crypto |
| scrypt Password Hashing | ✅ | N=16384, r=8, p=1 |
| Session Revocation | ✅ | isSessionActive + globalThis cache + invalidateSessionCache در logout |
| RBAC | ✅ | 52+ permission، 148/154 routes با requirePermission |
| Rate Limiting | ✅ | In-memory sliding window (5 req/min auth) |
| 12 Security Headers | ✅ | CSP, HSTS, X-Frame-Options, etc. در middleware |
| Input Sanitizer | ✅ | 75 attack pattern |
| Correlation ID | ✅ | X-Correlation-Id در همه responses |
| Audit Log | ✅ | Immutable (throw on update/delete) |
| Tenant Isolation | ✅ | tenantId در همه 116 model + getTenantId() در همه routes |
| Mass Assignment Protection | ✅ | Whitelist در همه routes (F-02 fix) |
| CSRF | ✅ N/A | Bearer token auth — CSRF not applicable |
| SQL Injection | ✅ | Prisma parameterized |
| XSS | ✅ | React default + CSP |

### Security Gaps

| Gap | Current | Risk | Required Fix | Test | Priority |
|-----|---------|------|--------------|------|----------|
| MFA | None | High برای admin/finance | TOTP (RFC 6238) + Backup Codes | Unit test TOTP validation | P2 |
| OTP (SMS/Email) | None | Medium برای customer | OTP generation + rate limit + expiry | Unit test OTP flow | P2 |
| PII Encryption | None | High (GDPR-like) | Field-level AES-256-GCM برای Party.taxId, User.email, User.phone | Unit test encrypt/decrypt | P2 |
| File Virus Scan | Field موجود، impl نه | High | ClamAV integration + async scan | Integration test با EICAR test file | P2 |
| Signed URL | None | Medium | Pre-signed URL با expiry برای S3/MinIO | Unit test URL generation + expiry | P2 |
| Secrets Management | .env file | High | HashiCorp Vault یا AWS Secrets Manager | Integration test | P2 |
| Device Security | None | High برای Mobile | Device registration + fingerprint + root/jailbreak detection | Mobile test | P1 (Phase 4) |
| Offline Data Security | None | High | SQLite encryption (SQLCipher) در Mobile | Mobile test | P1 (Phase 4) |
| Security Events | None | Medium | SecurityEvent model + alerting | Unit test | P2 |
| Brute Force (advanced) | Rate limit فقط | Low | Account lockout + IP block + CAPTCHA | Integration test | P3 |
| API Key (for integrations) | None | Medium | API Key model + scope + rotation | Unit test | P3 |
| Webhook Signing | None | Medium | HMAC signature verification | Unit test | P3 |

---

## 11. Mobile Gap

### Current State

- **Mobile Routes:** 0
- **Mobile Models:** 0 (Device, OfflineSyncQueue, SyncConflict, MobileJobSnapshot)
- **Mobile App:** 0 directory (no flutter/, no apps/mobile/, no PWA config)
- **Mobile Backend Support:** 0

### Target State

- **Mobile App:** Flutter (Android + iOS) — Technician Panel
- **PWA:** Next.js PWA برای Customer Portal (اختیاری)
- **Offline-First:** SQLite (Drift) + Sync Queue + Conflict Resolution
- **Push Notification:** Firebase Cloud Messaging
- **GPS:** Google Maps + Geolocation
- **Camera:** Camera + image compression
- **Barcode/QR:** mobile_scanner package
- **Signature:** signature_pad package

### Gap

| Item | Status | Action |
|------|--------|--------|
| Flutter App | 🔴 Missing | Build from scratch |
| PWA | 🔴 Missing | Next.js PWA config + manifest |
| Offline DB | 🔴 Missing | Drift (SQLite) |
| Sync Queue | 🔴 Missing | OfflineSyncQueue model + SyncService |
| Conflict Resolution | 🔴 Missing | Last-Write-Wins + Conflict Queue |
| GPS | 🔴 Missing | geolocator + Google Maps |
| Camera | 🔴 Missing | image_picker + flutter_image_compress |
| Barcode Scanner | 🔴 Missing | mobile_scanner |
| Push Notification | 🔴 Missing | FCM + APNs |
| Background Sync | 🔴 Missing | workmanager |
| Signature | 🔴 Missing | signature_pad |
| Device Registration | 🔴 Missing | Device model + /mobile/register-device |

---

## 12. Technician Gap

### Current State (Backend)

- **Models:** TechnicianSkill, TechnicianAvailability, TechnicianPerformance, TechnicianAssignment, Appointment
- **Routes:** /technician-skills, /technician-availability, /technician-performance, /appointments
- **Service:** ServiceRequest/Order با technicianPartyId field

### Target State

- **Mobile App:** Flutter کامل برای تکنسین
- **Dispatch:** DispatchService با scoring algorithm
- **Offline:** Offline-first با sync
- **Tracking:** GPS live tracking در مأموریت
- **Push:** Real-time assignment notification

### Gap

| Item | Status | Action |
|------|--------|--------|
| Mobile App | 🔴 Missing | Phase 4 — Flutter |
| Dispatch Algorithm | 🔴 Missing | Phase 6 — DispatchService |
| GPS Tracking | 🔴 Missing | Phase 4 — TechnicianLocation |
| Push Notification | 🔴 Missing | Phase 4 — FCM |
| Offline Mode | 🔴 Missing | Phase 4 — OfflineSyncQueue |
| Job Acceptance Flow | 🔴 Missing | Phase 4 — /mobile/jobs/[id]/accept |
| Check-in/Check-out | 🔴 Missing | Phase 4 — /mobile/jobs/[id]/check-in |
| Photo Before/After | 🔴 Missing | Phase 4 — FileAttachment + Mobile upload |
| Signature Capture | 🔴 Missing | Phase 4 — signature_pad |
| Barcode Scan | 🔴 Missing | Phase 4 — mobile_scanner |
| Service Report | 🟡 Partial | ServiceOrder موجود، ولی Mobile Form نه |

---

## 13. Dispatch & SLA Gap

### Current State

- **Models:** SLAPolicy, SLATracker, TechnicianSkill, TechnicianAvailability, TechnicianPerformance, TechnicianAssignment
- **Routes:** /sla-policies, /sla-trackers, /technician-skills, /technician-availability, /technician-performance, /appointments
- **Assignment:** Manual (ServiceRequest → ServiceOrder → TechnicianAssignment)

### Target State

- **Dispatch Engine:** DispatchService با scoring algorithm
- **Auto-Assignment:** بر اساس Skill + Coverage + Availability + Workload + SLA + Distance + Priority
- **SLA Enforcement:** Deadline calculation + breach detection + escalation
- **Escalation:** Automatic escalation on breach

### Dispatch Algorithm (Proposed)

```text
Input: ServiceRequest
  ↓
Step 1: Find Candidates
  - Filter by TechnicianSkill (productId/categoryId)
  - Filter by TechnicianAvailability (date + status='available')
  - Filter by CoverageArea (customer city)
  ↓
Step 2: Score Each Candidate
  Score = (w1 × SLA_Urgency) + (w2 × Skill_Match) + (w3 × Distance) + (w4 × Workload) + (w5 × Rating)
  - SLA_Urgency: higher برای urgent/critical
  - Skill_Match: exact > senior > intermediate > junior
  - Distance: closer = higher (PostGIS یا Google Distance Matrix)
  - Workload: less assigned jobs = higher
  - Rating: higher customerRating = higher
  ↓
Step 3: Select Best
  - Pick top-scored technician
  - Check capacity (max concurrent jobs)
  ↓
Step 4: Assign
  - Create TechnicianAssignment
  - Update ServiceRequest.technicianPartyId
  - Send push notification
  - Create Appointment
  ↓
Step 5: Fallback
  - If no candidate: escalate to Service Manager (manual)
```

### V1 Strategy

- **Manual Assignment** (موجود) — Service Manager selects technician
- **Semi-Automatic** (Phase 6) — System suggests top-3 candidates, manager picks
- **Automatic** (Phase 6+) — System auto-assigns best candidate (configurable per tenant)

### SLA Gap

| Item | Status | Action |
|------|--------|--------|
| SLA Policy Definition | ✅ | None |
| SLA Tracker | ✅ | None |
| Deadline Calculation | 🟡 Manual | Auto-calc از SLAPolicy |
| Breach Detection | 🔴 Missing | Cron job + alert |
| Escalation Rules | 🔴 Missing | EscalationRule model + engine |
| SLA Reports | 🔴 Missing | Phase 7 — /reports/service/sla-breach |

---

## 14. Customer 360 Gap

### Current State

- **Data Spread Across:** Party, SalesOrder, Invoice, Payment, WarrantyCard, ServiceRequest, Complaint, Survey, CustomerInteraction, LoyaltyAccount
- **No Projection:** هر query باید join کند → slow برای 1000+ customers
- **No CLV:** Customer Lifetime Value محاسبه نمی‌شود
- **No Recommendations:** هیچ cross-sell/upsell logic

### Target State

- **Customer360View Projection** (Materialized View یا event-updated table)
- **CLV Calculation:** از مجموع payments + projected future value
- **Customer Journey:** timeline از همه interactions
- **Recommendations:** rule-based (buy X → suggest Y)

### Projection Strategy

```text
Events (sales_order.created, payment.received, service_request.created, etc.)
  ↓
Event Handler: Customer360Projector
  ↓
Update Customer360View (idempotent, increment counters)
  ↓
API: GET /customers/[id]/360
  → Returns aggregated view (fast, no joins)
```

### Customer 360 Fields

```text
- profile (Party data)
- totalPurchases (sum of paid invoices)
- totalSpent (sum of payments)
- lastPurchaseDate
- productsOwned (count + list)
- activeWarranties (count)
- serviceHistory (count + last 5)
- openComplaints (count)
- satisfactionScore (avg of survey ratings)
- loyaltyPoints
- loyaltyTier
- clv (calculated)
- segment (RFM: Recency, Frequency, Monetary)
- recommendedProducts (top 3)
- interactions (last 5)
```

### Gap

| Item | Status | Action |
|------|--------|--------|
| Projection Model | 🔴 Missing | Customer360View |
| Event Projector | 🔴 Missing | Customer360Projector handler |
| CLV Calculation | 🔴 Missing | Service method |
| Customer Journey | 🔴 Missing | CustomerJourneyEvent model |
| Recommendations | 🔴 Missing | Rule-based engine |
| Segmentation | 🔴 Missing | RFM segmentation cron |
| API | 🔴 Missing | /customers/[id]/360 |

---

## 15. CRM Gap

### Current State

- **Lead:** ✅ (model + 2 routes)
- **CustomerInteraction:** ✅ (model + 1 route)
- **Loyalty:** ✅ (LoyaltyAccount + LoyaltyTransaction)
- **Complaint:** ✅ (model + 1 route + customer portal route)
- **Survey:** ✅ (Survey + SurveyTemplate + routes)

### Target State (Full CRM)

| CRM Feature | Status | Action |
|-------------|--------|--------|
| Lead Management | ✅ | None |
| Lead → Opportunity Conversion | 🔴 | Opportunity model + conversion flow |
| Opportunity Pipeline | 🔴 | Stage-based pipeline (Prospecting → Qualification → Proposal → Negotiation → Close) |
| Campaign Management | 🔴 | Campaign + CampaignTarget + metrics |
| Task Management | 🔴 | Task model + assignment + reminders |
| Follow-up Tracking | 🔴 | FollowUp model + scheduling |
| Customer Segmentation | 🔴 | RFM + custom segments |
| Customer Journey Map | 🔴 | CustomerJourneyEvent |
| CLV Calculation | 🔴 | Service + cron |
| Cross-sell / Upsell | 🔴 | Rule engine |
| Marketing Automation | 🔴 | Trigger-based (Phase 9) |
| Call Center Tools | 🔴 | Quick search + interaction log |
| Email Marketing | 🔴 | Campaign + template + send |
| SMS Marketing | 🔴 | Campaign + bulk send |
| Customer Score | 🔴 | Engagement + satisfaction + CLV |

### Phase Strategy

- **Phase 8 (CRM):** Opportunity + Campaign + Task + FollowUp + Segmentation + Journey + CLV
- **Phase 9 (Automation):** Marketing Automation + Trigger-based campaigns + Email/SMS marketing

---

## 16. Reporting & BI Gap

### Current State

- **6 Financial Reports:** dashboard, balance-sheet, profit-loss, cash-flow, equity, final-trial-balance
- **All from OLTP** (JournalEntry direct query)
- **No Projections** (every report computes from raw data)
- **No Dynamic Report Builder**
- **No Scheduled Reports**
- **No Export** (PDF/Excel/CSV)

### Target State

#### V1 (Phase 7)

- **Materialized Views:** SalesProjection, ServiceProjection, InventoryProjection, CustomerProjection
- **Standard Reports:** Sales (8), Service (10), Financial (8), Executive Dashboard
- **Export:** PDF, Excel, CSV
- **Scheduled:** Daily/Weekly email

#### V2 (Future)

- **BI Tool:** Metabase یا Superset (self-service)
- **OLAP:** ClickHouse یا Separate PostgreSQL اگر حجم زیاد شد
- **Real-time Dashboard:** WebSocket push

### Reports Needed

#### Sales Reports (8)

1. Daily Sales
2. Monthly Sales
3. Sales by Product
4. Sales by Branch
5. Sales by Representative
6. Sales by City
7. Top Products
8. Returns Analysis

#### Service Reports (10)

1. Service Requests Count
2. Open vs Closed Requests
3. SLA Breach Report
4. Average Resolution Time
5. First-Time Fix Rate
6. Technician Performance
7. Parts Consumption
8. Warranty Cost
9. Non-Warranty Revenue
10. Customer Satisfaction (CSAT/NPS)

#### Financial Reports (8)

1. Revenue Report
2. Receivables Aging
3. Payables Aging
4. Cash Flow
5. Profit & Loss
6. Balance Sheet
7. Tax Report (VAT)
8. Commission Report

#### Executive Dashboard (Real-time)

- Revenue (today/MTD/YTD)
- Sales (today/MTD/YTD)
- Orders (open/closed)
- Customers (new/active)
- Service Requests (open/closed/SLA breach)
- Warranty Cost (MTD)
- Cash Position
- Receivables (total + aging)
- Customer Satisfaction (avg)
- Technician Performance (top 5)

### Gap

| Item | Status | Action |
|------|--------|--------|
| 6 Financial Reports | ✅ | None |
| Sales Reports | 🔴 | Phase 7 |
| Service Reports | 🔴 | Phase 7 |
| Executive Dashboard | 🔴 | Phase 7 (با real-time data از /system/stats) |
| Materialized Views | 🔴 | Phase 7 |
| Dynamic Report Builder | 🔴 | V2 |
| Export (PDF/Excel/CSV) | 🔴 | Phase 7 |
| Scheduled Reports | 🔴 | Phase 7 |
| BI Tool | 🔴 | V2 |

---

## 17. Infrastructure Gap

### Current State

- **Database:** SQLite (file-based)
- **Cache:** In-memory (globalThis, no Redis)
- **Object Storage:** Local filesystem (file:/upload)
- **Web Server:** Next.js dev server (port 3000)
- **Gateway:** Caddy (port 81 → 3000)
- **Worker:** Manual `bun run src/workers/run-workers.ts`
- **Monitoring:** فقط /api/v1/system/health
- **Containerization:** Dockerfile + docker-compose.production.yml (اصلاح‌شده)

### Target State (Production)

| Component | Current | Target | Priority |
|-----------|---------|--------|----------|
| Database | SQLite | PostgreSQL 16 | P0 |
| Cache | In-memory | Redis 7 | P1 |
| Object Storage | Local FS | MinIO (S3-compatible) | P1 |
| Web Server | Next.js dev | Next.js standalone (production build) | P0 |
| Reverse Proxy | Caddy | Caddy (with TLS) | P0 |
| Worker | Manual | Docker service (auto-restart) | P0 |
| Monitoring | Health check | Prometheus + Grafana | P1 |
| Logging | console.log | Loki + structured JSON | P1 |
| Tracing | None | OpenTelemetry + Jaeger | P2 |
| Error Tracking | None | Sentry | P1 |
| Secrets | .env | HashiCorp Vault | P2 |
| IaC | None | Terraform | P2 |
| CI/CD | ci-cd.yml ناقص | GitHub Actions کامل | P1 |
| Backup | None | pg_dump + WAL Archive → MinIO | P0 |
| DR | None | Hot standby + automated failover | P2 |

---

## 18. Observability Gap

### Current State

- **Health Check:** /api/v1/system/health (database, outbox, sagas)
- **Audit Log:** AuditLog model (3 routes instrumented)
- **Logging:** `console.log` و `console.error` scattered
- **Metrics:** None
- **Tracing:** None
- **Alerting:** None

### Target State

#### Logging

- **Structured JSON** (pino یا winston)
- **Log Levels:** debug, info, warn, error, fatal
- **Log Aggregation:** Loki + Grafana
- **PII Redaction** در logs

#### Metrics

- **Application:** Request count, latency, error rate
- **Business:** Orders/day, revenue/day, service requests/day, SLA breach count
- **Infrastructure:** CPU, memory, disk, DB connections
- **Tool:** Prometheus + Grafana

#### Tracing

- **Distributed Tracing:** OpenTelemetry SDK
- **Trace ID:** Propagated از middleware → service → DB
- **Spans:** HTTP request, DB query, external API call, worker loop
- **Tool:** Jaeger یا Grafana Tempo

#### Alerting

- **Alertmanager** برای Prometheus
- **Channels:** Slack, Email, SMS (via existing Notification system)
- **Alerts:**
  - API 5xx error rate > 1%
  - API p95 latency > 500ms
  - DB connection pool exhausted
  - Worker down
  - Outbox backlog > 100 messages
  - SLA breach imminent
  - Disk space < 20%
  - Backup failed

#### SLO/SLA

- **API Availability:** 99.9%
- **API p95 Latency:** < 300ms
- **Worker Uptime:** 99.9%
- **Backup Success Rate:** 100%

---

## 19. Testing Gap

### Current State

| Test Type | Files | Cases | Status |
|-----------|-------|-------|--------|
| Unit (Architecture Laws) | 1 | 17 | ✅ |
| Unit (Shared Kernel) | 1 | 26 | ✅ |
| Unit (Auth/RBAC) | 1 | 22 | ✅ |
| Unit (Business Logic) | 1 | 19 | ✅ |
| Unit (Input Sanitizer) | 1 | 38 | ✅ |
| Regression (Audit v4) | 1 script | 53 | ✅ |
| **TOTAL** | **6** | **175** | |

### Target State (Test Pyramid)

| Test Type | Current | Target | Gap |
|-----------|---------|--------|------|
| Unit | 122 | 500+ | 378 |
| Integration | 0 | 100+ | 100 |
| API Contract | 0 | 50+ | 50 |
| E2E | 0 | 30+ | 30 |
| Security | 0 | 20+ | 20 |
| Load | 0 | 10+ | 10 |
| Concurrency | 0 | 10+ | 10 |
| Mobile Offline | 0 | 20+ | 20 |
| Sync | 0 | 15+ | 15 |
| Financial Integrity | 0 | 25+ | 25 |
| Inventory Integrity | 0 | 15+ | 15 |
| Event Reliability | 0 | 10+ | 10 |
| Migration | 0 | 5+ | 5 |
| Backup Restore | 0 | 5+ | 5 |
| Disaster Recovery | 0 | 3+ | 3 |

### Critical Business Invariant Tests Needed

```text
Financial:
- Total Debit == Total Credit (هر JournalEntry)
- AR balance == Sum of unpaid invoices
- AP balance == Sum of unpaid bills
- Cash balance == Sum of cash receipts - cash payments

Inventory:
- Stock cannot < 0 (هر محصول در هر انبار)
- Stock reserved + available == total
- InventoryTransaction sum == StockBalance

Sales:
- Duplicate Order cannot happen (idempotency)
- Cancelled Order reversed inventory
- Returned Order reversed invoice + payment

Service:
- Completed Job must have ServiceReport
- Completed Job must have signature
- Warranty job cannot charge customer (LAW)
- SLA breach logged

Warranty:
- Warranty not active before Installation
- Warranty Claim requires active Warranty
- Warranty Transfer updates customerPartyId
```

---

## 20. Production Readiness

### Current Readiness: 55%

| Category | Score | Reason |
|----------|------:|--------|
| Architecture | 90% | DDD + Event-Driven قوی |
| Code Quality | 75% | 18 route fixed،但仍 monolithic page.tsx |
| Database | 40% | SQLite (limitation) |
| Security | 80% | JWT + RBAC + Session Revocation، بدون MFA |
| Backend/API | 85% | 154 route، 148 با RBAC |
| Frontend | 60% | 17 view،但仍 mock data باقی‌مانده |
| Testing | 30% | 175 tests، no integration/E2E |
| Performance | 50% | SQLite bottleneck proven |
| Scalability | 40% | SQLite limit، PostgreSQL ready |
| Data Integrity | 80% | Atomic operations proven |
| Observability | 10% | فقط health check |
| Backup/DR | 0% | هیچ |
| CI/CD | 30% | ناقص |
| Infrastructure | 20% | بدون Redis/MinIO/Monitoring |
| **Weighted Average** | **55%** | |

### Readiness by Phase

| Phase | Readiness | Note |
|-------|-----------|------|
| Current | 55% | Core ERP قابل demo |
| After Phase 2 | 75% | Production-ready (با Backup + DR + Observability + PostgreSQL) |
| After Phase 4 | 82% | Technician Mobile کامل |
| After Phase 7 | 90% | BI + Reporting کامل |
| After Phase 8 | 95% | CRM + Customer 360 کامل |
| Final Target | 98% | Enterprise-ready (AI در V2) |

---

## 21. Target Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENTS                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │  Admin   │  │ Customer │  │  Rep     │  │Technician│            │
│  │  Web     │  │  Portal  │  │  Portal  │  │  Mobile  │            │
│  │ (Next.js)│  │ (Next.js)│  │ (Next.js)│  │ (Flutter)│            │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘            │
│       │              │              │              │                  │
│       └──────────────┴──────────────┴──────────────┘                 │
│                              │                                        │
└──────────────────────────────┼────────────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Caddy (TLS, GW)   │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
      ┌───────▼───────┐ ┌─────▼─────┐ ┌───────▼───────┐
      │  Next.js API  │ │  Worker   │ │  Scheduler    │
      │  (App Router) │ │ (run-wkr) │ │  (cron jobs)  │
      └───────┬───────┘ └─────┬─────┘ └───────┬───────┘
              │                │                │
              └────────────────┼────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Application Layer  │
                    │  (Domain Services)   │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │    Domain Layer      │
                    │ (Aggregates, Events) │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ Infrastructure Layer│
                    └──┬─────┬──────┬─────┘
                       │     │      │
              ┌────────▼┐ ┌─▼──┐ ┌─▼────────┐
              │PostgreSQL│ │Redis│ │ MinIO    │
              │  16     │ │  7  │ │ (S3)     │
              └────┬────┘ └────┘ └──────────┘
                   │
         ┌─────────▼──────────┐
         │  Backup + WAL      │
         │  → MinIO (PITR)    │
         └────────────────────┘

  Observability:
  ┌─────────────────────────────────────┐
  │  OpenTelemetry → Jaeger (Tracing)   │
  │  Prometheus → Grafana (Metrics)     │
  │  pino → Loki (Logs)                 │
  │  Sentry (Errors)                    │
  └─────────────────────────────────────┘

  External:
  ┌─────────────────────────────────────┐
  │  FCM/APNs (Push)                    │
  │  Kavenegar/Twilio (SMS)             │
  │  SMTP/SES (Email)                   │
  │  Google Maps (Distance)             │
  └─────────────────────────────────────┘
```

### Components Justification

| Component | Reason |
|-----------|--------|
| Next.js (Web) | موجود + App Router + Edge middleware |
| Flutter (Mobile) | Offline-first + Native performance + single codebase |
| Caddy | موجود + automatic TLS + simple config |
| PostgreSQL | SQLite bottleneck proven + schema ready |
| Redis | Rate limit + session cache + queue + pub/sub |
| MinIO | S3-compatible + self-hosted + برای file + backup |
| Worker | موجود (run-workers.ts) + Docker service |
| Scheduler | New — برای cron jobs (Warranty expiry alert, SLA breach, scheduled reports) |
| OpenTelemetry | Standard برای distributed tracing |
| Prometheus + Grafana | Standard برای metrics + dashboard |
| Loki | Log aggregation (lighter than ELK) |
| Sentry | Error tracking |
| FCM/APNs | Push notification برای mobile |
| Google Maps | Distance calculation برای Dispatch |

---

## 22. Architecture Decisions (ADR)

### ADR-001: Mobile Framework — Flutter

**Decision:** Flutter برای Technician Mobile App (Android + iOS)

**Alternatives Considered:**
- React Native: پشتیبانی offline-first ضعیف‌تر، native module bridge complexity
- PWA: محدودیت در background sync + push notification روی iOS
- Native (Swift + Kotlin): هزینه development 2x، maintenance 2x

**Rationale:**
- Flutter: single codebase، native performance، excellent offline support
- Drift (SQLite ORM) برای local DB
- workmanager برای background sync
- mobile_scanner برای barcode
- signature_pad برای signature
- FCM برای push

### ADR-002: Accounting Scope — GL Lite + Sepidar Integration

**Decision:** BISMARK = AR/AP + GL Lite؛ Sepidar = GL کامل

**Rationale:**
- BISMARK باید AR/AP برای تطبیق Sales/Service داشته باشد
- GL کامل (Cost Center advanced, Multi-Currency Consolidation, Inter-company Elimination) پیچیده‌تر از V1
- Sepidar یا همکاران سیستم برای GL رسمی
- Integration via REST API یا Excel Import/Export

### ADR-003: Reporting — Materialized Views (V1)

**Decision:** PostgreSQL Materialized Views + Projection models (نه separate BI tool در V1)

**Rationale:**
- در V1، حجم داده کافی برای ClickHouse یا separate reporting DB نیست
- Materialized Views سریع و ساده
- Refresh هر ساعت یا روزانه
- در V2 اگر volume > 10M rows شد، migrate به ClickHouse

### ADR-004: Search — PostgreSQL FTS (V1)

**Decision:** PostgreSQL Full Text Search (نه Elasticsearch)

**Rationale:**
- در V1، تعداد رکوردها < 1M
- PostgreSQL FTS با GIN index کافی است
- Elasticsearch complexity اضافه می‌کند (cluster management, sync)
- در V2 اگر نیاز شد، اضافه کن

### ADR-005: Architecture — Modular Monolith (KEEP)

**Decision:** حفظ Modular Monolith (نه Microservices در V1)

**Rationale:**
- Domain‌ها به‌خوبی جدا شده‌اند (18 Bounded Context)
- Modular Monolith complexity کمتری دارد
- Microservices نیاز به: service discovery, distributed transactions, network observability دارد
- اگر در V2 یک domain bottleneck شد، extract کن

### ADR-006: Offline Sync — Last-Write-Wins + Conflict Queue

**Decision:** LWW برای اکثر داده‌ها + Conflict Queue برای موارد خاص

**Rationale:**
- اکثر داده‌های تکنسین locally-owned هستند (Job assigned به او)
- Conflict نادر است (مثلاً Job توسط dispatcher لغو شده ولی تکنسین offline کار کرده)
- در این موارد، Job در Conflict Queue قرار می‌گیرد + dispatcher تصمیم می‌گیرد
- CRDT یا Merge Resolution overkill است

### ADR-007: Cache — Redis (single instance)

**Decision:** Redis single instance (نه cluster در V1)

**Rationale:**
- V1 نیاز به horizontal scaling ندارد
- Single Redis کافی برای: rate limit + session cache + queue + pub/sub
- در V2 اگر scale شد، Redis Cluster یا Redis Sentinel

### ADR-008: Push Notification — FCM + APNs

**Decision:** Firebase Cloud Messaging (Android) + Apple Push Notification Service (iOS)

**Rationale:**
- FCM رایگان + reliable + Google-backed
- APNs برای iOS لازم است
- Flutter firebase_messaging package هر دو را پشتیبانی می‌کند

### ADR-009: File Storage — MinIO (S3-compatible)

**Decision:** MinIO self-hosted (نه AWS S3 در V1)

**Rationale:**
- Self-hosted = کنترل کامل + no egress cost
- S3-compatible = easy migration to AWS S3 در V2
- MinIO supports signed URLs + bucket policies

### ADR-010: Background Jobs — In-process + Cron (V1)

**Decision:** In-process worker (run-workers.ts) + node-cron برای scheduled jobs

**Rationale:**
- V1 نیاز به separate job queue (BullMQ, Sidekiq) ندارد
- In-process worker موجود و working
- node-cron برای scheduled reports + alerts
- در V2 اگر volume زیاد شد، migrate به BullMQ + Redis

---

## 23. Anti-Overengineering Review

| Technology | Needed Now? | Needed Later? | Reason |
|-----------|-------------|---------------|--------|
| PostgreSQL | ✅ بله | — | SQLite bottleneck proven |
| Redis | ✅ بله | — | Rate limit + cache + queue |
| MinIO | ✅ بله | — | File storage + backup target |
| Kafka | ❌ نه | ❌ نه | Outbox + in-process کافی است |
| RabbitMQ | ❌ نه | ❌ نه | Redis pub/sub + in-process کافی |
| Elasticsearch / OpenSearch | ❌ نه | شاید V2 | PostgreSQL FTS کافی برای V1 |
| Kubernetes | ❌ نه | شاید V3 | Docker Compose کافی تا 10K users |
| Terraform | 🟡 V2 | ✅ V2 | در V1 manual setup کافی |
| Flutter | ✅ بله (Phase 4) | — | Mobile |
| PWA | 🟡 اختیاری | — | Fallback برای customer portal |
| React Native | ❌ نه | ❌ نه | Flutter انتخاب شد |
| GraphQL | ❌ نه | ❌ نه | REST + api-client کافی |
| gRPC | ❌ نه | ❌ نه | REST کافی |
| Vector DB | ❌ نه | شاید V3 | برای AI (V2/V3) |
| ClickHouse | ❌ نه | شاید V2 | PostgreSQL MV کافی برای V1 |
| Service Mesh (Istio) | ❌ نه | ❌ نه | برای Monolith لازم نیست |
| API Gateway (Kong) | ❌ نه | ❌ نه | Caddy کافی |
| CQRS کامل | ❌ نه | ❌ نه | Projection‌های ساده کافی |
| Event Sourcing کامل | ❌ نه | ❌ نه | Outbox + Snapshot کافی |
| Microservices | ❌ نه | شاید V3 | Modular Monolith کافی |

---

## 24. Phased Roadmap

### Phase 0 — Current State Freeze ✅ COMPLETED

- Audit v4 (82/100)
- 53 regression test
- Gap Analysis

### Phase 1 — Core Stabilization ✅ COMPLETED

- F-02: 18 broken routes fixed
- F-01: Session Revocation
- F-03: Customer Portal
- F-05: Worker Runtime
- F-06: Views Auth
- F-07: Dashboard Real Stats

### Phase 2 — Production Foundation (3-4 weeks) 🔴 CRITICAL

**Goal:** قابل‌اعتماد بودن برای Production واقعی

**Business Value:** System can be deployed without catastrophic risk

**Scope:**
- PostgreSQL Migration (با scripts/migrate-to-postgres.sh آماده)
- Redis Setup
- MinIO Setup
- Backup Strategy (pg_dump + WAL Archive → MinIO)
- PITR (RPO ≤ 15 min)
- Restore Test (weekly automated)
- DR Plan (RTO ≤ 1 hour)
- Observability (OpenTelemetry + Prometheus + Grafana + Loki + Sentry)
- CI/CD Upgrade (lint → test → security scan → build → staging → production → health check → rollback)
- Secrets Management (HashiCorp Vault یا AWS Secrets Manager)
- IaC (Terraform — V2 deferred, manual در V1)
- MFA برای Admin/Finance (TOTP)
- PII Encryption (AES-256-GCM)
- File Virus Scan (ClamAV)
- Signed URL برای Files

**Out of Scope:** Mobile, CRM, BI, Dispatch

**Dependencies:** None (Foundation)

**Database Changes:**
- Switch provider to PostgreSQL
- Add: SecurityEvent, RefreshToken (if separate)
- Modify: User (mfaEnabled, mfaSecret, piiEncryptionKeyId), Party (piiDataEncrypted), FileAttachment (signedUrlExpiresAt, retentionExpiresAt), AuditLog (piiAccessed)

**Backend Changes:**
- TOTP MFA service
- PII encrypt/decrypt service
- ClamAV scan service
- Signed URL service
- Structured logging (pino)
- OpenTelemetry instrumentation
- Prometheus metrics exporter

**Frontend Changes:**
- MFA setup page
- MFA login flow

**Mobile Changes:** None

**Infrastructure Changes:**
- Deploy PostgreSQL 16
- Deploy Redis 7
- Deploy MinIO
- Deploy Prometheus + Grafana
- Deploy Loki
- Deploy Sentry (self-hosted یا SaaS)
- Configure backup cron
- Configure restore test cron

**Security Changes:**
- MFA enforcement برای admin/finance
- PII field encryption
- File scan on upload
- Signed URL با expiry
- Secrets در Vault

**Events:** None new

**Workers:** Add backup worker + restore test worker

**Tests:**
- Integration test: PostgreSQL migration
- Integration test: Backup + restore
- Unit test: MFA TOTP
- Unit test: PII encrypt/decrypt
- Unit test: Signed URL
- Security test: ClamAV EICAR

**Acceptance Criteria:**
- [ ] PostgreSQL deployed + all 154 routes functional
- [ ] 100 concurrent writes → 0% timeout
- [ ] Backup daily + WAL archive running
- [ ] PITR restore test PASS (RPO ≤ 15 min)
- [ ] DR failover test PASS (RTO ≤ 1 hour)
- [ ] Prometheus + Grafana dashboard live
- [ ] Loki log aggregation working
- [ ] OpenTelemetry trace visible in Jaeger
- [ ] Sentry capturing errors
- [ ] CI/CD: push → test → build → staging → production → health check
- [ ] MFA enabled برای admin/finance
- [ ] PII fields encrypted at rest
- [ ] File upload triggers virus scan
- [ ] Signed URL با 15-min expiry
- [ ] Secrets در Vault (not .env)

**Risks:**
- PostgreSQL migration data loss (mitigation: backup SQLite first)
- Redis single point of failure (mitigation: AOF persistence + restart policy)
- Vault complexity (mitigation: start with AWS Secrets Manager if simpler)

**Estimated Complexity:** HIGH

**Exit Gate:**
- [ ] Production can be deployed with confidence
- [ ] Backup + DR tested
- [ ] Observability dashboards live
- [ ] MFA + PII + File Scan working

---

### Phase 3 — Core Business Completion (4-5 weeks)

**Goal:** تکمیل چرخه Sales → Service → Warranty → Finance

**Business Value:** چرخه کسب‌وکار اصلی end-to-end کار می‌کند

**Scope:**
- Sales Pipeline کامل (Quote → Order → Approval → Payment → Invoice → Shipment → Delivery → Installation → Warranty Activation)
- Returns & Refunds کامل با financial reversal
- Inventory: Stock Transfer complete, Cycle Count complete
- Financial Integration: AR/AP/Settlement/Cost Center
- Tax Calculation Engine (VAT, multi-rate)
- Commission Calculation Engine
- Reconciliation Module (Bank + AR + AP)
- Sepidar Integration (REST API یا Excel I/E)

**Out of Scope:** Mobile, CRM, BI, Dispatch, Customer Portal UI

**Dependencies:** Phase 2

**Database Changes:**
- Add: Settlement, BankAccount, BankTransaction, Reconciliation
- Modify: CostCenter (فعال‌سازی), JournalEntry (add costCenterId)

**Backend Changes:**
- Tax Calculation Service (multi-rate, multi-jurisdiction)
- Commission Service (tiered, percentage, fixed)
- Reconciliation Service (bank statement import + match)
- Sepidar Integration Service
- Sales Pipeline orchestrator (Saga: sales_order_fulfillment 확장)

**Frontend Changes:**
- Sales Pipeline dashboard
- Reconciliation UI
- Tax configuration UI
- Commission dashboard

**Mobile Changes:** None

**Infrastructure Changes:** None

**Security Changes:** None

**Events:**
- tax.calculated
- commission.earned
- reconciliation.matched
- settlement.completed

**Workers:** None new

**Tests:**
- E2E: Sales order → Invoice → Payment → Shipment → Delivery → Installation → Warranty
- E2E: Return → Refund → Credit Note → JE reversal
- E2E: Bank reconciliation
- Unit: Tax calculation (multi-rate)
- Unit: Commission calculation (tiered)
- Financial Integrity: AR balance == sum unpaid invoices

**Acceptance Criteria:**
- [ ] Sales pipeline end-to-end works
- [ ] Returns reverse inventory + invoice + payment
- [ ] Tax calculation multi-rate
- [ ] Commission calculation tiered
- [ ] Bank reconciliation matches 95%+ of transactions
- [ ] Sepidar integration exports JournalEntries

**Risks:**
- Sepidar API instability (mitigation: Excel I/E fallback)
- Tax rule complexity (mitigation: start with simple VAT)

**Estimated Complexity:** MEDIUM-HIGH

**Exit Gate:**
- [ ] Sales pipeline end-to-end
- [ ] Financial reversal on returns
- [ ] Tax + Commission + Reconciliation

---

### Phase 4 — Technician Platform (6-8 weeks) 🔴 BIGGEST GAP

**Goal:** Mobile Product واقعی برای تکنسین

**Business Value:** تکنسین‌ها می‌توانند مأموریت کامل را offline انجام دهند

**Scope:**
- Backend: /api/v1/mobile/* endpoints (15+ routes)
- Schema: Device, OfflineSyncQueue, SyncConflict, MobileJobSnapshot, TechnicianLocation
- Conflict Resolution Strategy (LWW + Conflict Queue)
- Push Notification (FCM + APNs)
- Flutter App: Offline-first با SQLite (Drift)
  - Local DB Schema
  - Sync Queue Manager
  - GPS + Google Maps Integration
  - Camera + Barcode Scanner
  - Signature Pad
  - Background Sync (workmanager)

**Out of Scope:** Customer Portal UI, Representative Portal, Dispatch Engine

**Dependencies:** Phase 2 (Push notification needs Redis + production)

**Database Changes:**
- Add: Device, OfflineSyncQueue, SyncConflict, MobileJobSnapshot, TechnicianLocation

**Backend Changes:**
- MobileAuthService (device registration + token)
- MobileSyncService (sync queue + conflict resolution)
- MobileJobService (job snapshot for offline)
- PushNotificationService (FCM + APNs)
- 15+ mobile API routes (see Section 9)

**Frontend Changes:** None (web)

**Mobile Changes:**
- Flutter app from scratch
- Screens: Login, Job List, Job Detail, Check-in, Diagnosis, Parts, Photos, Signature, Complete
- Local DB (Drift/SQLite)
- Sync Queue
- GPS integration
- Camera + image compression
- Barcode scanner
- Signature pad
- Push notification handler
- Background sync (workmanager)
- Offline state management

**Infrastructure Changes:**
- FCM project setup
- APNs certificate
- Google Maps API key

**Security Changes:**
- Device binding (token + fingerprint)
- SQLite encryption (SQLCipher)
- JWT scope to technician
- Offline data wipe on logout

**Events:**
- technician.assigned
- technician.checked_in
- technician.checked_out
- technician.location_updated
- mobile.sync_completed
- mobile.conflict_detected

**Workers:**
- Push notification worker (FCM dispatch)
- Location cleanup worker (delete old locations)

**Tests:**
- Mobile E2E: Login → Accept Job → Check-in → Diagnosis → Parts → Photos → Signature → Complete
- Offline test: Disable network → perform actions → enable → sync → verify
- Conflict test: Server cancels job while technician offline → conflict queue
- Push test: FCM + APNs delivery
- Security test: Device binding, SQLCipher encryption
- Load test: 100 technicians concurrent sync

**Acceptance Criteria:**
- [ ] Technician can login on Flutter app
- [ ] Technician sees assigned jobs
- [ ] Technician accepts job
- [ ] GPS navigation to customer
- [ ] Check-in with GPS verification
- [ ] Diagnosis form works
- [ ] Parts consumed logged
- [ ] Photos before/after captured
- [ ] Customer signature captured
- [ ] Job completed
- [ ] All above works OFFLINE
- [ ] Sync when online (no data loss)
- [ ] Conflict queue handles edge cases
- [ ] Push notification received
- [ ] Device binding enforced
- [ ] SQLite encrypted

**Risks:**
- Flutter learning curve (mitigation: experienced dev + good docs)
- Offline sync complexity (mitigation: start simple LWW, iterate)
- Push notification reliability (mitigation: fallback to in-app)
- iOS App Store review (mitigation: prepare privacy policy + terms)

**Estimated Complexity:** VERY HIGH

**Exit Gate:**
- [ ] Flutter app on Android + iOS
- [ ] All 15+ mobile routes functional
- [ ] Offline mode works (no data loss)
- [ ] Sync conflict resolution works
- [ ] Push notification delivered
- [ ] Device security enforced
- [ ] E2E test passes

---

### Phase 5 — Customer & Representative Experience (4-5 weeks)

**Goal:** Portal‌های کامل

**Business Value:** مشتری و نماینده می‌توانند کارهای اصلی خود را انجام دهند

**Scope:**
- Customer Portal UI (Next.js)
  - Dashboard با محصولات، گارانتی، خدمات
  - ثبت درخواست خدمات
  - ثبت شکایت
  - رضایت‌سنجی
  - پرداخت آنلاین
  - اعلان‌ها
- Representative Portal UI
  - مدیریت مشتریان
  - ثبت فروش
  - موجودی قابل فروش
  - قیمت‌گذاری مجاز
  - پورسانت
  - گزارش فروش
- Customer 360 Projection (initial — full در Phase 8)
  - Event handlers برای به‌روزرسانی Projection
  - API: GET /customers/[id]/360 (initial version)

**Out of Scope:** Full CRM (Phase 8), BI (Phase 7), Dispatch (Phase 6)

**Dependencies:** Phase 3 (Sales pipeline complete)

**Database Changes:**
- Add: Customer360View (initial — basic fields)

**Backend Changes:**
- Customer360Projector (event handler)
- Representative API (7 routes — see Section 9)
- Payment gateway integration (Zarinpal یا Sep)
- Customer dashboard API

**Frontend Changes:**
- Customer Portal (Next.js pages)
  - Dashboard
  - Products
  - Warranties
  - Service Requests
  - Invoices
  - Payments
  - Complaints
  - Surveys
  - Profile
- Representative Portal (Next.js pages)
  - Dashboard
  - Customers
  - Orders
  - Inventory
  - Commissions
  - Receivables

**Mobile Changes:** None (technician app در Phase 4)

**Infrastructure Changes:**
- Payment gateway account (Zarinpal/Sep)

**Security Changes:**
- Customer scope enforced (can only see own data)
- Representative scope enforced (can only see own customers)

**Events:**
- customer.registered
- customer.loggedIn
- representative.loggedIn
- payment.online_received

**Workers:** None new

**Tests:**
- E2E: Customer registers → sees products → creates service request → tracks → completes → surveys
- E2E: Representative creates customer → creates order → invoice → tracks commission
- Security: Customer A cannot see Customer B data
- Security: Representative A cannot see Representative B data

**Acceptance Criteria:**
- [ ] Customer can register + login
- [ ] Customer sees own products + warranties + services
- [ ] Customer creates service request
- [ ] Customer pays online
- [ ] Customer submits complaint + survey
- [ ] Representative creates customer + order
- [ ] Representative sees own commissions
- [ ] Representative sees available inventory
- [ ] Customer 360 API returns aggregated data
- [ ] Security scoping enforced

**Risks:**
- Payment gateway integration (mitigation: sandbox testing first)
- UI complexity (mitigation: incremental delivery)

**Estimated Complexity:** MEDIUM-HIGH

**Exit Gate:**
- [ ] Customer Portal live
- [ ] Representative Portal live
- [ ] Online payment works
- [ ] Customer 360 initial version
- [ ] Security scoping tested

---

### Phase 6 — Dispatch & SLA Engine (3-4 weeks)

**Goal:** تخصیص هوشمند تکنسین + SLA enforcement

**Business Value:** تکنسین بهینه تخصیص داده می‌شود، SLA رعایت می‌شود

**Scope:**
- Dispatch Service
  - findCandidateTechnicians(serviceRequest)
  - scoreTechnician(technician, serviceRequest)
  - assignBestTechnician(serviceRequest)
  - reassignTechnician(serviceRequest, reason)
- SLA Engine
  - SLA Deadline Calculation (auto از SLAPolicy)
  - SLA Breach Detection (cron job)
  - Escalation Rules
  - Escalation Log
- Distance Calculation (PostgreSQL PostGIS یا Google Distance Matrix)
- Workload Balancing

**Out of Scope:** Full BI (Phase 7), CRM (Phase 8)

**Dependencies:** Phase 4 (Mobile — for push notification on assignment)

**Database Changes:**
- Add: TechnicianScore, EscalationRule, EscalationLog
- Modify: SLATracker (auto-calculate deadlines)

**Backend Changes:**
- DispatchService (scoring algorithm)
- SLAEnforcementService (deadline + breach + escalation)
- EscalationService (rule-based)
- DistanceCalculationService (PostGIS یا Google Maps)
- WorkloadService (technician capacity)
- Dispatch API (7 routes — see Section 9)

**Frontend Changes:**
- Dispatch dashboard (admin)
- SLA monitoring dashboard
- Technician map view (با location)

**Mobile Changes:**
- Push notification on assignment (Phase 4 backend, now used)
- Job acceptance flow (Phase 4 + now with auto-assignment)

**Infrastructure Changes:**
- PostGIS extension (اگر PostgreSQL)
- Google Maps API key (اگر Google Distance Matrix)

**Security Changes:** None

**Events:**
- dispatch.assigned
- dispatch.reassigned
- sla.deadline_calculated
- sla.breach_imminent
- sla.breached
- escalation.triggered

**Workers:**
- SLA monitoring worker (every 5 min: check deadlines + breach)
- Escalation worker (process escalation queue)

**Tests:**
- Unit: Scoring algorithm (weight tuning)
- Integration: Auto-assign best technician
- Integration: Reassignment with audit
- Integration: SLA breach detection + escalation
- Load: 100 service requests concurrent assignment

**Acceptance Criteria:**
- [ ] Dispatch Service suggests top-3 candidates
- [ ] Auto-assign mode configurable per tenant
- [ ] Reassignment logged in Audit
- [ ] SLA deadline auto-calculated from policy
- [ ] SLA breach detected within 5 min
- [ ] Escalation triggers on breach
- [ ] Workload visible per technician
- [ ] Distance calculation works (PostGIS or Google)

**Risks:**
- Scoring weights tuning (mitigation: start with defaults, A/B test)
- Google Maps API cost (mitigation: use PostGIS برای distance, Google برای navigation)

**Estimated Complexity:** HIGH

**Exit Gate:**
- [ ] Dispatch Service functional
- [ ] SLA enforcement automated
- [ ] Escalation working
- [ ] Dashboard live

---

### Phase 7 — Reporting & BI (4-5 weeks)

**Goal:** داشبورد اجرایی واقعی + Reporting کامل

**Business Value:** مدیران می‌توانند تصمیمات data-driven بگیرند

**Scope:**
- Projection Layer
  - Sales Projection (daily/monthly)
  - Service Projection
  - Inventory Projection
  - Customer Projection
- Materialized Views (PostgreSQL)
- Sales Reports (8)
- Service Reports (10)
- Financial Reports (8 — شامل گزارش‌های موجود)
- Executive Dashboard (real-time)
- Export: PDF, Excel, CSV
- Scheduled Reports (email)

**Out of Scope:** Dynamic Report Builder (V2), BI Tool (V2), AI (V2)

**Dependencies:** Phase 3 (Sales + Finance complete)

**Database Changes:**
- Add: SalesProjection, ServiceProjection, InventoryProjection, CustomerProjection
- Add: ReportSchedule, ReportExecution

**Backend Changes:**
- Projection event handlers (update projections on events)
- ReportService (generate reports from projections)
- ExportService (PDF/Excel/CSV)
- ScheduledReportService (cron + email)
- Reporting API (16 routes — see Section 9)

**Frontend Changes:**
- Executive Dashboard (real-time KPIs)
- Sales Reports page (with filters + charts)
- Service Reports page
- Financial Reports page (enhance existing)
- Report scheduling UI

**Mobile Changes:**
- Push notification: Scheduled report ready

**Infrastructure Changes:**
- Materialized view refresh cron

**Security Changes:**
- Report access control (financial reports برای finance only)

**Events:**
- projection.updated
- report.generated
- report.scheduled
- report.exported

**Workers:**
- Projection refresh worker (hourly)
- Materialized view refresh worker (daily)
- Scheduled report worker (cron-driven)

**Tests:**
- Unit: Projection updates correctly on event
- Integration: Report generates correct data
- Integration: Export PDF/Excel/CSV
- Integration: Scheduled report emailed
- Performance: Report generation < 5s

**Acceptance Criteria:**
- [ ] 8 Sales Reports functional
- [ ] 10 Service Reports functional
- [ ] 8 Financial Reports functional (6 existing + 2 new)
- [ ] Executive Dashboard real-time
- [ ] Export PDF/Excel/CSV works
- [ ] Scheduled reports emailed
- [ ] Projections update within 1 hour of event
- [ ] Report access controlled

**Risks:**
- Projection lag (mitigation: hourly refresh + real-time fallback)
- Report performance (mitigation: indexes + materialized views)

**Estimated Complexity:** HIGH

**Exit Gate:**
- [ ] All reports functional
- [ ] Executive Dashboard live
- [ ] Export + Schedule works
- [ ] Performance acceptable

---

### Phase 8 — CRM & Customer 360 (4-5 weeks)

**Goal:** مدیریت ارتباط با مشتری حرفه‌ای

**Business Value:** تیم فروش می‌تواند Lead را از ابتدا تا تبدیل مدیریت کند

**Scope:**
- Schema: Opportunity, Campaign, CampaignTarget, Task, FollowUp, CustomerSegment, CustomerJourneyEvent
- Lead → Opportunity → Quote → Order Pipeline
- Customer Journey Map
- CLV (Customer Lifetime Value) Calculation
- Customer Segmentation (RFM)
- Cross-sell / Upsell Recommendations (rule-based)
- Campaign Management
- Call Center Tools (Quick Customer Search, Interaction Log)
- Full Customer 360 (enrich از Phase 5)

**Out of Scope:** Marketing Automation (Phase 9), AI recommendations (V2)

**Dependencies:** Phase 5 (Customer 360 initial), Phase 7 (Projections)

**Database Changes:**
- Add: Opportunity, Campaign, CampaignTarget, Task, FollowUp, CustomerSegment, CustomerJourneyEvent
- Modify: Customer360View (enrich with CLV, segment, recommendations)

**Backend Changes:**
- OpportunityService (stage transitions)
- CampaignService (launch + metrics)
- TaskService (assignment + reminders)
- FollowUpService (scheduling)
- SegmentationService (RFM calculation)
- CLVService (calculation)
- RecommendationService (rule-based)
- CustomerJourneyService (event tracking)
- CRM API (15+ routes — see Section 9)

**Frontend Changes:**
- CRM Dashboard (pipeline view)
- Lead → Opportunity conversion UI
- Opportunity kanban board
- Campaign management UI
- Task list + calendar
- Customer 360 enriched view
- Customer journey timeline

**Mobile Changes:**
- Push notification: New task, Follow-up reminder

**Infrastructure Changes:** None

**Security Changes:**
- CRM data access control (sales rep sees own leads/opportunities)

**Events:**
- opportunity.created
- opportunity.stage_changed
- campaign.launched
- task.assigned
- follow_up.scheduled
- customer.segmented
- customer.journey_event

**Workers:**
- Segmentation worker (daily RFM refresh)
- Follow-up reminder worker (hourly check)
- CLV recalculation worker (daily)

**Tests:**
- E2E: Lead → Opportunity → Quote → Order → Customer
- Unit: RFM segmentation
- Unit: CLV calculation
- Unit: Recommendation rules
- Integration: Campaign launch + metrics

**Acceptance Criteria:**
- [ ] Lead → Opportunity conversion works
- [ ] Opportunity pipeline (5 stages) functional
- [ ] Campaign management + metrics
- [ ] Task assignment + reminders
- [ ] Follow-up scheduling
- [ ] RFM segmentation (daily refresh)
- [ ] CLV calculation (daily refresh)
- [ ] Cross-sell recommendations (rule-based)
- [ ] Customer journey timeline
- [ ] Full Customer 360 API

**Risks:**
- Recommendation quality (mitigation: start with simple rules, improve later)
- Segmentation performance (mitigation: batch processing)

**Estimated Complexity:** HIGH

**Exit Gate:**
- [ ] Full CRM pipeline
- [ ] Customer 360 enriched
- [ ] Campaign + Task + FollowUp
- [ ] Segmentation + CLV + Recommendations

---

### Phase 9 — Automation (3-4 weeks)

**Goal:** اتوماسیون فرآیندهای تکراری

**Business Value:** فرآیندهای تکراری به‌صورت خودکار اجرا می‌شوند

**Scope:**
- Workflow Engine Enhancement (در حال حاضر موجود ولی ساده)
- Scheduled Jobs (cron-style): Report Generation, Warranty Expiry Alert, SLA Breach Alert, Follow-up Reminder
- Trigger-Based Automation: Event → Rule → Action
- Notification Automation: Customer Journey-based (Welcome, Birthday, Warranty Expiring, Service Due)
- Escalation Rules (از Phase 6 — extend)
- Bulk Operations (bulk status change, bulk assign, bulk notify)

**Out of Scope:** AI (V2)

**Dependencies:** Phase 7 (Reporting), Phase 8 (CRM)

**Database Changes:**
- Add: ScheduledJob, JobExecutionLog, AutomationTrigger, AutomationRule

**Backend Changes:**
- SchedulerService (cron-based job execution)
- TriggerService (event → rule → action)
- BulkOperationService
- Automation API (5 routes — see Section 9)

**Frontend Changes:**
- Automation dashboard
- Trigger/Rule configuration UI
- Scheduled jobs list + logs
- Bulk operation UI

**Mobile Changes:**
- Push: Automation triggered notification

**Infrastructure Changes:** None

**Security Changes:**
- Automation access control (admin only)

**Events:**
- automation.triggered
- automation.action_executed
- scheduled_job.started
- scheduled_job.completed
- scheduled_job.failed

**Workers:**
- Scheduler worker (cron-driven)
- Trigger evaluation worker (event-driven)

**Tests:**
- Unit: Cron expression parsing
- Integration: Trigger → Rule → Action
- Integration: Scheduled job execution
- Integration: Bulk operation

**Acceptance Criteria:**
- [ ] Cron-style scheduled jobs configurable
- [ ] Trigger-based automation (event → rule → action)
- [ ] Bulk operations work
- [ ] Automation logs visible
- [ ] Welcome/Birthday/Warranty Expiry notifications automated

**Risks:**
- Trigger infinite loop (mitigation: max depth + cycle detection)
- Bulk operation performance (mitigation: batch + async)

**Estimated Complexity:** MEDIUM

**Exit Gate:**
- [ ] Scheduler functional
- [ ] Triggers + Rules functional
- [ ] Bulk operations
- [ ] Notification automation

---

### Phase 10 — Advanced Enterprise / AI (6+ weeks, V2)

**Goal:** پیش‌بینی و بهینه‌سازی پیشرفته

**Business Value:** AI-powered insights + predictions

**Scope (V2 — Deferred):**
- AI Layer
  - Predictive Maintenance (با تاریخچه خدمات)
  - Demand Forecast (با تاریخچه فروش)
  - Technician Optimization (با ML)
  - Customer Recommendation (ML-based)
  - Anomaly Detection (fraud, unusual patterns)
- WhatsApp Business Integration
- Advanced Search (Elasticsearch/OpenSearch) — فقط اگر PostgreSQL Search کافی نباشد
- Multi-Currency
- Multi-Language (i18n)
- API Gateway (Kong/APISIX) — فقط اگر تعداد سرویس‌ها زیاد شود
- Microservices Split — فقط اگر Modular Monolith به bottleneck تبدیل شود
- BI Tool (Metabase/Superset)
- OLAP (ClickHouse اگر حجم زیاد شد)
- Advanced Cost Center (Multi-dimensional)
- Inter-company Consolidation

**Dependencies:** All previous Phases

**Estimated Complexity:** VERY HIGH

---

## 25. Phase-by-Phase Exit Gates (Summary)

| Phase | Exit Gate (Must Pass ALL) |
|-------|---------------------------|
| Phase 0 | ✅ Audit v4 + Gap Analysis complete |
| Phase 1 | ✅ All 7 Findings (F-01 to F-07) fixed + runtime-tested |
| Phase 2 | PostgreSQL + Backup + PITR + DR + Observability + CI/CD + MFA + PII + File Scan |
| Phase 3 | Sales Pipeline E2E + Returns Reversal + Tax + Commission + Reconciliation + Sepidar |
| Phase 4 | Flutter App + Offline + Sync + Conflict + Push + GPS + Camera + Barcode + Signature + E2E + Security |
| Phase 5 | Customer Portal + Representative Portal + Online Payment + Customer 360 Initial + Security Scoping |
| Phase 6 | Dispatch Service + Auto-Assign + SLA Enforcement + Escalation + Workload + Distance |
| Phase 7 | 26 Reports + Executive Dashboard + Export + Schedule + Projections |
| Phase 8 | CRM Pipeline + Campaign + Task + FollowUp + Segmentation + CLV + Recommendations + Customer 360 Full |
| Phase 9 | Scheduler + Triggers + Bulk Ops + Notification Automation |
| Phase 10 | (V2) AI + WhatsApp + Advanced BI + Multi-Currency + i18n |

---

## 26. Risk Matrix

| ID | Risk | Probability | Impact | Severity | Mitigation | Phase |
|----|------|-------------|--------|----------|------------|-------|
| R-01 | SQLite data loss در Production | High | Critical | P0 | Migrate to PostgreSQL (Phase 2) | 2 |
| R-02 | No Backup → catastrophic data loss | High | Critical | P0 | Implement Backup + PITR (Phase 2) | 2 |
| R-03 | No DR → unlimited downtime | Medium | Critical | P0 | DR Plan + Restore Test (Phase 2) | 2 |
| R-04 | No Observability → unable to debug Production | High | High | P0 | OpenTelemetry + Prometheus + Loki (Phase 2) | 2 |
| R-05 | Mobile App failure (offline sync data loss) | Medium | High | P1 | Comprehensive offline tests + LWW + Conflict Queue | 4 |
| R-06 | Payment gateway downtime | Low | Medium | P2 | Fallback + retry + manual reconciliation | 5 |
| R-07 | Dispatch scoring suboptimal | Medium | Low | P2 | A/B test weights + manual override | 6 |
| R-08 | Projection lag → stale reports | Medium | Low | P2 | Hourly refresh + real-time fallback | 7 |
| R-09 | CRM adoption low | Medium | Low | P3 | Training + simple UI | 8 |
| R-10 | CI/CD pipeline breaks Production | Low | High | P1 | Staging + health check + rollback | 2 |
| R-11 | Push notification not delivered | Medium | Medium | P2 | FCM + APNs + in-app fallback | 4 |
| R-12 | PII breach | Low | Critical | P0 | PII encryption + access control + audit | 2 |
| R-13 | Tenant data leakage | Low | Critical | P0 | tenantId enforcement + tests (موجود) | 0 |
| R-14 | Concurrent payment race | Medium | High | P1 | Idempotency + optimistic lock (موجود) | 0 |
| R-15 | Inventory negative stock | Medium | High | P1 | Atomic check in transaction (موجود) | 0 |

---

## 27. Final Readiness Score

### Weighted Scoring Methodology

| Category | Weight | Current | After P2 | After P4 | After P7 | Final |
|----------|-------:|--------:|---------:|---------:|---------:|------:|
| Architecture | 15% | 90 | 90 | 90 | 90 | 90 |
| Code Quality | 10% | 75 | 80 | 85 | 90 | 95 |
| Database | 10% | 40 | 90 | 90 | 90 | 95 |
| Security | 15% | 80 | 95 | 95 | 95 | 98 |
| Backend/API | 10% | 85 | 90 | 95 | 95 | 98 |
| Frontend | 10% | 60 | 65 | 75 | 85 | 90 |
| Mobile | 5% | 0 | 0 | 85 | 90 | 95 |
| Testing | 10% | 30 | 50 | 60 | 75 | 85 |
| Performance | 5% | 50 | 85 | 85 | 90 | 95 |
| Observability | 5% | 10 | 85 | 85 | 90 | 95 |
| Backup/DR | 5% | 0 | 90 | 90 | 95 | 98 |
| **Weighted Total** | 100% | **55%** | **75%** | **82%** | **90%** | **95%** |

### Readiness Levels

| Level | Score | Status |
|-------|-------|--------|
| Prototype | 0-30% | 🟡 (Core ERP was here before Audit v4) |
| Internal MVP | 30-50% | — |
| Pilot | 50-70% | ✅ Current (55%) |
| Production Ready | 70-85% | After Phase 2 (75%) |
| Enterprise Ready | 85-95% | After Phase 4 (82%) — After Phase 7 (90%) |
| Scale Ready | 95%+ | Final Target (95%) |

---

## 28. Final Recommendation

### ۱۰ پاسخ نهایی

#### ۱. پروژه فعلی چقدر از سیستم هدف فاصله دارد؟
**~40%** — Core ERP کامل، Enterprise extensions مفقود. امتیاز فعلی 55%، هدف 95%.

#### ۲. چه چیزهایی همین الان ارزشمند و قابل استفاده‌اند؟
- Core ERP: Sales, Service, Warranty, Inventory, Finance, Notifications
- Architecture: DDD + Event-Driven + 54 LAW + Outbox/Inbox/Saga
- Security: JWT + RBAC + Session Revocation + Rate Limit + 12 Headers
- Audit Log + Workflow + Rule Engine + 46 Domain Events
- 154 API Routes با 96% RBAC coverage
- 17 UI Views
- PostgreSQL migration script آماده

#### ۳. چه چیزهایی نباید دوباره ساخته شوند؟
(See Section 3 — 43 قابلیت موجود)

خلاصه: Architecture کامل، Core Domains، Security Foundation، Event System، Workflow + Rule Engine، Notification Platform.

#### ۴. بزرگ‌ترین Gap چیست؟
**Technician Mobile + Offline Sync** — 0 route، 0 model، 0 app. این بزرگ‌ترین فاصله عملیاتی است.

#### ۵. بزرگ‌ترین Risk چیست؟
**نبود Backup/DR** — بدون این، هر خرابی فاجعه‌بار است. P0 Production Blocker.

#### ۶. اولین Phase بعدی چیست؟
**Phase 2 — Production Foundation** (3-4 هفته): PostgreSQL + Backup + PITR + DR + Observability + CI/CD + MFA + PII + File Scan.

#### ۷. چه چیزی باید قبل از Production تکمیل شود؟
Phase 2 کامل:
- PostgreSQL Migration
- Backup + PITR + Restore Test
- DR Plan
- Observability (Prometheus + Grafana + Loki + Sentry)
- CI/CD کامل (test → security → build → staging → production → health → rollback)
- MFA برای admin/finance
- PII Encryption
- File Virus Scan
- Signed URL
- Secrets Management

#### ۸. چه چیزهایی می‌توانند به V2 منتقل شوند؟
- AI Layer (Predictive Maintenance, Demand Forecast, Anomaly Detection)
- Marketing Automation (advanced)
- Advanced BI (Metabase/Superset, ClickHouse)
- WhatsApp Business Integration
- Multi-Currency + Multi-Language
- Microservices Split (اگر لازم شد)
- Dynamic Report Builder
- Kubernetes (اگر scale لازم شد)
- Elasticsearch (اگر PostgreSQL FTS کافی نباشد)

#### ۹. آیا Architecture فعلی قابل حفظ است؟
**بله — قطعاً.** Modular Monolith + DDD + Event-Driven انتخاب صحیحی است. هیچ redesign لازم نیست. فقط Implementation باید کامل شود.

#### ۱۰. آیا پروژه از نظر Enterprise Architecture مسیر درستی دارد؟
**بله.** Foundation قوی (54 LAW، 116 model، 46 event، Outbox/Inbox/Saga، Ledger Pattern، Double-Entry Accounting). مسیر واضح است: Phase 2 (Production Foundation) → Phase 3 (Core Completion) → Phase 4 (Mobile) → Phase 5 (Portals) → Phase 6 (Dispatch) → Phase 7 (BI) → Phase 8 (CRM) → Phase 9 (Automation) → Phase 10 (AI در V2).

---

### Final Summary Table

| Area | Current | Target | Gap | Priority | Phase |
|------|---------|--------|-----|----------|-------|
| Architecture | 90% | 95% | 5% | — | KEEP |
| Database | 40% (SQLite) | 95% (PostgreSQL) | 55% | P0 | 2 |
| Backup/DR | 0% | 98% | 98% | P0 | 2 |
| Observability | 10% | 95% | 85% | P0 | 2 |
| CI/CD | 30% | 90% | 60% | P1 | 2 |
| Security (MFA/PII) | 80% | 98% | 18% | P2 | 2 |
| Sales Pipeline | 85% | 95% | 10% | P1 | 3 |
| Financial (Tax/Commission/Recon) | 60% | 90% | 30% | P1 | 3 |
| Technician Mobile | 0% | 95% | 95% | P1 | 4 |
| Offline Sync | 0% | 90% | 90% | P1 | 4 |
| Customer Portal UI | 30% | 90% | 60% | P2 | 5 |
| Representative Portal | 0% | 85% | 85% | P2 | 5 |
| Customer 360 | 0% | 90% | 90% | P2 | 5+8 |
| Dispatch Engine | 20% (data only) | 90% | 70% | P1 | 6 |
| SLA Enforcement | 50% | 90% | 40% | P2 | 6 |
| Reporting/BI | 25% (6 routes) | 90% | 65% | P2 | 7 |
| CRM | 15% (Lead only) | 85% | 70% | P2 | 8 |
| Automation | 40% (Workflow+Rules) | 85% | 45% | P3 | 9 |
| AI | 0% | 80% | 80% | P4 | 10 (V2) |

---

### Final Roadmap (Visual)

```text
Current (55%) — Pilot Ready
    │
    ▼
Phase 2 (3-4w) — Production Foundation
    │  PostgreSQL + Backup + DR + Observability + CI/CD + MFA + PII
    ▼
75% — Production Ready
    │
    ├─────────────────────────┐
    ▼                         ▼
Phase 3 (4-5w)            Phase 4 (6-8w)
Core Business              Technician Mobile
    │                         │
    └─────────┬───────────────┘
              ▼
Phase 5 (4-5w) — Customer + Representative Portal
    │
    ▼
Phase 6 (3-4w) — Dispatch + SLA
    │
    ▼
Phase 7 (4-5w) — Reporting + BI
    │
    ▼
90% — Enterprise Ready
    │
    ▼
Phase 8 (4-5w) — CRM + Customer 360
    │
    ▼
Phase 9 (3-4w) — Automation
    │
    ▼
95% — Scale Ready
    │
    ▼
Phase 10 (V2) — AI + Advanced Enterprise
```

---

##END

این سند مرجع اصلی توسعه بعدی پروژه BISMARK است.

**قانون نهایی:**
1. هیچ کدنویسی بدون عبور از Exit Gate مرحله قبلی.
2. هیچ Phase بدون Acceptance Criteria‌ تکمیل‌شده بسته نشود.
3. هیچ Feature جدید بدون ADR اضافه نشود.
4. هیچ ابزار جدید بدون Anti-Overengineering Review اضافه نشود.
5. Architecture Freeze حفظ شود — هیچ redesign بدون دلیل بحرانی نه.

**موفقیت پروژه BISMARK به اجرای منظم این Roadmap بستگی دارد، نه به redesign.**
