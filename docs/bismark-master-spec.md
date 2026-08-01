# BISMARK MASTER SPEC v1.0

> **مرجع مادر پروژه BISMARK**
> این سند **Single Source of Truth** برای تمام تصمیمات معماری، دیتابیس، امنیت و اجراست.
> هیچ تصمیمی خارج از این سند معتبر نیست.
> تاریخ تثبیت: پس از Deep Audit + P0 Fix + Runtime Verification

---

## وضعیت‌های تصمیم

هر تصمیم فقط یکی از این چهار حالت را دارد:

| وضعیت | معنی |
|-------|------|
| 🔒 **FROZEN** | تصمیم قطعی. تغییر ممنوع مگر Blocker بحرانی. |
| 🟡 **CONDITIONAL** | فعلاً انتخاب شده، اما با شرط. در Production Foundation نهایی می‌شود. |
| ⏳ **DEFERRED** | در آینده لازم می‌شود، ولی فعلاً ممنوع ساخت. |
| ❌ **REJECTED** | عمداً وارد سیستم نمی‌شود. مگر Requirement تغییر کند. |

---

## بخش ۱ — تصمیمات معماری 🔒

### ۱.۱ الگوی معماری

| تصمیم | وضعیت | توضیح |
|-------|-------|-------|
| Modular Monolith | 🔒 FROZEN | یک process، چند Module. Microservices ممنوع. |
| Domain-Driven Design | 🔒 FROZEN | Bounded Context + Aggregate + Value Object + Domain Event |
| Event-Driven Architecture | 🔒 FROZEN | Outbox + Inbox + Saga |
| REST API | 🔒 FROZEN | GraphQL و gPC ممنوع |
| Next.js 16 (App Router) | 🔒 FROZEN | Frontend + API |
| Prisma ORM | 🔒 FROZEN | TypeScript-first |
| Layered: API → Application → Domain → Infrastructure | 🔒 FROZEN | Business Logic فقط در Domain/Application |

### ۱.۲ Bounded Contexts

| Context | وضعیت | Owner Models |
|---------|-------|-------------|
| Identity | 🔒 FROZEN | User, Role, Permission, UserRole, RolePermission, Session |
| Organization | 🔒 FROZEN | Tenant, Branch, Company |
| Customer/Party | 🔒 FROZEN | Party |
| Product | 🔒 FROZEN | Product, ProductModel, ProductBrand, ProductCategory, ProductInstance |
| Inventory | 🔒 FROZEN | Warehouse, WarehouseZone, Location, Bin, StockItem, InventoryTransaction, StockReservation, StockTransfer, StockBalance, StockBalanceSnapshot, CycleCount, PickList |
| Sales | 🔒 FROZEN | Quote, SalesOrder, SalesOrderLine, Shipment, ShipmentLine, Invoice, InvoiceLine, Payment, PaymentAllocation, CreditNote, CreditNoteLine, ReturnOrder, ReturnOrderLine, Refund |
| Warranty | 🔒 FROZEN | WarrantyCard, WarrantyClaim, WarrantyPolicy, WarrantyExtension, WarrantyTransfer |
| Service | 🔒 FROZEN | ServiceRequest, ServiceOrder, ServiceOrderLine, ServiceOrderPart, ServiceOrderLabor, ServiceDiagnosis, ServiceQualityCheck, TechnicianAssignment, Appointment |
| Financial | 🔒 FROZEN | ChartOfAccount, FiscalYear, FiscalPeriod, JournalEntry, JournalEntryLine, TaxCode, TaxRule, TaxCalculation, TaxPosting, CostCenter, ARTransaction, APTransaction, ARAllocation, APAllocation |
| Procurement | 🔒 FROZEN | PurchaseOrder, PurchaseOrderLine, GoodsReceipt, GoodsReceiptLine |
| Notification | 🔒 FROZEN | NotificationTemplate, Notification, NotificationDelivery, NotificationPreference, NotificationQueue |
| CRM | 🔒 FROZEN | Lead, CustomerInteraction, LoyaltyAccount, LoyaltyTransaction, Complaint, Survey, SurveyTemplate |
| Service Operations | 🔒 FROZEN | SLAPolicy, SLATracker, TechnicianSkill, TechnicianAvailability, TechnicianPerformance, Installation |
| File | 🔒 FROZEN | FileAttachment |
| Marketing | 🔒 FROZEN | Promotion, Coupon, CommissionRule, CommissionTransaction, PriceList, PriceListLine |
| Workflow | 🔒 FROZEN | WorkflowDefinition, WorkflowInstance, WorkflowHistory |
| Rule | 🔒 FROZEN | RuleSet, RuleDefinition, RuleExecution, RuleAuditStep |
| Banking (Phase 3) | 🔒 FROZEN | BankAccount, BankTransaction, BankReconciliation |
| Mobile (Phase 4) | 🔒 FROZEN | Device, OfflineSyncQueue, MobileJobSnapshot, TechnicianLocation |

### ۱.۳ زبان و Runtime

| تصمیم | وضعیت |
|-------|-------|
| TypeScript 5 (strict) | 🔒 FROZEN |
| Node.js 20+ / Bun Runtime | 🔒 FROZEN |
| Edge Runtime برای middleware | 🔒 FROZEN |

---

## بخش ۲ — تصمیمات دیتابیس 🔒

### ۲.۱ Engine

| تصمیم | وضعیت | توضیح |
|-------|-------|-------|
| PostgreSQL 16 | 🔒 FROZEN | SQLite فقط sandbox. `schema.postgres.prisma` آماده. |
| Connection Pool | 🟡 CONDITIONAL | Prisma default در V1. PgBouncer در V2 اگر لازم شد. |
| Read Replica | ⏳ DEFERRED | فقط اگر read load > 10K QPS |
| Partitioning | ⏳ DEFERRED | فقط اگر جدول > 10M rows |
| Full Text Search | 🟡 CONDITIONAL | PostgreSQL FTS در V1. Elasticsearch ❌ REJECTED. |

### ۲.۲ Design Patterns

| تصمیم | وضعیت | توضیح |
|-------|-------|-------|
| Loose FK (LAW-04) | 🔒 FROZEN | FK رشته‌ای بدون Prisma relation برای cross-context |
| tenantId در همه مدل‌ها | 🔒 FROZEN | Multi-Tenant Isolation |
| Optimistic Locking (version field) | 🔒 FROZEN | 36 مدل دارند |
| Soft Delete (deletedAt) | 🔒 FROZEN | برای Aggregate Roots |
| @@unique برای Business Codes | 🔒 FROZEN | [tenantId, code] |
| @@index برای Query Patterns | 🔒 FROZEN | [tenantId, status, createdAt] |
| UUID (cuid) برای PK | 🔒 FROZEN | نه auto-increment |
| JSON برای metadata | 🔒 FROZEN | flexible schema |

### ۲.۳ Migration Strategy

| مرحله | وضعیت |
|-------|-------|
| `schema.postgres.prisma` آماده | 🔒 FROZEN (exists) |
| `scripts/migrate-to-postgres.sh` | 🔒 FROZEN (exists) |
| SQLite backup قبل از migration | 🔒 FROZEN |
| Dry run روی test DB | 🔒 FROZEN |
| Data validation (row counts) | 🔒 FROZEN |
| Rollback path به SQLite | 🔒 FROZEN |

---

## بخش ۳ — تصمیمات امنیت 🔒

### ۳.۱ Authentication

| تصمیم | وضعیت | توضیح |
|-------|-------|-------|
| JWT (HMAC-SHA256) | 🔒 FROZEN | RS256 در V2 اگر multi-service لازم شد |
| Access Token 15min | 🔒 FROZEN | |
| Refresh Token 7day | 🔒 FROZEN | Rotation: old token invalidated |
| scrypt Password Hashing | 🔒 FROZEN | N=16384, r=8, p=1 |
| MFA (TOTP RFC 6238) | 🔒 FROZEN | برای admin/finance. otplib v13 |
| Session Revocation (DB check) | 🔒 FROZEN | isSessionActive + globalThis cache + invalidateSessionCache |
| Password Reset Token | ⏳ DEFERRED | فعلاً نداریم. قبل از Production لازم. |
| OTP (SMS/Email) | ⏳ DEFERRED | برای customer portal |
| Device Fingerprint | 🟡 CONDITIONAL | در Mobile Phase (Phase 4) |

### ۳.۲ Authorization

| تصمیم | وضعیت | توضیح |
|-------|-------|-------|
| RBAC (Role-Based Access Control) | 🔒 FROZEN | 52+ permission, 7 role |
| requirePermission در همه routes | 🔒 FROZEN | 148/154 routes |
| Tenant Isolation (tenantId) | 🔒 FROZEN | همه کوئری‌ها tenant-scoped |
| Customer scope (getCustomerPartyId) | 🔒 FROZEN | مشتری فقط داده خودش |
| ABAC | ⏳ DEFERRED | فقط اگر RBAC کافی نباشد |

### ۳.۳ API Security

| تصمیم | وضعیت | توضیح |
|-------|-------|-------|
| 12 Security Headers | 🔒 FROZEN | CSP, HSTS, X-Frame-Options, etc. |
| Rate Limiting | 🔒 FROZEN | In-memory (sandbox) → Redis (production) |
| Idempotency (IdempotencyKey) | 🔒 FROZEN | 107 POST route |
| Input Sanitizer (75 pattern) | 🔒 FROZEN | |
| Correlation ID (X-Correlation-Id) | 🔒 FROZEN | LAW-61 |
| Mass Assignment Protection | 🔒 FROZEN | Whitelist در همه routes |
| CSRF Protection | 🔒 FROZEN | N/A (Bearer token, نه cookie) |
| SQL Injection Protection | 🔒 FROZEN | Prisma parameterized |

### ۳.۴ Data Protection

| تصمیم | وضعیت | توضیح |
|-------|-------|-------|
| PII Encryption (AES-256-GCM) | 🟡 CONDITIONAL | Service exists (`pii-encryption.ts`) ولی فعلاً **ORPHANED** — هیچ فیلدی encrypted نیست. قبل از Production باید متصل شود. |
| File Virus Scan (ClamAV) | 🟡 CONDITIONAL | Service exists. Sandbox mode (EICAR). Production: ClamAV daemon. |
| Signed URL (HMAC) | 🔒 FROZEN | 15min expiry, cross-file abuse blocked |
| Audit Log (Immutable) | 🔒 FROZEN | AuditLog model + throw on update/delete |
| Secrets Management | 🟡 CONDITIONAL | فعلاً .env. قبل از Production: Vault/KMS. |

---

## بخش ۴ — الگوی Event-Driven 🔒

### ۴.۱ Outbox Pattern

| تصمیم | وضعیت | توضیح |
|-------|-------|-------|
| OutboxMessage model | 🔒 FROZEN | همه events در transaction اصلی نوشته می‌شوند |
| OutboxDispatcher (5s poll) | 🔒 FROZEN | run-workers.ts |
| Retry Policy (exponential backoff) | 🔒 FROZEN | 2^attempt, max 1h, 8 attempts |
| Dead Letter Queue | 🔒 FROZEN | بعد از 8 retry → dead_letter status |
| Outbox Reaper | ⏳ DEFERRED | Cleanup published messages > 30 days. فعلاً دستی. |

### ۴.۲ Inbox Pattern

| تصمیم | وضعیت | توضیح |
|-------|-------|-------|
| ProcessedMessage model | 🔒 FROZEN | exactly-once (LAW-26) |
| InboxWorker (5s poll) | 🔒 FROZEN | run-workers.ts |
| Consumer ID | 🔒 FROZEN | هر consumer جداگانه |
| Payload Hash | 🔒 FROZEN | برای idempotency |

### ۴.۳ Saga Pattern

| تصمیم | وضعیت | توضیح |
|-------|-------|-------|
| SagaDefinition + SagaInstance | 🔒 FROZEN | |
| sales_order_fulfillment (5 step) | 🔒 FROZEN | reserve → ship → invoice → payment → complete |
| return_processing | 🔒 FROZEN | |
| Saga Timeout | ❌ **MISSING** | فعلاً نداریم. **باید اضافه شود.** Saga بدون timeout می‌تواند hang کند. |
| Compensation Action | 🔒 FROZEN | هر step compensation دارد |
| Saga State Machine | 🔒 FROZEN | running | completed | failed | compensated |

### ۴.۴ Domain Events

| تصمیم | وضعیت | توضیح |
|-------|-------|-------|
| 46 Event در catalog | 🔒 FROZEN | event-catalog.ts |
| Event Versioning (LAW-15) | 🔒 FROZEN | v1.0, v2.0 |
| Event Payload = JSON | 🔒 FROZEN | |
| Event Ordering (aggregate sequence) | ❌ **MISSING** | فعلاً sequence نداریم. PendingOrderedEvent لازم است. |
| Event Schema Evolution | 🟡 CONDITIONAL | فعلاً versioning. Schema Registry در V2. |

### ۴.۵ Cross-Context Communication

| تصمیم | وضعیت | توضیح |
|-------|-------|-------|
| No Direct Cross-Context Repository (LAW-04) | 🔒 FROZEN | |
| No Cross-Context Synchronous Commands (LAW-25) | 🔒 FROZEN | |
| Event Bus (in-process) | 🔒 FROZEN | PrismaEventBus |
| Redis Pub/Sub | ⏳ DEFERRED | فقط اگر multi-instance |

---

## بخش ۵ — Hardening BISMARK (موجود + ناقص)

### ۵.۱ Hardening موجود ✅

| Hardening Item | LAW | وضعیت | Evidence |
|----------------|-----|-------|----------|
| Aggregate Version (Optimistic Lock) | LAW-07 | ✅ EXISTS | 36 مدل version field دارند |
| Idempotency (IdempotencyKey) | LAW-06 | ✅ EXISTS | 107 POST route |
| Outbox Pattern | LAW-08 | ✅ EXISTS | OutboxMessage + Dispatcher + Retry + DLQ |
| Inbox Pattern (exactly-once) | LAW-09 | ✅ EXISTS | ProcessedMessage + InboxWorker |
| Snapshot Policy (Ledger scalability) | LAW-10 | ✅ EXISTS | SnapshotPolicy + SnapshotScheduler + SnapshotWorker |
| Unit of Work (Transaction Boundary) | LAW-11/12 | ✅ EXISTS | UnitOfWork.execute() |
| Financial Integrity (Double Entry) | LAW-13/35 | ✅ EXISTS | totalDebit == totalCredit |
| Immutable Business Documents | LAW-14/21 | ✅ EXISTS | Invoice immutable after issue |
| Event Versioning | LAW-15 | ✅ EXISTS | |
| Reservation Before Shipment | LAW-17 | ✅ EXISTS | |
| Shipment Immutable After Shipping | LAW-18 | ✅ EXISTS | |
| Only Financial Creates JE | LAW-19/34 | ✅ EXISTS | financial-handlers.ts |
| Payment Allocation | LAW-20 | ✅ EXISTS | PaymentAllocation |
| Return Inspection | LAW-22 | ✅ EXISTS | inspectedCondition field |
| Refund Requires Approved Return | LAW-23 | ✅ EXISTS | |
| Replacement = Return + New Fulfillment | LAW-24 | ✅ EXISTS | replacementSalesOrderId |
| Exactly-Once Event Processing | LAW-26 | ✅ EXISTS | |
| Saga for Long-Running Processes | LAW-27 | ✅ EXISTS | |
| Warranty Activation From Shipment | LAW-28 | ✅ EXISTS | |
| Warranty Claim Inspection | LAW-29 | ✅ EXISTS | |
| Device Timeline From Events | LAW-30 | ✅ EXISTS | |
| Part Consumption Ledger Event | LAW-31 | ✅ EXISTS | |
| QC Before Delivery | LAW-32 | ✅ EXISTS | |
| Warranty Approval → Service Request (Event) | LAW-33 | ✅ EXISTS | |
| JE Balance | LAW-35 | ✅ EXISTS | |
| Closed Period Immutable | LAW-36 | ✅ EXISTS | |
| Reversal Corrects Posted JE | LAW-37 | ✅ EXISTS | |
| Period Close Validation | LAW-38 | ✅ EXISTS | closing-validation route |
| Year Close → Opening Balances | LAW-39 | ✅ EXISTS | |
| Subledger Reconciles with GL | LAW-40 | ✅ EXISTS | |
| Allocation Reversible | LAW-41 | ✅ EXISTS | |
| Customer Balance Derived | LAW-42 | ✅ EXISTS | |
| Tax Derived From Rules | LAW-43 | ✅ EXISTS | |
| Tax Posting Independent JE | LAW-44 | ✅ EXISTS | |
| Tax Rules Versioned | LAW-45 | ✅ EXISTS | |
| Financial Statements From Posted JE | LAW-46 | ✅ EXISTS | |
| Reports Reproducible | LAW-47 | ✅ EXISTS | |
| Reporting Never Mutates | LAW-48 | ✅ EXISTS | |
| Workflow Engine Changes State | LAW-49 | ✅ EXISTS | |
| Rules Declarative + Versioned | LAW-50 | ✅ EXISTS | |
| Notifications Event-Driven | LAW-51 | ✅ EXISTS | |
| Rule Engine Evaluates | LAW-52 | ✅ EXISTS | |
| Rule Evaluation Deterministic | LAW-53 | ✅ EXISTS | |
| Rule Execution Auditable | LAW-54 | ✅ EXISTS | |
| Notifications Template-Based | LAW-55 | ✅ EXISTS | |
| Notification Channel-Agnostic | LAW-56 | ✅ EXISTS | |
| Notification Retryable + Idempotent | LAW-57 | ✅ EXISTS | |
| Atomic Sequence Allocation | — | ✅ EXISTS | BusinessCodeRepository.nextSequence() |
| Tenant Runtime Enforcement | — | ✅ EXISTS | TenantContext + getTenantId() |
| Refresh Token Rotation | — | ✅ EXISTS | old token invalidated on refresh |
| Session Revocation | — | ✅ EXISTS | isSessionActive + globalThis cache |
| MFA (TOTP) | — | ✅ EXISTS | otplib v13, setup/verify/disable routes |

**Total: 54 LAW + 4 additional hardening items = 58 hardening items**

### ۵.۲ Hardening ناقص — باید اضافه شود

| Hardening Item | وضعیت | توضیح | Priority |
|----------------|-------|-------|----------|
| **Saga Timeout** | ❌ MISSING | Saga بدون timeout می‌تواند hang کند. هر Saga step باید deadline داشته باشد. | P1 |
| **PendingOrderedEvent** | ❌ MISSING | Event ordering داخل aggregate. فعلاً events بدون sequence هستند. | P1 |
| **Projection Shadow Rebuild** | ❌ MISSING | Rebuild projection بدون downtime. فعلاً projection نداریم. | P2 (با BI) |
| **Outbox Reaper** | ❌ MISSING | Cleanup published messages > 30 days. فعلاً دستی. | P2 |
| **Password Reset Token** | ❌ MISSING | قبل از Production لازم. | P1 |
| **Refresh Token Reuse Detection** | ❌ MISSING | اگر refresh token دوباره استفاده شد → revoke all sessions. | P1 |

---

## بخش ۶ — اصلاحات Queen (۵ مورد)

### Queen Correction 1: ServiceRequest ≠ TechnicianJob 🔒

**مشکل فعلی:**
ServiceRequest و ServiceOrder موجود هستند، ولی TechnicianJob وجود ندارد. TechnicianAssignment به ServiceOrder متصل است، نه به یک Job مستقل.

**مدل درست:**

```text
Customer
   ↓
ServiceRequest (درخواست از مشتری)
   ↓
ServiceOrder (سفارش تعمیر — ایجاد شده از ServiceRequest)
   ↓
TechnicianJob (مأموریت تکنسین — مستقل از ServiceOrder)
   ↓
Appointment (زمان‌بندی)
   ↓
ServiceReport (گزارش نهایی)
```

**وضعیت فعلی:**
- ServiceRequest ✅ EXISTS
- ServiceOrder ✅ EXISTS (با serviceRequestId link)
- TechnicianAssignment ✅ EXISTS (به serviceOrderId متصل، نه Job)
- Appointment ✅ EXISTS
- ServiceReport ❌ MISSING
- TechnicianJob ❌ MISSING (الان TechnicianAssignment این نقش را ایفا می‌کند ولی کافی نیست)

**تصمیم:**
- 🔒 FROZEN: TechnicianJob باید به‌عنوان مدل مستقل اضافه شود.
- TechnicianAssignment باید به TechnicianJob متصل شود (نه مستقیم به ServiceOrder).
- ServiceReport باید به TechnicianJob متصل شود.
- این تغییر در Phase 4 (Technician Platform) انجام می‌شود.

**دلیل:**
- گزارش‌های واقعی نیاز دارند: "چند Job تکنسین داشته؟" نه "چند Assignment."
- یک ServiceOrder می‌تواند چند Job داشته باشد (مثلاً تعمیر اول + تعمیر مجدد).
- Job مستقل از ServiceOrder است (می‌تواند بدون SO باشد در موارد خاص).

### Queen Correction 2: Van Stock 🔒

**مشکل فعلی:**
تکنسین قطعات را از انبار central می‌گیرد، ولی Van Stock (انبار روی خودرو تکنسین) وجود ندارد. فقط `ServiceOrderPart` داریم که consumption را ثبت می‌کند ولی stock را مدیریت نمی‌کند.

**مدل درست:**

```text
Central Warehouse
       ↓
VanTransfer (انتقال به Van)
       ↓
VanStock (موجودی Van تکنسین)
       ↓
VanStockLedger (دفتر Van — مثل InventoryTransaction)
       ↓
PartConsumption (مصرف در Job)
       ↓
VanRestockRequest (درخواست تكمید از Central)
```

**وضعیت فعلی:**
- VanStock ❌ MISSING
- VanStockLedger ❌ MISSING
- VanTransfer ❌ MISSING
- VanRestockRequest ❌ MISSING
- ServiceOrderPart ✅ EXISTS (consumption ثبت می‌کند ولی stock نه)

**تصمیم:**
- 🔒 FROZEN: Van Stock باید با Ledger Pattern پیاده‌سازی شود (مثل Inventory).
- VanStock = aggregate root با version field.
- VanStockLedger = append-only ledger (مثل InventoryTransaction).
- VanTransfer = از Central به Van (مثل StockTransfer).
- VanRestockRequest = درخواست تكمید.
- این تغییر در Phase 4 (Technician Platform) انجام می‌شود.

**دلیل:**
- بدون Van Stock، تکنسین نمی‌داند چقدر قطعه دارد.
- بدون Ledger، نمی‌توانیم discrepancy پیدا کنیم.
- بدون Restock Request، فرآیند تكمید خودکار نمی‌شود.

### Queen Correction 3: حفظ Hardening قبلی 🔒

**قانون:**
هیچ تغییر جدیدی نباید Hardening موجود را حذف کند.

**Hardening که باید حفظ شود:**

| Hardening | LAW | حفظ |
|-----------|-----|-----|
| Aggregate Version | LAW-07 | 🔒 |
| Aggregate Sequence | (missing) | 🔒 باید اضافه شود |
| Atomic Sequence Allocation | — | 🔒 |
| PendingOrderedEvent | (missing) | 🔒 باید اضافه شود |
| Outbox Reaper | (missing) | 🔒 باید اضافه شود |
| Saga Timeout | (missing) | 🔒 باید اضافه شود |
| Projection Shadow Rebuild | (missing) | 🔒 باید اضافه شود (با BI) |
| Tenant Runtime Enforcement | — | 🔒 |
| Refresh Token Reuse Detection | (missing) | 🔒 باید اضافه شود |
| Password Reset Token | (missing) | 🔒 باید اضافه شود |

### Queen Correction 4: Golden Slice 🔒

**تعریف:**
یک Vertical Slice کامل از ابتدا تا انتها که واقعاً کار کند. قبل از اینکه ده‌ها Feature بسازیم.

```text
Product
  ↓
Serial (ProductInstance)
  ↓
Inventory (StockItem + Ledger)
  ↓
Sales (SalesOrder + Lines)
  ↓
Delivery (Shipment)
  ↓
Installation
  ↓
Warranty Activation
  ↓
Service Request
  ↓
TechnicianJob
  ↓
Repair (Diagnosis + Parts + Labor)
  ↓
QC
  ↓
ServiceReport
  ↓
Close
```

**شرط Golden Slice:**
- ✅ هر stage واقعاً Runtime کار کند
- ✅ هر transition state machine باشد
- ✅ هر financial effect Journal Entry ایجاد کند
- ✅ هر inventory effect Ledger Event ایجاد کند
- ✅ هر stage Audit Log داشته باشد
- ✅ هر stage Outbox Event منتشر کند
- ✅ E2E Test وجود داشته باشد

**وضعیت فعلی:**
- Product → Serial → Inventory → Sales → Shipment: ✅ موجود (با BUG-03 response.clone)
- Installation → Warranty: ✅ موجود
- ServiceRequest → ServiceOrder: ✅ موجود
- TechnicianJob: ❌ MISSING
- ServiceReport: ❌ MISSING
- E2E Test: ❌ MISSING

**تصمیم:**
- 🔒 FROZEN: Golden Slice قبل از هر Feature جدید کامل شود.
- ترتیب: BUG-03 fix → Golden Slice → PostgreSQL → بقیه

### Queen Correction 5: AI ممنوع ⏳

**تصمیم:**
- ⏳ DEFERRED: AI (Chatbot, Recommendation, Predictive Maintenance, Agent) فعلاً ممنوع.
- AI باید آخر کار بیاید، نه برای جبران ضعف معماری.

**ترتیب صحیح:**
```text
Data → Business Rules → Workflow → Transactions → Audit →
Security → Observability → Reporting → Automation → AI
```

**AI Features که DEFERRED هستند:**
- AI Service Diagnosis
- Demand Forecasting
- Customer Churn Prediction
- Predictive Maintenance
- Technician Recommendation (ML-based)
- Advanced BI (Metabase/Superset)
- Anomaly Detection

---

## بخش ۷ — الگوی Engineer بصری

### چرخه مهندسی اجباری

```text
SPEC
  ↓
IMPLEMENT
  ↓
UNIT TEST
  ↓
INTEGRATION TEST
  ↓
RUNTIME TEST
  ↓
E2E
  ↓
SECURITY
  ↓
LOAD / CONCURRENCY
  ↓
AUDIT
  ↓
DONE
```

### قوانین Verification

| سطح | تعریف |
|-----|-------|
| **CODE VERIFIED** | کد وجود دارد، lint passes، compiles |
| **RUNTIME VERIFIED** | API فراخوانی شده، response صحیح، DB state صحیح |
| **PRODUCTION VERIFIED** | در Production واقعی کار می‌کند، Load tested، DR tested |
| **NOT VERIFIED** | هیچ‌کدام از بالا |

**قانون:** هیچ Featureای بدون RUNTIME VERIFIED به‌عنوان "Done" اعلام نشود.

---

## بخش ۸ — تکنولوژی‌های رد شده ❌

| تکنولوژی | وضعیت | دلیل |
|----------|-------|------|
| Kafka | ❌ REJECTED | Outbox + in-process کافی است |
| RabbitMQ | ❌ REJECTED | Redis Pub/Sub کافی است |
| Elasticsearch | ❌ REJECTED (V1) | PostgreSQL FTS کافی است |
| Kubernetes | ❌ REJECTED (V1) | Docker Compose کافی است |
| GraphQL | ❌ REJECTED | REST + typed api-client کافی است |
| gRPC | ❌ REJECTED | REST کافی است |
| Vector DB | ❌ REJECTED (V1) | برای AI در V2/V3 |
| ClickHouse | ❌ REJECTED (V1) | PostgreSQL MV کافی است |
| Service Mesh (Istio) | ❌ REJECTED | Monolith لازم ندارد |
| API Gateway (Kong) | ❌ REJECTED | Caddy کافی است |
| CQRS کامل | ❌ REJECTED | Projection ساده کافی است |
| Event Sourcing کامل | ❌ REJECTED | Outbox + Snapshot کافی است |
| Microservices | ❌ REJECTED (V1) | Modular Monolith کافی است |
| BPMN Workflow Engine | ❌ REJECTED | JSON-based Workflow کافی است |
| React Native | ❌ REJECTED | Flutter انتخاب شد |

---

## بخش ۹ — تکنولوژی‌های مشروط 🟡

| تکنولوژی | وضعیت | شرط |
|----------|-------|-----|
| Redis | 🟡 CONDITIONAL | برای Rate Limit + Cache + Queue. قبل از Production لازم. |
| MinIO (S3-compatible) | 🟡 CONDITIONAL | برای File Storage + Backup. قبل از Production لازم. |
| Flutter | 🟡 CONDITIONAL | برای Technician Mobile App. در Phase 4. |
| OpenTelemetry | 🟡 CONDITIONAL | برای Tracing. در Phase 2 (Production Foundation). |
| Prometheus + Grafana | 🟡 CONDITIONAL | برای Metrics + Dashboards. در Phase 2. |
| Loki | 🟡 CONDITIONAL | برای Log Aggregation. در Phase 2. |
| Sentry | 🟡 CONDITIONAL | برای Error Tracking. در Phase 2. |
| HashiCorp Vault | 🟡 CONDITIONAL | برای Secrets. در Phase 2 (یا AWS Secrets Manager). |
| FCM + APNs | 🟡 CONDITIONAL | برای Push Notification. در Phase 4. |
| PostGIS | 🟡 CONDITIONAL | برای Distance Calculation در Dispatch. در Phase 6. |
| node-cron | 🟡 CONDITIONAL | برای Scheduled Jobs. در Phase 9. |
| ClamAV | 🟡 CONDITIONAL | برای File Virus Scan. در Phase 2 (production mode). |

---

## بخش ۱۰ — تکنولوژی‌های معوق ⏳

| تکنولوژی | وضعیت | زمان |
|----------|-------|------|
| AI Layer (LLM, ML) | ⏳ DEFERRED | V2 — بعد از Reporting + Automation |
| WhatsApp Business | ⏳ DEFERRED | V2 |
| Advanced BI (Metabase) | ⏳ DEFERRED | V2 |
| Multi-Currency | ⏳ DEFERRED | V2 |
| Multi-Language (i18n) | ⏳ DEFERRED | V2 |
| Microservices Split | ⏳ DEFERRED | V3 — فقط اگر Monolith bottleneck شود |
| Kubernetes | ⏳ DEFERRED | V3 |
| Redis Cluster | ⏳ DEFERRED | V2 — فقط اگر single Redis کافی نباشد |
| Read Replica | ⏳ DEFERRED | V2 — فقط اگر read load زیاد شود |
| Event Schema Registry | ⏳ DEFERRED | V2 |
| ClickHouse | ⏳ DEFERRED | V2 — فقط اگر PostgreSQL MV کافی نباشد |

---

## بخش ۱۱ — Golden Slice Definition

### زنجیره Golden Slice

```text
[1] Product Created
  ↓
[2] ProductInstance (Serial) Created
  ↓
[3] StockItem Created (Inventory)
  ↓
[4] SalesOrder Created (with lines)
  ↓
[5] SalesOrder Approved → Inventory Reserved
  ↓
[6] Shipment Created → Shipped → Delivered
  ↓
[7] Installation Created → Completed
  ↓
[8] WarrantyCard Activated
  ↓
[9] ServiceRequest Created (from customer)
  ↓
[10] ServiceOrder Created (from ServiceRequest)
  ↓
[11] TechnicianJob Created (from ServiceOrder)
  ↓
[12] Technician Assigned (Dispatch)
  ↓
[13] Appointment Scheduled
  ↓
[14] Technician Check-in (GPS)
  ↓
[15] Diagnosis Recorded
  ↓
[16] Parts Consumed (from Van Stock)
  ↓
[17] Labor Recorded
  ↓
[18] Photos Before/After
  ↓
[19] Customer Signature
  ↓
[20] QC Passed
  ↓
[21] ServiceReport Created
  ↓
[22] Technician Check-out
  ↓
[23] Job Completed
  ↓
[24] ServiceOrder Closed
  ↓
[25] Survey Sent to Customer
  ↓
[26] Payment Recorded (if paid service)
  ↓
[27] Journal Entry Created (if financial impact)
  ↓
[28] Outbox Events Published throughout
  ↓
[29] Audit Log for every state change
```

### شرط Golden Slice Done

- ✅ هر ۲۹ stage Runtime کار کند
- ✅ هر stage State Machine validation داشته باشد
- ✅ هر financial effect JE ایجاد کند (balanced)
- ✅ هر inventory effect Ledger Event ایجاد کند
- ✅ هر stage Audit Log داشته باشد
- ✅ هر stage Outbox Event منتشر کند
- ✅ E2E Test خودکار وجود داشته باشد
- ✅ Concurrent scenario تست شده باشد
- ✅ Failure + Rollback تست شده باشد

### وضعیت فعلی Golden Slice

| Stage | موجود | Runtime Verified | نکته |
|-------|-------|-----------------|------|
| 1-3 (Product → Inventory) | ✅ | ✅ | |
| 4-5 (Sales → Reserve) | ✅ | 🟡 | BUG-03 (response.clone) |
| 6 (Shipment) | ✅ | 🟡 | BUG-03 |
| 7-8 (Install → Warranty) | ✅ | ✅ | |
| 9-10 (SR → SO) | ✅ | ✅ | |
| 11 (TechnicianJob) | ❌ | ❌ | MISSING — Queen Correction 1 |
| 12 (Dispatch) | ✅ | ✅ | BUG-02 fixed |
| 13 (Appointment) | ✅ | 🟡 | |
| 14 (Check-in) | ✅ | 🟡 | Needs technician user |
| 15 (Diagnosis) | ✅ | 🟡 | |
| 16 (Parts from Van) | ❌ | ❌ | MISSING — Queen Correction 2 |
| 17 (Labor) | ✅ | 🟡 | |
| 18 (Photos) | ✅ | 🟡 | |
| 19 (Signature) | ✅ | 🟡 | |
| 20 (QC) | ✅ | 🟡 | |
| 21 (ServiceReport) | ❌ | ❌ | MISSING |
| 22 (Check-out) | ✅ | 🟡 | |
| 23-24 (Job/SO Close) | ✅ | 🟡 | |
| 25 (Survey) | ✅ | ✅ | |
| 26-27 (Payment/JE) | ✅ | ✅ | BUG-01 fixed |
| 28 (Outbox Events) | ✅ | ✅ | |
| 29 (Audit Log) | ✅ | 🟡 | Only 3 routes instrumented |

**نقص‌های Golden Slice:**
1. ❌ TechnicianJob model (Queen Correction 1)
2. ❌ Van Stock (Queen Correction 2)
3. ❌ ServiceReport model
4. 🟡 BUG-03 (response.clone) باید fix شود
5. 🟡 Audit Log coverage باید گسترش یابد
6. ❌ E2E Test خودکار

---

## بخش ۱۲ — Roadmap نهایی (بر اساس Master Spec)

### ترتیب اجباری

```text
مرحله ۱: BUG-01 + BUG-02 Fix ✅ DONE (Runtime Verified)
    ↓
مرحله ۲: BUG-03 Fix (response.clone — 60 routes) ← NEXT
    ↓
مرحله ۳: Golden Slice Completion
  - TechnicianJob model
  - Van Stock + Ledger
  - ServiceReport model
  - E2E Test
    ↓
مرحله ۴: Production Foundation
  - PostgreSQL migration
  - Backup + Restore + PITR
  - DR Plan + Drill
  - Observability (Prometheus + Grafana + Loki + Sentry)
  - Redis + MinIO
  - CI/CD
  - Secrets Management
  - Wire orphaned services (PII, Commission, Metrics, Logger)
    ↓
مرحله ۵: Technician Platform (Mobile)
  - Flutter App
  - Offline Sync
  - Push Notification
  - GPS + Camera + Barcode + Signature
    ↓
مرحله ۶: Dispatch + SLA Production-grade
  - Distance Calculation (PostGIS)
  - Coverage Area
  - SLA Escalation
    ↓
مرحله ۷: Reporting + BI
  - Projections
  - 26 Reports
  - Executive Dashboard
    ↓
مرحله ۸: CRM + Customer 360
  - Opportunity + Campaign + Task
  - CLV + Segmentation
  - Customer 360 Projection
    ↓
مرحله ۹: Automation
  - Scheduler
  - Trigger-based
    ↓
مرحله ۱۰: AI (V2 — DEFERRED)
```

---

## بخش ۱۳ — نمره‌دهی رسمی

### نمرات فعلی (Verified)

| شاخص | نمره | مبنای شواهد |
|------|------|-------------|
| **معماری کلان** | 8.7/10 | DDD + Event-Driven + 54 LAW + Modular Monolith |
| **Business Analysis** | 9.0/10 | Master Prompt 39 section + Blueprint 8721 lines |
| **Domain Design** | 8.5/10 | 18 Bounded Contexts + 123 models |
| **Database Design** | 8.0/10 | Loose FK + Optimistic Lock + Ledger Pattern. نقص: FK relations ناقص |
| **Financial** | 8.3/10 | Double Entry + 14 Financial LAW. نقیصه: Concurrent test نشده |
| **Inventory** | 8.0/10 | Ledger Pattern + Snapshot. نقیصه: Van Stock نیست |
| **Security** | 8.0/10 | JWT + MFA + RBAC + 12 Headers + Signed URL. نقیصه: PII orphaned |
| **Event/Workflow** | 8.5/10 | Outbox + Inbox + Saga + 46 events. نقیصه: Saga Timeout نیست |
| **Mobile/Offline** | 3.5/10 | Backend 40%. App 0%. Offline 0% |
| **Production Readiness** | 2.5/10 | SQLite. No backup. No observability. No CI/CD run. |
| **Implementation** | 6.0/10 | 175 routes. ولی BUG-03 + orphaned services |
| **Anti-Overengineering** | 9.3/10 | 14 تکنولوژی REJECTED. Modular Monolith حفظ شده. |
| **Roadmap** | 8.5/10 | Master Execution Plan + Golden Slice |
| **امتیاز کلی معماری/Spec** | **8.6/10** | |
| **آمادگی Production** | **~3/10** | |

**قانون:** این دو نمره هرگز با هم قاطی نشوند.

---

## بخش ۱۴ — Definition of Done (سراسری)

A Feature is Done ONLY when ALL of the following are complete:

```text
□ SPEC (در Master Spec تعریف شده)
□ IMPLEMENT (کد نوشته شده)
□ UNIT TEST (logic تست شده)
□ INTEGRATION TEST (API + DB تست شده)
□ RUNTIME TEST (API فراخوانی شده، response صحیح)
□ E2E (در Golden Slice کار می‌کند)
□ SECURITY (RBAC + Tenant + Validation)
□ AUDIT (AuditLog entry)
□ IDEMPOTENCY (IdempotencyKey)
□ OBSERVABILITY (Logger + Metrics)
□ DOCUMENTATION (ADR if architectural)
```

### برای Critical Features (اضافی):

```text
□ CONCURRENCY (parallel requests تست شده)
□ FAILURE RECOVERY (rollback تست شده)
□ FINANCIAL INTEGRITY (JE balanced)
□ LOAD TEST (performance قابل قبول)
```

---

## بخش ۱۵ — سند مرجع

### اسناد مادر

| سند | مسیر | وضعیت |
|------|------|-------|
| **BISMARK MASTER SPEC v1.0** | `docs/bismark-master-spec.md` | 🔒 THIS DOCUMENT |
| Master Execution Plan | `docs/bismark-master-execution-plan.md` | 🟡 Reference |
| Post-P0 Fix Deep Audit | `docs/bismark-post-p0-fix-deep-audit.md` | ✅ Verified |
| Post-Phase 6 Deep Audit | `docs/bismark-post-phase6-deep-audit.md` | ✅ Verified |
| Audit v4 | `docs/audit-report-v4.md` | ✅ Verified |
| DR Plan | `docs/dr-plan.md` | 🟡 Documented, not drilled |
| Blueprint | `docs/bismark-blueprint.md` | 🟡 Reference |

### قوانین تغییر Master Spec

1. هیچ تغییر بدون ADR (Architecture Decision Record) مجاز نیست.
2. ADR باید شامل: Context → Decision → Consequences → Alternatives.
3. تغییر 🔒 FROZEN نیاز به Blocker بحرانی دارد.
4. تغییر ❌ REJECTED نیاز به Requirement تغییر کرده دارد.
5. تمام تغییرات در `docs/adr-index.md` ثبت می‌شوند.

---

**END OF BISMARK MASTER SPEC v1.0**

> این سند از این لحظه **Single Source of Truth** پروژه BISMARK است.
> هیچ تصمیمی خارج از این سند معتبر نیست.
> هیچ Featureای بدون RUNTIME VERIFIED به‌عنوان "Done" اعلام نشود.
> کیفیت مهم‌تر از تعداد Feature است.
