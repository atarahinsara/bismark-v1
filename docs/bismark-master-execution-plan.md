# BISMARK — MASTER EXECUTION PLAN

## From Current Repository to Production-Ready Enterprise Platform

> **Single Source of Truth برای اجرای پروژه BISMARK**
> **مبنای تحلیل:** بررسی واقعی Repository + اسناد قبلی (audit-report-v4.md، bismark-final-gap-analysis-and-roadmap.md)
> **قانون:** فقط Execution Plan. هیچ کدنویسی، هیچ Migration، هیچ Package نصب نشود.

---

## ⚠️ قوانین غیرقابل مذاکره

### Rule 1 — Architecture Freeze

معماری فعلی حفظ می‌شود:

```text
Modular Monolith + DDD + Event-Driven + Outbox/Inbox/Saga + PostgreSQL + RBAC + Audit + Idempotency
```

بدون دلیل بحرانی: Domain بازطراحی نمی‌شود، Database از نو طراحی نمی‌شود، API architecture عوض نمی‌شود، Framework عوض نمی‌شود، Microservice ایجاد نمی‌شود، Event system بازنویسی نمی‌شود.

### Rule 2 — Existing Capability = DO NOT REBUILD

قبل از ایجاد هر Feature: `Search Repository → Find Existing → Reuse → Extend → Only if Missing → Build`

### Rule 3 — NO CODING در این مرحله

```text
NO SOURCE CODE CHANGES | NO MIGRATIONS | NO PACKAGE INSTALL | NO FEATURE IMPLEMENTATION
```

### Rule 4 — Repository Is Source of Truth

هر تصمیم به Repository واقعی متصل است. اگر مسیر فایل قابل اثبات نیست: `LOCATION TO VERIFY`

---

## 1. EXECUTIVE EXECUTION SUMMARY

| Field | Value |
|-------|-------|
| **Current State** | Core ERP Backend قوی با DDD + Event-Driven، 116 مدل، 154 route، 54 LAW، اما SQLite و بدون Production Foundation |
| **Current Readiness** | 55% (Pilot Ready — نه درصد کدنویسی، بلکه Readiness Score) |
| **Target State** | Enterprise Business Platform با PostgreSQL + Mobile + BI + CRM + Production Foundation (95% readiness) |
| **Major Remaining Gaps** | 4 محور: (1) Production Foundation، (2) Technician Mobile، (3) BI/Reporting، (4) CRM/Customer 360 |
| **Critical Risks** | (1) No Backup/DR (P0)، (2) SQLite bottleneck (P0)، (3) No Observability (P0)، (4) Mobile Missing (P1) |
| **First Implementation Step** | Phase 2 — PostgreSQL Migration + Backup + Observability + CI/CD |
| **Estimated Total Scope** | ~30-40 هفته برای Enterprise کامل (Phase 2-9)، ~10-14 هفته برای Production-ready MVP (Phase 2-4) |

**تفاوت مهم:**
- Current Readiness 55% = Readiness Score (نه درصد کدنویسی انجام‌شده)
- Core ERP تقریباً کامل است (85%+)، اما Enterprise extensions مفقودند

---

## 2. CURRENT BASELINE (Verified)

تمام اعداد از Repository Verify شده‌اند:

| Metric | Value | Verification Command |
|--------|-------|---------------------|
| Prisma Models | 116 | `grep -c '^model ' prisma/schema.prisma` |
| API Routes | 154 | `find src/app/api -name 'route.ts' \| wc -l` |
| Routes with RBAC | 148 (96%) | `grep -rl 'requirePermission' src/app/api/ \| wc -l` |
| Public Routes (no RBAC) | 6 | auth/login, auth/logout, auth/refresh, auth/me, system/health, api/route.ts |
| Architecture Laws | 54 | `ls src/lib/shared/laws/ \| wc -l` |
| Domain Events | 46 | `grep -E 'eventType:' src/lib/event-catalog.ts \| wc -l` |
| Sagas | 2 | sales_order_fulfillment, return_processing |
| UI Views | 17 | `ls src/components/views/*.tsx \| wc -l` |
| Unit Test Files | 5 | `find src/tests -name '*.test.ts' \| wc -l` |
| Regression Tests | 53 | test_audit_v4.sh |
| Domain Modules | 2 | notification, product |
| Mobile Routes | 0 | `ls src/app/api/v1/mobile/ 2>/dev/null` |
| Device Models | 0 | `grep -c '^model Device' prisma/schema.prisma` |
| Backup Scripts | 1 | scripts/migrate-to-postgres.sh (migration فقط، نه backup) |
| Observability Tools | 0 | grep for opentelemetry/prometheus/grafana = 0 |
| page.tsx Lines | 1503 | monolithic |
| mock-data.ts Lines | 425 | still exists (partial F-07 fix) |
| Database Provider | sqlite | `grep 'provider' prisma/schema.prisma` |
| PostgreSQL Schema Ready | YES | `prisma/schema.postgres.prisma` EXISTS |
| Docker Compose | YES (fixed) | docker-compose.production.yml with `worker` service |
| CI/CD | PARTIAL | .github/workflows/ci-cd.yml (ناقص: `bun audit \|\| true`) |

**تغییرات از آخرین Audit:**
- هیچ تغییری (اعداد стабильные از Audit v4)

---

## 3. EXISTING FOUNDATION

| # | Capability | Current Implementation | Evidence | Status | Reuse Strategy |
|---|-----------|----------------------|----------|--------|----------------|
| 1 | Authentication | JWT HMAC-SHA256 + scrypt + Session Revocation | `src/lib/auth/auth-service.ts`، `src/lib/auth/jwt.ts`، `src/lib/auth/edge-jwt.ts` | ✅ Complete | Extend با MFA (Phase 2) |
| 2 | Authorization (RBAC) | 52+ permission، 6 role، requirePermission در 148 route | `src/lib/rbac.ts`، `src/lib/seed.ts` | ✅ Complete | Extend با ABAC برای customer scope (Phase 5) |
| 3 | Tenant Isolation | tenantId در همه 116 model + getTenantId() | `src/lib/api-helpers.ts`، `src/lib/shared/contracts/tenant-context.ts` | ✅ Complete | Keep |
| 4 | Audit Log | AuditLog model + immutable enforcement | `prisma/schema.prisma` (line 2423)، `src/lib/audit.ts` | ✅ Complete | Extend به 154 route (Phase 2) |
| 5 | Idempotency | IdempotencyKey + IdempotencyHelper در 107 POST route | `src/lib/shared/infra/idempotency-helper.ts`، `prisma/schema.prisma` (IdempotencyKey model) | ✅ Complete | Keep |
| 6 | Inventory | Ledger Pattern + StockItem + Reservation + Transfer + CycleCount + Snapshot | 11 model، 18 route | ✅ Complete | Keep |
| 7 | Sales | Quote → Order → Invoice → Payment → Shipment → Return → Refund | 12 model، 22 route | ✅ Complete | Extend با pipeline orchestration (Phase 3) |
| 8 | Accounting | GL + AR/AP + Tax + Journal + Fiscal | 14 model، 17 route | 🟡 Partial | Extend با Cost Center/Settlement/Reconciliation (Phase 3) |
| 9 | Warranty | Card + Claim + Policy + Extension + Transfer | 5 model، 5 route | ✅ Complete | Keep |
| 10 | Service | Request + Order + Diagnosis + Part + Labor + QC + Assignment + Appointment | 8 model، 8 route | ✅ Complete | Extend با Mobile (Phase 4) + Dispatch (Phase 6) |
| 11 | Customer | Party model + 6 customer portal route | `src/app/api/v1/customer/` | 🟡 Backend | Extend با Portal UI (Phase 5) |
| 12 | Representative | Backend routes موجود (orders، commissions) | در `/api/v1/sales-orders`، `/api/v1/commission-*` | 🟡 Partial | Build Representative Portal UI (Phase 5) |
| 13 | Events | 46 event + EventCatalog + EventBus | `src/lib/event-catalog.ts`، `src/lib/shared/events/` | ✅ Complete | Extend با new events (هر Phase) |
| 14 | Outbox | OutboxMessage + Dispatcher + Retry + DLQ | `src/lib/shared/outbox/dispatcher.ts`، `prisma/schema.prisma` (OutboxMessage) | ✅ Complete | Keep |
| 15 | Inbox | ProcessedMessages + exactly-once | `src/lib/shared/inbox/inbox-worker.ts`، `prisma/schema.prisma` (ProcessedMessage) | ✅ Complete | Keep |
| 16 | Saga | saga-manager.ts با 2 definition | `src/lib/saga/saga-manager.ts`، `prisma/schema.prisma` (SagaDefinition, SagaInstance) | ✅ Framework | Add more Sagas (Phase 3) |
| 17 | Workers | run-workers.ts با 3 loop | `src/workers/run-workers.ts` | ✅ Complete | Extend با new workers (Scheduler Phase 9) |
| 18 | Dashboard | Real stats از /api/v1/system/stats | `src/app/api/v1/system/stats/route.ts`، `src/app/page.tsx` (DashboardView) | ✅ Fixed (v4) | Extend با Executive Dashboard (Phase 7) |
| 19 | Customer Portal | 6 route با Party resolution | `src/app/api/v1/customer/`، `src/lib/api-helpers.ts` (getCustomerPartyId) | ✅ Backend | Build UI (Phase 5) |
| 20 | API Client | apiFetch با auto Bearer + refresh | `src/lib/api-client.ts` (apiFetch export) | ✅ Complete | Extend با typed APIs (هر Phase) |
| 21 | Session Revocation | isSessionActive + globalThis cache + invalidateSessionCache | `src/lib/auth/auth-service.ts`، `src/lib/rbac.ts` (SessionRevokedError) | ✅ Complete (v4) | Keep |
| 22 | Rate Limiting | In-memory sliding window | `src/lib/rate-limiter.ts` | 🟡 In-memory | Migrate به Redis (Phase 2) |
| 23 | Security Headers | 12 headers در middleware | `src/middleware.ts` | ✅ Complete | Keep |
| 24 | Input Sanitizer | 75 attack pattern | `src/lib/input-sanitizer.ts` (LOCATION TO VERIFY) | ✅ Complete | Keep |
| 25 | Business Code Generator | 47 definition (LAW-02) | `src/lib/shared/helpers/business-code-generator.ts` | ✅ Complete | Extend با new codes (هر Phase) |
| 26 | Workflow Engine | WorkflowDefinition + Instance + History | 3 model، 5 route | ✅ Complete | Extend (Phase 9) |
| 27 | Rule Engine | RuleSet + RuleDefinition + Execution + AuditStep | 4 model، 4 route | ✅ Complete | Extend (Phase 9) |
| 28 | Notification Platform | 5 model + 5 Channel + Template Engine | `src/lib/modules/notification/`، 16 route | ✅ Complete | Extend با WhatsApp (Phase 4+) |
| 29 | File Management | FileAttachment با virusScanStatus | 1 model، 1 route | 🟡 Basic | Extend با Signed URL + ClamAV (Phase 2) |
| 30 | Reporting (Financial) | 6 route از OLTP | `/api/v1/reports/*` | 🟡 Partial | Build BI Layer (Phase 7) |
| 31 | CRM Lite | Lead + CustomerInteraction + Loyalty | 7 model، 18 route | 🟡 Minimal | Build full CRM (Phase 8) |
| 32 | Service Ops | SLAPolicy + Tracker + TechnicianSkill/Availability/Performance | 6 model، 6 route | 🟡 Backend | Build Dispatch Engine (Phase 6) |
| 33 | Procurement | PurchaseOrder + GoodsReceipt | 4 model، 2 route | 🟡 Backend | Keep |
| 34 | Marketing Lite | Promotion + Coupon + Commission | 5 model، 6 route | 🟡 Backend | Keep |
| 35 | Multi-Company | Company model | 1 model، 1 route | 🟡 Backend | Keep |

---

## 4. TARGET CAPABILITY MAP

| ID | Capability | Current | Target | Gap | Priority | Phase | Dependencies |
|----|-----------|---------|--------|-----|----------|-------|-------------|
| A | Identity | 90% | 98% | MFA, OTP, PII Enc | P2 | 2 | None |
| B | Organization | 85% | 95% | Multi-currency | P3 | 3 | None |
| C | Customer | 60% (backend) | 90% | Portal UI, 360 | P2 | 5, 8 | Phase 3 |
| D | Product | 90% | 95% | Variant management | P3 | 3 | None |
| E | Inventory | 90% | 95% | Reorder point | P3 | 3 | None |
| F | Procurement | 60% | 85% | Supplier portal, GR automation | P3 | 3 | None |
| G | Sales | 85% | 95% | Pipeline orchestrator | P1 | 3 | None |
| H | Billing | 85% | 95% | Online payment | P2 | 5 | Phase 3 |
| I | Accounting | 60% | 90% | Cost Center, Recon, Sepidar | P1 | 3 | None |
| J | Warranty | 90% | 95% | Expiry automation | P3 | 9 | Phase 3 |
| K | Service | 75% | 95% | Mobile, Dispatch | P1 | 4, 6 | Phase 2 |
| L | Technician | 30% (data) | 90% | Mobile App, Offline | P1 | 4 | Phase 2 |
| M | Dispatch | 20% (data) | 90% | Algorithm | P1 | 6 | Phase 4 |
| N | SLA | 50% | 90% | Enforcement, Escalation | P2 | 6 | Phase 4 |
| O | CRM | 15% | 85% | Opportunity, Campaign | P2 | 8 | Phase 5 |
| P | Customer 360 | 0% | 90% | Projection | P2 | 5, 8 | Phase 3 |
| Q | Reporting | 25% | 90% | 26 reports | P2 | 7 | Phase 3 |
| R | BI | 0% | 80% | Projections, Dashboard | P3 | 7 | Phase 3 |
| S | Notification | 85% | 95% | WhatsApp, Push | P2 | 4 | Phase 2 |
| T | Files | 40% | 90% | Signed URL, ClamAV | P2 | 2 | None |
| U | Search | 30% | 80% | PostgreSQL FTS | P3 | 7 | Phase 2 |
| V | Mobile | 0% | 90% | Flutter App | P1 | 4 | Phase 2 |
| W | Offline Sync | 0% | 90% | Sync Engine | P1 | 4 | Phase 4 |
| X | Automation | 40% | 85% | Scheduler, Triggers | P3 | 9 | Phase 7, 8 |
| Y | Observability | 10% | 95% | OTel, Prometheus, Loki | P0 | 2 | None |
| Z | Infrastructure | 20% | 90% | Redis, MinIO, IaC | P0 | 2 | None |
| AA | AI | 0% | 80% | Predictive, Recommend | P4 | 10 (V2) | All |

---

## 5. MASTER EXECUTION BACKLOG

### Task ID Format: `T-[Phase]-[Seq]`

#### Phase 2 Tasks (Production Foundation)

| Task ID | Title | Priority | Business Value | Affected Domain | DB Impact | API Impact | Frontend | Mobile | Security | Events | Testing |
|---------|-------|----------|---------------|-----------------|-----------|------------|----------|--------|----------|--------|---------|
| T-2-01 | PostgreSQL Migration | P0 | System reliability | All | Switch provider | None | None | None | None | None | Integration: all 154 routes |
| T-2-02 | Redis Setup | P1 | Performance | All (rate limit, cache) | None | None | None | None | None | None | Integration: rate limit |
| T-2-03 | MinIO Setup | P1 | File storage | File | None | /files (modify) | None | None | Signed URL | None | Integration: upload/download |
| T-2-04 | Backup Strategy (pg_dump + WAL) | P0 | Data safety | All | None | None | None | None | None | None | Integration: backup + restore |
| T-2-05 | PITR Implementation | P0 | Data recovery | All | None | None | None | None | None | None | Integration: PITR restore |
| T-2-06 | Restore Test Automation | P0 | DR readiness | All | None | None | None | None | None | None | Weekly automated test |
| T-2-07 | DR Plan + Failover | P0 | Business continuity | All | None | None | None | None | None | None | DR drill |
| T-2-08 | Structured Logging (pino) | P1 | Debuggability | All | None | None | None | None | PII redaction | None | Unit: log format |
| T-2-09 | OpenTelemetry Tracing | P1 | Distributed tracing | All | None | None | None | None | None | None | Integration: trace propagation |
| T-2-10 | Prometheus Metrics | P1 | Monitoring | All | None | /metrics (new) | None | None | None | None | Integration: metrics scrape |
| T-2-11 | Grafana Dashboards | P1 | Visibility | All | None | None | None | None | None | None | Manual: dashboard review |
| T-2-12 | Loki Log Aggregation | P2 | Log search | All | None | None | None | None | None | None | Integration: log query |
| T-2-13 | Sentry Error Tracking | P1 | Error visibility | All | None | None | None | None | None | None | Integration: error capture |
| T-2-14 | Alerting (Alertmanager) | P1 | Proactive ops | All | None | None | None | None | None | None | Integration: alert trigger |
| T-2-15 | CI/CD Pipeline Complete | P1 | Deploy safety | All | None | None | None | None | None | None | E2E: push → prod |
| T-2-16 | Secrets Management (Vault) | P2 | Secret safety | All | None | None | None | None | Secrets in Vault | None | Integration: secret retrieval |
| T-2-17 | MFA (TOTP) for Admin/Finance | P2 | Account security | Identity | User (modify: mfaEnabled, mfaSecret) | /auth/mfa/* (new) | MFA setup page | None | MFA enforcement | mfa.enabled | Unit: TOTP validation |
| T-2-18 | PII Encryption (AES-256-GCM) | P2 | Data privacy | Customer, Identity | Party, User (modify) | None | None | None | PII at rest | None | Unit: encrypt/decrypt |
| T-2-19 | File Virus Scan (ClamAV) | P2 | Upload security | File | None | /files (modify) | None | None | Scan on upload | file.scan_completed | Integration: EICAR test |
| T-2-20 | Signed URL for Files | P2 | Access control | File | FileAttachment (modify: signedUrlExpiresAt) | /files/[id]/url (new) | None | None | Time-limited access | None | Unit: URL expiry |

#### Phase 3 Tasks (Core Business Completion)

| Task ID | Title | Priority | Business Value | Affected Domain | DB Impact | API Impact | Frontend | Testing |
|---------|-------|----------|---------------|-----------------|-----------|------------|----------|---------|
| T-3-01 | Sales Pipeline Orchestrator | P1 | End-to-end sales | Sales | None | None | None | E2E: quote → warranty |
| T-3-02 | Returns Financial Reversal | P1 | Correct accounting | Sales, Billing | None | /return-orders/[id]/reverse (new) | None | E2E: return → JE reversal |
| T-3-03 | Tax Calculation Engine (multi-rate) | P1 | Compliance | Financial | TaxCalculation (existing) | /tax/calculate (existing) | Tax config UI | Unit: multi-rate |
| T-3-04 | Commission Calculation (tiered) | P2 | Sales incentive | Financial | CommissionRule (existing) | None | Commission dashboard | Unit: tiered calc |
| T-3-05 | Bank Reconciliation | P2 | Financial accuracy | Financial | BankAccount, Reconciliation (new) | /reconciliation/* (extend) | Reconciliation UI | E2E: bank recon |
| T-3-06 | Cost Center Activation | P3 | Cost tracking | Financial | CostCenter (existing, activate) | None | None | Unit: cost allocation |
| T-3-07 | Sepidar Integration (REST API) | P2 | GL sync | Financial | None | /integrations/sepidar/* (new) | None | Integration: JE export |
| T-3-08 | Inventory Reorder Point | P3 | Stock optimization | Inventory | StockItem (modify: reorderPoint) | None | None | Unit: reorder trigger |

#### Phase 4 Tasks (Technician Platform)

| Task ID | Title | Priority | Business Value | Affected Domain | DB Impact | API Impact | Frontend | Mobile | Testing |
|---------|-------|----------|---------------|-----------------|-----------|------------|----------|--------|---------|
| T-4-01 | Device Model + Registration API | P1 | Mobile auth | Identity, Mobile | Device (new) | /mobile/register-device (new) | None | Device registration | Unit: device binding |
| T-4-02 | OfflineSyncQueue Model + Sync API | P1 | Offline support | Mobile | OfflineSyncQueue, SyncConflict (new) | /mobile/sync (new) | None | Sync manager | E2E: offline → sync |
| T-4-03 | MobileJobSnapshot Model + API | P1 | Offline job access | Mobile, Service | MobileJobSnapshot (new) | /mobile/assignments (new) | None | Job list offline | Unit: snapshot |
| T-4-04 | Job Acceptance API | P1 | Job flow | Service | None | /mobile/jobs/[id]/accept (new) | None | Accept button | Integration: accept flow |
| T-4-05 | GPS Check-in/Check-out API | P1 | Field tracking | Service | TechnicianLocation (new) | /mobile/jobs/[id]/check-in (new) | None | GPS capture | Integration: GPS verify |
| T-4-06 | Mobile Diagnosis API | P1 | Service recording | Service | None | /mobile/jobs/[id]/diagnosis (new) | None | Diagnosis form | Integration: diagnosis |
| T-4-07 | Mobile Parts/Labor API | P1 | Service cost | Service | None | /mobile/jobs/[id]/parts, /labor (new) | None | Parts form | Integration: parts |
| T-4-08 | Photo Upload (Before/After) API | P1 | Service evidence | File, Service | None | /mobile/jobs/[id]/photos (new) | None | Camera + upload | Integration: photo upload |
| T-4-09 | Signature Capture API | P1 | Customer confirmation | Service | None | /mobile/jobs/[id]/signature (new) | None | Signature pad | Integration: signature |
| T-4-10 | Job Complete API | P1 | Service closure | Service | None | /mobile/jobs/[id]/complete (new) | None | Complete button | E2E: full job flow |
| T-4-11 | Push Notification (FCM + APNs) | P1 | Real-time alerts | Notification | None | None | None | Push handler | Integration: FCM delivery |
| T-4-12 | Flutter App — Login + Job List | P1 | Mobile entry | — | None | None | None | Flutter UI | E2E: login → job list |
| T-4-13 | Flutter App — Job Detail + Check-in | P1 | Mobile job flow | — | None | None | None | Flutter UI | E2E: check-in |
| T-4-14 | Flutter App — Diagnosis + Parts + Photos + Signature | P1 | Mobile service | — | None | None | None | Flutter UI | E2E: full service |
| T-4-15 | Flutter App — Offline Mode + Sync | P1 | Offline-first | — | None | None | None | SQLite (Drift) + Sync Queue | E2E: offline → sync |
| T-4-16 | Flutter App — Barcode/QR Scanner | P2 | Product identify | — | None | None | None | mobile_scanner | Unit: scan |
| T-4-17 | Flutter App — Background Sync | P2 | Auto-sync | — | None | None | None | workmanager | Integration: background |
| T-4-18 | SQLite Encryption (SQLCipher) | P1 | Offline data security | — | None | None | None | SQLCipher | Security: encryption |

#### Phase 5 Tasks (Customer + Representative Portal)

| Task ID | Title | Priority | Business Value | Affected Domain | DB Impact | API Impact | Frontend | Testing |
|---------|-------|----------|---------------|-----------------|-----------|------------|----------|---------|
| T-5-01 | Customer Portal UI — Dashboard | P2 | Self-service | Customer | None | None | Next.js page | E2E: customer dashboard |
| T-5-02 | Customer Portal UI — Products + Warranty | P2 | Product visibility | Customer | None | None | Next.js page | E2E: view products |
| T-5-03 | Customer Portal UI — Service Requests | P2 | Self-service | Customer, Service | None | None | Next.js page | E2E: create service request |
| T-5-04 | Customer Portal UI — Invoices + Payments | P2 | Online payment | Customer, Billing | None | None | Next.js page | E2E: pay online |
| T-5-05 | Customer Portal UI — Complaints + Surveys | P2 | Feedback | Customer | None | None | Next.js page | E2E: submit complaint |
| T-5-06 | Online Payment Gateway (Zarinpal/Sep) | P2 | Revenue | Billing | Payment (modify: gateway) | /payments/online (new) | None | Integration: payment |
| T-5-07 | Customer 360 Initial Projection | P2 | Fast customer view | Customer 360 | Customer360View (new) | /customers/[id]/360 (new) | None | Unit: projection update |
| T-5-08 | Representative Portal UI — Dashboard | P2 | Sales tool | Sales | None | /representative/dashboard (new) | Next.js page | E2E: rep dashboard |
| T-5-09 | Representative Portal UI — Customers + Orders | P2 | Sales workflow | Sales, Customer | None | /representative/* (new) | Next.js page | E2E: create order |
| T-5-10 | Representative Portal UI — Commissions + Inventory | P2 | Sales insight | Financial, Inventory | None | /representative/commissions (new) | Next.js page | E2E: view commissions |

#### Phase 6 Tasks (Dispatch + SLA)

| Task ID | Title | Priority | Business Value | Affected Domain | DB Impact | API Impact | Testing |
|---------|-------|----------|---------------|-----------------|-----------|------------|---------|
| T-6-01 | DispatchService — Candidate Finder | P1 | Smart assignment | Service | None | /dispatch/candidates/[id] (new) | Unit: candidate filter |
| T-6-02 | DispatchService — Scoring Algorithm | P1 | Optimal assignment | Service | TechnicianScore (new) | /dispatch/score (new) | Unit: scoring |
| T-6-03 | DispatchService — Auto-Assign | P1 | Automation | Service | None | /dispatch/auto-assign (new) | Integration: auto-assign |
| T-6-04 | DispatchService — Reassign | P2 | Flexibility | Service | None | /dispatch/reassign (new) | Integration: reassign |
| T-6-05 | Distance Calculation (PostGIS) | P2 | Smart dispatch | Service | None | None | Unit: distance calc |
| T-6-06 | Workload Balancing | P2 | Fair distribution | Service | None | /dispatch/workload (new) | Unit: workload |
| T-6-07 | SLA Deadline Auto-Calculation | P2 | SLA compliance | Service | SLATracker (modify) | None | Unit: deadline calc |
| T-6-08 | SLA Breach Detection (Cron) | P2 | Proactive SLA | Service | None | None | Integration: breach detection |
| T-6-09 | EscalationRule + EscalationLog | P2 | Auto-escalation | Service | EscalationRule, EscalationLog (new) | None | Integration: escalation |
| T-6-10 | Dispatch Dashboard UI | P2 | Visibility | Service | None | None | E2E: dispatch dashboard |

#### Phase 7 Tasks (Reporting + BI)

| Task ID | Title | Priority | Business Value | Affected Domain | DB Impact | API Impact | Testing |
|---------|-------|----------|---------------|-----------------|-----------|------------|---------|
| T-7-01 | SalesProjection Model + Handler | P2 | Fast sales reports | Reporting | SalesProjection (new) | None | Unit: projection |
| T-7-02 | ServiceProjection Model + Handler | P2 | Fast service reports | Reporting | ServiceProjection (new) | None | Unit: projection |
| T-7-03 | 8 Sales Reports | P2 | Sales insight | Reporting | None | /reports/sales/* (8 new) | Unit: report gen |
| T-7-04 | 10 Service Reports | P2 | Service insight | Reporting | None | /reports/service/* (10 new) | Unit: report gen |
| T-7-05 | 2 New Financial Reports | P2 | Finance insight | Reporting | None | /reports/financial/* (2 new) | Unit: report gen |
| T-7-06 | Executive Dashboard (real-time) | P2 | Decision support | Reporting | None | /reports/executive (new) | E2E: dashboard |
| T-7-07 | Export (PDF/Excel/CSV) | P2 | Report sharing | Reporting | None | /reports/export (new) | Unit: export |
| T-7-08 | Scheduled Reports (email) | P2 | Automation | Reporting, Automation | ReportSchedule (new) | /reports/schedule (new) | Integration: scheduled email |
| T-7-09 | Materialized Views Refresh Cron | P2 | Fresh data | Reporting | None | None | Integration: refresh |

#### Phase 8 Tasks (CRM + Customer 360)

| Task ID | Title | Priority | Business Value | Affected Domain | DB Impact | API Impact | Testing |
|---------|-------|----------|---------------|-----------------|-----------|------------|---------|
| T-8-01 | Opportunity Model + Pipeline | P2 | Sales pipeline | CRM | Opportunity (new) | /opportunities/* (CRUD) | E2E: lead → opportunity |
| T-8-02 | Campaign Model + Management | P2 | Marketing | CRM | Campaign, CampaignTarget (new) | /campaigns/* (CRUD) | Integration: campaign |
| T-8-03 | Task Model + Assignment | P2 | Productivity | CRM | Task (new) | /tasks/* (CRUD) | Unit: task assignment |
| T-8-04 | FollowUp Model + Scheduling | P2 | Sales follow-up | CRM | FollowUp (new) | /follow-ups/* (CRUD) | Unit: scheduling |
| T-8-05 | Customer Segmentation (RFM) | P2 | Targeting | CRM | CustomerSegment (new) | /customers/segments (new) | Unit: RFM |
| T-8-06 | CLV Calculation | P2 | Customer value | CRM | None | /customers/[id]/clv (new) | Unit: CLV |
| T-8-07 | Customer 360 Full (enrich) | P2 | 360 view | Customer 360 | Customer360View (modify) | /customers/[id]/360 (extend) | Unit: enrichment |
| T-8-08 | Cross-sell Recommendations | P3 | Revenue | CRM | None | /customers/[id]/recommendations (new) | Unit: recommendations |
| T-8-09 | Customer Journey Map | P3 | Visibility | CRM | CustomerJourneyEvent (new) | /customers/[id]/journey (new) | Unit: journey |
| T-8-10 | CRM Dashboard UI | P2 | Sales tool | CRM | None | None | E2E: CRM dashboard |

#### Phase 9 Tasks (Automation)

| Task ID | Title | Priority | Business Value | Affected Domain | DB Impact | API Impact | Testing |
|---------|-------|----------|---------------|-----------------|-----------|------------|---------|
| T-9-01 | ScheduledJob Model + Scheduler | P3 | Automation | Automation | ScheduledJob, JobExecutionLog (new) | /scheduler/* (CRUD) | Integration: cron |
| T-9-02 | Trigger-Based Automation | P3 | Event-driven | Automation | AutomationTrigger, AutomationRule (new) | /automation/* (new) | Integration: trigger |
| T-9-03 | Warranty Expiry Automation | P3 | Proactive | Warranty | None | None | Integration: expiry alert |
| T-9-04 | Follow-up Reminder Automation | P3 | Sales | CRM | None | None | Integration: reminder |
| T-9-05 | Notification Automation | P3 | Engagement | Notification | None | None | Integration: auto-notify |
| T-9-06 | Bulk Operations | P3 | Efficiency | All | None | /bulk/* (new) | Integration: bulk |

#### Phase 10 Tasks (Advanced/AI — V2)

| Task ID | Title | Priority | Business Value | Phase |
|---------|-------|----------|---------------|-------|
| T-10-01 | AI Service Diagnosis | P4 | Service speed | V2 |
| T-10-02 | Demand Forecasting | P4 | Inventory opt | V2 |
| T-10-03 | Customer Churn Prediction | P4 | Retention | V2 |
| T-10-04 | Predictive Maintenance | P4 | Proactive | V2 |
| T-10-05 | Advanced BI (Metabase) | P4 | Self-service | V2 |
| T-10-06 | WhatsApp Business | P4 | Channel | V2 |
| T-10-07 | Multi-Currency | P4 | International | V2 |
| T-10-08 | Multi-Language (i18n) | P4 | International | V2 |

---

## 6. PRIORITY SYSTEM

| Priority | Definition | Count |
|----------|-----------|-------|
| P0 | Production Blocker | 7 (Phase 2) |
| P1 | Required for Production / Major Gap | 18 (Phase 2-4) |
| P2 | Important | 25 (Phase 5-8) |
| P3 | Enhancement | 15 (Phase 9-10) |
| P4 | Future / V2 | 8 (Phase 10) |

---

## 7. PHASE 2 — PRODUCTION FOUNDATION (Detailed)

### Goal
 قابل‌اعتماد بودن برای Production واقعی

### Tasks Detail

#### T-2-01: PostgreSQL Migration

| Field | Value |
|-------|-------|
| **Task ID** | T-2-01 |
| **Priority** | P0 |
| **Implementation Location** | `scripts/migrate-to-postgres.sh` (existing)، `prisma/schema.postgres.prisma` (existing) |
| **Dependencies** | None |
| **Database Impact** | Switch provider sqlite → postgresql |
| **API Impact** | None (transparent) |
| **Acceptance Test** | 100 concurrent writes → 0% timeout (was 60% on SQLite) |
| **Exit Gate** | All 154 routes functional on PostgreSQL + 53 regression tests PASS |

#### T-2-02: Redis Setup

| Field | Value |
|-------|-------|
| **Task ID** | T-2-02 |
| **Priority** | P1 |
| **Implementation Location** | `src/lib/rate-limiter.ts` (modify: Redis backend)، LOCATION TO VERIFY for Redis client |
| **Dependencies** | T-2-01 |
| **Database Impact** | None |
| **API Impact** | None |
| **Acceptance Test** | Rate limit works across multiple server instances |
| **Exit Gate** | Redis running + rate limit functional + session cache on Redis |

#### T-2-03: MinIO Setup

| Field | Value |
|-------|-------|
| **Task ID** | T-2-03 |
| **Priority** | P1 |
| **Implementation Location** | `src/app/api/v1/files/route.ts` (modify)، LOCATION TO VERIFY for MinIO client |
| **Dependencies** | T-2-01 |
| **Database Impact** | FileAttachment.storageType (use 'minio') |
| **API Impact** | /files (modify: upload to MinIO) |
| **Acceptance Test** | File upload → MinIO → download via signed URL |
| **Exit Gate** | MinIO running + files uploaded to MinIO |

#### T-2-04: Backup Strategy

| Field | Value |
|-------|-------|
| **Task ID** | T-2-04 |
| **Priority** | P0 |
| **Implementation Location** | `scripts/backup.sh` (NEW)، docker-compose (add backup service) |
| **Dependencies** | T-2-01 |
| **Database Impact** | None |
| **Acceptance Test** | Daily full backup + WAL archive → MinIO |
| **Exit Gate** | Backup successful + file exists in MinIO + size > 0 |

#### T-2-05: PITR Implementation

| Field | Value |
|-------|-------|
| **Task ID** | T-2-05 |
| **Priority** | P0 |
| **Implementation Location** | PostgreSQL config (wal_level=replica، archive_mode=on)، `scripts/pitr-restore.sh` (NEW) |
| **Dependencies** | T-2-04 |
| **Acceptance Test** | Restore to specific timestamp (RPO ≤ 15 min) |
| **Exit Gate** | PITR restore test PASS |

#### T-2-06: Restore Test Automation

| Field | Value |
|-------|-------|
| **Task ID** | T-2-06 |
| **Priority** | P0 |
| **Implementation Location** | `scripts/restore-test.sh` (NEW)، CI/CD weekly job |
| **Dependencies** | T-2-05 |
| **Acceptance Test** | Weekly automated restore to test DB + data integrity check |
| **Exit Gate** | 4 consecutive weekly restore tests PASS |

#### T-2-07: DR Plan + Failover

| Field | Value |
|-------|-------|
| **Task ID** | T-2-07 |
| **Priority** | P0 |
| **Implementation Location** | `docs/dr-plan.md` (NEW)، `scripts/failover.sh` (NEW) |
| **Dependencies** | T-2-05 |
| **Acceptance Test** | DR drill: simulate primary failure → failover → RTO ≤ 1 hour |
| **Exit Gate** | DR drill PASS + documented |

#### T-2-08 to T-2-14: Observability Stack

| Task | Location | Acceptance |
|------|----------|------------|
| T-2-08 Structured Logging | `src/lib/logger.ts` (NEW), replace console.log | JSON logs in Loki |
| T-2-09 OpenTelemetry | `src/lib/otel.ts` (NEW), middleware instrumentation | Trace visible in Jaeger |
| T-2-10 Prometheus | `/api/metrics` (NEW endpoint), `src/lib/metrics.ts` (NEW) | Metrics scraped |
| T-2-11 Grafana | `infra/grafana/dashboards/` (NEW) | 5 dashboards live |
| T-2-12 Loki | Docker service + pino-loki transport | Logs searchable |
| T-2-13 Sentry | `src/lib/sentry.ts` (NEW), `sentry.client.config.ts` (NEW) | Errors captured |
| T-2-14 Alertmanager | `infra/alertmanager/` (NEW) | 10 alerts configured |

#### T-2-15: CI/CD Pipeline Complete

| Field | Value |
|-------|-------|
| **Task ID** | T-2-15 |
| **Priority** | P1 |
| **Implementation Location** | `.github/workflows/ci-cd.yml` (modify: remove `\|\| true`, add staging + production) |
| **Acceptance Test** | Push → lint → test → security scan → build → staging → health check → production → rollback test |
| **Exit Gate** | Full pipeline PASS + rollback tested |

#### T-2-17: MFA (TOTP)

| Field | Value |
|-------|-------|
| **Task ID** | T-2-17 |
| **Priority** | P2 |
| **Implementation Location** | `src/lib/auth/mfa.ts` (NEW), `src/app/api/v1/auth/mfa/*` (NEW), `src/app/page.tsx` (modify: MFA login) |
| **Database Impact** | User model (add: mfaEnabled, mfaSecret, lastMfaAt) |
| **API Impact** | /auth/mfa/setup, /auth/mfa/verify, /auth/mfa/disable (NEW) |
| **Acceptance Test** | Admin/finance must complete MFA to login |
| **Exit Gate** | MFA enforced for admin/finance roles |

### Phase 2 Exit Gate

```text
✓ PostgreSQL production test (100 concurrent writes → 0% timeout)
✓ Backup successful (daily + WAL archive)
✓ Restore successful (PITR to timestamp)
✓ RPO measured (≤ 15 min)
✓ RTO measured (≤ 1 hour)
✓ Monitoring active (Prometheus + Grafana)
✓ Critical alerts active (10 alerts)
✓ CI/CD successful (push → prod with rollback)
✓ Security checks passed (MFA + PII + File Scan + Signed URL)
✓ Regression suite passed (53 tests)
```

---

## 8. DATABASE MIGRATION PLAN (SQLite → PostgreSQL)

### Pre-Migration Checks

| Check | Status | Notes |
|-------|--------|-------|
| Schema Compatibility | ✅ Ready | `prisma/schema.postgres.prisma` EXISTS |
| SQLite-specific features | ✅ None | 0 `@db.`، 0 `dbgenerated`، 0 `Unsupported` |
| JSON fields | ✅ Compatible | Prisma handles Json type |
| Enums (String-based) | ✅ Compatible | All enums are String (not Prisma enum) |
| Case sensitivity | ⚠️ Verify | SQLite insensitive، PostgreSQL sensitive — verify all queries |
| Full Text Search | ⚠️ Verify | SQLite LIKE → PostgreSQL ILIKE or FTS |
| Connection Pool | ✅ Needed | Prisma default pool (configure for PostgreSQL) |
| Sequences/IDs | ✅ Compatible | cuid() strings (not auto-increment) |

### Migration Steps (No Execution — Plan Only)

```text
Step 1: Preparation
  - Backup SQLite: cp db/custom.db db/custom.db.backup
  - Verify schema.postgres.prisma compiles: bun run db:generate (with postgres schema)
  - Install PostgreSQL 16
  - Create database: createdb bismark

Step 2: Dry Run
  - Run migrate-to-postgres.sh on test database
  - Verify all 116 tables created
  - Verify all indexes + constraints

Step 3: Data Validation
  - Export SQLite data: sqlite3 db/custom.db .dump > /tmp/sqlite-dump.sql
  - Transform SQL (SQLite → PostgreSQL syntax)
  - Import to PostgreSQL
  - Compare row counts (SQLite vs PostgreSQL) for each table

Step 4: Integrity Check
  - Run all 5 unit tests
  - Run 53 regression tests
  - Verify 154 routes return 200

Step 5: Cutover
  - Maintenance mode ON
  - Final SQLite backup
  - Run migration script
  - Update .env: DATABASE_URL=postgresql://...
  - Restart app
  - Verify health check
  - Maintenance mode OFF

Step 6: Post-Migration Verification
  - Monitor for 24 hours
  - Verify no data loss
  - Verify performance improvement

Step 7: Rollback Plan (if needed)
  - Revert .env to SQLite
  - Restart app
  - SQLite database untouched (backup exists)
```

---

## 9. BACKUP & DISASTER RECOVERY

### Backup Plan

| Item | Value |
|------|-------|
| **Backup Frequency** | Daily full (02:00 AM) + WAL archive (every 60s) |
| **Retention** | Daily: 7 days، Weekly: 4 weeks، Monthly: 12 months |
| **PITR** | Enabled (wal_level=replica, archive_mode=on) |
| **Offsite Backup** | MinIO bucket (separate server ideally) |
| **Encryption** | AES-256 at rest (MinIO) + TLS in transit |
| **RPO** | ≤ 15 minutes |
| **RTO** | ≤ 1 hour |

### Restore Procedure

```text
1. Identify restore point (timestamp)
2. Stop application
3. Restore base backup: pg_restore --dbname=bismark --target-timestamp=<ts> base.dump
4. Replay WAL: pg_waldump + pg_receivewal
5. Verify data integrity (row counts + checksums)
6. Restart application
7. Verify health check
```

### Restore Test (Weekly Automated)

```text
1. Provision test PostgreSQL instance
2. Restore latest backup
3. PITR to random timestamp in last 24h
4. Run data integrity checks:
   - Row counts match
   - Foreign key constraints valid
   - Critical queries return expected results
5. Alert if any check fails
```

### Disaster Scenarios

| Scenario | Response | RTO |
|----------|----------|-----|
| Primary DB failure | Failover to standby | ≤ 1 hour |
| Data corruption | PITR to pre-corruption | ≤ 1 hour |
| Region failure | Restore from offsite backup | ≤ 4 hours |
| Ransomware | Restore from offline backup | ≤ 4 hours |
| Accidental deletion | PITR to pre-deletion | ≤ 15 min |

### Runtime Tests Required

- [ ] Backup completes successfully
- [ ] Restore to test DB PASS
- [ ] PITR to specific timestamp PASS
- [ ] RPO measured ≤ 15 min
- [ ] RTO measured ≤ 1 hour
- [ ] DR drill PASS

---

## 10. OBSERVABILITY

### What to Add

| Component | Tool | Location | Purpose |
|-----------|------|----------|---------|
| Structured Logs | pino + Loki | `src/lib/logger.ts` (NEW) | JSON logs, searchable |
| Metrics | Prometheus + Grafana | `/api/metrics` (NEW) | App + business metrics |
| Tracing | OpenTelemetry + Jaeger | `src/lib/otel.ts` (NEW) | Distributed traces |
| Error Tracking | Sentry | `src/lib/sentry.ts` (NEW) | Error capture |
| Health Checks | Existing + extend | `/api/v1/system/health` | DB, Redis, MinIO, Worker |
| Alerting | Alertmanager | `infra/alertmanager/` (NEW) | 10 critical alerts |

### Critical Flows to Trace

| Flow | Spans |
|------|-------|
| Order | POST /sales-orders → create order → create lines → reserve stock → outbox event |
| Payment | POST /payments → create payment → allocate → outbox event → JE creation |
| Invoice | POST /invoices/[id]/issue → validate → issue → outbox event → JE |
| Inventory | POST /inventory-transactions → validate → update stock → outbox event → snapshot |
| Warranty | POST /warranty-cards/[id]/activate → validate → activate → outbox event |
| Service | POST /service-requests → create → validate warranty → outbox event |
| Technician | POST /mobile/jobs/[id]/complete → validate → update → outbox event |
| Events | Outbox → Dispatcher → Inbox → Handler → side effect |

### Business Metrics

```text
- Orders created per day
- Revenue per day
- Service requests opened/closed per day
- SLA breach count
- Active technicians
- Customer satisfaction score
- Notification delivery rate
```

### Alerts (10 Critical)

```text
1. API 5xx error rate > 1% (5 min)
2. API p95 latency > 500ms (5 min)
3. DB connection pool exhausted
4. Worker process down
5. Outbox backlog > 100 messages (10 min)
6. SLA breach imminent (1 hour)
7. Disk space < 20%
8. Backup failed
9. Redis down
10. MinIO down
```

---

## 11. PHASE 3 — CORE BUSINESS COMPLETION

### Gap Status by Domain

| Domain | Missing | Partial | Needs Hardening | Production Ready |
|--------|---------|---------|-----------------|-----------------|
| Sales | Pipeline orchestrator | — | — | ✅ (CRUD) |
| Inventory | Reorder point | — | — | ✅ (CRUD) |
| Accounting | Cost Center active, Settlement, Reconciliation | Sepidar integration | Tax multi-rate | 🟡 |
| Warranty | — | — | Expiry automation | ✅ |
| Service | — | Mobile (Phase 4) | Dispatch (Phase 6) | ✅ (backend) |
| Customer | — | Portal UI (Phase 5) | — | 🟡 (backend) |
| Representative | Portal UI | — | — | 🟡 (backend) |

---

## 12. PHASE 4 — TECHNICIAN PLATFORM (Offline Architecture Detail)

### Offline Architecture

```text
┌─────────────────────────────────────────┐
│           Flutter App (Technician)      │
│  ┌─────────────────────────────────┐    │
│  │   UI (Job List, Detail, Forms)  │    │
│  └──────────┬──────────────────────┘    │
│  ┌──────────▼──────────────────────┐    │
│  │   Local DB (Drift / SQLite)     │    │
│  │   - Jobs Snapshot               │    │
│  │   - Draft Diagnosis/Parts       │    │
│  │   - Pending Photos              │    │
│  │   - Sync Queue                  │    │
│  └──────────┬──────────────────────┘    │
│  ┌──────────▼──────────────────────┐    │
│  │   Sync Engine                   │    │
│  │   - Detect online/offline       │    │
│  │   - Process Sync Queue          │    │
│  │   - Conflict Detection          │    │
│  │   - Retry with Backoff          │    │
│  └──────────┬──────────────────────┘    │
└─────────────┼───────────────────────────┘
              │ HTTPS (when online)
              ▼
┌─────────────────────────────────────────┐
│           Backend API                   │
│  /api/v1/mobile/sync                    │
│  - Receive sync batch                   │
│  - Idempotency check (Operation ID)     │
│  - Apply changes                        │
│  - Detect conflicts (version check)     │
│  - Return conflict list                 │
│  - Acknowledge successful syncs         │
└─────────────────────────────────────────┘
```

### Data Classification (Offline vs Online)

| Data | Offline Allowed | Online Only | Notes |
|------|----------------|-------------|-------|
| Job List (assigned) | ✅ Yes | — | Snapshot on sync |
| Job Detail | ✅ Yes | — | Snapshot |
| Customer Info | ✅ Yes | — | Snapshot (PII encrypted) |
| Diagnosis Form | ✅ Yes (draft) | — | Submit on sync |
| Parts Used | ✅ Yes (draft) | — | Submit on sync |
| Photos | ✅ Yes (local) | — | Upload on sync |
| Signature | ✅ Yes (local) | — | Upload on sync |
| Check-in/Check-out | ✅ Yes (with timestamp) | — | Submit on sync |
| Job Acceptance | ⚠️ Limited | ✅ Yes | Accept needs server confirm (prevent double-accept) |
| Job Rejection | ✅ Yes (revert if conflict) | — | Server may have already reassigned |
| New Job Assignment | — | ✅ Yes | Push notification |
| Other Technicians' Jobs | ❌ No | ❌ No | Scope: own jobs only |

### Sync Queue Operation

```text
Operation ID: UUID (client-generated, idempotency)
  ↓
Sync Queue Entry:
  - operationId (UUID)
  - entityType (Job, Diagnosis, Part, Photo, Signature)
  - entityId
  - operationType (create, update, delete)
  - payload (JSON)
  - createdAt (client timestamp)
  - attempts (0, 1, 2...)
  - status (pending, syncing, success, conflict, failed)
  ↓
When Online:
  - POST /mobile/sync with batch of operations
  - Server processes each:
    1. Check idempotency (operationId)
    2. Check version (optimistic lock)
    3. Apply or mark conflict
  - Server returns: { success: [...], conflicts: [...], failures: [...] }
  - Client updates local status
```

### Conflict Resolution

| Conflict Type | Resolution |
|---------------|------------|
| Job cancelled on server, technician worked offline | Mark as conflict → dispatcher reviews → manual resolution |
| Job reassigned on server, technician worked offline | Mark as conflict → dispatcher reviews |
| Same field updated on both sides | Last-Write-Wins (server timestamp authoritative) |
| Part quantity mismatch | Mark as conflict → supervisor reviews |
| Photo upload fails after 5 retries | Move to Failed queue → manual upload later |

### Retry Strategy

```text
- Attempt 1: Immediate
- Attempt 2: 30s backoff
- Attempt 3: 2min backoff
- Attempt 4: 10min backoff
- Attempt 5: 1hour backoff
- After 5 failures: Move to Failed queue → notify user
```

---

## 13. PHASE 5 — CUSTOMER + REPRESENTATIVE

### Customer Portal Tasks (10)

| # | Feature | Backend | Frontend | Priority |
|---|---------|---------|----------|----------|
| 1 | Profile Management | /customer/profile (existing) | Profile page | P2 |
| 2 | Products + Serials | /customer/products (existing) | Products page | P2 |
| 3 | Warranties | /customer/warranties (existing) | Warranties page | P2 |
| 4 | Invoices | /customer/invoices (existing) | Invoices page | P2 |
| 5 | Payments (Online) | /payments/online (NEW) | Payment page | P2 |
| 6 | Service Requests | /customer/service-requests (existing) + POST | Service request form | P2 |
| 7 | Complaints | /customer/complaints (existing) + POST | Complaint form | P2 |
| 8 | Surveys | /customer/surveys (existing) + POST | Survey form | P2 |
| 9 | Notifications | /notifications (existing) | Notifications page | P2 |
| 10 | Customer 360 (initial) | /customers/[id]/360 (NEW) | Dashboard | P2 |

### Representative Portal Tasks (10)

| # | Feature | Backend | Frontend | Priority |
|---|---------|---------|----------|----------|
| 1 | Dashboard | /representative/dashboard (NEW) | Dashboard page | P2 |
| 2 | Customer Management | /representative/customers (NEW) | Customers page | P2 |
| 3 | Order Creation | /sales-orders (existing) | Order form | P2 |
| 4 | Available Inventory | /representative/inventory (NEW) | Inventory page | P2 |
| 5 | Pricing + Discount | /price-lists (existing) | Pricing page | P2 |
| 6 | Commission View | /representative/commissions (NEW) | Commission page | P2 |
| 7 | Invoice Issuance | /invoices (existing) | Invoice form | P2 |
| 8 | Delivery Recording | /shipments (existing) | Delivery form | P2 |
| 9 | Installation Request | /installations (existing) | Installation form | P2 |
| 10 | Warranty Activation | /warranty-cards/[id]/activate (existing) | Activation form | P2 |

---

## 14. PHASE 6 — DISPATCH + SLA

### V1 (Current) — Manual Assignment
- Service Manager selects technician manually via TechnicianAssignment model
- Already implemented

### V1.5 (Phase 6) — Rule-Based Assignment
- System suggests top-3 candidates based on rules
- Manager picks one
- DispatchService.findCandidates() + scoreTechnician()

### V2 (Phase 6+) — Smart Assignment
- System auto-assigns best candidate
- Configurable per tenant (auto-assign toggle)
- DispatchService.autoAssign()

### Scoring Algorithm

```text
Score = (w1 × SLA_Urgency) + (w2 × Skill_Match) + (w3 × Distance_Score) + (w4 × Workload_Score) + (w5 × Rating_Score)

Default Weights:
  w1 = 0.30 (SLA urgency — highest priority)
  w2 = 0.25 (Skill match — must be able to do the job)
  w3 = 0.20 (Distance — closer is better)
  w4 = 0.15 (Workload — less loaded is better)
  w5 = 0.10 (Rating — higher rated preferred)

Inputs:
  SLA_Urgency: 1.0 (critical), 0.8 (urgent), 0.6 (high), 0.4 (normal), 0.2 (low)
  Skill_Match: 1.0 (expert), 0.8 (senior), 0.6 (intermediate), 0.4 (junior)
  Distance_Score: 1.0 (< 5km), 0.8 (< 15km), 0.6 (< 30km), 0.4 (< 50km), 0.2 (> 50km)
  Workload_Score: 1.0 (0 jobs), 0.8 (1 job), 0.6 (2 jobs), 0.4 (3 jobs), 0.2 (4+ jobs)
  Rating_Score: customerRating / 5.0
```

### SLA Engine

```text
1. SLA Policy Definition (existing: SLAPolicy model)
   - responseTimeMinutes
   - resolutionTimeHours
   - priority
   - entityType

2. Deadline Calculation (NEW — T-6-07)
   - On ServiceRequest creation:
     - Find matching SLAPolicy (by entityType + priority)
     - Calculate responseDeadline = now + responseTimeMinutes
     - Calculate resolutionDeadline = now + resolutionTimeHours
     - Create SLATracker

3. Breach Detection (NEW — T-6-08)
   - Cron job (every 5 min):
     - Find SLATrackers where deadline < now + 1 hour AND not responded/resolved
     - Mark as "breach_imminent"
     - Send alert
     - Find SLATrackers where deadline < now AND not responded/resolved
     - Mark as "breached"
     - Trigger escalation

4. Escalation (NEW — T-6-09)
   - EscalationRule: if breach → notify [role/person] + escalate to [level]
   - EscalationLog: record all escalations
```

---

## 15. PHASE 7 — REPORTING + BI

### Report Categories

| Category | Reports | Data Source | Refresh |
|----------|---------|-------------|---------|
| Sales | 8 | SalesProjection (NEW) | Hourly |
| Service | 10 | ServiceProjection (NEW) | Hourly |
| Warranty | 3 | OLTP (WarrantyCard) | Real-time |
| Inventory | 4 | OLTP (StockItem) | Real-time |
| Financial | 8 (6 existing + 2 new) | OLTP (JournalEntry) | Real-time |
| Technician | 5 | ServiceProjection + TechnicianPerformance | Hourly |
| Customer | 4 | CustomerProjection (NEW) | Daily |
| Executive | 1 (Dashboard) | All projections | Real-time |

### Technology Choice

| Volume | Technology | When |
|--------|-----------|------|
| < 1M rows | PostgreSQL direct query | V1 (Phase 7) |
| 1M - 10M rows | PostgreSQL Materialized Views | V1 (Phase 7) |
| 10M - 100M rows | Separate Reporting PostgreSQL | V2 (if needed) |
| > 100M rows | ClickHouse / Data Warehouse | V3 (if needed) |

**V1 Decision:** PostgreSQL Materialized Views + Projection models (event-updated)

---

## 16. PHASE 8 — CRM + CUSTOMER 360

### CRM Evolution

```text
Current (Phase 1):
  Lead → (manual) → Customer

Target (Phase 8):
  Lead → Opportunity → Quote → Order → Customer
    ↓         ↓          ↓        ↓
  FollowUp  Stage    Convert   Pipeline
    ↓
  Campaign → Segment → Customer 360 → Recommendation
```

### Customer 360 Projection

```text
Events (sales_order.created, payment.received, etc.)
  ↓
Customer360Projector (event handler)
  ↓
Update Customer360View:
  - totalPurchases
  - totalSpent
  - lastPurchaseDate
  - productsOwned (count)
  - activeWarranties (count)
  - serviceHistory (count + last 5)
  - openComplaints (count)
  - satisfactionScore (avg)
  - loyaltyPoints
  - loyaltyTier
  - clv (calculated daily)
  - segment (RFM, calculated daily)
  - recommendedProducts (rule-based)
  ↓
API: GET /customers/[id]/360 (fast, no joins)
```

---

## 17. PHASE 9 — AUTOMATION

### What to Build

| Feature | Based On | New Work |
|---------|----------|----------|
| ScheduledJob | node-cron | ScheduledJob + JobExecutionLog model, SchedulerService |
| Trigger-Based | Existing Rule Engine | AutomationTrigger + AutomationRule model, TriggerService |
| Warranty Expiry | Existing Notification | Cron: find warranties expiring in 30 days → notify |
| Follow-up Reminder | Existing Notification | Cron: find due follow-ups → notify representative |
| Customer Retention | Existing Notification | Trigger: customer inactive 90 days → notify sales |
| SLA Automation | From Phase 6 | Already automated |
| Bulk Operations | Existing CRUD | Bulk endpoints (status change, assign, notify) |

### What NOT to Build (Anti-Overengineering)

- ❌ Heavy BPMN Workflow Engine (existing WorkflowDefinition JSON is enough)
- ❌ Separate Queue System (Redis + existing worker is enough)
- ❌ Complex Rule DSL (existing conditionDsl is enough)

---

## 18. PHASE 10 — ADVANCED ENTERPRISE / AI (V2)

| Feature | Business Value | Data Requirement | Complexity | V1/V2 |
|---------|---------------|-----------------|------------|-------|
| AI Service Diagnosis | Speed up service | 10K+ historical diagnoses | High | V2 |
| Technician Recommendation | Optimal dispatch | Technician performance + job history | Medium | V2 |
| Demand Forecasting | Inventory opt | 12+ months sales data | High | V2 |
| Sales Forecasting | Revenue planning | 12+ months sales data | Medium | V2 |
| Customer Churn Prediction | Retention | Customer activity + purchase history | Medium | V2 |
| Product Recommendation | Cross-sell | Purchase history + product catalog | Low | V2 (rule-based in V1) |
| Predictive Maintenance | Proactive service | Warranty + service history | High | V2 |
| Advanced BI (Metabase) | Self-service analytics | All data | Low (deploy) | V2 |

**V1 Decision:** Rule-based recommendations only. AI deferred to V2.

---

## 19. FILE-BY-FILE EXECUTION MAP (P0 + P1 Tasks)

### Phase 2

| Task | Existing Location | New/Modified Location | Change |
|------|------------------|----------------------|--------|
| T-2-01 | `prisma/schema.prisma` (sqlite), `prisma/schema.postgres.prisma` (existing), `scripts/migrate-to-postgres.sh` (existing) | `.env` (modify DATABASE_URL) | Switch provider |
| T-2-02 | `src/lib/rate-limiter.ts` (existing) | `src/lib/rate-limiter.ts` (modify: Redis backend), `src/lib/redis.ts` (NEW) | Redis integration |
| T-2-03 | `src/app/api/v1/files/route.ts` (existing) | `src/app/api/v1/files/route.ts` (modify), `src/lib/storage/minio.ts` (NEW) | MinIO integration |
| T-2-04 | None | `scripts/backup.sh` (NEW), `docker-compose.production.yml` (modify: add backup service) | Backup |
| T-2-05 | None | `scripts/pitr-restore.sh` (NEW), PostgreSQL config | PITR |
| T-2-06 | None | `scripts/restore-test.sh` (NEW), `.github/workflows/restore-test.yml` (NEW) | Restore test |
| T-2-07 | None | `docs/dr-plan.md` (NEW), `scripts/failover.sh` (NEW) | DR |
| T-2-08 | console.log scattered | `src/lib/logger.ts` (NEW), replace console.log | Structured logging |
| T-2-09 | None | `src/lib/otel.ts` (NEW), `src/middleware.ts` (modify: instrumentation) | Tracing |
| T-2-10 | None | `/api/metrics` route (NEW), `src/lib/metrics.ts` (NEW) | Metrics |
| T-2-11 | None | `infra/grafana/` (NEW) | Dashboards |
| T-2-12 | None | `docker-compose.production.yml` (modify: add Loki) | Log aggregation |
| T-2-13 | None | `src/lib/sentry.ts` (NEW), `sentry.client.config.ts` (NEW) | Error tracking |
| T-2-14 | None | `infra/alertmanager/` (NEW) | Alerting |
| T-2-15 | `.github/workflows/ci-cd.yml` (existing) | `.github/workflows/ci-cd.yml` (modify: complete pipeline) | CI/CD |
| T-2-16 | `.env` (existing) | `src/lib/secrets.ts` (NEW), Vault config | Secrets |
| T-2-17 | `src/lib/auth/auth-service.ts` (existing) | `src/lib/auth/mfa.ts` (NEW), `src/app/api/v1/auth/mfa/*/route.ts` (NEW), `prisma/schema.prisma` (modify: User) | MFA |
| T-2-18 | `src/lib/api-helpers.ts` (existing) | `src/lib/pii-encryption.ts` (NEW), `prisma/schema.prisma` (modify: Party, User) | PII |
| T-2-19 | `src/app/api/v1/files/route.ts` (existing) | `src/lib/clamav.ts` (NEW) | Virus scan |
| T-2-20 | `src/app/api/v1/files/route.ts` (existing) | `src/app/api/v1/files/[id]/url/route.ts` (NEW) | Signed URL |

### Phase 4 (Key Files)

| Task | Existing Location | New/Modified Location | Change |
|------|------------------|----------------------|--------|
| T-4-01 | None | `prisma/schema.prisma` (modify: add Device), `src/app/api/v1/mobile/register-device/route.ts` (NEW) | Device |
| T-4-02 | None | `prisma/schema.prisma` (modify: add OfflineSyncQueue, SyncConflict), `src/app/api/v1/mobile/sync/route.ts` (NEW), `src/lib/mobile/sync-service.ts` (NEW) | Sync |
| T-4-11 | `src/lib/modules/notification/` (existing) | `src/lib/notification/push-provider.ts` (NEW or extend existing) | Push |
| T-4-12 to T-4-18 | None | `mobile/` (NEW Flutter project) | Flutter app |

---

## 20. DATABASE CHANGE MAP

### Phase 2

| Existing Models | New Models | Modified Models | Indexes | Migration |
|----------------|-----------|----------------|---------|-----------|
| 116 | SecurityEvent, RefreshToken (if separate) | User (mfaEnabled, mfaSecret, piiEncryptionKeyId), Party (piiDataEncrypted), FileAttachment (signedUrlExpiresAt, retentionExpiresAt), AuditLog (piiAccessed) | None | Add columns |

### Phase 4

| Existing Models | New Models | Modified Models | Indexes | Migration |
|----------------|-----------|----------------|---------|-----------|
| 116+P2 | Device, OfflineSyncQueue, SyncConflict, MobileJobSnapshot, TechnicianLocation | None | Device: [tenantId, userId], OfflineSyncQueue: [tenantId, deviceId, status] | Add tables |

### Phase 6

| Existing Models | New Models | Modified Models | Indexes | Migration |
|----------------|-----------|----------------|---------|-----------|
| 116+P2+P4 | TechnicianScore, EscalationRule, EscalationLog | SLATracker (auto-calc fields) | EscalationLog: [tenantId, slaTrackerId] | Add tables |

### Phase 7

| Existing Models | New Models | Modified Models | Indexes | Migration |
|----------------|-----------|----------------|---------|-----------|
| 116+P2+P4+P6 | SalesProjection, ServiceProjection, InventoryProjection, CustomerProjection, ReportSchedule, ReportExecution | None | Projections: [tenantId, date] | Add tables + MV |

### Phase 8

| Existing Models | New Models | Modified Models | Indexes | Migration |
|----------------|-----------|----------------|---------|-----------|
| 116+...+P7 | Opportunity, Campaign, CampaignTarget, Task, FollowUp, CustomerSegment, CustomerJourneyEvent | Customer360View (enrich) | Opportunity: [tenantId, stage], Campaign: [tenantId, status] | Add tables |

### Phase 9

| Existing Models | New Models | Modified Models | Indexes | Migration |
|----------------|-----------|----------------|---------|-----------|
| 116+...+P8 | ScheduledJob, JobExecutionLog, AutomationTrigger, AutomationRule | None | ScheduledJob: [tenantId, nextRunAt] | Add tables |

### Reuse Check (Before Creating New Model)

| Planned New Model | Check Existing | Reuse? |
|-------------------|---------------|--------|
| Device | None similar | NEW |
| OfflineSyncQueue | None similar | NEW |
| Opportunity | Lead (existing) — different stage | NEW (but extend Lead if possible) |
| Task | None similar | NEW |
| CustomerSegment | None similar | NEW |
| SalesProjection | None similar | NEW |
| TechnicianScore | TechnicianPerformance (existing) — different purpose | NEW |
| ScheduledJob | WorkflowDefinition (existing) — different (cron vs state machine) | NEW |

---

## 21. API EXECUTION MAP

### Phase 2 New APIs

| Endpoint | Method | Permission | Validation | Idempotency | Audit | Rate Limit |
|----------|--------|-----------|------------|-------------|-------|------------|
| /api/metrics | GET | public (IP whitelist) | None | None | None | None |
| /auth/mfa/setup | POST | auth (self) | None | Yes | Yes | 5/min |
| /auth/mfa/verify | POST | auth (self) | TOTP code | Yes | Yes | 5/min |
| /auth/mfa/disable | POST | auth (self) | Password | Yes | Yes | 5/min |
| /files/[id]/url | GET | file owner | None | None | Yes | 60/min |

### Phase 4 New APIs (15+)

| Endpoint | Method | Permission | Validation | Idempotency | Audit | Rate Limit |
|----------|--------|-----------|------------|-------------|-------|------------|
| /mobile/register-device | POST | technician | Device info | Yes | Yes | 5/min |
| /mobile/sync | POST | technician | Batch | Yes | Yes | 60/min |
| /mobile/assignments | GET | technician | None | None | Yes | 60/min |
| /mobile/jobs/[id] | GET | technician (own jobs) | None | None | Yes | 60/min |
| /mobile/jobs/[id]/accept | POST | technician | None | Yes | Yes | 5/min |
| /mobile/jobs/[id]/check-in | POST | technician | GPS coords | Yes | Yes | 5/min |
| /mobile/jobs/[id]/check-out | POST | technician | GPS coords | Yes | Yes | 5/min |
| /mobile/jobs/[id]/diagnosis | POST | technician | Diagnosis form | Yes | Yes | 10/min |
| /mobile/jobs/[id]/parts | POST | technician | Parts array | Yes | Yes | 10/min |
| /mobile/jobs/[id]/labor | POST | technician | Labor array | Yes | Yes | 10/min |
| /mobile/jobs/[id]/photos | POST | technician | Photo files | Yes | Yes | 30/min |
| /mobile/jobs/[id]/signature | POST | technician | Signature data | Yes | Yes | 5/min |
| /mobile/jobs/[id]/complete | POST | technician | Completion form | Yes | Yes | 5/min |
| /mobile/jobs/[id]/reject | POST | technician | Reason | Yes | Yes | 5/min |
| /mobile/location/update | POST | technician | GPS coords | Yes | Yes | 60/min |

### Phase 6 New APIs (7)

| Endpoint | Method | Permission |
|----------|--------|-----------|
| /dispatch/assign | POST | service.create |
| /dispatch/auto-assign | POST | service.create |
| /dispatch/reassign | POST | service.create |
| /dispatch/candidates/[requestId] | GET | service.read |
| /dispatch/score/[technicianId]/[requestId] | GET | service.read |
| /dispatch/bulk-assign | POST | service.create |
| /dispatch/workload | GET | service.read |

### Phase 7-9 New APIs (40+)

(See Section 5 Master Execution Backlog for full list)

---

## 22. EVENT EXECUTION MAP

### Existing Events (46)

(Verified from `src/lib/event-catalog.ts`)

### New Events by Phase

| Phase | Event | Producer | Consumer | Payload | Version | Idempotency | Retry | DLQ |
|-------|-------|----------|----------|---------|---------|-------------|-------|-----|
| 2 | mfa.enabled | AuthService | AuditLog | {userId, method} | 1.0 | Yes (ProcessedMessage) | Yes | Yes |
| 2 | pii.accessed | Any service | AuditLog | {userId, field, entityType, entityId} | 1.0 | Yes | Yes | Yes |
| 2 | file.scan_completed | FileService | NotificationService | {fileId, status} | 1.0 | Yes | Yes | Yes |
| 4 | technician.assigned | DispatchService | NotificationService, Mobile | {technicianId, jobId} | 1.0 | Yes | Yes | Yes |
| 4 | technician.checked_in | MobileJobService | AuditLog, SLA | {jobId, technicianId, gps} | 1.0 | Yes | Yes | Yes |
| 4 | technician.checked_out | MobileJobService | AuditLog | {jobId, technicianId, gps} | 1.0 | Yes | Yes | Yes |
| 4 | technician.location_updated | MobileLocationService | (real-time, not persisted) | {technicianId, gps} | 1.0 | No (transient) | No | No |
| 4 | mobile.sync_completed | MobileSyncService | AuditLog | {deviceId, operations} | 1.0 | Yes | Yes | Yes |
| 4 | mobile.conflict_detected | MobileSyncService | NotificationService | {deviceId, operationId, conflict} | 1.0 | Yes | Yes | Yes |
| 6 | dispatch.assigned | DispatchService | NotificationService, Mobile | {requestId, technicianId} | 1.0 | Yes | Yes | Yes |
| 6 | dispatch.reassigned | DispatchService | AuditLog, Notification | {requestId, oldTech, newTech} | 1.0 | Yes | Yes | Yes |
| 6 | sla.deadline_calculated | SLAService | AuditLog | {trackerId, deadlines} | 1.0 | Yes | Yes | Yes |
| 6 | sla.breach_imminent | SLAService | NotificationService, Alert | {trackerId, deadline} | 1.0 | Yes | Yes | Yes |
| 6 | sla.breached | SLAService | NotificationService, Escalation | {trackerId, breachType} | 1.0 | Yes | Yes | Yes |
| 6 | escalation.triggered | EscalationService | NotificationService | {trackerId, level, target} | 1.0 | Yes | Yes | Yes |
| 7 | projection.updated | Projector | None (informational) | {projectionType, entityId} | 1.0 | No | No | No |
| 7 | report.generated | ReportService | NotificationService | {reportId, format} | 1.0 | Yes | Yes | Yes |
| 7 | report.scheduled | ScheduledReportService | AuditLog | {scheduleId, nextRun} | 1.0 | Yes | Yes | Yes |
| 8 | opportunity.created | OpportunityService | AuditLog, Notification | {opportunityId, stage} | 1.0 | Yes | Yes | Yes |
| 8 | opportunity.stage_changed | OpportunityService | AuditLog | {opportunityId, fromStage, toStage} | 1.0 | Yes | Yes | Yes |
| 8 | campaign.launched | CampaignService | NotificationService | {campaignId, targetCount} | 1.0 | Yes | Yes | Yes |
| 8 | task.assigned | TaskService | NotificationService | {taskId, assigneeId} | 1.0 | Yes | Yes | Yes |
| 8 | follow_up.scheduled | FollowUpService | Scheduler | {followUpId, dueAt} | 1.0 | Yes | Yes | Yes |
| 8 | customer.segmented | SegmentationService | AuditLog | {customerId, segment} | 1.0 | Yes | Yes | Yes |
| 8 | customer.journey_event | Various | CustomerJourneyProjector | {customerId, eventType, data} | 1.0 | Yes | Yes | Yes |
| 9 | automation.triggered | TriggerService | AuditLog | {triggerId, ruleId} | 1.0 | Yes | Yes | Yes |
| 9 | automation.action_executed | TriggerService | AuditLog | {actionType, result} | 1.0 | Yes | Yes | Yes |
| 9 | scheduled_job.started | SchedulerService | AuditLog | {jobId, executionId} | 1.0 | Yes | Yes | Yes |
| 9 | scheduled_job.completed | SchedulerService | AuditLog | {jobId, executionId, duration} | 1.0 | Yes | Yes | Yes |
| 9 | scheduled_job.failed | SchedulerService | Alert, Notification | {jobId, executionId, error} | 1.0 | Yes | Yes | Yes |

---

## 23. TEST EXECUTION PLAN

### Test Pyramid Target

| Test Type | Current | Target | Gap |
|-----------|---------|--------|-----|
| Unit | 122 cases (5 files) | 500+ | 378 |
| Integration | 0 | 100+ | 100 |
| API Contract | 0 | 50+ | 50 |
| E2E | 0 | 30+ | 30 |
| Security | 0 | 20+ | 20 |
| Concurrency | 0 | 10+ | 10 |
| Load | 0 | 10+ | 10 |
| Mobile Offline | 0 | 20+ | 20 |
| Sync Conflict | 0 | 15+ | 15 |
| Financial Integrity | 0 | 25+ | 25 |
| Inventory Integrity | 0 | 15+ | 15 |
| Event Reliability | 0 | 10+ | 10 |
| Migration | 0 | 5+ | 5 |
| Backup Restore | 0 | 5+ | 5 |
| DR | 0 | 3+ | 3 |

### Critical Business Invariants (Must Test)

```text
Financial:
- Debit = Credit (every JournalEntry)
- AR balance = Sum of unpaid invoices
- AP balance = Sum of unpaid bills
- Cash balance = Sum of cash receipts - cash payments
- Cancelled Order reverses inventory + invoice + payment

Inventory:
- Stock cannot become negative
- Stock reserved + available = total
- InventoryTransaction sum = StockBalance
- Duplicate inventory transaction cannot double-apply (idempotency)

Sales:
- Duplicate Order cannot happen (IdempotencyKey)
- Price/discount/payment/inventory remain consistent
- Cancelled Order reversed inventory

Service:
- Completed Job must have ServiceReport
- Completed Job must have signature
- Warranty job cannot charge customer
- Unauthorized state transition must fail

Warranty:
- Warranty not active before Installation
- Warranty Claim requires active Warranty
- Warranty Transfer updates customerPartyId

Security:
- Customer cannot access another customer's data
- Technician cannot access another technician's private data
- Representative cannot cross scope
- Unauthorized state transition must fail
- Revoked session cannot access API
- Tenant A cannot see Tenant B data
```

### Test by Phase

| Phase | Unit | Integration | E2E | Security | Performance |
|-------|------|-------------|-----|----------|-------------|
| 2 | 50+ | 20+ | 5+ | 10+ | 5+ (load) |
| 3 | 30+ | 15+ | 5+ | 5+ | 3+ |
| 4 | 50+ | 20+ | 10+ | 10+ | 5+ (mobile) |
| 5 | 30+ | 10+ | 5+ | 5+ | 2+ |
| 6 | 20+ | 10+ | 3+ | 2+ | 2+ |
| 7 | 30+ | 10+ | 3+ | 2+ | 3+ |
| 8 | 30+ | 10+ | 3+ | 2+ | 2+ |
| 9 | 20+ | 10+ | 2+ | 2+ | 2+ |

---

## 24. ACCEPTANCE TEST MATRIX (100+ Tests)

### Authentication (10)

| AT-ID | Given | When | Then | Priority | Phase |
|-------|-------|------|------|----------|-------|
| AT-001 | Valid credentials | POST /auth/login | 200 + accessToken + refreshToken | P0 | 1 |
| AT-002 | Invalid password | POST /auth/login | 401 + failedLoginAttempts++ | P0 | 1 |
| AT-003 | 5 failed attempts | 6th login attempt | 429 + lockedUntil set | P0 | 1 |
| AT-004 | Valid token | GET /auth/me | 200 + user profile | P0 | 1 |
| AT-005 | Logged out token | GET /auth/me | 401 SESSION_REVOKED | P0 | 1 |
| AT-006 | Expired token | GET /auth/me | 401 TOKEN_INVALID | P0 | 1 |
| AT-007 | Admin without MFA | POST /auth/login | 200 + must setup MFA | P2 | 2 |
| AT-008 | Admin with MFA | POST /auth/login + TOTP | 200 + accessToken | P2 | 2 |
| AT-009 | Wrong TOTP | POST /auth/mfa/verify | 401 + attempts++ | P2 | 2 |
| AT-010 | Refresh token | POST /auth/refresh | 200 + new tokens + old refresh invalid | P0 | 1 |

### Authorization (10)

| AT-ID | Given | When | Then | Priority | Phase |
|-------|-------|------|------|----------|-------|
| AT-011 | Customer role | GET /sales-orders | 403 FORBIDDEN | P0 | 1 |
| AT-012 | Super admin | GET /sales-orders | 200 (bypass RBAC) | P0 | 1 |
| AT-013 | Customer A | GET /customer/invoices | 200 (own invoices only) | P0 | 1 |
| AT-014 | Customer A | GET /customer/invoices (trying B's) | 403 or empty list | P0 | 1 |
| AT-015 | Technician | GET /mobile/assignments | 200 (own jobs only) | P1 | 4 |
| AT-016 | Representative A | GET /representative/customers | 200 (own customers only) | P2 | 5 |
| AT-017 | No token | GET /sales-orders | 401 UNAUTHORIZED | P0 | 1 |
| AT-018 | Tenant A user | GET /sales-orders (Tenant B) | Empty list (tenant scoped) | P0 | 1 |
| AT-019 | Finance role | POST /journal-entries | 201 | P0 | 1 |
| AT-020 | Service role | POST /journal-entries | 403 FORBIDDEN | P0 | 1 |

### Sales (15)

| AT-ID | Given | When | Then | Priority | Phase |
|-------|-------|------|------|----------|-------|
| AT-021 | Valid customer + lines | POST /sales-orders | 201 + orderNumber generated | P0 | 1 |
| AT-022 | Same IdempotencyKey | POST /sales-orders twice | Same order returned | P0 | 1 |
| AT-023 | Draft order | POST /sales-orders/[id]/approve | 200 + status=approved + inventory reserved | P1 | 3 |
| AT-024 | Approved order | POST /sales-orders/[id]/cancel | 200 + inventory released + JE reversal | P1 | 3 |
| AT-025 | Order with 0 lines | POST /sales-orders | 422 VALIDATION_FAILED | P0 | 1 |
| AT-026 | Non-existent customer | POST /sales-orders | 404 NOT_FOUND | P0 | 1 |
| AT-027 | Order approved | GET /sales-orders/[id] | 200 + includes reserved stock | P1 | 3 |
| AT-028 | 2 concurrent orders for last item | POST /sales-orders (parallel) | 1 succeeds, 1 fails (optimistic lock) | P0 | 1 |
| AT-029 | Order shipped | GET /sales-orders/[id] | 200 + status=shipped | P1 | 3 |
| AT-030 | Order delivered | POST /installations | 201 + installation triggers warranty | P1 | 3 |

(15 more Sales ATs in full version)

### Inventory (10)

| AT-ID | Given | When | Then | Priority | Phase |
|-------|-------|------|------|----------|-------|
| AT-036 | Stock 5 units | Reserve 10 units | 409 INSUFFICIENT_STOCK | P0 | 1 |
| AT-037 | Stock 10 units | Reserve 5 + Reserve 5 | Both succeed | P0 | 1 |
| AT-038 | Stock 10 units | Reserve 5 + Reserve 6 (parallel) | 1 succeeds, 1 fails | P0 | 1 |
| AT-039 | Reserved stock | Release reservation | Stock available again | P0 | 1 |
| AT-040 | Stock transfer | POST /stock-transfers | 201 + source decreases + dest increases | P1 | 3 |

(5 more Inventory ATs)

### Payment (10)

| AT-ID | Given | When | Then | Priority | Phase |
|-------|-------|------|------|----------|-------|
| AT-041 | Invoice 1000 IRR | POST /payments (1000) | 201 + invoice marked paid | P0 | 1 |
| AT-042 | Same IdempotencyKey | POST /payments twice | Same payment returned | P0 | 1 |
| AT-043 | Payment 1000 to invoice 500 | POST /payments + allocate | 400 + remaining 500 unallocated | P1 | 3 |
| AT-044 | Overpayment | POST /payments (1500 for 1000 invoice) | 201 + 500 credit | P2 | 3 |
| AT-045 | Duplicate payment | POST /payments twice (no idempotency) | Second rejected (invoice already paid) | P0 | 1 |

(5 more Payment ATs)

### Accounting (10)

| AT-ID | Given | When | Then | Priority | Phase |
|-------|-------|------|------|----------|-------|
| AT-046 | JE with debit ≠ credit | POST /journal-entries | 422 UNBALANCED_ENTRY | P0 | 1 |
| AT-047 | Posted JE | POST /journal-entries/[id]/reverse | 200 + reversal JE created | P1 | 3 |
| AT-048 | Closed period | POST /journal-entries (date in closed period) | 409 PERIOD_CLOSED | P0 | 1 |
| AT-049 | Invoice issued | GET /trial-balance | AR account increased | P1 | 3 |
| AT-050 | Payment received | GET /trial-balance | Cash account increased + AR decreased | P1 | 3 |

(5 more Accounting ATs)

### Warranty (10)

| AT-ID | Given | When | Then | Priority | Phase |
|-------|-------|------|------|----------|-------|
| AT-051 | Installed product | POST /warranty-cards/[id]/activate | 200 + status=active + startDate set | P0 | 1 |
| AT-052 | Active warranty | POST /warranty-claims | 201 + claim created | P0 | 1 |
| AT-053 | Expired warranty | POST /warranty-claims | 409 WARRANTY_EXPIRED | P0 | 1 |
| AT-054 | Warranty transfer | POST /warranty-transfers | 200 + customerPartyId updated | P1 | 3 |

(6 more Warranty ATs)

### Service (10)

| AT-ID | Given | When | Then | Priority | Phase |
|-------|-------|------|------|----------|-------|
| AT-056 | Active warranty | POST /service-requests | 201 + warranty validated | P0 | 1 |
| AT-057 | Service request | POST /service-requests/[id]/create-order | 201 + ServiceOrder created | P0 | 1 |
| AT-058 | Service order | POST /service-orders/[id]/diagnose | 200 + diagnosis recorded | P0 | 1 |
| AT-059 | Diagnosed order | POST /service-orders/[id]/qc | 200 + QC recorded | P1 | 3 |
| AT-060 | QC passed | POST /service-orders/[id]/ready | 200 + status=ready | P1 | 3 |

(5 more Service ATs)

### Mobile + Offline (15)

| AT-ID | Given | When | Then | Priority | Phase |
|-------|-------|------|------|----------|-------|
| AT-061 | Technician login | POST /mobile/register-device | 201 + deviceId | P1 | 4 |
| AT-062 | Online | GET /mobile/assignments | 200 + job list | P1 | 4 |
| AT-063 | Job assigned | POST /mobile/jobs/[id]/accept | 200 + status=accepted | P1 | 4 |
| AT-064 | At customer site | POST /mobile/jobs/[id]/check-in | 200 + GPS recorded | P1 | 4 |
| AT-065 | Offline | Complete diagnosis | Stored in local queue | P1 | 4 |
| AT-066 | Back online | Sync queue processes | Diagnosis uploaded successfully | P1 | 4 |
| AT-067 | Conflict (job cancelled server-side) | Sync | Conflict detected + added to conflict queue | P1 | 4 |
| AT-068 | Photo capture | Upload (offline) | Stored locally + uploaded on sync | P1 | 4 |
| AT-069 | Signature capture | Upload | Stored + uploaded | P1 | 4 |
| AT-070 | Job complete | POST /mobile/jobs/[id]/complete | 200 + status=completed | P1 | 4 |

(5 more Mobile ATs)

### Dispatch + SLA (10)

| AT-ID | Given | When | Then | Priority | Phase |
|-------|-------|------|------|----------|-------|
| AT-071 | Service request (urgent) | POST /dispatch/auto-assign | 200 + best technician assigned | P1 | 6 |
| AT-072 | No available technician | POST /dispatch/auto-assign | 409 + escalated to manager | P1 | 6 |
| AT-073 | Assigned technician | POST /dispatch/reassign | 200 + audit logged | P2 | 6 |
| AT-074 | SLA policy (1h response) | Create service request (urgent) | SLATracker auto-created + deadline=now+1h | P2 | 6 |
| AT-075 | Deadline approaching | Cron check | breach_imminent alert sent | P2 | 6 |
| AT-076 | Deadline passed | Cron check | breached + escalation triggered | P2 | 6 |

(4 more Dispatch ATs)

### CRM + Customer 360 (10)

| AT-ID | Given | When | Then | Priority | Phase |
|-------|-------|------|------|----------|-------|
| AT-077 | Lead | POST /opportunities (convert) | 201 + opportunity created | P2 | 8 |
| AT-078 | Opportunity | POST /opportunities/[id]/stage | 200 + stage changed | P2 | 8 |
| AT-079 | Campaign | POST /campaigns/[id]/launch | 200 + targets notified | P2 | 8 |
| AT-080 | Customer with purchases | GET /customers/[id]/360 | 200 + full 360 view | P2 | 8 |
| AT-081 | Customer with 5 purchases | Daily CLV cron | CLV calculated + stored | P2 | 8 |

(5 more CRM ATs)

### Reporting (5)

| AT-ID | Given | When | Then | Priority | Phase |
|-------|-------|------|------|----------|-------|
| AT-082 | Sales data | GET /reports/sales/monthly | 200 + monthly breakdown | P2 | 7 |
| AT-083 | Service data | GET /reports/service/sla-breach | 200 + breach list | P2 | 7 |
| AT-084 | Executive dashboard | GET /reports/executive/dashboard | 200 + all KPIs | P2 | 7 |
| AT-085 | Report | POST /reports/export (PDF) | 200 + PDF file | P2 | 7 |

(1 more Reporting AT)

### Security (10)

| AT-ID | Given | When | Then | Priority | Phase |
|-------|-------|------|------|----------|-------|
| AT-086 | PII field (Party.taxId) | DB query | Encrypted at rest | P2 | 2 |
| AT-087 | File upload | POST /files (EICAR test) | Rejected (virus detected) | P2 | 2 |
| AT-088 | Signed URL (expired) | GET /files/[id]/url | 410 GONE | P2 | 2 |
| AT-089 | SQL injection attempt | POST /sales-orders (malicious) | Sanitized (no injection) | P0 | 1 |
| AT-090 | XSS attempt | POST (script tag) | Sanitized | P0 | 1 |

(5 more Security ATs)

### Backup/Recovery (5)

| AT-ID | Given | When | Then | Priority | Phase |
|-------|-------|------|------|----------|-------|
| AT-091 | Backup system | Daily backup cron | Backup file created + uploaded to MinIO | P0 | 2 |
| AT-092 | Backup file | Restore to test DB | All tables restored + row counts match | P0 | 2 |
| AT-093 | PITR | Restore to timestamp T | Data at timestamp T restored | P0 | 2 |
| AT-094 | Primary failure | Failover to standby | RTO ≤ 1 hour | P0 | 2 |
| AT-095 | RPO measurement | Check WAL archive lag | RPO ≤ 15 min | P0 | 2 |

### Observability (5)

| AT-ID | Given | When | Then | Priority | Phase |
|-------|-------|------|------|----------|-------|
| AT-096 | API request | Trace | Distributed trace visible in Jaeger | P1 | 2 |
| AT-097 | Error | Sentry | Error captured + stack trace | P1 | 2 |
| AT-098 | API 5xx > 1% | Alertmanager | Alert triggered | P1 | 2 |
| AT-099 | Worker down | Alertmanager | Alert triggered | P1 | 2 |
| AT-100 | Outbox backlog > 100 | Alertmanager | Alert triggered | P1 | 2 |

**Total: 100 Acceptance Tests**

---

## 25. PHASE EXIT GATES

### Phase 2 Exit Gate

```text
✓ T-2-01: PostgreSQL production test (100 concurrent writes → 0% timeout)
✓ T-2-04: Backup successful (daily + WAL archive)
✓ T-2-05: Restore successful (PITR to timestamp)
✓ T-2-06: RPO measured (≤ 15 min)
✓ T-2-07: RTO measured (≤ 1 hour)
✓ T-2-10: Monitoring active (Prometheus + Grafana)
✓ T-2-14: Critical alerts active (10 alerts)
✓ T-2-15: CI/CD successful (push → prod with rollback)
✓ T-2-17 to T-2-20: Security checks passed (MFA + PII + File Scan + Signed URL)
✓ Regression suite passed (53 tests)
✓ Phase 2 Acceptance Tests passed (AT-007 to AT-010, AT-086 to AT-100)
```

### Phase 3 Exit Gate

```text
✓ T-3-01: Sales Pipeline E2E (quote → warranty)
✓ T-3-02: Returns reverse inventory + invoice + payment
✓ T-3-03: Tax calculation multi-rate
✓ T-3-04: Commission tiered
✓ T-3-05: Bank reconciliation (95%+ match)
✓ T-3-07: Sepidar integration (JE export)
✓ Phase 3 Acceptance Tests passed
```

### Phase 4 Exit Gate

```text
✓ T-4-01: Device registration works
✓ T-4-02: Sync Queue processes offline operations
✓ T-4-05: GPS check-in/checkout works
✓ T-4-10: Job complete E2E
✓ T-4-11: Push notification delivered (Android + iOS)
✓ T-4-12 to T-4-14: Flutter app functional
✓ T-4-15: Offline mode works (no data loss)
✓ T-4-18: SQLite encrypted
✓ Phase 4 Acceptance Tests passed (AT-061 to AT-070)
```

### Phase 5 Exit Gate

```text
✓ Customer Portal live (all 10 features)
✓ Representative Portal live (all 10 features)
✓ Online payment works
✓ Customer 360 initial API
✓ Security scoping tested (customer A ≠ customer B)
✓ Phase 5 Acceptance Tests passed
```

### Phase 6 Exit Gate

```text
✓ T-6-03: Auto-assign works
✓ T-6-07: SLA deadline auto-calculated
✓ T-6-08: SLA breach detected (within 5 min)
✓ T-6-09: Escalation triggered
✓ Phase 6 Acceptance Tests passed (AT-071 to AT-076)
```

### Phase 7 Exit Gate

```text
✓ 26 reports functional (8 sales + 10 service + 8 financial)
✓ Executive Dashboard real-time
✓ Export PDF/Excel/CSV works
✓ Scheduled reports emailed
✓ Phase 7 Acceptance Tests passed (AT-082 to AT-085)
```

### Phase 8 Exit Gate

```text
✓ Full CRM pipeline (lead → opportunity → quote → order)
✓ Campaign management + metrics
✓ Task + FollowUp
✓ Segmentation + CLV + Recommendations
✓ Customer 360 full
✓ Phase 8 Acceptance Tests passed (AT-077 to AT-081)
```

### Phase 9 Exit Gate

```text
✓ Scheduler functional (cron jobs)
✓ Triggers + Rules functional
✓ Bulk operations
✓ Notification automation
```

---

## 26. DEFINITION OF DONE

A Feature is Done ONLY when ALL of the following are complete:

```text
□ Code
  □ Implementation matches spec
  □ No TODO/FIXME comments
  □ ESLint passes (0 errors)
  □ TypeScript strict passes

□ Validation
  □ Input validation (whitelist + types + ranges)
  □ Business validation (invariants enforced)
  □ Domain validation (state transitions)

□ Authorization
  □ RBAC permission check
  □ Tenant scope enforced
  □ Data scope enforced (customer/technician/representative)

□ Audit
  □ AuditLog entry on create/update/delete
  □ Changes captured (before/after)

□ Error Handling
  □ DomainException → proper status code
  □ ValidationException → 422 with field errors
  □ NotFoundException → 404
  □ ConflictException → 409
  □ Internal errors → 500 with correlation_id

□ Idempotency
  □ IdempotencyKey check on POST
  □ Same key → same response

□ Tests
  □ Unit test (service logic)
  □ Integration test (API + DB)
  □ E2E test (full flow)
  □ Acceptance test (AT-xxx passed)

□ Observability
  □ Structured logging
  □ Metrics (if applicable)
  □ Tracing (if applicable)

□ Documentation
  □ API documented (OpenAPI/Swagger or inline)
  □ ADR written (if architectural decision)
  □ Code comments for complex logic
```

### For Critical Features (additional):

```text
□ Concurrency
  □ Optimistic lock (version field)
  □ Race condition tested

□ Failure Recovery
  □ Transaction rollback tested
  □ Outbox event on failure
  □ Retry strategy defined

□ Security
  □ PII check (if handling PII)
  □ Rate limit (if sensitive endpoint)
  □ Input sanitization
```

---

## 27. RISK REGISTER

| ID | Risk | Probability | Impact | Severity | Mitigation | Owner | Phase | Trigger | Recovery |
|----|------|-------------|--------|----------|------------|-------|-------|---------|----------|
| R-01 | Database Failure (SQLite corruption) | High | Critical | P0 | Migrate to PostgreSQL (T-2-01) | DevOps | 2 | DB unresponsive | Restore from backup |
| R-02 | Data Loss (no backup) | High | Critical | P0 | Implement backup (T-2-04) | DevOps | 2 | Data missing | Restore from backup |
| R-03 | Concurrency (SQLite lock) | High | High | P0 | PostgreSQL migration | Backend | 2 | Write timeout | Retry on PostgreSQL |
| R-04 | Event Loss (Outbox failure) | Low | High | P1 | Outbox + DLQ (existing) | Backend | 0 | Outbox backlog | Replay from DLQ |
| R-05 | Worker Failure | Medium | High | P1 | Docker restart policy | DevOps | 2 | Worker down alert | Auto-restart + manual |
| R-06 | Offline Conflict (Mobile) | Medium | Medium | P1 | LWW + Conflict Queue | Mobile | 4 | Sync conflict | Manual resolution |
| R-07 | Security Breach | Low | Critical | P0 | MFA + PII + Audit | Security | 2 | Anomaly detected | Incident response |
| R-08 | PII Leak | Low | Critical | P0 | PII Encryption (T-2-18) | Security | 2 | PII in logs | Redact + audit |
| R-09 | File Abuse (malicious upload) | Medium | High | P2 | ClamAV + Signed URL | Security | 2 | Virus detected | Quarantine + alert |
| R-10 | Bad Migration (data loss) | Low | Critical | P0 | Dry run + backup first | DevOps | 2 | Migration error | Rollback to SQLite |
| R-11 | Backup Failure | Low | Critical | P0 | Monitor + alert | DevOps | 2 | Backup job failed | Manual backup + investigate |
| R-12 | Deployment Failure | Medium | High | P1 | Staging + health check + rollback | DevOps | 2 | Health check fail | Auto-rollback |
| R-13 | Payment Gateway Downtime | Low | Medium | P2 | Fallback + retry | Backend | 5 | Payment fail | Manual reconciliation |
| R-14 | Push Notification Not Delivered | Medium | Medium | P2 | FCM + APNs + in-app fallback | Mobile | 4 | Push fail | In-app notification |
| R-15 | Token Theft | Low | High | P1 | Session Revocation (existing) | Security | 1 | Suspicious activity | Revoke session |

---

## 28. REALISTIC TIMELINE

| Phase | Optimistic | Realistic | Conservative | Notes |
|-------|-----------|-----------|--------------|-------|
| Phase 2 | 3 weeks | 4 weeks | 6 weeks | Many infra components (PostgreSQL + Backup + Observability + CI/CD + Security) |
| Phase 3 | 3 weeks | 5 weeks | 7 weeks | Financial logic complexity (Tax + Commission + Reconciliation) |
| Phase 4 | 5 weeks | 7 weeks | 10 weeks | Flutter app from scratch + Offline sync complexity |
| Phase 5 | 3 weeks | 4 weeks | 6 weeks | 2 portals (Customer + Representative) + Payment gateway |
| Phase 6 | 2 weeks | 3 weeks | 5 weeks | Dispatch algorithm tuning + SLA cron |
| Phase 7 | 3 weeks | 4 weeks | 6 weeks | 26 reports + Projections + Export |
| Phase 8 | 3 weeks | 5 weeks | 7 weeks | Full CRM + Customer 360 Projection |
| Phase 9 | 2 weeks | 3 weeks | 4 weeks | Scheduler + Triggers (build on existing Workflow/Rule) |
| **Total (Phase 2-9)** | **24 weeks** | **35 weeks** | **51 weeks** | ~6-12 months realistic |

**Phase 10 (V2):** 6+ months (AI + Advanced Enterprise) — not included in V1 timeline

### Factors Considered

- Complexity (not just feature count)
- Dependencies (sequential vs parallel)
- Testing (unit + integration + E2E + security)
- Integration (3rd party: payment, push, Sepidar, FCM/APNs)
- Learning curve (Flutter if new to team)
- Bug fixing + stabilization (20% buffer included in realistic)

---

## 29. RESOURCE PLAN

| Role | Required For | Can be AI-Assisted? |
|------|-------------|---------------------|
| Backend Developer | Phase 2-9 (API + Domain + Services) | ✅ Yes (AI writes boilerplate, dev reviews) |
| Frontend Developer | Phase 5, 7, 8 (Portals + Dashboards) | ✅ Yes (AI writes components, dev reviews) |
| Mobile Developer (Flutter) | Phase 4 (Technician App) | ⚠️ Partially (AI helps, but Flutter expertise needed for offline/sync) |
| DevOps Engineer | Phase 2 (PostgreSQL + Redis + MinIO + Observability + CI/CD) | ⚠️ Partially (AI helps with config, but infra expertise needed) |
| QA Engineer | All Phases (Test writing + execution) | ✅ Yes (AI writes test cases, QA reviews) |
| Security Engineer | Phase 2 (MFA + PII + Audit + Pen test) | ⚠️ Partially (AI helps, but security review needed) |
| Database Architect | Phase 2, 8 (PostgreSQL tuning + Projections) | ✅ Yes (AI helps with schema/queries) |
| Product/Business Analyst | Phase 3, 5, 8 (Requirements clarification) | ❌ No (needs domain knowledge) |
| UI/UX Designer | Phase 4, 5 (Mobile + Portal design) | ❌ No (needs design expertise) |

### If 1 Powerful AI-Assisted Developer

**Can be reduced:**
- Backend boilerplate (AI generates routes, services, tests)
- Frontend components (AI generates UI from spec)
- Test cases (AI generates from acceptance criteria)
- Documentation (AI generates from code)
- Config files (Docker, CI/CD, Terraform)

**Cannot be reduced:**
- Flutter offline sync complexity (needs expertise)
- DevOps production setup (needs expertise)
- Security review (needs expertise)
- Business requirements (needs domain knowledge)
- UI/UX design (needs design expertise)

**Realistic for 1 AI-assisted dev:**
- Phase 2: 6-8 weeks (instead of 4)
- Phase 3: 6-8 weeks (instead of 5)
- Phase 4: 10-12 weeks (instead of 7 — Flutter learning curve)
- Phase 5-9: 4-5 weeks each (instead of 3-4)
- Total: ~40-50 weeks (instead of 35)

---

## 30. FINAL ROADMAP

| Phase | Goal | Priority | Duration (Realistic) | Dependencies | Exit Gate |
|-------|------|----------|---------------------|--------------|-----------|
| Phase 0 | Current State Freeze | ✅ Done | 1 week | — | ✅ Passed |
| Phase 1 | Core Stabilization | ✅ Done | 1 week | Phase 0 | ✅ Passed |
| **Phase 2** | **Production Foundation** | **P0** | **4 weeks** | Phase 1 | PostgreSQL + Backup + DR + Observability + CI/CD + MFA + PII |
| Phase 3 | Core Business Completion | P1 | 5 weeks | Phase 2 | Sales Pipeline + Returns + Tax + Commission + Reconciliation |
| **Phase 4** | **Technician Platform** | **P1** | **7 weeks** | Phase 2 | Flutter App + Offline + Sync + Push + GPS + Camera + Signature |
| Phase 5 | Customer + Representative | P2 | 4 weeks | Phase 3 | Portals + Online Payment + Customer 360 Initial |
| Phase 6 | Dispatch + SLA | P1 | 3 weeks | Phase 4 | Dispatch Engine + SLA Enforcement + Escalation |
| Phase 7 | Reporting + BI | P2 | 4 weeks | Phase 3 | 26 Reports + Executive Dashboard + Export + Schedule |
| Phase 8 | CRM + Customer 360 | P2 | 5 weeks | Phase 5, 7 | Full CRM + Customer 360 + Segmentation + CLV |
| Phase 9 | Automation | P3 | 3 weeks | Phase 7, 8 | Scheduler + Triggers + Bulk Ops |
| Phase 10 | AI + Advanced | P4 (V2) | 6+ months | All | AI + WhatsApp + Multi-Currency + i18n |

### Visual Roadmap

```text
CURRENT (55%) — Pilot Ready
    │
    ▼
PRODUCTION FOUNDATION (Phase 2, 4w) → 75% Production Ready
    │
    ├────────────────────┐
    ▼                    ▼
CORE BUSINESS (P3, 5w)   TECHNICIAN MOBILE (P4, 7w)
    │                    │
    └────────┬───────────┘
             ▼
CUSTOMER / REPRESENTATIVE (P5, 4w)
             │
             ▼
DISPATCH / SLA (P6, 3w)
             │
             ▼
REPORTING / BI (P7, 4w) → 90% Enterprise Ready
             │
             ▼
CRM / CUSTOMER 360 (P8, 5w)
             │
             ▼
AUTOMATION (P9, 3w) → 95% Scale Ready
             │
             ▼
AI / ADVANCED ENTERPRISE (P10, V2)
```

---

## 31. FINAL READINESS MODEL

### Three Separate Indicators (Do Not Mix)

#### 1. Capability Coverage

**Question:** چند درصد Capability هدف وجود دارد؟

| Capability Category | Coverage | Notes |
|---------------------|----------|-------|
| Core ERP (Sales, Service, Warranty, Inventory, Finance) | 85% | Backend complete، UI partial |
| Security Foundation | 80% | JWT + RBAC + Session، MFA/PII missing |
| Event System | 90% | Outbox/Inbox/Saga/46 events |
| Mobile | 0% | Nothing built |
| CRM | 15% | Lead only |
| Customer 360 | 0% | No projection |
| Reporting/BI | 25% | 6 financial reports |
| Dispatch | 20% | Data only، no algorithm |
| Automation | 40% | Workflow + Rule engine |
| Observability | 10% | Health check only |
| Production Infra | 20% | Docker + Caddy، no Redis/MinIO/Backup |
| AI | 0% | Nothing |
| **Weighted Capability Coverage** | **~55%** | |

#### 2. Production Readiness

**Question:** چند درصد Production Ready است؟

| Criterion | Score | Notes |
|-----------|-------|-------|
| Database (PostgreSQL) | 0% | SQLite (P0 blocker) |
| Backup + DR | 0% | None (P0 blocker) |
| Observability | 10% | Health check only |
| CI/CD | 30% | Náquît |
| Security (MFA/PII) | 50% | JWT+RBAC، no MFA/PII |
| Scalability | 40% | SQLite limit |
| Monitoring + Alerting | 10% | None |
| Disaster Recovery | 0% | None |
| **Production Readiness** | **~20%** | NOT production ready |

#### 3. Enterprise Readiness

**Question:** چند درصد Enterprise Ready است؟

| Criterion | Score | Notes |
|-----------|-------|-------|
| Architecture (DDD + Event-Driven) | 90% | Strong |
| Domain Completeness | 70% | Core complete، CRM/BI missing |
| Mobile Platform | 0% | Missing |
| Customer 360 | 0% | Missing |
| BI/Reporting | 25% | Minimal |
| CRM | 15% | Lead only |
| Dispatch | 20% | Data only |
| Automation | 40% | Workflow + Rules |
| Integration (Sepidar, Payment, Push) | 20% | Designed not built |
| **Enterprise Readiness** | **~35%** | |

### Summary

```text
Capability Coverage:    55%  (what we can do today)
Production Readiness:   20%  (can we deploy safely?)
Enterprise Readiness:   35%  (is it a complete enterprise system?)

These three numbers are DIFFERENT and must not be mixed.
```

### Projected Readiness by Phase

| Phase | Capability Coverage | Production Readiness | Enterprise Readiness |
|-------|--------------------:|---------------------:|---------------------:|
| Current | 55% | 20% | 35% |
| After Phase 2 | 60% | 85% | 40% |
| After Phase 3 | 70% | 85% | 50% |
| After Phase 4 | 80% | 85% | 65% |
| After Phase 5 | 85% | 85% | 75% |
| After Phase 6 | 87% | 85% | 78% |
| After Phase 7 | 92% | 85% | 88% |
| After Phase 8 | 96% | 85% | 93% |
| After Phase 9 | 98% | 85% | 95% |
| Final Target | 98% | 95% | 95% |

---

## 32. FINAL ANSWERS

### 1. آیا پروژه نیاز به Rewrite دارد؟

**خیر — قطعاً نه.** معماری فعلی (Modular Monolith + DDD + Event-Driven + 54 LAW + 116 model + 46 event) بسیار قوی است. Rewrite هزینه 6+ ماه اضافه دارد بدون ارزش افزوده. فقط Implementation باید کامل شود.

### 2. آیا Architecture Freeze باید حفظ شود؟

**بله.** هیچ دلیل بحرانی برای تغییر معماری وجود ندارد. PostgreSQL migration فقط engine عوض می‌کند، نه architecture. Flutter فقط client جدید اضافه می‌کند. همه Extension‌ها روی معماری موجود ساخته می‌شوند.

### 3. کدام قابلیت‌های موجود را نباید دست زد؟

(See Section 3 — 35 قابلیت)

خلاصه critical ones:
- **Authentication + RBAC + Session Revocation** (JWT + scrypt + globalThis cache)
- **Outbox/Inbox/Saga** (Event-Driven core)
- **Ledger Pattern** (Inventory + Finance)
- **54 Architecture Laws** (LAW-04 to LAW-57)
- **Workflow + Rule Engine** (existing)
- **Notification Platform** (5 channel + Template Engine)
- **Business Code Generator** (47 definitions)
- **Idempotency + Optimistic Locking** (data integrity)

### 4. بزرگ‌ترین Production Blocker چیست؟

**نبود Backup/DR + SQLite.** بدون این دو، هر خرابی فاجعه‌بار است. Phase 2 (T-2-01 to T-2-07) این را حل می‌کند.

### 5. بزرگ‌ترین Product Gap چیست؟

**Technician Mobile + Offline Sync.** تکنسین‌ها نمی‌توانند با سیستم کار کنند. Phase 4 (T-4-01 to T-4-18) این را حل می‌کند.

### 6. اولین Task قابل اجرا چیست؟

**T-2-01: PostgreSQL Migration.** چون:
- schema.postgres.prisma آماده است
- scripts/migrate-to-postgres.sh آماده است
- SQLite bottleneck اثبات‌شده است (10 concurrent writes → 60% timeout)
- هیچ dependency ندارد
- بلافاصله Roadmap را جلو می‌برد

### 7. بعد از Phase 2 چه چیزی قابل ارائه است؟

```text
✓ Production-ready system (PostgreSQL + Redis + MinIO)
✓ Backup + DR (RPO ≤ 15min, RTO ≤ 1hr)
✓ Observability (Prometheus + Grafana + Loki + Sentry)
✓ CI/CD (push → staging → prod → rollback)
✓ MFA for admin/finance
✓ PII Encryption
✓ File Virus Scan + Signed URL
✓ All 154 existing routes functional on PostgreSQL
```

**System can be deployed to production with confidence.**

### 8. چه زمانی Technician می‌تواند با سیستم واقعی کار کند؟

**پس از Phase 4 (هفته ۱۶ از شروع Phase 2).**

```text
Phase 2 (4w) + Phase 3 (5w) + Phase 4 (7w) = 16 weeks
```

Technician می‌تواند:
- Login روی Flutter app (Android + iOS)
- مأموریت‌های assigned را ببیند
- Check-in با GPS
- Diagnosis ثبت کند
- Parts + Labor ثبت کند
- Photos قبل/بعد بگیرد
- Signature بگیرد
- Job complete کند
- همه این‌ها Offline + Sync

### 9. چه زمانی Customer Portal کامل می‌شود؟

**پس از Phase 5 (هفته ۲۰ از شروع Phase 2).**

```text
Phase 2 (4w) + Phase 3 (5w) + Phase 4 (7w) + Phase 5 (4w) = 20 weeks
```

Customer می‌تواند:
- Login + Profile management
- محصولات + گارانتی خود را ببیند
- فاکتور + پرداخت آنلاین
- درخواست خدمات ثبت کند
- شکایت + نظرسنجی
- اعلان‌ها را ببیند
- Customer 360 (initial)

### 10. چه زمانی سیستم برای Production واقعی مناسب است؟

**پس از Phase 2 (هفته ۴).**

پس از Phase 2:
- ✅ PostgreSQL (نه SQLite)
- ✅ Backup + PITR + DR
- ✅ Observability
- ✅ CI/CD
- ✅ MFA + PII + File Security

System production-ready است. اما فقط Core ERP (Sales/Service/Warranty/Inventory/Finance) فعال است. Mobile و Portal‌ها هنوز کامل نیستند.

**برای Enterprise کامل:** پس از Phase 9 (هفته ۳۵).

### 11. چه چیزهایی را باید به V2 منتقل کنیم؟

(See Phase 10)

```text
✗ AI Layer (Predictive Maintenance, Demand Forecast, Churn, Recommendations)
✗ WhatsApp Business Integration
✗ Advanced BI (Metabase/Superset, ClickHouse)
✗ Multi-Currency
✗ Multi-Language (i18n)
✗ Microservices Split (اگر لازم شد)
✗ Kubernetes (اگر scale لازم شد)
✗ Elasticsearch (اگر PostgreSQL FTS کافی نباشد)
✗ Dynamic Report Builder
✗ Advanced Cost Center (Multi-dimensional)
✗ Inter-company Consolidation
```

### 12. چه چیزهایی را اصلاً نباید بسازیم؟

(See Section 23 — Anti-Overengineering)

```text
✗ Microservices (در V1) — Modular Monolith کافی است
✗ Kafka — Outbox + in-process کافی است
✗ RabbitMQ — Redis pub/sub کافی است
✗ Elasticsearch (در V1) — PostgreSQL FTS کافی است
✗ Kubernetes (در V1) — Docker Compose کافی است
✗ GraphQL — REST + api-client کافی است
✗ gRPC — REST کافی است
✗ Service Mesh — برای Monolith لازم نیست
✗ API Gateway (Kong) — Caddy کافی است
✗ CQRS کامل — Projection‌های ساده کافی است
✗ Event Sourcing کامل — Outbox + Snapshot کافی است
✗ Vector DB (در V1) — برای AI در V2
✗ ClickHouse (در V1) — PostgreSQL MV کافی است
✗ Heavy BPMN Workflow Engine — existing JSON-based کافی است
✗ Complex Rule DSL — existing conditionDsl کافی است
```

---

## FINAL DELIVERABLE SUMMARY

این سند `docs/bismark-master-execution-plan.md` از این لحظه به بعد **Single Source of Truth** برای اجرای پروژه BISMARK است.

### چه این سند دارد:

- ✅ Current State (Verified از Repository)
- ✅ 35 Existing Capability (DO NOT REDESIGN)
- ✅ 27 Capability Map (A-Z + AA)
- ✅ 80+ Task با ID، Priority، Dependencies، Acceptance Criteria
- ✅ Phase 2 Detail (20 Task)
- ✅ Database Migration Plan (SQLite → PostgreSQL)
- ✅ Backup + DR Plan
- ✅ Observability Plan
- ✅ Offline Architecture Detail
- ✅ Dispatch Algorithm
- ✅ 100 Acceptance Test
- ✅ Phase Exit Gates
- ✅ Definition of Done
- ✅ 15 Risk Register
- ✅ Realistic Timeline (24-51 weeks)
- ✅ Resource Plan
- ✅ 3 Readiness Indicators (Capability / Production / Enterprise)
- ✅ 12 Final Answers

### چه این سند ندارد:

- ❌ هیچ کدنویسی
- ❌ هیچ Migration اجرا شده
- ❌ هیچ Package نصب شده
- ❌ هیچ Feature پیاده‌سازی شده
- ❌ هیچ Architecture redesign

---

**END OF MASTER EXECUTION PLAN**

**اقدام بعدی:** شروع Phase 2 با Task T-2-01 (PostgreSQL Migration) — وقتی مجوز اجرا داده شد.
