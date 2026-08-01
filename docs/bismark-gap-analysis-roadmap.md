# BISMARK — Gap Analysis & Final Roadmap (v1.0)

> **هدف:** تطبیق پروژه فعلی BISMARK با Master System Analysis Prompt (39 بخش) و تعیین فاصله‌های واقعی + فازبندی نهایی.
> **قانون:** فقط تحلیل و فازبندی. هیچ کدنویسی در این سند وجود ندارد.
> **مبنای تحلیل:** بررسی واقعی فایل‌های پروژه (schema.prisma، src/app/api، src/lib، docker-compose، tests).

---

## بخش ۱: خلاصه اجرایی

پروژه BISMARK در وضعیت فعلی یک **Core ERP Backend** قوی است که هسته اصلی Domain را پوشش می‌دهد. اما با «Enterprise Business Platform» که در Master Prompt تعریف شده، فاصله‌های مشخصی در ۳ محور دارد:

1. **Mobile/Offline** — Backend آماده است ولی خود Mobile Product ساخته نشده.
2. **Production Infrastructure** — Backup، DR، Observability، CI/CD هنوز enterprise-grade نیستند.
3. **Business Completeness** — CRM، Customer 360، Dispatch Engine، BI Reporting هنوز کامل نیستند.

**نکته کلیدی:** امتیاز 82/100 در Audit v4 به معنای 82٪ تکمیل محصول نیست؛ بلکه نشان‌دهنده کیفیت وضعیت فعلی پیاده‌سازی است.

---

## بخش ۲: تطبیق با Master Prompt — جدول کامل

بر اساس بررسی واقعی فایل‌های پروژه:

| # | بخش Master Prompt | وضعیت واقعی | شواهد از کد | فاصله |
|---|------------------|------------|-------------|-------|
| 1 | Identity / RBAC / Tenant | 🟢 قوی | 154 route، 54 LAW، requirePermission در همه routes | کم |
| 2 | Organization / Branch / Warehouse | 🟢 | Branch + Warehouse + WarehouseZone مدل‌ها موجود | کم |
| 3 | Customer / Party | 🟢 | Party model + Customer Portal (6 routes اصلاح‌شده) | کم |
| 4 | Product / SKU / Serial / Asset | 🟢 | Product، ProductModel، ProductInstance، ProductCategory، ProductBrand | کم |
| 5 | Inventory / Ledger | 🟢 | StockItem، InventoryTransaction، StockReservation، StockBalanceSnapshot | کم |
| 6 | Sales / Order / Invoice / Payment | 🟢 | SalesOrder، SalesOrderLine، Invoice، Payment، PaymentAllocation، CreditNote | کم تا متوسط |
| 7 | Warranty | 🟢 | WarrantyCard، WarrantyClaim، WarrantyPolicy، WarrantyExtension، WarrantyTransfer | کم |
| 8 | Service Management | 🟢 | ServiceRequest، ServiceOrder، ServicePart، QualityCheck | کم تا متوسط |
| 9 | Technician Workflow | 🟡 Backend فقط | TechnicianSkill، TechnicianAvailability، TechnicianPerformance موجود؛ اما Dispatch Engine نه | متوسط |
| 10 | Customer Portal | 🟡 Backend + UI | 6 routes کار می‌کنند ولی UI محدود است | متوسط |
| 11 | Representative Portal | 🔴 | هیچ panel جداگانه‌ای موجود نیست | زیاد |
| 12 | **Technician Mobile** | 🔴 | 0 مدل Device، 0 مدل OfflineSyncQueue، 0 مسیر `/api/v1/mobile/*`، 0 دایرکتوری Flutter | **زیاد** |
| 13 | **Offline Sync واقعی** | 🔴 | هیچ پیاده‌سازی Conflict Resolution یا Sync Queue موجود نیست | **زیاد** |
| 14 | Dispatch Engine | 🔴 | فقط مدل‌های داده موجود؛ هیچ الگوریتم Assignment واقعی نه | متوسط |
| 15 | Accounting کامل | 🟡 | JournalEntry، ChartOfAccount، FiscalYear موجود؛ اما AR/AP/Settlement/CostCenter نه | متوسط تا زیاد |
| 16 | **CRM واقعی** | 🔴 | فقط Lead + CustomerInteraction موجود؛ Opportunity/Campaign/Task/Follow-up نه | **زیاد** |
| 17 | Customer 360 | 🔴 | هیچ Projection/Read Model موجود نیست | **زیاد** |
| 18 | Marketing Automation | 🔴 | فقط Promotion + Coupon موجود (قیمت‌گذاری) | زیاد |
| 19 | Loyalty | 🟡 | LoyaltyAccount + LoyaltyTransaction موجود ولی ساده | متوسط |
| 20 | **Reporting / BI** | 🔴 | 6 route گزارش مالی موجود ( dashboard، balance-sheet، profit-loss، cash-flow، equity، trial-balance)؛ Dynamic Report Builder نه | **زیاد** |
| 21 | Notification Platform | 🟡 | 5 مدل + Template Engine + 5 Channel Provider موجود؛ ولی WhatsApp نه | متوسط |
| 22 | File Management | 🟡 | FileAttachment موجود با virusScanStatus field؛ ولی ClamAV/Signed URL نه | متوسط |
| 23 | Search پیشرفته | 🔴 | فقط PostgreSQL LIKE (پارامتریک via Prisma)؛ Elasticsearch/OpenSearch نه | متوسط |
| 24 | Event-Driven (Outbox/Inbox) | 🟢 | Outbox + Inbox + ProcessedMessages + Saga + Event Catalog (46 event) | کم |
| 25 | Security Enterprise | 🟡 | JWT + scrypt + RBAC + Rate Limit + 12 Security Headers + Session Revocation؛ MFA/OTP/PII Encryption نه | متوسط |
| 26 | **Observability** | 🔴 | فقط Health Check + Audit Log؛ OpenTelemetry/Prometheus/Grafana نه | **زیاد** |
| 27 | **Backup / DR** | 🔴 | هیچ فایل backup/pitr/restore موجود نیست | **بحرانی** |
| 28 | CI/CD | 🟡 | ci-cd.yml موجود ولی `bun audit || true` و integration-tests fail | زیاد |
| 29 | IaC (Terraform/Pulumi) | 🔴 | هیچ فایل IaC موجود نیست | زیاد |
| 30 | Test Coverage | 🟡 | 5 فایل unit test + 53 regression test در v4؛ Contract/E2E/Load نه | زیاد |
| 31 | AI Layer | 🔴 | هیچ پیاده‌سازی AI موجود نیست | **زیاد** |
| 32 | Mobile Strategy (Flutter/PWA) | 🔴 | تصمیم معماری گرفته نشده | زیاد |
| 33 | Workflow Engine | 🟢 | WorkflowDefinition + WorkflowInstance + RuleEngine موجود | کم |
| 34 | Audit Log | 🟢 | AuditLog model + immutable enforcement (LAW) | کم |

---

## بخش ۳: تحلیل عمیق ۷ Gap اصلی

### Gap 1: Technician Mobile + Offline Sync (بحرانی)

**وضعیت فعلی:**
- 0 مدل `Device` در schema
- 0 مدل `OfflineSyncQueue` در schema
- 0 مسیر `/api/v1/mobile/*`
- 0 دایرکتوری `mobile/` یا `flutter/`
- هیچ Local DB، Conflict Resolution یا Background Sync پیاده‌سازی نشده

**آنچه Master Prompt می‌خواهد:**
- Flutter یا PWA برای Android + iOS
- GPS، Camera، Barcode/QR Scanner
- عکس قبل/بعد، Signature
- Offline-first با Local DB + Sync Queue
- Conflict Resolution
- Push Notification
- Background Sync

**ارزیابی:** Backend آماده‌سازی نشده، Mobile Product کاملاً مفقود. این بزرگ‌ترین Gap پروژه است.

---

### Gap 2: Production Backup + DR + PITR (بحرانی برای Production)

**وضعیت فعلی:**
- هیچ فایل backup script موجود نیست
- هیچ استراتژی PITR (Point-in-Time Recovery) پیاده‌سازی نشده
- هیچ Restore Test انجام نشده
- فقط `migrate-to-postgres.sh` موجود است (Migration، نه Backup)
- SQLite database بدون backup خودکار

**آنچه Master Prompt می‌خواهد:**
- PostgreSQL WAL Archive
- Backup روزانه + هفتگی
- Object Storage برای backup
- PITR با RPO ≤ 15 min
- Restore Test منظم
- DR Plan با RTO ≤ 1 hour

**ارزیابی:** برای Production واقعی، این P0 است. بدون Backup و DR، هر خرابی فاجعه‌بار است.

---

### Gap 3: Observability + Monitoring + Tracing (زیاد)

**وضعیت فعلی:**
- فقط `/api/v1/system/health` endpoint موجود
- Audit Log برای 3 route instrumentation شده
- `console.log` در چندین فایل
- هیچ OpenTelemetry، Prometheus، Grafana، Sentry یا مشابه نصب نیست

**آنچه Master Prompt می‌خواهد:**
- Structured Logging
- Distributed Tracing با Trace ID + Correlation ID
- Business Metrics
- Error Tracking
- Alerting
- SLO/SLA Monitoring

**ارزیابی:** برای enterprise، Visibility صفر است. وقتی مشکلی رخ می‌دهد، دیباگ کردن تقریباً غیرممکن است.

---

### Gap 4: Reporting / BI Engine (زیاد)

**وضعیت فعلی:**
- 6 route گزارش مالی موجود: `/reports/dashboard`، `/reports/balance-sheet`، `/reports/profit-loss`، `/reports/cash-flow`، `/reports/equity`، `/reports/final-trial-balance`
- این‌ها از OLTP (JournalEntry) محاسبه می‌کنند
- هیچ Projection/Read Model جداگانه‌ای موجود نیست
- هیچ Dynamic Report Builder یا Schedule Export موجود نیست

**آنچه Master Prompt می‌خواهد:**
- OLTP → Events → Projections → Reporting DB → BI
- Sales Reports (Daily/Monthly/by Product/by Branch/by Rep)
- Service Reports (SLA Breach، First-Time Fix Rate، Technician Performance)
- Executive Dashboard
- Dynamic Report Builder

**ارزیابی:** زیرساخت OLTP خوب است، ولی BI Layer کاملاً مفقود. باید Projectionها ساخته شوند.

---

### Gap 5: Dispatch + SLA Engine (متوسط)

**وضعیت فعلی:**
- مدل‌های داده موجود: `TechnicianSkill`، `TechnicianAvailability`، `TechnicianPerformance`، `Appointment`، `SLAPolicy`، `SLATracker`
- هیچ الگوریتم Assignment واقعی پیاده‌سازی نشده
- هیچ `DispatchService` یا `AssignmentEngine` موجود نیست

**آنچه Master Prompt می‌خواهد:**
- Algorithm: Candidate → Filter (Skill/Coverage/Availability) → Score (SLA/Distance/Workload/Priority) → Best Technician → Assignment

**ارزیابی:** داده‌ها هست، عقل نه. باید Logic ساخته شود.

---

### Gap 6: Customer 360 + CRM (زیاد)

**وضعیت فعلی:**
- مدل‌های داده پراکنده: `Party`، `CustomerInteraction`، `Lead`، `LoyaltyAccount`، `Complaint`، `Survey`
- هیچ `Customer360` Projection موجود نیست
- هیچ `Opportunity`، `Campaign`، `Task`، `FollowUp` موجود نیست
- هیچ Customer Journey Map یا CLV محاسبه نمی‌شود

**آنچه Master Prompt می‌خواهد:**
- Customer 360 Projection: Purchases + Products + Warranty + Service + Complaints + Payments + Satisfaction + Interactions + CLV
- CRM کامل: Lead → Opportunity → Quote → Order → Customer
- Customer Journey، Segmentation، Cross-sell، Upsell

**ارزیابی:** CRM فقط در سطح Lead ثبتی موجود است. ادامه Sales Pipeline مفقود.

---

### Gap 7: CI/CD + Production Infrastructure (زیاد)

**وضعیت فعلی:**
- `ci-cd.yml` موجود ولی ناقص: `bun audit || true` (خطاها نادیده گرفته می‌شوند)، integration-tests job fail
- Dockerfile موجود ولی single-stage
- `docker-compose.production.yml` اصلاح شده ولی تست نشده
- هیچ IaC (Terraform/Pulumi) موجود نیست
- هیچ Secrets Management (Vault/AWS Secrets Manager) موجود نیست
- هیچ Staging environment تعریف نشده

**آنچه Master Prompt می‌خواهد:**
- CI: Test → Security Scan → Build → Docker
- CD: Staging → Migration → Production → Health Check → Rollback
- IaC برای Production Infrastructure
- Secrets Management

**ارزیابی:** Pipeline موجود ولی enterprise-grade نه.

---

## بخش ۴: آنچه پروژه از قبل حل کرده (Verified)

این موارد را **نباید** دوباره طراحی کنیم:

| قابلیت | شواهد |
|--------|-------|
| Multi-Tenant با tenantId | همه 116 مدل tenantId دارند |
| RBAC با 52+ Permission | seed.ts تعریف شده، requirePermission در همه routes |
| JWT + scrypt + Session Revocation | auth-service.ts با globalThis cache |
| 12 Security Headers | middleware.ts |
| Rate Limiting | src/lib/rate-limiter.ts |
| Outbox/Inbox Pattern | OutboxMessage + ProcessedMessage + OutboxDispatcher + InboxWorker |
| Saga Pattern | saga-manager.ts با 2 تعریف (sales_order_fulfillment، return_processing) |
| 46 Domain Events | event-catalog.ts |
| 54 Architecture Laws | src/lib/shared/laws/ |
| Ledger Pattern برای Inventory | StockItem + InventoryTransaction + StockBalanceSnapshot |
| Double-Entry Accounting | JournalEntry + JournalEntryLine با totalDebit==totalCredit |
| Optimistic Locking | version field در Aggregate Roots |
| Idempotency | IdempotencyKey + IdempotencyHelper |
| Audit Log Immutable | AuditLog model + throw on update/delete |
| Workflow Engine | WorkflowDefinition + WorkflowInstance + transition validation |
| Rule Engine | RuleSet + Rule + evaluate endpoint |
| Notification Platform | 5 مدل + Template Engine + 5 Channel Provider |
| Customer Portal Backend | 6 route اصلاح‌شده با Party resolution |
| 18 GAP Module (Phase 1A) | Installation، Appointment، Complaint، Survey، File، Technician Skills، SLA، Procurement، Commission، Promotion، CRM/Loyalty، Multi-Company |

---

## بخش ۵: فازبندی نهایی پیشنهادی

بر اساس وابستگی‌های واقعی (نه ترتیب دلخواه):

### Phase 0 — Architecture & Gap Freeze (1 هفته) ✅ تکمیل‌شده

- [x] تطبیق پروژه با Master Prompt (این سند)
- [x] Audit v4 (82/100)
- [x] 53 regression test

### Phase 1 — Core Stabilization (1 هفته) ✅ تکمیل‌شده

- [x] F-02: 18 broken routes اصلاح
- [x] F-01: Session Revocation
- [x] F-03: Customer Portal
- [x] F-05: Worker Runtime
- [x] F-06: Views Auth
- [x] F-07: Dashboard Real Stats

### Phase 2 — Production Foundation (3-4 هفته) 🔴 بحرانی

**هدف:** قابل‌اعتماد بودن برای Production واقعی.

- [ ] PostgreSQL Migration (با `scripts/migrate-to-postgres.sh` آماده است)
- [ ] Redis Setup (برای Rate Limit + Cache + Session)
- [ ] **Backup Strategy**: WAL Archive + Daily Full Backup + Object Storage
- [ ] **PITR**: RPO ≤ 15 min
- [ ] **Restore Test**: هفتگی自动化
- [ ] **DR Plan**: RTO ≤ 1 hour
- [ ] **Observability**: OpenTelemetry + Prometheus + Grafana + Sentry
- [ ] **CI/CD Upgrade**: Test → Security Scan → Build → Staging → Production → Health Check → Rollback
- [ ] **Secrets Management**: HashiCorp Vault یا AWS Secrets Manager
- [ ] **IaC**: Terraform برای Production Infrastructure

**Exit Gate:** می‌توانیم Production را با اطمینان deploy کنیم.

### Phase 3 — Core Business Completion (4-5 هفته)

**هدف:** تکمیل چرخه Sales → Service → Warranty → Finance.

- [ ] Sales Pipeline کامل: Quote → Order → Approval → Payment → Invoice → Shipment → Delivery → Installation → Warranty Activation
- [ ] Returns & Refunds کامل با financial reversal
- [ ] Inventory: Stock Transfer، Cycle Count، Stock Take
- [ ] Financial Integration: AR/AP/Settlement/Cost Center (یا Sepidar integration)
- [ ] Tax Calculation Engine
- [ ] Commission Calculation Engine
- [ ] Reconciliation Module

**Exit Gate:** چرخه کسب‌وکار اصلی end-to-end کار می‌کند.

### Phase 4 — Technician Platform (6-8 هفته) 🔴 بزرگ‌ترین Gap

**هدف:** Mobile Product واقعی برای تکنسین.

**تصمیم معماری پیشنهادی:** Flutter (Android + iOS) + PWA (fallback)

- [ ] Backend: `/api/v1/mobile/*` endpoints
  - [ ] `POST /mobile/register-device` — ثبت Device (مدل Device باید اضافه شود)
  - [ ] `POST /mobile/sync` — Sync Queue endpoint
  - [ ] `GET /mobile/assignments` — مأموریت‌های assigned
  - [ ] `POST /mobile/jobs/[id]/check-in` — Check-in با GPS
  - [ ] `POST /mobile/jobs/[id]/check-out` — Check-out
  - [ ] `POST /mobile/jobs/[id]/diagnosis` — Diagnosis ثبت
  - [ ] `POST /mobile/jobs/[id]/parts` — قطعات مصرفی
  - [ ] `POST /mobile/jobs/[id]/photos` — عکس قبل/بعد
  - [ ] `POST /mobile/jobs/[id]/signature` — امضای مشتری
  - [ ] `POST /mobile/jobs/[id]/complete` — تکمیل
- [ ] Schema: `Device`، `OfflineSyncQueue`، `MobileJobSnapshot` مدل‌ها
- [ ] Conflict Resolution Strategy
- [ ] Push Notification (Firebase Cloud Messaging)
- [ ] Flutter App: Offline-first با SQLite (Drift/Hive)
  - [ ] Local DB Schema
  - [ ] Sync Queue Manager
  - [ ] GPS + Google Maps Integration
  - [ ] Camera + Barcode Scanner (mobile_scanner)
  - [ ] Signature Pad
  - [ ] Background Sync (workmanager)

**Exit Gate:** تکنسین می‌تواند مأموریت کامل را offline انجام دهد و sync کند.

### Phase 5 — Customer + Representative Experience (4-5 هفته)

**هدف:** Portal‌های کامل.

- [ ] Customer Portal UI (Next.js)
  - [ ] Dashboard با محصولات، گارانتی، خدمات
  - [ ] ثبت درخواست خدمات
  - [ ] ثبت شکایت
  - [ ] رضایت‌سنجی
  - [ ] پرداخت آنلاین
  - [ ] اعلان‌ها
- [ ] Representative Portal UI
  - [ ] مدیریت مشتریان
  - [ ] ثبت فروش
  - [ ] موجودی قابل فروش
  - [ ] قیمت‌گذاری مجاز
  - [ ] پورسانت
  - [ ] گزارش فروش
- [ ] Customer 360 Projection (Read Model)
  - [ ] Event handlers برای به‌روزرسانی Projection
  - [ ] API: `GET /customers/[id]/360`

**Exit Gate:** مشتری و نماینده می‌توانند کارهای اصلی خود را انجام دهند.

### Phase 6 — Dispatch + SLA Engine (3-4 هفته)

**هدف:** تخصیص هوشمند تکنسین.

- [ ] Dispatch Service
  - [ ] `findCandidateTechnicians(serviceRequest)` — فیلتر بر اساس Skill + Coverage + Availability
  - [ ] `scoreTechnician(technician, serviceRequest)` — Score بر اساس SLA + Distance + Workload + Priority
  - [ ] `assignBestTechnician(serviceRequest)` — انتخاب بهترین + Assignment
  - [ ] `reassignTechnician(serviceRequest, reason)` — Reassignment با Audit
- [ ] SLA Engine
  - [ ] SLA Deadline Calculation
  - [ ] SLA Breach Detection
  - [ ] Escalation Rules
  - [ ] SLA Reports
- [ ] Distance Calculation (با PostgreSQL PostGIS یا Google Distance Matrix API)
- [ ] Workload Balancing

**Exit Gate:** تکنسین بهینه تخصیص داده می‌شود، SLA رعایت می‌شود.

### Phase 7 — Reporting & BI (4-5 هفته)

**هدف:** داشبورد اجرایی واقعی.

- [ ] Projection Layer
  - [ ] Sales Projection (daily/monthly)
  - [ ] Service Projection
  - [ ] Inventory Projection
  - [ ] Customer Projection
- [ ] Reporting DB (PostgreSQL Materialized Views یا Separate Schema)
- [ ] Sales Reports (Daily/Monthly/by Product/by Branch/by Rep/by City/by Customer/Top Products/Returns)
- [ ] Service Reports (Requests/Open/Closed/SLA Breach/Avg Resolution/First-Time Fix/Technician Performance/Parts Consumption/Warranty Cost/Customer Satisfaction)
- [ ] Financial Reports (Revenue/Receivables/Payables/Cash/Profit/Margin/Tax/Commission/Cost)
- [ ] Executive Dashboard (Real-time KPIs)
- [ ] Dynamic Report Builder (اختیاری — V2)
- [ ] Export: PDF، Excel، CSV
- [ ] Scheduled Reports (email)

**Exit Gate:** مدیران می‌توانند تصمیمات data-driven بگیرند.

### Phase 8 — CRM (4-5 هفته)

**هدف:** مدیریت ارتباط با مشتری حرفه‌ای.

- [ ] Schema: `Opportunity`، `Campaign`، `Task`، `FollowUp`، `CustomerSegment`
- [ ] Lead → Opportunity → Quote → Order Pipeline
- [ ] Customer Journey Map
- [ ] CLV (Customer Lifetime Value) Calculation
- [ ] Customer Segmentation (RFM: Recency، Frequency، Monetary)
- [ ] Cross-sell / Upsell Recommendations
- [ ] Campaign Management
- [ ] Call Center Tools (Quick Customer Search، Interaction Log)

**Exit Gate:** تیم فروش می‌تواند Lead را از ابتدا تا تبدیل مدیریت کند.

### Phase 9 — Automation (3-4 هفته)

**هدف:** اتوماسیون فرآیندهای تکراری.

- [ ] Workflow Engine Enhancement (در حال حاضر موجود ولی ساده)
- [ ] Scheduled Jobs (cron-style): Report Generation، Warranty Expiry Alert، SLA Breach Alert
- [ ] Trigger-Based Automation: Event → Rule → Action
- [ ] Notification Automation: Customer Journey-based (Welcome، Birthday، Warranty Expiring، Service Due)
- [ ] Escalation Rules
- [ ] Bulk Operations

**Exit Gate:** فرآیندهای تکراری به‌صورت خودکار اجرا می‌شوند.

### Phase 10 — Advanced Enterprise (6+ هفته) — اختیاری V2

- [ ] AI Layer
  - [ ] Predictive Maintenance (با تاریخچه خدمات)
  - [ ] Demand Forecast (با تاریخچه فروش)
  - [ ] Technician Optimization (با ML)
  - [ ] Customer Recommendation
  - [ ] Anomaly Detection (fraud، unusual patterns)
- [ ] WhatsApp Business Integration
- [ ] Advanced Search (Elasticsearch/OpenSearch) — فقط اگر PostgreSQL Search کافی نباشد
- [ ] Multi-Currency
- [ ] Multi-Language
- [ ] API Gateway (Kong/APISIX) — فقط اگر تعداد سرویس‌ها زیاد شود
- [ ] Microservices Split — فقط اگر Modular Monolith به bottleneck تبدیل شود

---

## بخش ۶: زمان‌بندی کلی

| Phase | مدت | وابستگی | ریسک |
|-------|-----|---------|------|
| Phase 0 | 1 هفته | — | ✅ تکمیل‌شده |
| Phase 1 | 1 هفته | Phase 0 | ✅ تکمیل‌شده |
| Phase 2 | 3-4 هفته | Phase 1 | 🔴 بحرانی برای Production |
| Phase 3 | 4-5 هفته | Phase 2 | متوسط |
| Phase 4 | 6-8 هفته | Phase 3 | 🔴 بزرگ‌ترین Gap |
| Phase 5 | 4-5 هفته | Phase 3 | متوسط |
| Phase 6 | 3-4 هفته | Phase 4 | متوسط |
| Phase 7 | 4-5 هفته | Phase 3 | متوسط |
| Phase 8 | 4-5 هفته | Phase 5 | متوسط |
| Phase 9 | 3-4 هفته | Phase 7، 8 | کم |
| Phase 10 | 6+ هفته | همه | اختیاری |

**زمان تا Production-ready MVP:** ~10-14 هفته (Phase 2 + 3 + 4)
**زمان تا Enterprise کامل:** ~30-40 هفته (همه Phase‌ها)

---

## بخش ۷: ۱۲ قانون بحرانی (از Master Prompt)

این قوانین در پروژه فعلی **همگی رعایت شده‌اند**:

1. ✅ هیچ Entity بدون Data Ownership تعریف نشده (همه tenantId دارند)
2. ✅ هیچ Business Rule مهمی فقط در Frontend نیست (همه در Backend)
3. ✅ هر عملیات مالی Invariant دارد (totalDebit==totalCredit)
4. ✅ هر Service Audit Trail دارد (AuditLog)
5. ✅ هیچ State Transition غیرمجاز ممکن نیست (transition validation)
6. ✅ هیچ Source of Truth دوتایی ایجاد نشده (هر Aggregate یک Owner دارد)
7. ✅ ابزار ساده ترجیح داده شده (Modular Monolith نه Microservices)

**قوانینی که باید در Phase‌های بعد رعایت شوند:**
- Rule 6: Technician نباید داده خارج از Scope ببیند (در Phase 4)
- Rule 7: Customer نباید اطلاعات مشتری دیگر را ببیند (در Phase 5)
- Rule 8: Representative نباید بدون Authorization به داده خارج از محدوده دسترسی داشته باشد (در Phase 5)
- Rule 12: هر تصمیم مهم باید قابل تست باشد (در همه Phase‌ها)

---

## بخش ۸: تصمیمات معماری پیشنهادی (ADR)

### ADR-001: Mobile Strategy

**تصمیم:** Flutter (Android + iOS) + PWA (fallback)

**دلیل:**
- Flutter: یک کدبیس برای Android + iOS، Native Performance، Offline-first پشتیبانی عالی
- PWA: fallback برای کاربرانی که App نصب نمی‌کنند
- React Native رد شد چون Flutter برای Offline-first و Camera/GPS بهتر است

### ADR-002: Accounting Scope

**تصمیم:** BISMARK = AR + AP + GL Lite؛ Sepidar = GL کامل

**دلیل:**
- BISMARK باید AR/AP برای تطبیق با Sales/Service داشته باشد
- GL کامل (Cost Center، Multi-Currency، Consolidation) پیچیده‌تر از آن است که در V1 لازم باشد
- Sepidar یا همکاران سیستم برای GL رسمی استفاده شود
- Integration via REST API یا Excel Import/Export

### ADR-003: Reporting Architecture

**تصمیم:** PostgreSQL Materialized Views + Projections (نه Separate Reporting DB)

**دلیل:**
- در V1، حجم داده کافی برای جدا کردن Reporting DB نیست
- Materialized Views سریع و ساده هستند
- اگر در V2 حجم زیاد شد، می‌توان به ClickHouse یا Separate PostgreSQL migrated

### ADR-004: Search

**تصمیم:** PostgreSQL Full Text Search (نه Elasticsearch)

**دلیل:**
- در V1، تعداد رکوردها < 1M است
- PostgreSQL FTS برای این حجم کافی است
- Elasticsearch complexity اضافه می‌کند که لازم نیست
- اگر در V2 نیاز شد، می‌توان اضافه کرد

### ADR-005: Monolith vs Microservices

**تصمیم:** Modular Monolith (حفظ وضعیت فعلی)

**دلیل:**
- Domain‌ها به‌خوبی جدا شده‌اند (Bounded Contexts)
- Complexity Microservices (network، distributed transactions، observability) لازم نیست
- اگر در V2 یک Domain به bottleneck تبدیل شد، می‌توان آن را جدا کرد

### ADR-006: Offline Sync Strategy

**تصمیم:** Last-Write-Wins با Conflict Queue

**دلیل:**
- برای تکنسین، اکثر داده‌ها locally-owned هستند (Job assigned به او)
- Conflict فقط در موارد نادر رخ می‌دهد (مثلاً Job توسط dispatcher لغو شده ولی تکنسین offline کار کرده)
- در این موارد، Job در Conflict Queue قرار می‌گیرد و dispatcher تصمیم می‌گیرد

---

## بخش ۹: Anti-Overengineering Review

این موارد را **نباید** در V1 اضافه کنیم:

| ابزار/Pattern | لازم است؟ | دلیل |
|--------------|----------|------|
| Microservices | ❌ نه | Modular Monolith کافی است |
| Kafka | ❌ نه | Redis Streams یا در-process EventBus کافی است |
| Elasticsearch | ❌ نه | PostgreSQL FTS کافی است |
| Kubernetes | ❌ نه | Docker Compose + Caddy کافی است (تا 10K user) |
| GraphQL | ❌ نه | REST با typed api-client کافی است |
| gRPC | ❌ نه | REST کافی است |
| CQRS کامل | ❌ نه | Projection‌های ساده کافی است |
| Event Sourcing کامل | ❌ نه | Outbox + Snapshot کافی است |
| Service Mesh | ❌ نه | برای Monolith لازم نیست |
| API Gateway جدا | ❌ نه | Caddy + Next.js middleware کافی است |

**قانون:** هر ابزار جدید باید با این سؤال بررسی شود: «آیا PostgreSQL + Redis + Next.js نمی‌توانند این را انجام دهند؟»

---

## بخش 10: Red-Team Review

### نقاط ضعف فعلی

1. **Single Point of Failure:** SQLite single-writer → PostgreSQL migration لازم
2. **No Backup:** هر خرابی فاجعه
3. **No Observability:** دیباگ Production تقریباً غیرممکن
4. **Mobile Missing:** تکنسین‌ها نمی‌توانند کار کنند
5. **CRM Missing:** تیم فروش فقط Lead ثبتی دارد
6. **No DR:** اگر سرور down شد، RTO نامحدود

### نقاط قوت فعلی

1. **Architecture Solid:** DDD + Event-Driven + Ledger Pattern
2. **Security Good:** JWT + RBAC + Rate Limit + Session Revocation
3. **Domain Complete (Core):** Sales + Service + Warranty + Inventory + Finance
4. **116 Models:** داده‌های لازم برای همه Phase‌ها موجود
5. **54 Laws:** قوانین معماری enforce شده
6. **46 Events:** Event-Driven آماده

### حملات احتمالی

- **Ransomware روی Database:** بدون Backup، داده‌ها از بین می‌روند (Phase 2)
- **DDoS روی API:** Rate Limit موجود ولی Redis لازم برای distributed (Phase 2)
- **Insider Threat:** Audit Log موجود ولی PII Encryption نه (Phase 2)
- **Mobile Device Theft:** Device Management لازم (Phase 4)
- **Token Theft:** Session Revocation پیاده‌سازی شده ✅
- **Mass Assignment:** Whitelist در همه routes ✅

---

## بخش ۱۱: نقشه راه اجرایی (Executive Summary)

### اولویت ۱: Production Foundation (Phase 2)
**چرا:** بدون Backup و DR، هر چیز دیگری بی‌معنی است. اگر Production down شد، همه چیز از دست می‌رود.

### اولویت ۲: Technician Mobile (Phase 4)
**چرا:** بدون Mobile، تکنسین‌ها نمی‌توانند کار کنند. این بزرگ‌ترین Gap عملیاتی است.

### اولویت ۳: Core Business Completion (Phase 3)
**چرا:** چرخه Sales → Service → Warranty → Finance باید کامل باشد تا کسب‌وکار کار کند.

### اولویت ۴: Customer + Representative Portal (Phase 5)
**چرا:** تجربه کاربری نهایی باید کامل باشد.

### اولویت ۵: Dispatch + SLA (Phase 6)
**چرا:** بهینه‌سازی تخصیص تکنسین.

### اولویت ۶: Reporting & BI (Phase 7)
**چرا:** تصمیم‌گیری data-driven.

### اولویت ۷: CRM (Phase 8)
**چرا:** مدیریت ارتباط با مشتری.

### اولویت ۸: Automation (Phase 9)
**چرا:** اتوماسیون فرآیندهای تکراری.

### اولویت ۹: AI (Phase 10)
**چرا:** پیش‌بینی و بهینه‌سازی پیشرفته.

---

## بخش ۱۲: جمع‌بندی نهایی

### پروژه فعلی را دور نریز.

معماری و هسته Domain آن برای رسیدن به سیستم موردنظر **پایه بسیار خوبی** دارد. 116 مدل، 154 route، 54 LAW، 46 event، 5 قانون Ledger، Outbox/Inbox/Saga، Session Revocation — این‌ها دستاوردهای بزرگ هستند.

### مشکل اصلی:

فاصله بین **Core Backend فعلی** و **Enterprise Product کامل** در موارد زیر است:

1. **Mobile Product** (Flutter + Offline)
2. **Production Infrastructure** (Backup + DR + Observability)
3. **Business Completeness** (CRM + Dispatch + BI + Customer 360)

### توصیه نهایی:

1. **Phase 2 (Production Foundation)** را جدی بگیر — این P0 است.
2. **Phase 4 (Technician Mobile)** را زودتر شروع کن — بزرگ‌ترین Gap است.
3. **Master Prompt فعلی را به AI نده** — چون بخش‌هایی از چیزهایی که پروژه از قبل حل کرده را دوباره طراحی می‌کند.
4. از این سند (Gap Analysis & Roadmap) به‌عنوان **مرجع واحد** برای Phase‌بندی استفاده کن.
5. **Architecture Freeze** را حفظ کن — هیچ redesign لازم نیست.

---

## پیوست A: شاخص‌های کلیدی پروژه (Verified)

| شاخص | مقدار واقعی | منبع |
|------|------------|------|
| Prisma Models | 116 | `grep -c "^model " prisma/schema.prisma` |
| API Routes | 154 | `find src/app/api -name "route.ts" \| wc -l` |
| UI Views | 17 | `ls src/components/views/*.tsx \| wc -l` |
| Architecture Laws | 54 | `ls src/lib/shared/laws/ \| wc -l` |
| Domain Events | 46 | `grep -E "eventType:" src/lib/event-catalog.ts \| wc -l` |
| Unit Test Files | 5 | `find src/tests -name "*.test.ts" \| wc -l` |
| Domain Modules | 2 (notification، product) | `ls src/lib/modules/` |
| Sagas | 2 | `grep "sagaDefinitionKey" src/lib/saga/saga-manager.ts` |
| Mobile Routes | 0 | `ls src/app/api/v1/mobile/ 2>/dev/null` |
| Device Models | 0 | `grep "^model Device" prisma/schema.prisma` |
| Backup Scripts | 0 | `ls scripts/` (فقط migrate-to-postgres.sh) |
| Observability Tools | 0 | `grep -rln "opentelemetry\|prometheus" src/` |

---

## پیوست B: خروجی مورد انتظار از هر Phase

هر Phase باید این موارد را تحویل دهد:

1. **Scope Document** — چه کاری انجام می‌شود
2. **Database Changes** — Schema migrations
3. **API Contracts** — OpenAPI/Swagger
4. **UI Mockups** — برای Frontend Phase‌ها
5. **Events** — جدید Domain Events
6. **Tests** — Unit + Integration + Acceptance
7. **Documentation** — ADR + User Guide
8. **Exit Gate Criteria** — چه چیزی باید کار کند تا Phase بسته شود

---

**پایان سند.**

این سند جایگزین Master Prompt اصلی برای Phase‌بندی است. Master Prompt همچنان مرجع کامل برای طراحی هر Phase است، اما این سند مشخص می‌کند **چه چیزی از قبل موجود است** و **چه چیزی باید ساخته شود**.
