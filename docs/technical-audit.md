# ممیزی جامع معماری فنی و امنیت — BISMARK ERP

> **شناسه سند:** AUDIT-2025-01
> **تاریخ تدوین:** ۱۴۰۴/۰۵/۱۰
> **ممیز:** معمار نرم‌افزار (General-Purpose Sub Agent)
> **پایه ممیزی:** کد واقعی موجود در فایل‌سیستم (نه ادعاهای worklog)
> **محدوده:** تمامی ۲۵ بخش درخواستی کاربر
> **زبان:** فارسی (مطابق زبان ارتباط کاربر)

---

## ۰. وضعیت پیاده‌سازی واقعی (Implementation Status) — تذکر بحرانی

> ⚠️ **هشدار مهم برای خواننده:** این ممیزی بر اساس کد **واقعاً موجود** در فایل‌سیستم نوشته شده است. فایل `worklog.md` (بیش از ۶۳۷۴ خط ادعا شده) حاوی توصیفاتی است که با واقعیت کد مطابقت ندارد. در این سند هر جا چیزی «وجود ندارد»، واقعاً فایل آن در مخزن نیست.

### ۰.۱ مقایسه واقعیت با ادعای worklog

| سنجه | ادعای worklog | واقعیت فایل‌سیستم | توضیح |
|------|--------------|-------------------|--------|
| مدل‌های Prisma | ۹۶ | **۸۹** | ۸۹ مدل واقعاً در `prisma/schema.prisma` تعریف شده‌اند. مدل‌های مربوط به Sprint 7.4+ وجود ندارند. |
| مسیرهای API | ~۲۴۴ | **۱۱۸** | شمارش با `find … -name route.ts` در `src/app/api/v1/`. |
| Viewهای UI | ۳۶ | **۱۷ فایل view + داشبورد/کاربران/نقش‌ها/اشخاص/شعب در page.tsx (۲۴ view ناوبری)** | ۱۷ کامپوننت در `src/components/views/` وجود دارد. |
| فایل‌های تست | ۲۱ | **۳** | فقط سه فایل در `src/tests/unit/` وجود دارد. |
| تست‌های پاس‌شونده | ۷۵۸ | **۶۸** | مطابق `production-readiness-checklist.md` و شمارش `it(` در سه فایل تست. |
| فایل‌های قانون (Law) | ۶۴ (LAW-01..64) | **۵۴ (LAW-04..57)** | قانون‌های ۵۸–۶۴ که ادعا شده، فایل ندارند و در `src/lib/shared/index.ts` نیز export نشده‌اند. |
| دایرکتوری ماژول‌ها | ۷+ (scheduler, ai, bi, monitoring, automation, perf, security) | **۳ (notification, product, shared)** | فقط این سه دایرکتوری در `src/lib/modules/` وجود دارند. |
| خطوط page.tsx | ۱۵۴۵+ | **۱۴۶۴** | فایل واقعی ۱۴۶۴ خط است. |

### ۰.۲ آنچه واقعاً پیاده‌سازی شده (Sprint 1 تا 7.3)

#### ۰.۲.۱ موجود در کد واقعی

- **۵۴ فایل قانون معماری** در مسیر `src/lib/shared/laws/law-04.ts` تا `law-57.ts` (قانون‌های ۱ تا ۳ و ۵۸ تا ۶۴ مفقود هستند).
- **۸۹ مدل Prisma** پوشش‌دهنده: زیرساخت (Idempotency، Outbox، Inbox، Snapshot)، Identity (User, Role, Permission, Session, Tenant)، Organization (Branch)، Party، Product (Category, Brand, Model, Product, Instance)، Inventory (Warehouse, Zone, Location, Bin, StockItem, Transaction, Balance, Reservation, Transfer, TransferLine, CycleCount, CycleCountLine)، Sales (Order, Line, PriceList, Line, Quote, Line)، Fulfillment (Shipment, Line, PickList, Line)، Billing (Invoice, Line, Payment, Allocation, CreditNote, Line)، Returns (ReturnOrder, Line, Refund)، Warranty (Policy, Card, Claim, Extension, Transfer)، Service (Request, Order, Line, Diagnosis, Part, Labor, QC, TechnicianAssignment)، Financial (ChartOfAccount, FiscalYear, Period, CostCenter, TaxCode, JournalEntry, Line, AR/AP Transaction, Allocation, TaxRule, Calculation, Posting)، Workflow (Definition, Instance, History)، Rule (Set, Definition, Execution, AuditStep)، Notification (Template, Notification, Delivery, Preference, Queue)، Saga (Definition, Instance).
- **۱۱۸ مسیر API** در `src/app/api/v1/`.
- **۱۷ فایل view** در `src/components/views/`.
- **Shared Kernel کامل**: value-objects (UuidV7, Money, DateRange, Locale)، exceptions (DomainException, NotFoundException, ValidationException, BusinessException, ConflictException)، events (DomainEvent, EventBus, PrismaEventBus)، outbox (Dispatcher, Publisher, RetryPolicy, DeadLetterHandler)، inbox (InboxWorker)، snapshot (Policy, Scheduler, Worker)، laws، specifications، traits (Auditable, SoftDeletable)، helpers (PersianCalendar, BusinessCodeGenerator)، repositories (BusinessCodeRepository)، infra (UnitOfWork, IdempotencyHelper, OptimisticLockHelper).
- **Event Catalog**: ۴۶ رویداد در `src/lib/event-catalog.ts` (۳۲۶ خط).
- **API Client**: ۱۱۱۰ خط با type definitions کامل.
- **Saga Manager**: ۲۸۰ خط در `src/lib/saga/saga-manager.ts` با دو تعریف (sales_order_fulfillment, return_processing).
- **Event Handlers**: ۱۷۶ خط در `src/lib/event-handlers/index.ts` با ثبت هندلرهای cross-context.
- **Financial Handlers**: ۲۵۳ خط در `src/lib/financial-handlers.ts` با تبدیل رویدادها به Journal Entry.
- **Backend Laravel**: اسکفولد اولیه با Identity, Organization, Party, MasterData modules در `backend/bismark-laravel/` (تنها دو migration: tenants و users).
- **Dockerfile پایه** (۳۲ خط، چندمرحله‌ای با `oven/bun:1`).
- **docker-compose.production.yml** (۱۳۹ خط، شامل app, postgres, redis, outbox-worker, inbox-worker, snapshot-worker, nginx).
- **CI/CD پایه** در `.github/workflows/ci-cd.yml` (۸۷ خط، شامل lint → test → build → security → docker → deploy).
- **پایگاه داده SQLite sandbox**: ۱.۵ مگابایت در `db/custom.db`.

#### ۰.۲.۲ ادعا شده اما در کد موجود نیست (Sprint 7.4 تا 12)

این موارد در `worklog.md` توصیف شده‌اند ولی فایل آن‌ها واقعاً در فایل‌سیستم وجود ندارد:

- ❌ **قوانین ۵۸–۶۴** (LAW-58..LAW-64): فایل‌های `law-58.ts` تا `law-64.ts` مفقود و از `shared/index.ts` export نشده‌اند.
- ❌ **ماژول Scheduler** (Sprint 7.4): مسیر `src/lib/modules/scheduler/` **وجود ندارد**.
- ❌ **ماژول Automation** (Sprint 7.4): مسیر `src/lib/modules/automation/` **وجود ندارد**.
- ❌ **ماژول Monitoring** (Sprint 7.5): مسیر `src/lib/modules/monitoring/` **وجود ندارد**.
- ❌ **ماژول BI** (Sprint 8): مسیر `src/lib/modules/bi/` **وجود ندارد**.
- ❌ **ماژول AI** (Sprint 8): مسیر `src/lib/modules/ai/` **وجود ندارد**.
- ❌ **ماژول Performance** (Sprint 10): مسیر `src/lib/perf/` **وجود ندارد**.
- ❌ **ماژول Security** (Sprint 11): مسیر `src/lib/security/` **وجود ندارد**.
- ❌ **Worker files** (`outbox-worker.ts`, `inbox-worker.ts`, `snapshot-worker.ts`): مسیر `src/workers/` **وجود ندارد** در حالی که `docker-compose.production.yml` به این فایل‌ها ارجاع می‌دهد (سطرهای ۷۴، ۹۳، ۱۱۲).
- ❌ **nginx.conf**: در ریشه پروژه وجود ندارد در حالی که `docker-compose.production.yml` سطر ۱۳۰ به آن ارجاع می‌دهد.
- ❌ **دایرکتوری ssl/**: وجود ندارد.
- ❌ **دایرکتوری scripts/**: وجود ندارد.
- ❌ **مسیرهای API مربوط به Sprint 7.4+**: شامل `/scheduler/*`, `/automations/*`, `/monitoring/*`, `/events/*`, `/dead-letters/*`, `/feature-flags/*`, `/admin/*`, `/bi/*`, `/analytics/*`, `/forecasts/*`, `/ai/*`, `/reports/definitions/*`, `/executive/*`, `/performance/*`, `/security/*`, `/deployment/*` — همه **غیرموجود**.
- ❌ **Viewهای UI مربوط به Sprint 7.4+**: شامل scheduler-dashboard, scheduler-jobs, automations, platform-dashboard, integration-monitor, event-explorer, dead-letter-queue, metrics, feature-flags, admin-console, bi-dashboard, executive-dashboard, analytics, forecast, ai-assistant, report-builder, performance-dashboard, security-dashboard, deployment — همه **غیرموجود**.
- ❌ **فایل‌های تست Sprint 9+**: شامل cron-parser, template-engine, rule-engine, forecast, ai-provider, metrics-collector, event-bus, dead-letter, feature-flags, persian-calendar, outbox-retry, security, api-latency, query-profile و تست‌های یکپارچه‌سازی — همه **غیرموجود**.
- ❌ **فایل‌های مستندسازی ادعا شده**: `docs/backlog.md`, `docs/quality-gate.md`, `docs/performance-report.md`, `docs/disaster-recovery.md`, `docs/deployment-guide.md` — **غیرموجود**.
- ❌ **آزمون‌های یکپارچه‌سازی** در `src/tests/integration`: مسیر **وجود ندارد** (در حالی که `ci-cd.yml` سطر ۴۶ آن را اجرا می‌کند).
- ❌ **داشبورد BI، داشبورد اجرایی، گزارش‌ساز پیشرفته**: هیچ کد UI برای آن‌ها وجود ندارد.

### ۰.۳ نتیجه‌گیری وضعیت پیاده‌سازی

**سپرینت‌های ۱ تا ۷.۳ واقعاً پیاده‌سازی شده‌اند** (با کیفیت معماری بالا) و سپرینت‌های ۷.۴ تا ۱۲ صرفاً در `worklog.md` توصیف شده‌اند و کد آن‌ها در فایل‌سیستم وجود ندارد. این ممیزی بر اساس کد واقعی Sprint 1–7.3 انجام شده است.

---

## ۱. معرفی پروژه (Project Introduction)

### ۱.۱ شناسه کسب‌وکار

**BISMARK ERP** یک سامانه برنامه‌ریزی منابع سازمانی (Enterprise Resource Planning) جامع است که با محوریت مدیریت موجودی فیزیکی، فروش، انبارداری، گارانتی، خدمات پس از فروش و حسابداری طراحی شده است. این پروژه از یک سند چشم‌انداز اولیه (`upload/سند چشم انداز بیسمارک.docx`) نشأت گرفته و بر پایه اصول Domain-Driven Design و معماری میکروسرویس-گرای مونولیتیک (Modular Monolith) بنا شده است.

### ۱.۲ اهداف فنی

بر اساس کد موجود، اهداف فنی قابل استنباط عبارت‌اند از:

1. **پشتیبانی Multi-Tenant** با مدل Shared Database + `tenant_id` (ADR-003). تمام مدل‌های scoping‌شده فیلد `tenantId` دارند (۱۸۵ ارجاع در `schema.prisma`).
2. **رعایت ۵۴ قانون معماری (LAW-04 تا LAW-57)** که در `src/lib/shared/laws/` تعریف شده‌اند.
3. **استفاده از UUID v7** به عنوان شناسه time-ordered (تطبیق در `UuidV7` value object و migration Laravel `ALTER COLUMN id SET DEFAULT uuid_v7()`).
4. **الگوی Outbox/Inbox** برای انتشار مطمئن رویدادهای دامنه و پردازش Exactly-Once (LAW-08/09/26).
5. **Ledger Pattern** برای موجودی و حسابداری (LAW-05/19/34) — هیچ مقدار aggregate به‌عنوان منبع حقیقت ذخیره نمی‌شود.
6. **سازگاری i18n** با تمرکز بر فارسی (fa-IR)، تقویم جلالی (`PersianCalendar`) و کدهای کسب‌وکار مبتنی بر سال شمسی (LAW-02).

### ۱.۳ دامنه عملکردی (از روی کد)

| بستر دامنه (Bounded Context) | مدل‌های اصلی | مسیرهای API نمونه |
|----------------------------|-------------|-------------------|
| Identity | User, Role, Permission, Session, Tenant | (Laravel + sandbox موجود) |
| Organization | Branch | (در Laravel + sandbox) |
| Party | Party | (در page.tsx + API واقعی) |
| Product | ProductCategory, Brand, Model, Product, Instance | `/api/v1/products`, `/product-categories`, `/product-brands`, `/product-models` |
| Inventory | Warehouse, Zone, Location, Bin, StockItem, Transaction, Balance, Reservation, Transfer, CycleCount | `/warehouses`, `/stock-items`, `/inventory-transactions`, `/stock-reservations`, `/stock-transfers`, `/cycle-counts`, `/movements` |
| Sales | SalesOrder, Line, PriceList, Quote | `/sales-orders`, `/sales-orders/[id]/approve` |
| Fulfillment | Shipment, Line, PickList | `/shipments`, `/shipments/[id]/{pick,pack,ship,deliver,tracking}` |
| Billing | Invoice, Line, Payment, Allocation, CreditNote | `/invoices`, `/invoices/[id]/{issue,cancel,credit-note}`, `/payments`, `/payments/[id]/allocate` |
| Returns | ReturnOrder, Refund | `/return-orders`, `/refunds` |
| Warranty | Policy, Card, Claim, Extension, Transfer | `/warranty-cards`, `/warranty-cards/[id]/activate`, `/warranty-claims`, `/warranty-claims/[id]/{inspect,approve}` |
| Service | Request, Order, Diagnosis, Part, Labor, QC, TechAssignment | `/service-requests`, `/service-orders`, `/service-orders/[id]/{diagnose,consume-part,ready,qc}` |
| Financial | COA, FiscalYear, Period, CostCenter, TaxCode, JournalEntry, AR/AP, TaxRule | `/chart-of-accounts`, `/journal-entries`, `/trial-balance`, `/general-ledger`, `/reconciliation`, `/closing-validation`, `/tax/{calculate,post,reports/vat}`, `/fiscal-years`, `/fiscal-periods`, `/ar/*`, `/reports/{dashboard,balance-sheet,profit-loss,cash-flow,equity,final-trial-balance}` |
| Workflow | Definition, Instance, History | `/workflow/{definitions,instances}` |
| Rule | Set, Definition, Execution, AuditStep | `/rule-sets`, `/rule-sets/[id]/publish`, `/rules`, `/rules/evaluate` |
| Notification | Template, Notification, Delivery, Preference, Queue | `/notifications`, `/notifications/{[id],[id]/retry,[id]/cancel,send,stats}`, `/notification/templates/*`, `/notification-preferences`, `/notification-queue/{,process}` |
| Saga | Definition, Instance | (در `saga-manager.ts` + handlers) |
| DeviceTimeline | — | `/device-timeline/[instanceId]` |

### ۱.۴ کاربران هدف

طبق `User.userType` (از `schema.prisma` سطر ۱۲۷) و فایل `types.ts`:

- `customer` (مشتری)
- `representative` (نماینده)
- `technician` (تکنسین)
- `service_center` (مرکز خدمات)
- `staff` (کارمند داخلی)

### ۱.۵ مدل درآمدی و کاربرد تجاری

پروژه به‌صورت یک ERP صنعتی برای کسب‌وکارهایی طراحی شده که:

1. محصول فیزیکی سریال‌دار (serialized) می‌فروشند (مانند لوازم الکترونیکی).
2. انبارهای چندگانه دارند.
3. گارانتی و خدمات پس از فروش ارائه می‌دهند.
4. نیاز به حسابداری دقیق با طرف دین/بدهکار دارند.
5. گردش کار (Workflow) تأییدیه (مانند تأیید سفارش فروش) نیاز دارند.

### ۱.۶ نسخه و وضعیت انتشار

- نسخه پکیج: `0.2.1` (از `package.json`).
- نشان نسخه در UI: `1.0.0 — Sprint 1` (در `page.tsx` سطر ۱۹۲، که نشان‌دهنده این است که UI از Sprint 1 به‌روزرسانی برچسب نسخه نشده است).
- وضعیت: **پیش‌انتشار (Pre-release)** — آماده Production نیست (مشاهده بخش ۲۲ و ۲۳).

---

## ۲. معماری سیستم (System Architecture)

### ۲.۱ الگوی معماری کلی

معماری BISMARK ERP یک **Modular Monolith با Bounded Context های صریح** است که در لایه‌های زیر سازمان‌دهی شده:

```
┌──────────────────────────────────────────────────────────────────┐
│                          Presentation Layer                       │
│  Next.js 16 + React 19 + shadcn/ui + Tailwind 4                  │
│  src/app/page.tsx (1464 lines, 24 views) + 17 view components    │
└─────────────────────────────────┬────────────────────────────────┘
                                  │ fetch /api/v1/*
┌─────────────────────────────────▼────────────────────────────────┐
│                              API Layer                            │
│  Next.js Route Handlers (118 routes under /api/v1/)              │
│  api-helpers.ts: getTenantId, jsonResponse, errorResponse,       │
│                 parseQueryParams (RFC 7807 Problem Details)      │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
┌─────────────────────────────────▼────────────────────────────────┐
│                       Application Services                        │
│  src/lib/modules/notification/services/notification-service.ts   │
│  src/lib/modules/product/services/product-query-service.ts       │
│  src/lib/saga/saga-manager.ts                                    │
│  src/lib/event-handlers/index.ts (cross-context consumers)       │
│  src/lib/financial-handlers.ts (Journal Entry creators)          │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
┌─────────────────────────────────▼────────────────────────────────┐
│                          Domain Layer                             │
│  src/lib/shared/                                                 │
│   ├── value-objects/  (UuidV7, Money, DateRange, Locale)         │
│   ├── exceptions/     (DomainException hierarchy)                │
│   ├── events/         (DomainEvent, EventBus)                    │
│   ├── specifications/ (Specification pattern)                    │
│   ├── traits/         (Auditable, SoftDeletable)                 │
│   ├── laws/           (54 architecture laws: LAW-04..57)         │
│   └── contracts/      (Repository, EventBus, TenantContext)      │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
┌─────────────────────────────────▼────────────────────────────────┐
│                       Infrastructure Layer                        │
│  src/lib/db.ts (PrismaClient singleton)                          │
│  src/lib/shared/infra/                                           │
│   ├── unit-of-work.ts       (LAW-12: db.$transaction wrapper)   │
│   ├── idempotency-helper.ts (LAW-06: SHA-256 dedup)             │
│   ├── optimistic-lock-helper.ts (LAW-07: If-Match + version)    │
│   └── prisma-event-bus.ts   (in-process EventBus)              │
│  src/lib/shared/outbox/ (Dispatcher, Publisher, Retry, DLQ)     │
│  src/lib/shared/inbox/  (InboxWorker — exactly-once)            │
│  src/lib/shared/snapshot/ (SnapshotPolicy, Scheduler, Worker)   │
│  src/lib/shared/repositories/ (BusinessCodeRepository)          │
└──────────────────────────────────────────────────────────────────┘
```

### ۲.۲ Bounded Context ها

از روی مدل‌های Prisma و فایل‌های رویداد، ۱۳ Bounded Context قابل تشخیص است:

1. **Identity** — User, Role, Permission, Session, Tenant
2. **Organization** — Branch
3. **Party** — Party (شخص/سازمان)
4. **Product** — ProductCategory, Brand, Model, Product, Instance
5. **Inventory** — Warehouse, Zone, Location, Bin, StockItem, Transaction, Balance, Reservation, Transfer, CycleCount
6. **Sales** — SalesOrder, Line, PriceList, Quote
7. **Fulfillment** — Shipment, PickList
8. **Billing** — Invoice, Payment, CreditNote
9. **Returns** — ReturnOrder, Refund
10. **Warranty** — Policy, Card, Claim, Extension, Transfer
11. **Service** — Request, Order, Diagnosis, Part, Labor, QC, TechnicianAssignment
12. **Financial** — COA, FiscalYear, Period, CostCenter, TaxCode, JournalEntry, AR/AP, TaxRule
13. **Workflow + Rule** — WorkflowDefinition/Instance/History, RuleSet/Definition/Execution/AuditStep
14. **Notification** — Template, Notification, Delivery, Preference, Queue
15. **Saga** — SagaDefinition, SagaInstance

### ۲.۳ استراتژی ارتباط Cross-Context

طبق LAW-04 (`src/lib/shared/laws/law-04.ts`) و LAW-25، هیچ Context مستقیماً Repository دیگری را import نمی‌کند. ارتباط از طریق:

1. **Domain Events** (LAW-15/25/26) — publisherها در `event-catalog.ts` با ۴۶ رویداد ثبت شده‌اند.
2. **Application Service Contracts** — مانند `product-query-service.ts` در `src/lib/modules/product/contracts/`.
3. **DTOs** — در `src/lib/modules/*/contracts/dtos/`.

مثال جریان واقعی در کد:

- **Sales** سند `sales_order.created` را در Outbox می‌نویسد (`sales-orders/route.ts` سطر ۱۵۸).
- **Outbox Dispatcher** آن را به InboxWorker منتقل می‌کند.
- **InboxWorker** آن را به handler `inventory-reservation-handler` تحویل می‌دهد (`event-handlers/index.ts` سطر ۲۳).
- Inventory ذخیره reservation را (در پیاده‌سازی sandbox: لاگ) انجام می‌دهد و Saga را advance می‌کند.

### ۲.۴ الگوی CQRS

پیاده‌سازی خاصی برای تفکیک Command/Query به‌صورت کلاس‌بندی‌شده دیده نمی‌شود، اما جداسازی ضمنی در مسیرها وجود دارد:

- مسیرهای `GET` همگی از `parseQueryParams` و `findMany` استفاده می‌کنند.
- مسیرهای `POST`/`PATCH` از `UnitOfWork.execute` + `Outbox.append` استفاده می‌کنند.

### ۲.۵ الگوی Event Sourcing و Snapshot

طبق LAW-05 و LAW-10، تمام مقادیر aggregate از یک Ledger append-only مشتق می‌شوند:

- `StockItem` فیلد `on_hand_quantity` ندارد — `StockBalance` یک snapshot صریح است (`schema.prisma` سطر ۵۶۴).
- `StockBalanceSnapshot` (LAW-10) به‌صورت periodic ایجاد می‌شود (`src/lib/shared/snapshot/`).
- مشابه آن برای مالی: `Account.balance` از `JournalEntry` lines مشتق می‌شود.

### ۲.۶ الگوی Saga

`src/lib/saga/saga-manager.ts` (۲۸۰ خط) دو Saga تعریف می‌کند:

1. **sales_order_fulfillment** (۵ مرحله): Reserve Inventory → Create Shipment → Ship → Create Invoice → Complete.
2. **return_processing** (مراحل چندگانه): دریافت مرجوعی → بررسی → بازپرداخت → بستن.

هر مرحله `triggerEvent` و `completionEvent` دارد و در صورت شکست `compensationAction` اجرا می‌شود. این پیاده‌سازی از نظر معماری کامل است اما handlerهای واقعی پیشرفت Saga در `event-handlers/index.ts` بیشتر `console.log` هستند تا منطق کامل کسب‌وکار (مشاهده سطر ۲۵: «For now: log the event»).

### ۲.۷ ارزیابی نهایی معماری

| شاخص | امتیاز | توضیح |
|------|--------|--------|
| جداسازی Context ها | ۹/۱۰ | مرزهای صریح، contracts موجود |
| Ledger Pattern | ۱۰/۱۰ | قانون LAW-05 به‌خوبی اعمال شده |
| Outbox/Inbox | ۸/۱۰ | پیاده‌سازی موجود ولی workerهای تولیدی مفقود |
| Saga | ۶/۱۰ | تعاریف خوب ولی handlers ناتمام |
| Multi-Tenant Ready | ۸/۱۰ | tenantId همه‌جا هست ولی sandbox تک-tenant است |
| Domain Events | ۹/۱۰ | کاتالوگ ۴۶ رویدادی کامل و نسخه‌بندی‌شده |

---

## ۳. ساختار پروژه (Project Structure)

### ۳.۱ نمای کلی درخت پروژه

```
/home/z/my-project/
├── .env                                    # ✅ فقط DATABASE_URL (1 خط)
├── .github/workflows/ci-cd.yml             # ✅ CI/CD پایه (87 خط)
├── Dockerfile                              # ✅ چندمرحله‌ای (32 خط)
├── docker-compose.production.yml           # ⚠️ ارجاع به فایل‌های مفقود
├── package.json                            # ✅ وابستگی‌ها
├── next.config.ts                          # ⚠️ ignoreBuildErrors: true
├── vitest.config.ts                        # ✅ پیکربندی تست
├── tsconfig.json
├── eslint.config.mjs
├── tailwind.config.ts
├── postcss.config.mjs
├── components.json                         # ✅ پیکربندی shadcn/ui
├── bun.lock
├── Caddyfile                               # ⚠️ وجود دارد ولی در docker-compose استفاده نمی‌شود
│
├── prisma/
│   └── schema.prisma                       # ✅ 2370 خط، 89 مدل
│
├── db/
│   └── custom.db                           # ✅ SQLite sandbox (1.5 MB)
│
├── design/
│   └── sprint-1-entities.yaml              # ✅ طراحی YAML
│
├── docs/
│   ├── adr-index.md                        # ✅ 33 قانون + ADRها
│   ├── production-readiness-checklist.md   # ⚠️ ادعاها در آن غلو شده
│   └── technical-audit.md                  # ✅ همین سند
│
├── backend/bismark-laravel/                # ⚠️ اسکفولد اولیه
│   ├── app/Modules/{Identity,Organization,Party,MasterData}/
│   ├── app/Shared/Kernel/...
│   ├── composer.json                       # Laravel 12 + Sanctum + Spatie + ...
│   ├── database/migrations/                # ❌ فقط 2 فایل (tenants, users)
│   └── config/bismark.php                  # ✅ پیکربندی کامل
│
├── examples/websocket/                     # ⚠️ فقط نمونه، به‌کار نگرفته
│   ├── frontend.tsx
│   └── server.ts
│
├── public/                                 # ✅ logo.svg + robots.txt
│
├── tools/scaffold-generator/               # ⚠️ فقط README
│
├── upload/                                 # سند چشم‌انداز اولیه
│
└── src/
    ├── app/
    │   ├── layout.tsx                      # ✅ Root layout
    │   ├── page.tsx                        # ⚠️ 1464 خط (monolithic)
    │   ├── globals.css                     # ✅ استایل‌ها
    │   ├── api/
    │   │   ├── route.ts                    # ✅ مسیر ریشه
    │   │   └── v1/                         # ✅ 118 مسیر RESTful
    │   │       ├── chart-of-accounts/
    │   │       ├── closing-validation/
    │   │       ├── cycle-counts/
    │   │       ├── device-timeline/
    │   │       ├── fiscal-periods/
    │   │       ├── fiscal-years/
    │   │       ├── general-ledger/
    │   │       ├── integration/
    │   │       ├── inventory-transactions/
    │   │       ├── invoices/
    │   │       ├── journal-entries/
    │   │       ├── movements/
    │   │       ├── notification/           # /templates/* (7 مسیر)
    │   │       ├── notification-preferences/
    │   │       ├── notification-queue/
    │   │       ├── notifications/          # 6 مسیر
    │   │       ├── opening-balances/
    │   │       ├── payments/
    │   │       ├── product-brands/
    │   │       ├── product-categories/
    │   │       ├── product-models/
    │   │       ├── products/
    │   │       ├── reconciliation/
    │   │       ├── refunds/
    │   │       ├── reports/                # 6 گزارش مالی
    │   │       ├── return-orders/
    │   │       ├── rule-sets/
    │   │       ├── rules/
    │   │       ├── sales-orders/
    │   │       ├── service-orders/
    │   │       ├── service-requests/
    │   │       ├── shipments/
    │   │       ├── stock-items/
    │   │       ├── stock-reservations/
    │   │       ├── stock-transfers/
    │   │       ├── system/health/
    │   │       ├── tax/
    │   │       ├── tax-rules/
    │   │       ├── trial-balance/
    │   │       ├── warehouses/
    │   │       ├── warranty-cards/
    │   │       ├── warranty-claims/
    │   │       ├── workflow/
    │   │       └── ar/                     # Accounts Receivable
    │   └── (NO app/[locale]/, NO middleware.ts)
    │
    ├── components/
    │   ├── ui/                             # ✅ 48 کامپوننت shadcn
    │   └── views/                          # ✅ 17 view
    │       ├── billing-view.tsx            (368 lines)
    │       ├── cycle-count-view.tsx        (354)
    │       ├── financial-view.tsx          (310)
    │       ├── fulfillment-view.tsx        (262)
    │       ├── integration-view.tsx        (299)
    │       ├── inventory-ledger-view.tsx   (468)
    │       ├── inventory-view.tsx          (397)
    │       ├── notification-dashboard-view.tsx (574)
    │       ├── notification-preferences-view.tsx (608)
    │       ├── notification-templates-view.tsx (1095)
    │       ├── notifications-view.tsx      (1409)
    │       ├── products-view.tsx           (612)
    │       ├── returns-view.tsx            (269)
    │       ├── sales-view.tsx              (448)
    │       ├── service-view.tsx            (286)
    │       ├── transfers-view.tsx          (341)
    │       └── warranty-view.tsx           (337)
    │
    ├── hooks/                              # ✅ use-mobile.ts, use-toast.ts
    │
    ├── lib/
    │   ├── db.ts                           # ✅ PrismaClient singleton
    │   ├── api-helpers.ts                  # ✅ getTenantId, jsonResponse
    │   ├── api-client.ts                   # ✅ 1110 lines, fetch wrapper
    │   ├── event-catalog.ts                # ✅ 325 lines, 46 events
    │   ├── event-handlers/index.ts         # ✅ 176 lines, cross-context
    │   ├── financial-handlers.ts           # ✅ 253 lines, JE creation
    │   ├── mock-data.ts                    # ❌ 425 lines (سطر ۳۴ page.tsx)
    │   ├── seed.ts                         # ✅ 181 lines
    │   ├── types.ts                        # ✅ 136 lines (snake_case types)
    │   ├── utils.ts                        # ✅ cn() helper
    │   │
    │   ├── saga/saga-manager.ts            # ✅ 280 lines
    │   │
    │   ├── modules/
    │   │   ├── notification/               # ✅ کامل
    │   │   │   ├── index.ts
    │   │   │   └── services/
    │   │   │       ├── notification-service.ts (882 lines)
    │   │   │       ├── template-engine.ts
    │   │   │       ├── preference-service.ts
    │   │   │       ├── providers.ts
    │   │   │       └── types.ts
    │   │   └── product/
    │   │       ├── contracts/product-query-service.ts
    │   │       └── services/product-query-service.ts
    │   │
    │   └── shared/
    │       ├── index.ts                    # ✅ barrel export (114 lines)
    │       ├── value-objects/              # ✅ uuid-v7, money, date-range, locale
    │       ├── exceptions/                 # ✅ 5 نوع exception
    │       ├── events/                     # ✅ domain-event, event-bus
    │       ├── contracts/                  # ✅ tenant-context, repository, event-bus
    │       ├── specifications/             # ✅ Specification pattern
    │       ├── traits/                     # ✅ auditable, soft-deletable
    │       ├── helpers/                    # ✅ persian-calendar, business-code-generator
    │       ├── repositories/               # ✅ business-code-repository
    │       ├── infra/                      # ✅ unit-of-work, idempotency, optimistic-lock, prisma-event-bus
    │       ├── outbox/                     # ✅ dispatcher, publisher, retry-policy, dead-letter, index
    │       ├── inbox/                      # ✅ inbox-worker, index
    │       ├── snapshot/                   # ✅ snapshot-policy, scheduler, worker, index
    │       ├── domain-services/            # ✅ index
    │       └── laws/                       # ✅ 54 فایل law-04..law-57
    │
    └── tests/
        └── unit/                           # ❌ فقط 3 فایل
            ├── shared-kernel.test.ts       # ✅ 207 lines, UuidV7/Money/DateRange/Locale/Spec/Retry/Snapshot
            ├── architecture-laws.test.ts   # ✅ 145 lines, اعتبارسنجی LAWها
            └── business-logic.test.ts      # ✅ 160 lines, BusinessCodeGenerator/EventCatalog/Saga
```

### ۳.۲ نقاط قوت ساختار

1. **جداسازی لایه‌ها** واضح و منطبق بر DDD (Domain / Application / Infrastructure).
2. **Shared Kernel** بدون منطق کسب‌وکار، صرفاً primitives فنی.
3. **Barrel exports** (`shared/index.ts`) دسترسی یکپارچه فراهم می‌کند.
4. **مسیر API** نسخه‌بندی‌شده (`/api/v1/`).
5. **ماژول‌های domain** در `src/lib/modules/` با contracts/services تفکیک‌شده.

### ۳.۳ نقاط ضعف ساختار

1. **`page.tsx` monolithic** (۱۴۶۴ خط): تمام منطق UI در یک فایل، شامل LoginScreen، Sidebar، Topbar، DashboardView، UsersView، RolesView، PartiesView. باید به صفحات Next.js مجزا (`app/[locale]/dashboard/page.tsx` و ...) شکسته شود.
2. **نبود `middleware.ts`**: هیچ middleware برای auth, tenant resolution, i18n, security headers وجود ندارد.
3. **نبود `app/[locale]/`**: پشتیبانی real-time از i18n با next-intl در `package.json` نصب شده ولی به‌کار نرفته.
4. **وجود `mock-data.ts`** (۴۲۵ خط): علیرغم ادعای `api-client.ts` سطر ۴ «No mock data»، `page.tsx` سطر ۳۴ از `mockUsers`, `mockRoles`, `mockParties`, `mockBranches`, `dashboardStats` استفاده می‌کند. این یک تناقض آشکار است.
5. **نبود دایرکتوری `src/workers/`**: در حالی که `docker-compose.production.yml` سه worker را اجرا می‌کند.
6. **backend Laravel** فقط ۲ migration دارد و در عمل اجرایی نیست (composer.json موجود ولی `vendor/` نصب نشده).

### ۳.۴ ارزیابی انطباق با Best Practice

| شاخص | وضعیت |
|------|-------|
| Separation of Concerns | ✅ خوب |
| Modular Monolith | ✅ خوب |
| Monorepo (Front+Back) | ⚠️ Laravel ناتمام |
| File naming convention | ✅ kebab-case |
| Test directory structure | ❌ ضعیف (فقط unit، بدون integration/e2e) |
| Configuration centralization | ⚠️ متفرق |
| Documentation in `docs/` | ⚠️ کم (فقط ۲ سند + همین ممیزی) |

---

## ۴. تحلیل پایگاه داده (Database Analysis)

### ۴.۱ تکنولوژی پایه

| محیط | تکنولوژی | دلیل |
|------|----------|------|
| Sandbox (فعلی) | **SQLite** | `schema.prisma` سطر ۱۱: `provider = "sqlite"`. فایل `db/custom.db` ۱.۵ مگابایت. |
| تولیدی (ادعا شده) | **PostgreSQL 16** | `docker-compose.production.yml` سطر ۳۴: `image: postgres:16-alpine`. مهاجرت Prisma برای PostgreSQL نیاز به تغییر provider دارد. |
| Backend Laravel (آینده) | **PostgreSQL** | `backend/.../2025_01_15_000010_create_users_table.php` سطر ۲۰ از `CREATE TYPE ... ENUM` و `uuid_v7()` استفاده می‌کند که مختص PostgreSQL است. |

### ۴.۲ شمارش مدل‌ها

```
$ grep -c "^model " prisma/schema.prisma
89
```

این ۸۹ مدل در ۸ گروه سازمان‌دهی شده‌اند:

| گروه | تعداد مدل | نمونه‌ها |
|------|----------|----------|
| Infrastructure | 4 | IdempotencyKey, OutboxMessage, ProcessedMessage, StockBalanceSnapshot |
| Identity + System | 5 | Tenant, User, Role, Permission, Session |
| Organization | 1 | Branch |
| Party | 1 | Party |
| Product | 5 | ProductCategory, ProductBrand, ProductModel, Product, ProductInstance |
| Business Code | 1 | BusinessCodeSequence |
| Inventory | 12 | Warehouse, WarehouseZone, Location, Bin, StockItem, InventoryTransaction, StockBalance, StockReservation, StockTransfer, StockTransferLine, CycleCount, CycleCountLine |
| Sales + Fulfillment + Billing + Returns | 16 | SalesOrder, SalesOrderLine, PriceList, PriceListLine, Quote, QuoteLine, Shipment, ShipmentLine, PickList, PickListLine, Invoice, InvoiceLine, Payment, PaymentAllocation, CreditNote, CreditNoteLine, ReturnOrder, ReturnOrderLine, Refund |
| Saga | 2 | SagaDefinition, SagaInstance |
| Warranty | 5 | WarrantyPolicy, WarrantyCard, WarrantyClaim, WarrantyExtension, WarrantyTransfer |
| Service | 8 | ServiceRequest, ServiceOrder, ServiceOrderLine, ServiceDiagnosis, ServiceOrderPart, ServiceOrderLabor, ServiceQualityCheck, TechnicianAssignment |
| Financial | 14 | ChartOfAccount, FiscalYear, FiscalPeriod, CostCenter, TaxCode, JournalEntry, JournalEntryLine, ARTransaction, ARAllocation, APTransaction, APAllocation, TaxRule, TaxCalculation, TaxPosting |
| Workflow + Rule | 7 | WorkflowDefinition, WorkflowInstance, WorkflowHistory, RuleSet, RuleDefinition, RuleExecution, RuleAuditStep |
| Notification | 5 | NotificationTemplate, Notification, NotificationDelivery, NotificationPreference, NotificationQueue |

### ۴.۳ تحلیل الگوی طراحی

#### ۴.۳.۱ Multi-Tenancy

۱۸۵ ارجاع به `tenantId` در `schema.prisma`. تمام مدل‌های business-scoped این فیلد را دارند. مدل‌های سیستمی (`Permission`) و مدل‌های infrastructure با tenant-scope (`IdempotencyKey`, `OutboxMessage`, `ProcessedMessage`) نیز tenant-aware هستند.

الگوی جدول: `@@unique([tenantId, businessCode])` یا `@@unique([tenantId, code])` تضمین می‌کند که کدهای کسب‌وکار در یک tenant یکتا باشند.

#### ۴.۳.۲ Soft Delete

۳۸ مدل فیلد `deletedAt DateTime?` دارند. الگوی Query در `api-helpers.ts` و routeها به‌صورت یکنواخت `deletedAt: null` را در `where` اعمال می‌کند. این یک anti-pattern جزئی است: باید به‌صورت middleware Prisma اعمال شود.

#### ۴.۳.۳ Audit Columns

مدل‌های اصلی `createdAt`, `updatedAt` دارند (`@default(now())` و `@updatedAt`). اما فقط مدل `User` فیلدهای `createdBy`/`updatedBy` دارد (۲ ارجاع در سراسر schema). این یک نقیصه قابل توجه است — سایر مدل‌ها قابل audit نیستند که با LAWهای ممیزی (ADR-007) در تضاد است.

#### ۴.۳.۴ Optimistic Locking (LAW-07)

۳۵ مدل فیلد `version Int @default(1)` دارند. این شامل aggregate rootهای اصلی است:

- StockItem, StockBalance, StockReservation, StockTransfer, CycleCount
- SalesOrder, Shipment, Invoice, Quote, PriceList
- ReturnOrder, Refund
- WarrantyCard, WarrantyClaim
- ServiceOrder, TechnicianAssignment
- ChartOfAccount, JournalEntry, AR/APTransaction
- WorkflowInstance, RuleSet
- Notification, NotificationQueue

پیاده‌سازی helper در `src/lib/shared/infra/optimistic-lock-helper.ts`:

```typescript
const result = await model.updateMany({
  where: { id, tenantId, version: expectedVersion },
  data: { ...data, version: { increment: 1 } },
})
if (result.count === 0) {
  // ... ConflictException
}
```

این پیاده‌سازی صحیح است و از race condition جلوگیری می‌کند.

#### ۴.۳.۵ Ledger Pattern (LAW-05)

مدل `StockItem` به‌صراحت فاقد فیلد `on_hand_quantity` است (مشاهده سطر ۵۰۸: `// ❌ NO on_hand_quantity column — LAW-05: derived from InventoryTransaction`). موجودی از تجمیع `InventoryTransaction` ledger مشتق می‌شود.

مدل `StockBalance` یک snapshot صریح است با `snapshotAt` و علامت‌گذاری شده به‌عنوان DERIVED (سطر ۵۶۵).

#### ۴.۳.۶ Business Code Generation (LAW-02)

مدل `BusinessCodeSequence` با `@@unique([tenantId, module, prefix, fiscalYear])` تضمین می‌کند که تولید کد به‌صورت اتمیک در سطح tenant و سال مالی Jalali انجام شود.

پیاده‌سازی در `src/lib/shared/helpers/business-code-generator.ts` و `repositories/business-code-repository.ts` با ۲۳ تعریف کد کسب‌وکار (PRT, CAT, BRD, MDL, PRD, WH, IT, SO, SHP, INV, PAY, RET, RFD, WAR, WCL, SR, RO, JE, ...).

#### ۴.۳.۷ Outbox / Inbox / Snapshot

سه مدل infrastructure:

- `OutboxMessage` (LAW-08): با status (`pending|published|failed|dead_letter`), attempts, nextRetryAt. ایندکس روی `@@index([status, nextRetryAt])`.
- `ProcessedMessage` (LAW-26): با `@@unique([messageId, consumerId])` برای exactly-once.
- `StockBalanceSnapshot` (LAW-10): با `snapshotType` (`nightly|threshold|manual`).

### ۴.۴ تحلیل ایندکس‌ها

بررسی نمونه‌ها:

| مدل | ایندکس‌ها |
|------|----------|
| User | `@@unique([tenantId, username])`, `@@index([tenantId, status])` |
| Party | `@@unique([tenantId, businessCode])`, `@@index([tenantId, partyType])` |
| StockItem | `@@unique([tenantId, warehouseId, productId, productInstanceId, batchNumber])`, `@@index([tenantId, productId, warehouseId])`, `@@index([productInstanceId])` |
| InventoryTransaction | `@@unique([tenantId, transactionNumber])`, `@@index([tenantId, occurredAt])`, `@@index([stockItemId, occurredAt])`, `@@index([productId, occurredAt])`, `@@index([referenceType, referenceId])` |
| SalesOrder | `@@unique([tenantId, orderNumber])`, `@@index([tenantId, customerPartyId, orderDate])`, `@@index([tenantId, status])` |
| JournalEntry | `@@unique([tenantId, entryNumber])`, `@@index([tenantId, entryDate])`, `@@index([sourceType, sourceId])`, `@@index([status])` |
| OutboxMessage | `@@index([status, nextRetryAt])`, `@@index([tenantId, occurredAt])` |
| NotificationQueue | `@@index([tenantId, inDeadLetter, nextRetryAt])`, `@@index([tenantId, nextRetryAt])` |

**نکته:** در PostgreSQL تولیدی، ایندکس‌های partial و GIN برای JSONB باید اضافه شوند (مطابق migration Laravel `2025_01_15_000010_create_users_table.php` که `idx_users_active_partial` و `idx_users_metadata_gin` دارد). در schema فعلی SQLite این قابلیت‌ها استفاده نشده.

### ۴.۵ ارتباطات و FK ها

مدل‌های هم‌context دارای FK واقعی Prisma هستند (مثلاً `StockItem.warehouse → Warehouse`). اما ارتباطات cross-context به‌صورت loose FK پیاده‌سازی شده‌اند (مثلاً `StockItem.productId` بدون `@relation`). این منطبق بر LAW-01 (No Cross-Context JOIN) و LAW-04 است.

تنها استثنا: `Tenant` با ۶ relation به مدل‌های دیگر (User, Party, Branch, ProductCategory, ...) که نمایش‌دهنده ریشه tenant است.

### ۴.۶ محدودیت‌های SQLite

SQLite فاقد قابلیت‌های زیر است که در PostgreSQL تولیدی باید فعال شوند:

- ❌ ENUM types (در `schema.prisma` از `String` با comment استفاده شده)
- ❌ JSONB (از `Json` استفاده شده که در SQLite به TEXT تبدیل می‌شود)
- ❌ Partial Index
- ❌ GIN Index
- ❌ Range Partitioning (LAW-07 audit retention)
- ❌ Generated Column
- ❌ `uuid_v7()` تابع بومی (در sandbox از `cuid()` استفاده شده)

این تفاوت‌ها در فایل migration Laravel (`users.php`) دیده می‌شوند که از `CREATE TYPE ... ENUM` و `uuid_v7()` PostgreSQL استفاده می‌کنند.

### ۴.۷ مهاجرت به PostgreSQL

برای انتقال از sandbox به تولید، موارد زیر لازم است:

1. تغییر `provider = "sqlite"` به `provider = "postgresql"` در `schema.prisma`.
2. تبدیل تمام فیلدهای `String` که enum معنایی دارند به `enum` در Prisma.
3. اضافه کردن ایندکس‌های partial و GIN برای metadata.
4. فعال‌سازی partitioning برای `OutboxMessage` و `InventoryTransaction` (برای scale).
5. استفاده از `uuid_v7()` به‌جای `cuid()`.

### ۴.۸ ارزیابی پایگاه داده

| شاخص | امتیاز | توضیح |
|------|--------|--------|
| Normalization | ۹/۱۰ | به‌خوبی نرمال‌شده |
| Index Coverage | ۷/۱۰ | ایندکس‌های اصلی موجود ولی partial/GIN مفقود |
| Multi-Tenant Isolation | ۹/۱۰ | tenantId همه‌جا |
| Audit Trail | ۵/۱۰ | فقط `createdAt/updatedAt`، `createdBy/updatedBy` غایب |
| Ledger Pattern | ۱۰/۱۰ | LAW-05 به‌خوبی اعمال شده |
| Concurrency Control | ۸/۱۰ | version field + helper موجود |
| Schema Documentation | ۸/۱۰ | کامنت‌های گویا در schema |

---

## ۵. تحلیل کارایی (Performance Analysis)

### ۵.۱ نبود داده‌های واقعی بنچمارک

> ⚠️ **هیچ بنچمارک یا تست کارایی در کد وجود ندارد.** `docs/performance-report.md` که در worklog ادعا شده، **مفقود است**. مسیر `src/tests/integration/` وجود ندارد. هیچ فایل `*.bench.ts` یا `*.perf.ts` وجود ندارد.

### ۵.۲ تحلیل استاتیک کارایی

#### ۵.۲.1 اتصال به پایگاه داده

`src/lib/db.ts`:

```typescript
export const db = globalForPrisma.prisma ?? new PrismaClient({ log: ['query'] })
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

**نقص بحرانی:**
- `log: ['query']` در محیط production هم فعال است (شرط بر `NODE_ENV` فقط global singleton را محدود می‌کند، نه logging را). این در عمل کل query log را در stdout تولید می‌کند که در حجم بالا I/O شدیدی ایجاد می‌کند.
- نبود connection pool tuning (Prisma default در PostgreSQL ۱۰ connection است).
- نبود read replica یا query-level routing.

#### ۵.۲.۲ N+1 Query Risk

بررسی `src/app/api/v1/products/route.ts`:

```typescript
const products = await db.product.findMany({
  where,
  include: { model: { include: { brand: true } } },
  ...
})
```

این الگو برای سه سطح nesting خوب است، اما در `sales-orders/route.ts` از `_count: { select: { lines: true } }` استفاده می‌شود که در Prisma به یک subquery تبدیل می‌شود. این کارایی دارد اما برای aggregated counts روی میلیون‌ها رکورد به نقص کارایی منجر می‌شود.

#### ۵.۲.۳ Pagination Implementation

`api-helpers.ts` سطر ۶۹:

```typescript
perPage: Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') ?? '20', 10)))
```

- حداکثر ۱۰۰ رکورد در هر صفحه — مناسب.
- اما از offset-based pagination (`skip: (page-1)*perPage`) استفاده می‌کند که در صفحات عمیق (page > 1000) به‌شدت کند می‌شود.
- **ندارد:** cursor-based pagination برای جداول بزرگ (InventoryTransaction, OutboxMessage).

#### ۵.۲.۴ ایندکس‌گذاری روی Ledgers

`InventoryTransaction` با ۴ ایندکس (`occurredAt`, `stockItemId+occurredAt`, `productId+occurredAt`, `referenceType+referenceId`) برای queryهای اصلی بهینه است. اما در حجم تولیدی (صدها میلیون تراکنش در سال) به partitioning نیاز است که در SQLite ممکن نیست.

### ۵.۳ تحلیل Frontend Performance

#### ۵.۳.1 Bundle Size Risks

`page.tsx` ۱۴۶۴ خط و importهای متعدد از `lucide-react` (۳۲ آیکن در سطر ۴-۱۱) و ۱۷ view component. این یک bundle اولیه بزرگ تولید می‌کند. باید code-splitting با `dynamic()` اعمال شود که فعلاً موجود نیست.

#### ۵.۳.2 Client-Side State Management

`zustand` و `@tanstack/react-query` در `package.json` نصب شده‌اند. اما `page.tsx` از `useState` محلی استفاده می‌کند و `api-client.ts` با `fetch` مستقیم پیاده‌سازی شده. این یعنی:

- ❌ نبود cache برای queryهای GET.
- ❌ نبود automatic revalidation.
- ❌ نبود optimistic updates.

#### ۵.۳.3 Server Components vs Client Components

`page.tsx` با `'use client'` شروع می‌شود (سطر ۱). تمام منطق در client اجرا می‌شود. این برخلاف فلسفه Next.js 16 (App Router) است که Server Components را به‌عنوان default پیشنهاد می‌کند.

### ۵.۴ تحلیل Backend Performance

#### ۵.۴.۱ Outbox Dispatcher Polling

`src/lib/shared/outbox/dispatcher.ts` سطر ۲۳: `BATCH_SIZE = 100`. polling interval ۵ ثانیه. این یعنی در حالت بحرانی (هزاران پیام pending) throughput محدود به ۲۰ پیام در ثانیه است. برای production باید به message broker (RabbitMQ/Kafka) منتقل شود.

#### ۵.۴.۲ Inbox Worker

`inbox-worker.ts` سطر ۶۴: `take: 100`. همان محدودیت. علاوه بر این، در سطر ۸۸ از `db.processedMessage.create(...).catch(() => null)` استفاده می‌کند که در صورت conflict با catch از دور خارج می‌شود. این صحیح است اما در SQLite throughput محدودی دارد.

#### ۵.۴.۳ Transaction Scope

`UnitOfWork.execute` از `db.$transaction` استفاده می‌کند. در SQLite این exclusive lock روی کل DB ایجاد می‌کند. در PostgreSQL به row-level lock تبدیل می‌شود. اما اگر یک transaction شامل چندین operation سنگین باشد (مانند Create SalesOrder + Lines + Outbox)، lock طولانی می‌شود.

### ۵.۵ تحلیل کارایی الگوریتم‌ها

#### ۵.۵.۱ BusinessCodeGenerator

`business-code-generator.ts` سطر ۳۶:

```typescript
const sequence = await BusinessCodeRepository.nextSequence({...})
```

این یک UPDATE با `lastValue: { increment: 1 }` است که در PostgreSQL atomic است. اما برای `generateMany` (سطر ۵۰) به‌صورت sequential اجرا می‌شود:

```typescript
for (let i = 0; i < count; i++) {
  codes.push(await this.generate(moduleKey, tenantId))
}
```

این برای تولید ۱۰۰ کد، ۱۰۰ round-trip به DB ایجاد می‌کند. باید با batch increment جایگزین شود.

#### ۵.۵.۲ Notification Dispatch

`notification-service.ts` سطر ۱۲۶ از `UnitOfWork.execute` با دو `outbox.append` استفاده می‌کند. این درست است. اما `processQueueItem` در سطر ۲۶۷ با `updateMany` یک lock row ایجاد می‌کند. اگر چند worker هم‌زمان روی یک queue کار کنند، فقط یکی lock را می‌گیرد و بقیه skip می‌شوند — این الگوی صحیح است.

### ۵.۶ توصیه‌های کارایی

| اولویت | توصیه | اثر |
|--------|-------|-----|
| Critical | غیرفعال کردن `log: ['query']` در production | کاهش I/O 50%+ |
| High | اضافه کردن cursor-based pagination برای InventoryTransaction | پایداری در صفحات عمیق |
| High | استفاده از `@tanstack/react-query` در UI | کاهش 80% درخواست تکراری |
| Medium | انتقال Outbox به message broker | scale-out worker |
| Medium | Partitioning InventoryTransaction by month | query 10x سریع‌تر |
| Medium | Cache نمودار داشبورد با Redis | کاهش load DB |
| Low | Code-splitting در page.tsx | bundle اولیه 60% کوچک‌تر |
| Low | Snapshot پیش‌محاسبه برای گزارش‌ها | latency گزارش 5x |

### ۵.۷ ارزیابی کارایی

| شاخص | امتیاز | توضیح |
|------|--------|--------|
| Query Optimization | ۶/۱۰ | ایندکس‌ها موجود اما partial/GIN مفقود |
| Connection Pool | ۴/۱۰ | tuning مفقود، logging همیشه فعال |
| Pagination | ۵/۱۰ | offset-based، cursor مفقود |
| Frontend Bundle | ۴/۱۰ | monolithic page.tsx |
| Caching Strategy | ۲/۱۰ | هیچ cache‌ای پیاده‌سازی نشده |
| Async Processing | ۷/۱۰ | Outbox/Inbox موجود |
| Benchmark Coverage | ۱/۱۰ | هیچ بنچمارکی موجود نیست |

---

## ۶. تحلیل امنیت (Security Analysis)

### ۶.۱ مدل امنیتی کلی

> ⚠️ **هشدار بحرانی:** پیاده‌سازی فعلی **هیچ احراز هویتی** در سطح API ندارد. مسیرهای `/api/v1/*` به‌صورت بدون auth اجرا می‌شوند. در `api-helpers.ts` سطر ۸، `getTenantId()` از `getTenantContext()` می‌خواند و اگر نباشد، به tenant پیش‌فرض `slug: 'bismark'` برمی‌گردد. این یک آسیب‌پذیری بحرانی برای production است.

### ۶.۲ احراز هویت (Authentication)

#### ۶.۲.۱ وضعیت فعلی

- ❌ **هیچ middleware برای JWT validation وجود ندارد.**
- ❌ **هیچ مسیر `/api/v1/auth/login` در sandbox وجود ندارد.** (در Laravel وجود دارد: `app/Modules/Identity/Controllers/AuthController.php`)
- ❌ **`next-auth` در package.json** (^4.24.11) نصب شده ولی به‌کار نرفته. هیچ فایل `pages/api/auth/[...nextauth].ts` یا `app/api/auth/[...nextauth]/route.ts` موجود نیست.
- ⚠️ **Login در `page.tsx`** (سطر ۱۰۹) یک fake login است که با هر ورودی به dashboard می‌رود:
  ```typescript
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      onLogin()  // ← بدون هیچ اعتبارسنجی واقعی
    }, 800)
  }
  ```
- ⚠️ **در `seed.ts`** هیچ کاربری با password hash ایجاد نمی‌شود. فیلد `password` در مدل `User` تعریف نشده است (تنها در migration Laravel `users.php` باید باشد، اما migration مربوطه مفقود است).

#### ۶.۲.۲ ادعاهای `production-readiness-checklist.md`

سند `docs/production-readiness-checklist.md` سطر ۲۲ ادعا می‌کند «JWT Authentication ✅ Implemented — Access + Refresh token rotation». این **نادرست** است. هیچ کد JWT validation در sandbox موجود نیست.

#### ۶.۲.۳ الگوی مطلوب (طبق Laravel scaffold)

در `backend/.../config/bismark.php`:
- `access_token_ttl = 15 * 60` (۱۵ دقیقه)
- `refresh_token_ttl = 14 * 24 * 60 * 60` (۱۴ روز)
- `jwt_algorithm = HS256`
- `session.max_concurrent = 3` (ADR-009)
- `session.idle_timeout = 30 * 60` (۳۰ دقیقه)
- `session.absolute_timeout = 8 * 60 * 60` (۸ ساعت)

این مقادیر در Laravel تعریف شده‌اند ولی پیاده‌ساز sandbox آن‌ها را اعمال نکرده.

### ۶.۳ مدیریت نشست (Session Management)

مدل `Session` در `schema.prisma` (سطر ۱۷۲) با فیلدهای کامل:

- `deviceFingerprint`, `userAgent`, `ipAddress`
- `issuedAt`, `lastActivityAt`, `expiresAt`, `absoluteExpiresAt`
- `revokedAt`, `revokedReason`
- `@@index([userId, status])`

این طراحی مناسب است اما هیچ کد sandbox آن را استفاده نمی‌کند. مسیر `/api/v1/auth/login` وجود ندارد که session ایجاد کند.

### ۶.۴ Authorization (RBAC)

#### ۶.۴.۱ مدل‌ها

- `Role` با `key`, `name`, `isSystem`
- `Permission` با `key`, `module`, `action`
- در `seed.ts` ۶ نقش تعریف شده: `super_admin`, `ceo`, `service_manager`, `warehouse_manager`, `financial_manager`, `it_administrator`.

#### ۶.۴.۲ پیاده‌سازی

- ❌ **هیچ جدول join `RolePermission` یا `UserRole` در `schema.prisma` وجود ندارد.** این یعنی هیچ ارتباط many-to-many بین User-Role و Role-Permission پیاده‌سازی نشده.
- ❌ **هیچ middleware برای بررسی permission در مسیرهای API وجود ندارد.** مسیر `products/route.ts` فقط `getTenantId()` را صدا می‌زند و هیچ بررسی permission انجام نمی‌دهد.
- ❌ **هیچ Policy/Laravel-style authorization در sandbox موجود نیست** (در Laravel `app/Modules/Identity/Policies/UserPolicy.php` و سایر Policies موجود است).

#### ۶.۴.۳ نتیجه

هر کاربر anonymous می‌تواند به تمام مسیرهای `/api/v1/*` دسترسی داشته باشد. این یک آسیب‌پذیری **Critical** برای production است.

### ۶.۵ مدیریت رمز عبور

- ❌ **فیلد `password` در مدل `User` در Prisma schema وجود ندارد.**
- ❌ **هیچ سیاست رمز عبور، lockout، یا 2FA در sandbox پیاده‌سازی نشده.**
- در Laravel `composer.json` پکیج‌های `pragmarx/google2fa` و `bacon/bacon-qr-code` برای 2FA موجود است.
- در `config/bismark.php` تنظیمات ADR-010 (Password: Strong + 2FA + Lockout) تعریف شده.

### ۶.۶ حفاظت در برابر حملات رایج

| حمله | وضعیت sandbox | توضیح |
|------|---------------|--------|
| **SQL Injection** | ✅ محافظت | Prisma parameterized queries استفاده می‌شود. هیچ `$queryRawUnsafe` دیده نمی‌شود. |
| **XSS** | ✅ محافظت | React به‌صورت پیش‌فرض escape می‌کند. |
| **CSRF** | ⚠️ ناقص | `SameSite` cookie در `next-auth` موجود ولی next-auth به‌کار نرفته. |
| **Rate Limiting** | ❌ مفقود | هیچ rate limiter‌ای در مسیرها اعمال نشده. ادعای production-readiness «4-tier rate limiting» **نادرست** است. |
| **CORS** | ❌ مفقود | هیچ middleware CORS در `next.config.ts` یا `middleware.ts` موجود نیست. |
| **Security Headers** | ❌ مفقود | هیچ header‌ای برای CSP, HSTS, X-Frame-Options تنظیم نشده. |
| **Mass Assignment** | ✅ محافظت نسبی | مسیرها به‌صورت دستی فیلدها را pick می‌کنند، اما الگوی یکنواخت نیست. |
| **IDOR** | ❌ آسیب‌پذیر | tenant scoping اعمال می‌شود اما بدون auth، هرکس می‌تواند با tenantId دیگری (در صورت نشت) دسترسی داشته باشد. |
| **SSRF** | N/A | هیچ fetch به URL کاربر-کنترل‌شده دیده نمی‌شود. |
| **Path Traversal** | N/A | هیچ file upload/download موجود نیست. |
| **Replay Attack** | ⚠️ ناقص | Idempotency-Key برای POST موجود (LAW-06) ولی فقط هدر اختیاری است. |

### ۶.۷ مدیریت Secret

#### ۶.۷.۱ فایل `.env`

فقط یک خط:
```
DATABASE_URL=file:/home/z/my-project/db/custom.db
```

این کافی نیست برای production. باید شامل:

- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `DATABASE_URL` (PostgreSQL)
- `REDIS_URL`
- `SMTP_*`
- `SMS_PROVIDER_API_KEY`
- `ENCRYPTION_KEY`

#### ۶.۷.۲ بررسی hardcoded secrets

`ci-cd.yml` سطر ۷۰:
```yaml
! grep -r "sk_live\|sk_test\|password.*=.*['\"]" src/ --include="*.ts" --include="*.tsx"
```

این بررسی خوب است اما محدود. از regex ضعیف استفاده می‌کند که false negative تولید می‌کند.

#### ۶.۷.۳ در seed.ts

هیچ کاربری با password ایجاد نمی‌شود. این یعنی حتی اگر auth پیاده‌سازی می‌شد، نمی‌شد وارد شد.

### ۶.۸ Audit Log

- ❌ **هیچ مدل `AuditLog` در Prisma schema وجود ندارد.** (در ADR-007 و قانون ۳۳ قانون ادعا شده، اما مدل مفقود است).
- ❌ **هیچ middleware برای audit logging در sandbox موجود نیست.** (در Laravel `app/Shared/Http/Middleware/AuditRequestLog.php` موجود است).
- `event-handlers/index.ts` سطر ۱۳۷ یک wildcard handler برای audit ثبت می‌کند اما فقط `console.log` می‌کند.

### ۶.۹ Encryption

- ❌ **هیچ رمزنگاری برای فیلدهای حساس** (national ID, tax ID, etc.) در sandbox پیاده‌سازی نشده.
- ❌ **هیچ encryption at rest برای SQLite** فعال نیست.
- در Laravel `composer.json` پکیج `firebase/php-jwt` موجود است برای JWT signing.

### ۶.۱۰ Security Scan

`ci-cd.yml` سطر ۶۷:
```yaml
- run: bun audit || true
```

`|| true` یعنی اگر vulnerability پیدا شد، build همچنان موفق است. این یک anti-pattern است.

### ۶.۱۱ ارزیابی امنیت

| شاخص | امتیاز | توضیح |
|------|--------|--------|
| Authentication | ۱/۱۰ | هیچ auth واقعی |
| Authorization | ۲/۱۰ | مدل‌ها موجود ولی اعمال نمی‌شود |
| Session Management | ۳/۱۰ | مدل موجود ولی بدون استفاده |
| Input Validation | ۶/۱۰ | ValidationException موجود ولی ناقص |
| SQL Injection Protection | ۹/۱۰ | Prisma parameterized |
| XSS Protection | ۹/۱۰ | React built-in |
| CSRF Protection | ۲/۱۰ | ناکامل |
| Rate Limiting | ۰/۱۰ | مفقود |
| Security Headers | ۰/۱۰ | مفقود |
| Audit Logging | ۲/۱۰ | wildcard handler فقط لاگ می‌کند |
| Secrets Management | ۳/۱۰ | .env تک‌خطی کافی نیست |
| Encryption | ۱/۱۰ | مفقود |

**امتیاز کلی امنیت: ۳.۲/۱۰** — **نامناسب برای Production**.

---

## ۷. احراز هویت و سیستم کاربری (Authentication & User System)

### ۷.۱ مدل داده کاربر

مدل `User` در `schema.prisma` (سطر ۱۱۹):

```prisma
model User {
  id          String    @id @default(cuid())
  tenantId    String
  tenant      Tenant    @relation(fields: [tenantId], references: [id])
  username    String
  displayName String
  email       String?
  phone       String?
  userType    String    @default("staff")
  status      String    @default("active")
  locale      String    @default("fa-IR")
  isActive    Boolean   @default(true)
  lockedUntil DateTime?
  lastLoginAt DateTime?
  metadata    Json
  createdBy   String?
  updatedBy   String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  @@unique([tenantId, username])
  @@index([tenantId, status])
  @@map("users")
}
```

### ۷.۲ نقاط ضعف مدل

1. **نبود فیلد `password`**: حتی در سطح sandbox، فیلد password hash موجود نیست.
2. **نبود فیلد `mfaSecret`** برای 2FA TOTP.
3. **نبود فیلد `emailVerifiedAt`**.
4. **نبود فیلد `failedLoginAttempts`** برای lockout.
5. **نبود relation به `Role`**: هیچ `UserRole` join table موجود نیست.

### ۷.۳ مسیرهای Auth

- ❌ **`/api/v1/auth/login`** مفقود.
- ❌ **`/api/v1/auth/refresh`** مفقود.
- ❌ **`/api/v1/auth/logout`** مفقود.
- ❌ **`/api/v1/auth/me`** مفقود.
- ❌ **`/api/v1/auth/forgot-password`** مفقود.
- ❌ **`/api/v1/auth/reset-password`** مفقود.
- ❌ **`/api/v1/auth/verify-2fa`** مفقود.

### ۷.۴ در Laravel Backend

در `backend/bismark-laravel/app/Modules/Identity/`:

- `Controllers/AuthController.php` موجود
- `Requests/LoginRequest.php` موجود
- `Requests/RevokeSessionRequest.php` موجود
- `Services/SessionCommandService.php` و `SessionQueryService.php` موجود

اما این backend هنوز اجرایی نیست (`vendor/` نصب نشده، `composer install` اجرا نشده، هیچ migration جز tenants/users موجود نیست).

### ۷.۵ UI Login

`page.tsx` سطر ۱۰۹-۲۰۱ یک `LoginScreen` نمایش می‌دهد که:

- username پیش‌فرض `admin` و password پیش‌فرض `demo1234`.
- بعد از ۸۰۰ms صرفاً `onLogin()` callback را صدا می‌زند.
- هیچ درخواست HTTP به API نمی‌فرستد.
- به‌جای JWT، فقط state محلی `isLoggedIn` را set می‌کند.

این یک UI نمایشی است، نه احراز هویت واقعی.

### ۷.۶ مدیریت نقش‌ها

- ۶ نقش در `seed.ts` تعریف شده.
- هیچ permission seed نمی‌شود.
- هیچ جدول `role_permissions` یا `user_roles` در schema موجود نیست.
- در UI (`page.tsx` سطر ۲۱۶-۲۱۸) منوها نقش‌بندی شده‌اند اما در client-side فقط نمایش داده می‌شوند، هیچ کنترل دسترسی واقعی وجود ندارد.

### ۷.۷ پاسخ به سؤال: «آیا سیستم احراز هویت قابل استفاده است؟»

**خیر.** سیستم فعلی به‌طور کامل فاقد احراز هویت واقعی است. باید:

1. اضافه کردن فیلد `passwordHash`, `mfaSecret`, `failedLoginAttempts` به مدل `User`.
2. اضافه کردن `UserRole` و `RolePermission` join tables.
3. پیاده‌سازی `/api/v1/auth/login` با JWT issuing.
4. اضافه کردن `middleware.ts` برای JWT validation در تمام مسیرهای `/api/v1/*`.
5. Seed کردن permissions بر اساس module/action.
6. فعال‌سازی rate limiting در مسیرهای auth.

### ۷.۸ ارزیابی سیستم احراز هویت

| شاخص | امتیاز | توضیح |
|------|--------|--------|
| User Model Completeness | ۴/۱۰ | فیلدهای اصلی مفقود |
| Auth API Coverage | ۰/۱۰ | هیچ مسیری موجود نیست |
| Session Management | ۳/۱۰ | مدل موجود ولی بدون استفاده |
| RBAC Implementation | ۲/۱۰ | join tables مفقود |
| 2FA | ۰/۱۰ | مفقود |
| Password Policy | ۰/۱۰ | مفقود |
| Account Lockout | ۰/۱۰ | مفقود |

---

## ۸. تحلیل API (API Analysis)

### ۸.۱ شمارش و توزیع مسیرها

```
$ find src/app/api/v1 -name "route.ts" | wc -l
118
```

| Context | تعداد مسیر | نمونه |
|---------|-----------|-------|
| Product | 5 | `/products`, `/product-categories`, `/product-brands`, `/product-models`, `/product-categories/[id]` |
| Inventory | ۱۵+ | `/warehouses`, `/stock-items`, `/inventory-transactions`, `/stock-reservations`, `/stock-transfers`, `/cycle-counts`, `/movements` |
| Sales | 4 | `/sales-orders`, `/sales-orders/[id]`, `/sales-orders/[id]/{approve,cancel}` |
| Fulfillment | 7 | `/shipments`, `/shipments/[id]/{pick,pack,ship,deliver,tracking}` |
| Billing | 7 | `/invoices`, `/invoices/[id]/{issue,cancel,credit-note}`, `/payments`, `/payments/[id]/allocate` |
| Returns | 6 | `/return-orders`, `/return-orders/[id]/{approve,receive,close,create-replacement}`, `/refunds`, `/refunds/[id]/approve` |
| Warranty | 5 | `/warranty-cards`, `/warranty-cards/[id]/activate`, `/warranty-claims`, `/warranty-claims/[id]/{inspect,approve}` |
| Service | 8 | `/service-requests`, `/service-orders`, `/service-orders/[id]/{diagnose,consume-part,ready,qc}`, `/service-requests/[id]/create-order` |
| Financial | ۱۸+ | `/chart-of-accounts`, `/journal-entries`, `/trial-balance`, `/general-ledger`, `/reconciliation`, `/closing-validation`, `/opening-balances`, `/tax/{calculate,post,reports/vat}`, `/tax-rules`, `/fiscal-years`, `/fiscal-periods`, `/ar/{customers,allocate,unallocate}`, `/reports/{dashboard,balance-sheet,profit-loss,cash-flow,equity,final-trial-balance}` |
| Workflow | 5 | `/workflow/{definitions,instances}`, `/workflow/definitions/[id]/publish`, `/workflow/instances/[id]/{transition,route}` |
| Rule | 4 | `/rules`, `/rules/evaluate`, `/rule-sets`, `/rule-sets/[id]/publish` |
| Notification | ۱۳+ | `/notifications`, `/notifications/[id]/{retry,cancel}`, `/notifications/send`, `/notifications/stats`, `/notification/templates/*` (7 sub-routes), `/notification-preferences`, `/notification-queue`, `/notification-queue/process` |
| System | 1 | `/system/health` |
| Device Timeline | 1 | `/device-timeline/[instanceId]` |
| Integration | 1 | `/integration` |

### ۸.۲ الگوی طراحی مسیرها

الگوی یکنواخت در تمام مسیرها (نمونه: `sales-orders/route.ts`):

```typescript
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { BusinessCodeGenerator, IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId()
    // ... query ...
    return jsonResponse({ data, meta })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: '...', statusCode: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Idempotency check (LAW-06)
    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json()

    // 2. Validation
    if (!body.field) throw new ValidationException('...', [...])

    // 3. Business code generation (LAW-02)
    const orderNumber = await BusinessCodeGenerator.generate('sales_order', tenantId)

    // 4. Unit of Work + Outbox (LAW-12/08)
    const order = await UnitOfWork.execute(async (uow) => {
      const newOrder = await uow.tx.salesOrder.create({...})
      await uow.outbox.append({
        tenantId, aggregateType: 'SalesOrder', aggregateId: newOrder.id,
        eventType: 'sales_order.created', eventVersion: '1.0',
        payload: {...}, actorId: null,
      })
      return newOrder
    })

    // 5. Store idempotency (LAW-06)
    const response = jsonResponse({ data: toDTO(order) }, 201)
    await IdempotencyHelper.store(request, await response.clone().text(), 201)
    return response
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: '...', statusCode: 500 })
  }
}

function toDTO(order: any) { ... }
```

### ۸.۳ نقاط قوت API

1. **RFC 7807 Problem Details**: `errorResponse` در `api-helpers.ts` سطر ۳۹ استاندارد RFC 7807 را پیاده می‌کند با `type, title, status, detail, code, correlation_id, timestamp, errors`.
2. **Correlation ID**: هر response خطا یک `correlation_id: crypto.randomUUID()` دارد.
3. **Pagination یکنواخت**: `meta: { page, per_page, total, last_page }`.
4. **Idempotency**: الگوی صحیح LAW-06 پیاده شده.
5. **Outbox Event Publishing**: در همان transaction (LAW-08).
6. **Tenant scoping**: همه مسیرها `tenantId` را اعمال می‌کنند.
7. **Soft delete filtering**: `deletedAt: null` در where.

### ۸.۴ نقاط ضعف API

1. **نبود اعتبارسنجی ورودی با Zod**: `zod` در `package.json` (^4.0.2) نصب شده ولی هیچ schema‌ای در مسیرها استفاده نمی‌شود. اعتبارسنجی به‌صورت دستی `if (!body.field) throw` انجام می‌شود که در عمل به اشتباهات منجر می‌شود.
2. **نبود OpenAPI/Swagger generation**: هیچ فایل `openapi.json` یا `swagger.yaml` موجود نیست. ادعای Step 4 worklog «OpenAPI/Swagger spec structure» پیاده‌سازی نشده.
3. **نبود Rate Limiting**: هیچ محدودیتی روی مسیرها اعمال نمی‌شود.
4. **نبود Auth Middleware**: مسیرها بدون auth قابل دسترسی هستند.
5. **`toDTO` با type `any`**: در `sales-orders/route.ts` سطر ۱۹۳ `function toDTO(order: any)`. این type safety را از بین می‌برد.
6. **نبود ETag Header**: برای GET responses هیچ ETag تولید نمی‌شود (با LAW-07 ناسازگار در سطح HTTP).
7. **`actorId: null` در Outbox**: چون کاربر احراز هویت نشده، actorId همیشه null است. این auditability را نقض می‌کند.
8. **نبود HATEOAS links**: responseها hypermedia link ندارند (که برای REST سطح ۳ لازم است).
9. **نبود versioning header**: `Accept-Version` یا نسخه‌بندی از طریق URL (`/v1/`) که خوب است اما باید در آینده `/v2/` هم مدیریت شود.

### ۸.۵ Health Check Endpoint

`/api/v1/system/health` (`system/health/route.ts`):

```typescript
const checks: Record<string, { status: string; latency?: number }> = {}
// 1. Database check
await db.$queryRaw`SELECT 1`
// 2. Outbox pending count
const pendingCount = await db.outboxMessage.count({ where: { status: 'pending' } })
// 3. Active sagas count
const activeSagas = await db.sagaInstance.count({ where: { status: { in: ['running', 'compensating'] } } })

const allHealthy = Object.values(checks).every((c) => c.status === 'healthy')
return jsonResponse({...}, allHealthy ? 200 : 503)
```

این پیاده‌سازی خوب است. اما:

- ❌ بررسی Redis مفقود (در `docker-compose` redis موجود است).
- ❌ بررسی inbox worker مفقود.
- ❌ بررسی snapshot worker مفقود.

### ۸.۶ تحلیل مسیر POST /sales-orders

این مسیر (`sales-orders/route.ts`) یک نمونه کامل از الگوهای معماری است:

1. **Idempotency pre-check** (سطر ۵۴).
2. **Tenant isolation** (سطر ۵۷).
3. **Validation با ValidationError details** (سطر ۶۱-۶۸).
4. **Cross-context existence check** با loose FK (سطر ۷۱-۷۴): `db.party.findFirst` برای بررسی مشتری.
5. **Business code generation** (سطر ۷۶).
6. **UnitOfWork** با Outbox atomic (سطر ۷۹-۱۷۵):
   - Create SalesOrder با totals=0.
   - Loop روی lines با محاسبه subtotal/discount/tax/total.
   - Update order totals.
   - Append outbox event.
7. **Response و idempotency store** (سطر ۱۸۲-۱۸۴).

این الگو صحیح است اما **نقص** دارد:

- ❌ بدون check موجودی محصول (productId) قبل از create.
- ❌ بدون reservation موجودی در زمان create (طبق LAW-17 فقط بعد از approve رخ می‌دهد).
- ❌ `actorId: null` (نبود auth).
- ❌ بدون validation `body.lines[].quantityOrdered > 0` (فقط truthy check).

### ۸.۷ تحلیل مسیر POST /inventory-transactions

این مسیر (`inventory-transactions/route.ts`) یک نمونه دیگر است:

- برای `TRANSFER` type، دو ledger entry (OUT + IN) در یک transaction ایجاد می‌کند (سطر ۱۹۲-۲۴۲). این صحیح است.
- برای `RESERVATION`/`RELEASE`، مستقیماً `reservedQuantity` را increment/decrement می‌کند (سطر ۱۰۰-۱۱۰).

**نقص بحرانی:** برخلاف `sales-orders/route.ts`، این مسیر:

- ❌ Idempotency اعمال نمی‌کند (هیچ `IdempotencyHelper.check`).
- ❌ UnitOfWork استفاده نمی‌کند برای حالت non-TRANSFER.
- ❌ Outbox event publish نمی‌کند.
- ❌ Business code generation فقط برای non-TRANSFER انجام می‌شود، نه برای OUT/IN.
- ❌ آخرین `lastTransactionAt` update برای non-TRANSFER خارج از transaction (سطر ۱۳۷-۱۴۰) انجام می‌شود.

این یعنی **ناهماهنگی الگوی پیاده‌سازی** بین مسیرها — یک بدهی فنی قابل توجه.

### ۸.۸ API Client (Frontend)

`src/lib/api-client.ts` (۱۱۱۰ خط):

```typescript
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  if (!response.ok) {
    let error: ApiError
    try { error = await response.json() } catch { error = {...} }
    throw error
  }
  if (response.status === 204) return null as T
  return response.json()
}
```

**نقاط ضعف:**

1. **نبود retry**: در صورت network failure، request fail می‌شود.
2. **نبود timeout**: fetch می‌تواند برای مدت نامحدود معلق بماند.
3. **نبود auth header injection**: هیچ header Authorization اضافه نمی‌شود (چون auth هنوز پیاده‌سازی نشده).
4. **نبود base URL از env**: `API_BASE = '/api/v1'` hardcode شده.
5. **نبود React Query integration**: هیچ hook مبتنی بر `useQuery` تعریف نشده.

### ۸.۹ ارزیابی API

| شاخص | امتیاز | توضیح |
|------|--------|--------|
| REST Conformance | ۷/۱۰ | خوب اما HATEOAS مفقود |
| Error Handling | ۹/۱۰ | RFC 7807 + correlation_id |
| Idempotency | ۷/۱۰ | الگو موجود ولی ناهموار |
| Validation | ۴/۱۰ | دستی، بدون Zod |
| Auth | ۰/۱۰ | مفقود |
| Rate Limiting | ۰/۱۰ | مفقود |
| Documentation | ۲/۱۰ | فقط comments، OpenAPI مفقود |
| Test Coverage | ۱/۱۰ | هیچ تست API موجود نیست |

---

## ۹. تحلیل فرانت‌اند (Frontend Analysis)

### ۹.۱ تکنولوژی‌ها

| تکنولوژی | نسخه | وضعیت استفاده |
|----------|------|---------------|
| Next.js | 16.1.1 | ✅ App Router |
| React | 19.0.0 | ✅ |
| TypeScript | 5.x | ✅ |
| Tailwind CSS | 4.x | ✅ |
| shadcn/ui | (snapshot) | ✅ 48 کامپوننت در `components/ui/` |
| Radix UI | multiple | ✅ primitives |
| lucide-react | 0.525 | ✅ icons |
| next-themes | 0.4.6 | ✅ dark/light toggle |
| next-intl | 4.3.4 | ❌ **نصب شده ولی به‌کار نرفته** |
| next-auth | 4.24.11 | ❌ **نصب شده ولی به‌کار نرفته** |
| @tanstack/react-query | 5.82 | ❌ **نصب شده ولی به‌کار نرفته** |
| @tanstack/react-table | 8.21 | ⚠️ فقط در برخی viewها |
| zustand | 5.0.6 | ❌ **نصب شده ولی به‌کار نرفته** |
| react-hook-form | 7.60 | ⚠️ ناقص |
| @hookform/resolvers | 5.1.1 | ⚠️ ناقص |
| zod | 4.0.2 | ❌ **نصب شده ولی به‌کار نرفته** |
| recharts | 2.15 | ❌ **نصب شده ولی در داشبورد مفقود** |
| framer-motion | 12.23 | ❌ **نصب شده ولی به‌کار نرفته** |
| @mdxeditor/editor | 3.39 | ❌ **نصب شده ولی به‌کار نرفته** |
| @dnd-kit/* | multiple | ❌ **نصب شده ولی به‌کار نرفته** |
| date-fns | 4.1 | ⚠️ ناقص |
| react-markdown | 10.1 | ❌ **نصب شده ولی به‌کار نرفته** |

### ۹.۲ ساختار فرانت‌اند

#### ۹.۲.۱ کامپوننت اصلی `page.tsx`

۱۴۶۴ خط در یک فایل، شامل:

- `LoginScreen` (سطر ۱۰۹)
- `Sidebar` (سطر ۲۶۳) با ۶ گروه منو و ۲۴ آیتم
- `Topbar` (سطر ۳۵۶) با search, notifications, theme toggle, user menu
- `DashboardView` (سطر ۴۴۶) با stats, recent activity, tech stack
- `UsersView` (سطر ۶۳۵) با فیلتر، جدول، فرم ایجاد
- `RolesView` (در ادامه فایل)
- `PartiesView` (در ادامه فایل)
- `BranchesView` (در ادامه فایل)
- `App` main component که view فعلی را render می‌کند

#### ۹.۲.۲ ۱۷ کامپوننت View در `components/views/`

هر کدام بین ۲۶۲ تا ۱۴۰۹ خط:

- `notifications-view.tsx` (۱۴۰۹ خط) — بزرگ‌ترین view
- `notification-templates-view.tsx` (۱۰۹۵ خط)
- `notification-preferences-view.tsx` (۶۰۸ خط)
- `products-view.tsx` (۶۱۲ خط)
- `notification-dashboard-view.tsx` (۵۷۴ خط)
- `inventory-ledger-view.tsx` (۴۶۸ خط)
- `sales-view.tsx` (۴۴۸ خط)
- `inventory-view.tsx` (۳۹۷ خط)
- `billing-view.tsx` (۳۶۸ خط)
- `cycle-count-view.tsx` (۳۵۴ خط)
- `transfers-view.tsx` (۳۴۱ خط)
- `warranty-view.tsx` (۳۳۷ خط)
- `financial-view.tsx` (۳۱۰ خط)
- `integration-view.tsx` (۲۹۹ خط)
- `service-view.tsx` (۲۸۶ خط)
- `returns-view.tsx` (۲۶۹ خط)
- `fulfillment-view.tsx` (۲۶۲ خط)

#### ۹.۲.۳ الگوی View Component

نمونه از `notifications-view.tsx` (سطر ۱-۸۰):

```typescript
'use client'
import { useState, useEffect, useCallback } from 'react'
import { ... } from 'lucide-react'
import { Button, Card, ... } from '@/components/ui/...'
import { notificationsApi, ... } from '@/lib/api-client'
import type { ApiError } from '@/lib/api-client'

const CHANNEL_LABELS: Record<NotificationChannel, string> = {...}
const STATUS_LABELS: Record<string, string> = {...}

export function NotificationsView() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  // ...
  useEffect(() => {
    loadNotifications()
  }, [page, statusFilter])

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const result = await notificationsApi.list(page, perPage, statusFilter)
      setNotifications(result.data)
    } catch (err) {
      toast.error('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])
  // ...
}
```

### ۹.۳ نقاط قوت فرانت‌اند

1. **استفاده واقعی از API**: برخلاف ادعای `page.tsx` از mock-data، کامپوننت‌های view واقعاً از `api-client` استفاده می‌کنند.
2. **RTL Support**: layout به‌صورت RTL طراحی شده (`mr-3`, `right-3`, `text-right`).
3. **Dark Mode**: `next-themes` به‌کار رفته در Topbar.
4. **Toast Notifications**: `sonner` برای feedback.
5. **Responsive Design**: با `lg:`, `md:`, `sm:` breakpoints.
6. **Loading States**: هر view loading state دارد.
7. **Error Handling**: try-catch با toast error.
8. **Pagination**: یکنواخت در تمام viewها.

### ۹.۴ نقاط ضعف فرانت‌اند

#### ۹.۴.۱ Monolithic `page.tsx`

- ۱۴۶۴ خط در یک فایل.
- ۶ view inline (Dashboard, Users, Roles, Parties, Branches, Audit, Settings) در همین فایل.
- باید به صفحات Next.js مجزا شکسته شود: `app/[locale]/dashboard/page.tsx`, `app/[locale]/users/page.tsx`, ...
- باید `middleware.ts` اضافه شود برای auth redirect.
- باید `app/[locale]/layout.tsx` با i18n provider اضافه شود.

#### ۹.۴.۲ Mock Data در `page.tsx`

`page.tsx` سطر ۳۴:
```typescript
import { mockUsers, mockRoles, mockParties, mockBranches, dashboardStats } from '@/lib/mock-data'
```

این یعنی `DashboardView`, `UsersView`, `RolesView`, `PartiesView` در `page.tsx` از mock data استفاده می‌کنند، نه از API واقعی. این یک تناقض است با `api-client.ts` که می‌گوید «No mock data».

`mock-data.ts` (۴۲۵ خط) شامل:

- ۶ mock user
- ۶ mock role
- ۱۲ mock party
- ۳ mock branch
- آمار داشبورد mock

#### ۹.۴.۳ نبود i18n واقعی

`next-intl` نصب شده ولی:

- ❌ هیچ `app/[locale]/` directory موجود نیست.
- ❌ هیچ `messages/fa.json` یا `messages/en.json` موجود نیست.
- ❌ هیچ `NextIntlClientProvider` در layout موجود نیست.
- ❌ تمام رشته‌ها در فایل‌های TSX hardcode شده‌اند (مثلاً `'ورود به سیستم'` در page.tsx سطر ۱۳۷).

#### ۹.۴.۴ نبود State Management مرکزی

`zustand` نصب شده ولی به‌کار نرفته. هر view با `useState` محلی مدیریت state می‌کند. این یعنی:

- ❌ نبود shared state بین viewها (مثلاً notification badge در Topbar باید از API جداگانه بخواند).
- ❌ نبود optimistic updates.
- ❌ نبود cache برای data.

#### ۹.۴.۵ نبود React Query

`@tanstack/react-query` نصب شده ولی به‌کار نرفته. هر view با `useEffect` و `useState` دستی fetch می‌کند. این یعنی:

- ❌ نبود automatic refetch.
- ❌ نبود stale-while-revalidate.
- ❌ نبود mutation invalidation.
- ❌ نبود request deduplication.
- ❌ تکرار کد fetch در هر view.

#### ۹.۴.۶ نبود Form Validation با Zod

`react-hook-form` و `zod` نصب شده‌اند ولی در viewها به‌کار نرفته‌اند. validation به‌صورت دستی `if (!field) toast.error(...)` انجام می‌شود.

#### ۹.۴.۷ نبود Loading Skeletal

در viewها، loading state با `<Loader2 className="animate-spin" />` نمایش داده می‌شود. نه skeleton واقعی با ساختار UI.

#### ۹.۴.۸ نبود Code Splitting

`page.tsx` تمام ۱۷ view را import می‌کند. bundle اولیه شامل تمام کامپوننت‌ها است. باید از `dynamic(() => import('...'))` برای lazy loading استفاده شود.

#### ۹.۴.۹ نبود نوع‌بندی یکپارچه

`types.ts` از **snake_case** (`display_name`, `user_type`, `business_code`) استفاده می‌کند (۱۳۶ خط)، در حالی که `api-client.ts` از **camelCase** (`displayName`, `userType`, `businessCode`) استفاده می‌کند. این یک تضاد اساسی است که می‌تواند به باگ‌های runtime منجر شود.

### ۹.۵ دسترسی‌پذیری (Accessibility)

- ⚠️ `aria-label` در برخی کامپوننت‌های shadcn موجود است.
- ❌ هیچ `aria-live` برای toastها.
- ❌ هیچ keyboard navigation testing.
- ❌ هیچ focus trap در dialogها (shadcn به‌صورت پیش‌فرض دارد ولی تست نشده).

### ۹.۶ Bundle Size Analysis

پیش‌بینی بدون اجرای build:

- `page.tsx` با ۱۷ import view: bundle اولیه بزرگ.
- `lucide-react`: اگر import نام‌آگاه استفاده شود، درخت tree-shake می‌شود، اما import نام‌گذاری شده (`import { LayoutDashboard, Users, ... }`) صحیح است.
- `recharts`, `framer-motion`, `@mdxeditor/editor`: نصب شده ولی به‌کار نرفته، باید حذف شوند یا به‌کار گرفته شوند.

### ۹.۷ ارزیابی فرانت‌اند

| شاخص | امتیاز | توضیح |
|------|--------|--------|
| Component Architecture | ۵/۱۰ | viewها خوب ولی page.tsx monolithic |
| Type Safety | ۴/۱۰ | تضاد snake_case/camelCase |
| State Management | ۲/۱۰ | بدون Zustand/React Query |
| Form Handling | ۳/۱۰ | بدون react-hook-form/Zod |
| i18n | ۱/۱۰ | مفقود |
| Accessibility | ۳/۱۰ | ناکامل |
| Performance | ۳/۱۰ | بدون code splitting |
| Design System | ۸/۱۰ | shadcn/ui خوب |
| RTL Support | ۷/۱۰ | خوب |
| Dark Mode | ۸/۱۰ | خوب |

---

## ۱۰. تحلیل بک‌اند (Backend Analysis)

### ۱۰.۱ بک‌اند Sandbox (Next.js)

بک‌اند اصلی اجرایی در `src/app/api/v1/` قرار دارد. این در عمل یک Next.js Route Handler-based API است که به‌عنوان backend عمل می‌کند.

#### ۱۰.۱.۱ الگوی Service Layer

در `src/lib/modules/notification/services/notification-service.ts` (۸۸۲ خط) یک نمونه service کامل:

```typescript
export class NotificationService {
  async dispatch(input: DispatchInput): Promise<DispatchResult> {
    // 1. Idempotency pre-check
    // 2. Find template (LAW-55)
    // 3. Resolve channel
    // 4. Render template (LAW-55 deterministic)
    // 5. Persist with UoW + Outbox (LAW-08)
    //    a. Create Notification with status=pending
    //    b. Create Queue item
    //    c. Outbox: notification.created
    //    d. Transition to queued
    //    e. Outbox: notification.queued
  }

  async processQueueItem(queueItemId, workerId) {
    // Retry engine (LAW-57)
  }

  async cancel(...)
  async retry(...)
  async list(...)
  async getById(...)
  async getStats(...)
}
```

این یک نمونه خوب از Application Service است.

#### ۱۰.۱.۲ Repository Pattern

در `src/lib/shared/repositories/business-code-repository.ts` یک Repository پیاده شده:

```typescript
export class BusinessCodeRepository {
  static async nextSequence({...}): Promise<number> {
    return db.$transaction(async (tx) => {
      const seq = await tx.businessCodeSequence.upsert({
        where: { tenantId_module_prefix_fiscalYear: {...} },
        create: {...},
        update: { lastValue: { increment: 1 } },
      })
      return seq.lastValue
    })
  }
}
```

این الگو درست است. اما به‌جز `BusinessCodeRepository` هیچ Repository دیگری برای domain entityها پیاده نشده. تمام مسیرها مستقیماً به `db.product.findMany`, `db.salesOrder.create`, و غیره دسترسی دارند. این **نقص الگوی Repository** است که در ADR-003 و LAW-04 ادعا شده.

#### ۱۰.۱.۳ Specification Pattern

در `src/lib/shared/specifications/specification.ts` یک Specification interface موجود است اما هیچ specification واقعی برای domain rules پیاده نشده.

### ۱۰.۲ بک‌اند Laravel (Scaffold)

در `backend/bismark-laravel/`:

#### ۱۰.۲.۱ ماژول‌های موجود

- **Identity** (Models: User, Role, Permission, Session, Tenant)
- **Organization** (Models: Branch, Department)
- **Party** (Models: Party, Person, Organization)
- **MasterData** (Models: Country, City, Province, Currency, Language)

هر ماژول ساختار کامل دارد:

```
Modules/Identity/
├── Models/
├── Repositories/ (Interface + Implementation)
├── Services/ (Command + Query)
├── Controllers/
├── Requests/ (CreateUser, UpdateUser, Login, etc.)
├── Resources/ (UserResource, RoleResource, etc.)
├── Contracts/ (Service Interfaces + DTOs)
├── Policies/ (UserPolicy, RolePolicy, etc.)
├── Events/ (UserCreated, UserUpdated, etc.)
├── Enums/ (UserType, UserStatus, SessionStatus)
├── Routes/api.php
└── IdentityServiceProvider.php
```

#### ۱۰.۲.۲ Shared Kernel Laravel

`app/Shared/Kernel/`:

- `Domain/Entity.php`, `AggregateRoot.php`, `ValueObjects/UuidV7.php`, `DomainEvent.php`
- `Domain/Repository.php`
- `Contracts/EventBusInterface.php`
- `Concerns/HasAuditability.php`, `BelongsToTenant.php`
- `Support/UuidV7Generator.php`, `BusinessCodeGenerator.php`

`app/Shared/Http/Middleware/`:

- `AuthorizeRequestPolicy.php`
- `ForceJsonResponse.php`
- `EnforceLaw03.php`
- `AuditRequestLog.php`
- `EnsureTenantResolved.php`

`app/Shared/Infrastructure/`:

- `Outbox/OutboxEventBus.php`
- `Law/EnforceLaw03.php`

#### ۱۰.۲.۳ وابستگی‌های Laravel (composer.json)

- `laravel/sanctum` (API tokens)
- `darkaonline/l5-swagger` (OpenAPI)
- `predis/predis` (Redis)
- `maatwebsite/excel` (Excel import/export)
- `spatie/laravel-permission` (RBAC)
- `spatie/laravel-activitylog` (Audit)
- `webpatser/laravel-uuid`
- `firebase/php-jwt` (JWT)
- `pragmarx/google2fa` (2FA)
- `bacon/bacon-qr-code` (QR for 2FA)
- `league/fractal` (Transformer)
- `spatie/laravel-event-sourcing` (Event Sourcing)
- `owen-it/laravel-auditing` (Audit)

#### ۱۰.۲.۴ نقاط ضعف Laravel Backend

1. **فقط ۲ migration**: `tenants` و `users`. سایر ۸۷ جدول باید migrate شوند.
2. **`vendor/` نصب نشده**: `composer install` اجرا نشده.
3. **هیچ تست Laravel موجود نیست** (`tests/` directory مفقود).
4. **هیچ controller route در `routes/api.php` ثبت نشده** (فایل موجود ولی خالی یا حداقل).
5. **هیچ `.env.example` برای Laravel**.

### ۱۰.۳ ارزیابی Backend

| شاخص | Sandbox (Next.js) | Laravel |
|------|------------------|---------|
| Service Layer | ✅ (notification-service) | ✅ (با Contract) |
| Repository Pattern | ⚠️ (فقط BusinessCode) | ✅ (کامل) |
| Domain Events | ✅ (Event Catalog) | ✅ (Events در ماژول‌ها) |
| Migration | ❌ (فقط db:push) | ⚠️ (فقط ۲ migration) |
| Test Coverage | ❌ (۰%) | ❌ (مفقود) |
| Auth | ❌ | ⚠️ (controller موجود ولی اجرا نشده) |
| RBAC | ❌ | ✅ (Spatie) |
| Audit Log | ❌ | ✅ (Spatie activitylog) |

---

## ۱۱. وابستگی‌ها (Dependencies)

### ۱۱.۱ تحلیل `package.json`

#### ۱۱.۱.۱ Production Dependencies (۳۴ پکیج)

**Framework & Core:**
- `next: ^16.1.1` (App Router)
- `react: ^19.0.0` / `react-dom: ^19.0.0`
- `prisma: ^6.11.1` / `@prisma/client: ^6.11.1`

**UI Components (shadcn/ui basis):**
- ۲۵ پکیج `@radix-ui/*` (accordion, alert-dialog, avatar, checkbox, ...)

**Forms & Inputs:**
- `react-hook-form: ^7.60.0`
- `@hookform/resolvers: ^5.1.1`
- `input-otp: ^1.4.2`
- `react-day-picker: ^9.8.0`
- `embla-carousel-react: ^8.6.0`

**State & Data:**
- `@tanstack/react-query: ^5.82.0` (نصب، استفاده نشده)
- `@tanstack/react-table: ^8.21.3`
- `zustand: ^5.0.6` (نصب، استفاده نشده)

**Styling:**
- `tailwind-merge: ^3.3.1`
- `class-variance-authority: ^0.7.1`
- `clsx: ^2.1.1`
- `tailwindcss-animate: ^1.0.7`

**Icons & Media:**
- `lucide-react: ^0.525.0`
- `@reactuses/core: ^6.0.5`

**Date/Time:**
- `date-fns: ^4.1.0`

**Internationalization:**
- `next-intl: ^4.3.4` (نصب، استفاده نشده)

**Themes:**
- `next-themes: ^0.4.6`

**Markdown & Editor:**
- `react-markdown: ^10.1.0`
- `react-syntax-highlighter: ^15.6.1`
- `@mdxeditor/editor: ^3.39.1` (نصب، استفاده نشده)

**Charts:**
- `recharts: ^2.15.4` (نصب، استفاده نشده)

**Animation:**
- `framer-motion: ^12.23.2` (نصب، استفاده نشده)

**Notifications:**
- `sonner: ^2.0.6`

**Misc:**
- `cmdk: ^1.1.1`
- `vaul: ^1.1.2`
- `react-resizable-panels: ^3.0.3`
- `sharp: ^0.34.3` (image optimization)
- `uuid: ^11.1.0`
- `zod: ^4.0.2` (نصب، استفاده نشده)

**Auth:**
- `next-auth: ^4.24.11` (نصب، استفاده نشده)

**AI Integration:**
- `z-ai-web-dev-sdk: ^0.0.18` (نصب، استفاده نشده — مربوط به AI module که وجود ندارد)

#### ۱۱.۱.۲ Dev Dependencies (۱۱ پکیج)

- `@tailwindcss/postcss: ^4`
- `@types/react: ^19` / `@types/react-dom: ^19`
- `@vitest/coverage-v8: ^4.1.10`
- `bun-types: ^1.3.4`
- `eslint: ^9` / `eslint-config-next: ^16.1.1`
- `tailwindcss: ^4`
- `tw-animate-css: ^1.3.5`
- `typescript: ^5`
- `vitest: ^4.1.10`

### ۱۱.۲ تحلیل `composer.json` Laravel

(در بخش ۱۰.۲.۳ پوشش داده شد.)

### ۱۱.۳ ارزیابی وابستگی‌ها

#### ۱۱.۳.۱ Dependency Health

| شاخص | وضعیت |
|------|-------|
| پکیج‌های بدون استفاده | ۹+ (next-intl, next-auth, react-query, zustand, zod, recharts, framer-motion, @mdxeditor, @dnd-kit, z-ai-web-dev-sdk) |
| پکیج‌های outdated | نیاز بررسی با `bun outdated` |
| Vulnerabilities | نیاز `bun audit` (در CI با `\|\| true` نادیده گرفته می‌شود) |
| License compliance | نیاز بررسی |

#### ۱۱.۳.۲ پکیج‌های مفقود برای Production

- `ioredis` یا `redis` (cache + queue)
- `bullmq` (job queue)
- `winston` یا `pino` (structured logging)
- `@sentry/nextjs` (error tracking)
- `prom-client` (Prometheus metrics)
- `helmet` (security headers — اگرچه Next.js نیاز به middleware دارد)
- `compression` (response compression)

### ۱۱.۴ تضاد نسخه‌ها

- `next: ^16.1.1` اما `react: ^19.0.0`. Next.js 16 باید با React 19 سازگار باشد.
- `eslint: ^9` با `eslint-config-next: ^16.1.1`. باید بررسی شود که eslint 9 پشتیبانی شود.
- `tailwindcss: ^4` با `tailwindcss-animate: ^1.0.7`. در Tailwind 4، animate API تغییر کرده و `tailwindcss-animate` ممکن است deprecated باشد.

### ۱۱.۵ ارزیابی وابستگی‌ها

| شاخص | امتیاز | توضیح |
|------|--------|--------|
|نسخه‌های به‌روز | ۷/۱۰ | نسخه‌های اصلی جدید |
| پکیج‌های بدون استفاده | ۳/۱۰ | ۹+ پکیج بلااستفاده |
| Security Audit | ۴/۱۰ | در CI با `\|\| true` نادیده |
| Production Readiness | ۴/۱۰ | پکیج‌های logging/monitoring مفقود |
| License Compliance | ? | نیاز بررسی |

---

## ۱۲. پیکربندی و محیط (Configuration & Environment)

### ۱۲.۱ فایل `.env` (محیط Sandbox)

```
DATABASE_URL=file:/home/z/my-project/db/custom.db
```

تنها یک متغیر. این یعنی تمام سایر تنظیمات به hardcoded defaults وابسته است.

### ۱۲.۲ `next.config.ts`

```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,  // ⚠️ بحرانی
  },
  reactStrictMode: false,     // ⚠️ غیرفعال
}
```

**نقاط ضعف:**

1. `ignoreBuildErrors: true` — build حتی اگر type error باشد موفق است. این یک anti-pattern بحرانی است. باید `false` باشد.
2. `reactStrictMode: false` — در React 19، strict mode کمک می‌کند به تشخیص side effects. باید `true` باشد.
3. **نبود** `images.domains` یا `images.remotePatterns`.
4. **نبود** `headers()` برای security headers.
5. **نبود** `rewrites()` یا `redirects()`.
6. **نبود** `experimental.serverActions`.

### ۱۲.۳ `vitest.config.ts`

```typescript
test: {
  environment: 'node',
  include: ['src/tests/**/*.test.ts'],
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json', 'html'],
    include: ['src/lib/**/*.ts'],
    exclude: ['src/tests/**', 'src/lib/mock-data.ts', 'src/app/**'],
  },
}
```

**نقاط ضعف:**

1. `environment: 'node'` — برای تست API مناسب است، اما برای تست کامپوننت React باید `jsdom` باشد.
2. Coverage فقط `src/lib/**` — یعنی هیچ coverage برای `src/app/api/**` و `src/components/**` محاسبه نمی‌شود.
3. **نبود** `setupFiles` برای mock setup.
4. **نبود** `globals: true` (باید `import { describe, it }` در هر فایل نوشته شود).

### ۱۲.۴ `tsconfig.json` (بررسی نشده ولی موجود)

وجود دارد ولی محتوای آن در این ممیزی بررسی نشد (نبود اطلاعات کافی از فایل‌خوانی). باید strict mode فعال باشد.

### ۱۲.۵ `eslint.config.mjs`

وجود دارد ولی محتوای آن بررسی نشد. باید قواعد strict TypeScript و Next.js را اعمال کند.

### ۱۲.۶ `tailwind.config.ts` و `postcss.config.mjs`

Tailwind 4 از PostCSS plugin استفاده می‌کند. تنظیمات Tailwind 4 به `@theme` در CSS migration کرده است.

### ۱۲.۷ `components.json` (shadcn/ui)

پیکربندی shadcn/ui برای تولید کامپوننت.

### ۱۲.۸ پیکربندی Docker

#### ۱۲.۸.۱ `Dockerfile`

```dockerfile
FROM oven/bun:1 AS base
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY . .
RUN bun run db:generate
RUN bun run build

FROM oven/bun:1-slim AS production
WORKDIR /app
COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static
COPY --from=base /app/public ./public
COPY --from=base /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=base /app/node_modules/@prisma ./node_modules/@prisma
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["bun", "server.js"]
```

**نقاط ضعف:**

1. `--production` در `bun install` یعنی devDependencies نصب نمی‌شوند. این درست است، اما `prisma generate` نیاز به `@prisma/client` دارد که در dependencies هست.
2. **نبود** `.dockerignore` (بررسی نشد ولی باید موجود باشد).
3. **نبود** multi-arch build (`linux/amd64` + `linux/arm64`).
4. **نبود** HEALTHCHECK در Dockerfile (در `docker-compose.production.yml` سطر ۲۴ تعریف شده).
5. **نبود** USER non-root در production image.
6. **نبود** label metadata (`org.opencontainers.image.*`).

#### ۱۲.۸.۲ `docker-compose.production.yml`

۸ سرویس تعریف شده:

1. `app` (port 3000)
2. `postgres` (port 5432)
3. `redis` (port 6379)
4. `outbox-worker` (از `src/workers/outbox-worker.ts` که **موجود نیست**)
5. `inbox-worker` (از `src/workers/inbox-worker.ts` که **موجود نیست**)
6. `snapshot-worker` (از `src/workers/snapshot-worker.ts` که **موجود نیست**)
7. `nginx` (با volume `./nginx.conf` که **موجود نیست** و `./ssl/` که **موجود نیست**)

**نقص بحرانی:** ۴ سرویس به فایل‌های مفقود ارجاع می‌دهند. `docker-compose up` در عمل fail خواهد شد.

#### ۱۲.۸.۳ `Caddyfile`

وجود دارد ولی در `docker-compose.production.yml` به‌جای Caddy از nginx استفاده شده. این یک تناقض است. محتوای `Caddyfile` بررسی نشد.

### ۱۲.۹ پیکربندی Laravel

`backend/bismark-laravel/config/bismark.php` تنظیمات کامل دارد برای:

- `default_tenant_id`, `default_tenant_slug`
- `auth` (token TTL, session policy)
- (سایر بخش‌ها نیاز بررسی بیشتر)

### ۱۲.۱۰ ارزیابی پیکربندی

| شاخص | امتیاز | توضیح |
|------|--------|--------|
| .env completeness | ۱/۱۰ | فقط ۱ متغیر |
| next.config safety | ۲/۱۰ | ignoreBuildErrors + no strict mode |
| Test config | ۵/۱۰ | محدود |
| Docker | ۳/۱۰ | ارجاع به فایل‌های مفقود |
| Laravel config | ۷/۱۰ | کامل |

---

## ۱۳. استقرار و زیرساخت (Deployment & Infrastructure)

### ۱۳.۱ CI/CD Pipeline

`.github/workflows/ci-cd.yml`:

```yaml
jobs:
  lint:          bun run lint + bunx tsc --noEmit
  unit-tests:    bunx vitest run --coverage
  integration-tests:  (⚠️ مسیر src/tests/integration موجود نیست)
    - bun run db:push
    - bun run src/lib/seed.ts
    - bunx vitest run src/tests/integration
  build:         bun run build
  security-scan: bun audit || true + secret grep
  docker-build:  docker build -t bismark-erp:latest .
  deploy:        if main branch, echo "Deploying..."
```

**نقاط ضعف:**

1. **integration-tests** به مسیر موجود نیست ارجاع می‌دهد — job fail خواهد شد.
2. **`bun audit || true`** — vulnerabilities نادیده گرفته می‌شود.
3. **`echo "Deploying..."`** — هیچ deployment واقعی انجام نمی‌شود. فقط یک log.
4. **نبود** environment variables در CI (`.env` در CI وجود ندارد).
5. **نبود** artifact upload (build output).
6. **نبود** cache (Bun cache, Next.js cache).
7. **نبود** matrix build (multiple Node/Bun versions).
8. **نبود** branch protection rules documentation.
9. **نبود** deployment to staging/production environments.
10. **نبود** rollback strategy.

### ۱۳.۲ Deployment Strategy

هیچ استراتژی deployment واقعی موجود نیست. باید:

1. **Container Registry**: push image to GHCR یا Docker Hub.
2. **Orchestration**: K8s یا Docker Swarm.
3. **Configuration**: Helm chart یا Docker Compose با secrets.
4. **Database Migration**: اجرای `prisma migrate deploy` در deployment.
5. **Health Check**: wait for `/api/v1/system/health` قبل از traffic routing.
6. **Zero-Downtime**: blue-green یا rolling update.
7. **Rollback**: rollback自动化 روی failure.

### ۱۳.۳ Infrastructure as Code

- ❌ **نبود** Terraform / Pulumi / CloudFormation.
- ❌ **نبود** Helm chart.
- ✅ Dockerfile و docker-compose موجود (ناقص).

### ۱۳.۴ Monitoring & Observability

- ⚠️ `/api/v1/system/health` موجود.
- ❌ **نبود** Prometheus metrics endpoint.
- ❌ **نبود** Grafana dashboard.
- ❌ **نبود** Sentry / error tracking integration.
- ❌ **نبود** OpenTelemetry / distributed tracing.
- ❌ **نبود** structured logging (فقط `console.log` و `console.error`).

### ۱۳.۵ Load Balancing

- ⚠️ nginx در docker-compose تعریف شده (اما `nginx.conf` مفقود).
- ❌ **نبود** HAProxy / Traefik / Caddy فعال.
- ❌ **نبود** SSL termination documentation.

### ۱۳.۶ Database Backup

- ❌ **نبود** pg_dump cron job.
- ❌ **نبود** point-in-time recovery (PITR).
- ❌ **نبود** backup verification.
- ❌ **نبود** restore test.

### ۱۳.۷ ارزیابی استقرار

| شاخص | امتیاز | توضیح |
|------|--------|--------|
| CI Pipeline | ۴/۱۰ | موجود ولی ناقص و fail می‌شود |
| CD Pipeline | ۱/۱۰ | فقط echo، بدون deployment واقعی |
| Containerization | ۵/۱۰ | Dockerfile موجود، compose ناقص |
| IaC | ۰/۱۰ | مفقود |
| Monitoring | ۲/۱۰ | فقط health check |
| Backup | ۰/۱۰ | مفقود |
| Zero-Downtime | ۰/۱۰ | مفقود |

---

## ۱۴. پشتیبان‌گیری و بازیابی (Backup & Disaster Recovery)

### ۱۴.۱ وضعیت فعلی

> ❌ **هیچ استراتژی backup یا disaster recovery در پروژه پیاده‌سازی نشده است.**

- `docs/disaster-recovery.md` که در worklog ادعا شده، **مفقود است**.
- هیچ cron job یا script برای backup موجود نیست.
- هیچ `scripts/backup.sh` موجود نیست.
- هیچ snapshot policy برای PostgreSQL موجود نیست.

### ۱۴.۲ داده‌های بحرانی برای Backup

| داده | اولویت | توضیح |
|------|--------|--------|
| PostgreSQL DB | Critical | تمام داده‌های کسب‌وکار |
| Outbox messages (pending) | Critical | اگر از دست برود، رویدادهای منتشر نشده از دست می‌روند |
| Notification queue (DLQ) | High | برای audit و retry |
| Audit logs (آینده) | High | الزام قانونی |
| User uploads (آینده) | Medium | اگر file management اضافه شود |
| Configuration secrets | Critical | JWT secret, DB password, etc. |
| Application logs | Medium | برای debugging |

### ۱۴.۳ RPO و RTO پیشنهادی

| سنجه | هدف | استراتژی |
|------|------|----------|
| RPO (Recovery Point Objective) | ۱۵ دقیقه | WAL streaming + S3 backup هر ۱۵ دقیقه |
| RTO (Recovery Time Objective) | ۱ ساعت | Hot standby + automated failover |
| RPO برای Audit | ۰ (no data loss) | Synchronous replication |

### ۱۴.۴ استراتژی پیشنهادی

#### ۱۴.۴.۱ PostgreSQL Backup

```bash
# Daily full backup
pg_dump -Fc bismark | gzip > /backups/daily/bismark_$(date +%Y%m%d).sql.gz

# Hourly WAL archive
archive_command = 'aws s3 cp %p s3://bismark-wal/%f'

# 30-day retention
find /backups/daily -mtime +30 -delete
```

#### ۱۴.۴.۲ Redis Backup

```bash
# Save every 5 minutes if 100+ keys changed
save 300 100
# AOF for durability
appendonly yes
```

#### ۱۴.۴.۳ Application Config Backup

- **Secrets** در AWS Secrets Manager یا HashiCorp Vault.
- **Configuration** در Git (همین مخزن).
- **Environment-specific** در `.env.production` با encryption.

### ۱۴.۵ Disaster Recovery Plan

#### ۱۴.۵.۱ Recovery Scenarios

1. **Database failure**: Failover به hot standby (RTO: ۱ دقیقه).
2. **Region failure**: Failover به region ثانویه (RTO: ۱ ساعت).
3. **Ransomware/Corruption**: Restore from backup + audit (RTO: ۴ ساعت).
4. **Accidental deletion**: Point-in-time recovery (RTO: ۳۰ دقیقه).

#### ۱۴.۵.۲ Recovery Test

- ❌ **هیچ recovery test انجام نشده** (چون backup هم موجود نیست).
- باید ماهانه DR drill انجام شود.

### ۱۴.۶ ارزیابی Backup & DR

| شاخص | امتیاز | توضیح |
|------|--------|--------|
| Backup Strategy | ۰/۱۰ | مفقود |
| Recovery Procedures | ۰/۱۰ | مفقود |
| DR Plan Documentation | ۰/۱۰ | مفقود |
| Backup Verification | ۰/۱۰ | مفقود |
| Multi-region Replication | ۰/۱۰ | مفقود |

---

## ۱۵. مقیاس‌پذیری (Scalability)

### ۱۵.۱ مقیاس‌پذیری افقی

#### ۱۵.۱.۱ Application Layer

- ✅ **Stateless**: Next.js standalone می‌تواند scale-out شود.
- ⚠️ **`globalForPrisma.prisma`** در `db.ts` — این الگو در Next.js serverless مشکل ایجاد می‌کند (هر Lambda یک instance جدید). باید با external connection pooler (PgBouncer) مدیریت شود.
- ❌ **Outbox Dispatcher** در `dispatcher.ts` سطر ۲۶ از `static running` flag استفاده می‌کند — این فقط در یک instance کار می‌کند. اگر چند instance اجرا شود، race condition رخ می‌دهد.

#### ۱۵.۱.۲ Database Layer

- ⚠️ **SQLite** — هیچ scale-out capability. در production باید PostgreSQL استفاده شود.
- ✅ PostgreSQL از read replica پشتیبانی می‌کند.
- ❌ **نبود** sharding strategy.
- ❌ **نبود** partitioning برای جداول بزرگ (InventoryTransaction, OutboxMessage).

#### ۱۵.۱.۳ Worker Layer

- ⚠️ Outbox/Inbox/Snapshot workers در docker-compose تعریف شده‌اند (ناقص).
- ❌ **نبود** coordination بین workerها (هیچ leader election).
- ❌ **نبود** distributed lock برای workerها.

#### ۱۵.۱.۴ Cache Layer

- ⚠️ Redis در docker-compose تعریف شده.
- ❌ **هیچ usage واقعی** از Redis در کد. هیچ cache pattern‌ای پیاده نشده.

### ۱۵.۲ مقیاس‌پذیری عمودی

#### ۱۵.۲.۱ Memory Usage

- Prisma Client memory footprint در Node.js/Bun runtime.
- هر instance حدود ۲۰۰-۵۰۰ مگابایت RAM نیاز دارد.

#### ۱۵.۲.۲ CPU Usage

- JSON parsing در `metadata` fields می‌تواند CPU-intensive باشد.
- Template rendering در `template-engine.ts` نیاز به benchmark دارد.

### ۱۵.۳ Bottleneck Analysis

| Bottleneck | Severity | توضیح |
|-----------|----------|--------|
| SQLite single-writer | Critical | فقط یک writer همزمان |
| Outbox polling 5s | High | latency پایین throughput |
| Offset pagination در صفحات عمیق | High | query کند در page 1000+ |
| Monolithic page.tsx bundle | Medium | loading اولیه کند |
| No caching | High | تکرار queryهای یکسان |
| `log: ['query']` در production | Medium | I/O overhead |

### ۱۵.۴ Capacity Planning

بدون بنچمارک واقعی، تخمین ظرفیت تقریبی:

| منبع | ظرفیت تخمینی (single instance) |
|------|--------------------------------|
| Concurrent users | 100-500 |
| Requests/sec | 50-200 |
| Outbox throughput | 20 msg/sec |
| Inventory transactions/day | 100K-1M |
| DB size limit (SQLite) | ~1 TB (اما کارایی افت می‌کند) |

### ۱۵.۵ استراتژی Scale-up پیشنهادی

#### ۱۵.۵.۱ Phase 1: Vertical Scale

- ارتقا به PostgreSQL با ۴ CPU + 16 GB RAM.
- اضافه کردن Redis cache.
- اضافه کردن PgBouncer.

#### ۱۵.۵.۲ Phase 2: Horizontal Scale

- Read replica برای queryهای GET.
- Worker pool برای Outbox (با distributed lock).
- CDN برای static assets.

#### ۱۵.۵.۳ Phase 3: Sharding

- Partitioning InventoryTransaction by month.
- Partitioning OutboxMessage by status.
- Sharding by tenantId (برای multi-tenant scale).

### ۱۵.۶ ارزیابی مقیاس‌پذیری

| شاخص | امتیاز | توضیح |
|------|--------|--------|
| Horizontal Scale (App) | ۵/۱۰ | Stateless اما Prisma global مشکل دارد |
| Database Scale | ۲/۱۰ | SQLite محدودیت شدید |
| Worker Scale | ۲/۱۰ | Coordination مفقود |
| Cache Strategy | ۱/۱۰ | Redis نصب ولی استفاده نشده |
| Partitioning | ۰/۱۰ | مفقود |
| Read Replica | ۰/۱۰ | مفقود |

---

## ۱۶. آمادگی برای توسعه آینده (Future Development Readiness)

### ۱۶.۱ انعطاف‌پذیری معماری

#### ۱۶.۱.۱ Bounded Context Isolation

- ✅ Contextها به‌خوبی جدا شده‌اند.
- ✅ Cross-context فقط از طریق events و contracts.
- ✅ اگر بخواهیم Inventory را به microservice جداگانه تبدیل کنیم، آسان است.

#### ۱۶.۱.۲ Event-Driven Extension

- ✅ ۴۶ رویداد در `event-catalog.ts`.
- ✅ Outbox/Inbox برای reliable event delivery.
- ✅ اضافه کردن consumer جدید فقط با `InboxWorker.register(eventType, consumerId, handler)`.

#### ۱۶.۱.۳ Plugin Architecture

- ❌ **نبود** plugin system واقعی. باید اگر ماژول‌های third-party (مانند payment gateways) اضافه شوند، طراحی شود.

### ۱۶.۲ قابلیت توسعه ماژول‌های Sprint 7.4+

#### ۱۶.۲.۱ Scheduler Module

- ❌ **موجود نیست**.
- برای پیاده‌سازی نیاز است:
  - مدل `ScheduledJob` با cron expression.
  - Cron parser (مثل `node-cron` یا `cron-parser`).
  - Worker که هر دقیقه cron jobs را check می‌کند.
  - API برای CRUD jobs.
- **آمادگی موجود**: الگوی Outbox + Worker می‌تواند reuse شود.

#### ۱۶.۲.۲ Automation Module

- ❌ **موجود نیست**.
- برای پیاده‌سازی نیاز است:
  - مدل `AutomationRule` با trigger + action.
  - Rule engine (که در Sprint 7.2 پیاده شده) می‌تواند reused شود.
  - WebSocket برای real-time triggers.
- **آمادگی موجود**: Rule Engine موجود است.

#### ۱۶.۲.۳ Monitoring Module

- ❌ **موجود نیست**.
- برای پیاده‌سازی نیاز است:
  - Prometheus metrics endpoint.
  - Grafana dashboards.
  - Alert rules.
- **آمادگی موجود**: Health check endpoint موجود.

#### ۱۶.۲.۴ BI Module

- ❌ **موجود نیست**.
- برای پیاده‌سازی نیاز است:
  - Materialized views برای aggregates.
  - ETL از PostgreSQL به data warehouse.
  - Dashboard UI با recharts (نصب شده).
- **آمادگی موجود**: Ledger pattern گزارش‌گیری را آسان می‌کند.

#### ۱۶.۲.۵ AI Module

- ❌ **موجود نیست**.
- پکیج `z-ai-web-dev-sdk` در package.json نصب شده ولی استفاده نشده.
- برای پیاده‌سازی نیاز است:
  - Provider abstraction.
  - Rate limiting و cost tracking.
  - Caching برای LLM responses.

### ۱۶.۳ قابلیت Maintainability

#### ۱۶.۳.۱ Code Organization

- ✅ ساختار clear و قابل فهم.
- ✅ Naming convention یکنواخت.
- ⚠️ `page.tsx` monolithic برای maintenance سخت است.

#### ۱۶.۳.۲ Test Coverage

- ❌ ۳ فایل تست برای ۳۹۰۰+ خط shared kernel = ۸٪ coverage.
- ❌ هیچ تستی برای API routes (۱۱۸ فایل).
- ❌ هیچ تستی برای UI views (۱۷ فایل).

#### ۱۶.۳.۳ Documentation

- ⚠️ ۲ سند docs + ۱ law index.
- ❌ **نبود** API reference.
- ❌ **نبود** developer onboarding guide.
- ❌ **نبود** ADRs جز فهرست در `adr-index.md`.

### ۱۶.۴ قابلیت Upgrade

#### ۱۶.۴.۱ Framework Upgrades

- Next.js 16 → 17: باید breaking changes بررسی شود.
- React 19 → 20: با Next.js باید هماهنگ باشد.
- Prisma 6 → 7: migration لازم.
- Bun runtime: باید با Node.js compatibility بررسی شود.

#### ۱۶.۴.۲ Database Migration

- SQLite → PostgreSQL: schema migration لازم.
- PostgreSQL → PostgreSQL 17: معمولاً backward compatible.

### ۱۶.۵ ارزیابی آمادگی آینده

| شاخص | امتیاز | توضیح |
|------|--------|--------|
| Modular Architecture | ۸/۱۰ | Bounded Context خوب |
| Event-Driven Ready | ۸/۱۰ | Outbox/Inbox موجود |
| Plugin Extensibility | ۳/۱۰ | Plugin system مفقود |
| Test Coverage for Refactoring | ۲/۱۰ | ناکافی |
| Documentation | ۳/۱۰ | کم |
| Migration Path to Microservices | ۷/۱۰ | آماده |

---

## ۱۷. پلتفرم شطرنج (Chess Platform)

> **بدون موضوع (Not Applicable)**
>
> این پروژه یک **ERP سیستم (Enterprise Resource Planning)** برای مدیریت کسب‌وکار است و هیچ ارتباطی با پلتفرم شطرنج ندارد. تمام مفاهیم موجود در پروژه (Inventory, Sales, Billing, Warranty, Service, Financial, Workflow, Rule, Notification) مربوط به دامنه ERP هستند.
>
> در پروژه فعلی وجود ندارد و در محدوده این ممیزی نیست.

---

## ۱۸. ورود داده و ایندکس‌گذاری (Data Import / Indexing)

### ۱۸.۱ Seed Data

`src/lib/seed.ts` (۱۸۱ خط):

```typescript
const tenant = await db.tenant.upsert({...})  // 1 tenant
// 6 users
// 6 roles
// 1 branch (مرکز تهران)
// (در ادامه فایل: 8 product categories, 4 brands, 5 models, 10 products,
//  3 warehouses, 5 parties, etc.)
```

این seed برای توسعه و demo مناسب است اما برای production کافی نیست. باید:

- ❌ **Seed permissions** بر اساس module/action (حداقل ۵۰ permission).
- ❌ **Seed user-role assignments**.
- ❌ **Seed role-permission assignments**.
- ❌ **Seed default Chart of Accounts** (COA) برای فارسی.
- ❌ **Seed default tax codes** (VAT 9%).
- ❌ **Seed default notification templates** (LAW-55).
- ❌ **Seed default workflow definitions** (sales_order_approval).
- ❌ **Seed default rule sets** (invoice_approval).

### ۱۸.۲ Data Import Tools

- ❌ **نبود** CSV/Excel import برای bulk data entry.
- ❌ **نبود** `maatwebsite/excel` معادل در Next.js.
- ❌ **نبود** bulk create API endpoints.
- ⚠️ در Laravel `composer.json` پکیج `maatwebsite/excel` نصب شده ولی به‌کار نرفته.

### ۱۸.۳ Indexing Strategy

#### ۱۸.۳.۱ Database Indexes

(در بخش ۴.۴ پوشش داده شد.)

**نقاط ضعف:**

1. ❌ **نبود** full-text search index برای `Product.name`, `Party.displayName`.
2. ❌ **نبود** GIN index برای `metadata` JSONB (در SQLite ممکن نیست، در PostgreSQL باید).
3. ❌ **نبود** composite index برای queryهای پراستفاده (مانند `(tenantId, status, createdAt)`).
4. ❌ **نبود** partial index برای `WHERE deletedAt IS NULL`.

#### ۱۸.۳.۲ Search Indexing

- ❌ **نبود** Elasticsearch / Meilisearch / Algolia integration.
- ❌ **نبود** search API endpoint.
- ⚠️ `searchParams.get('search')` در مسیرها فقط با `contains` در Prisma پیاده شده — برای متن فارسی بهینه نیست.

### ۱۸.۴ Migration Strategy

#### ۱۸.۴.۱ Prisma Migration

- `package.json` scripts: `db:push`, `db:generate`, `db:migrate`, `db:reset`.
- ❌ **نبود** `prisma/migrations/` directory (فقط `db:push` استفاده می‌شود).
- ❌ **نبود** migration versioning.

این یعنی schema drift در production قابل tracking نیست. باید به `prisma migrate dev` و `prisma migrate deploy` منتقل شود.

#### ۱۸.۴.۲ Laravel Migration

- فقط ۲ migration: `tenants` و `users`.
- ۸۷ جدول دیگر باید به migration تبدیل شوند.
- ❌ **نبود** migration testing.

### ۱۸.۵ Data Validation

#### ۱۸.۵.۱ Input Validation

- ⚠️ اعتبارسنجی دستی با `if (!body.field) throw`.
- ❌ **نبود** Zod schema برای request body.
- ❌ **نبود** validation برای nested objects (مانند `lines[]` در SalesOrder).
- ❌ **نبود** range validation (مثلاً `quantityOrdered > 0`).

#### ۱۸.۵.۲ Business Rule Validation

- ⚠️ در some مسیرها چک می‌شود (مثلاً journal-entries/route.ts چک می‌کند fiscal period closed نباشد).
- ❌ **نبود** cross-field validation با Rule Engine (که پیاده شده ولی در مسیرها استفاده نمی‌شود).

### ۱۸.۶ ارزیابی Data Import & Indexing

| شاخص | امتیاز | توضیح |
|------|--------|--------|
| Seed Completeness | ۳/۱۰ | ناقص |
| Bulk Import | ۰/۱۰ | مفقود |
| Database Indexes | ۵/۱۰ | پایه موجود، پیشرفته مفقود |
| Full-Text Search | ۰/۱۰ | مفقود |
| Migration Strategy | ۲/۱۰ | فقط db:push |
| Input Validation | ۳/۱۰ | دستی و ناقص |

---

## ۱۹. تست (Testing)

### ۱۹.۱ وضعیت فعلی

```
src/tests/
└── unit/
    ├── shared-kernel.test.ts    (207 lines)
    ├── architecture-laws.test.ts (145 lines)
    └── business-logic.test.ts    (160 lines)
```

**۳ فایل تست، مجموعاً ۵۱۲ خط، ۶۸ تست.**

### ۱۹.۲ تحلیل فایل‌های تست

#### ۱۹.۲.۱ `shared-kernel.test.ts`

تست‌های:

- `UuidV7` (۳ تست): generate, validate, uniqueness (1000 ID).
- `Money` (۶ تست): create, negative, invalid currency, add, mismatch, subtract, multiply.
- `DateRange` (۴ تست): create, end-before-start, contains, overlap.
- `Locale` (۳ تست): predefined, fromCode, unsupported.
- `Specification` (۱ تست): isSatisfiedBy.
- `RetryPolicy` (۴ تست): exponential backoff, cap, retry decision, max attempts.
- `SnapshotPolicy` (۵ تست): threshold, defaults, custom config, nightly trigger.

**نقص:** Specification pattern فقط یک test ابتدایی دارد. `and`, `or`, `not` تست نشده‌اند.

#### ۱۹.۲.۲ `architecture-laws.test.ts`

تست‌های:

- `LAW-04..33` validation (۳۰ قانون، اما فقط ۲۰+ باید پاس شوند).
- بررسی exportهای `UnitOfWork`, `IdempotencyHelper`, `OptimisticLockHelper`, `BusinessCodeGenerator`, `BusinessCodeRepository`, `DomainException hierarchy`.

**نقص:**

1. فقط بررسی می‌کند که LAW description تعریف شده، نه اینکه در کد اعمال شده.
2. فقط LAW-04..33 را تست می‌کند، در حالی که LAW-34..57 هم وجود دارند.
3. تست `expect(laws.length).toBeGreaterThanOrEqual(20)` بسیار weak است.

#### ۱۹.۲.۳ `business-logic.test.ts`

تست‌های:

- `BusinessCodeGenerator` (۳ تست): definitions, validate, prefix/padding.
- `PersianCalendar` (۲ تست): year range, consistency.
- `EventCatalog` (۹ تست): count ≥30, version, consumers, idempotency key, payload fields, find by type, find by publisher, find by consumer, LAW-19/33/30 checks.
- `SagaDefinitions` (۵ تست): sales_order_fulfillment, return_processing, compensation action, sequential steps, trigger/completion events.

**نقاط قوت:** این فایل واقعاً business logic را تست می‌کند.

**نقص:**

1. EventCatalog تست می‌کند که ۴۶+ event وجود دارد، اما payload schema هر event را validate نمی‌کند.
2. Saga تست می‌کند که compensation action تعریف شده، اما اجرای compensation را تست نمی‌کند.

### ۱۹.۳ Coverage Analysis

طبق `vitest.config.ts`، coverage فقط شامل `src/lib/**/*.ts` است و `src/app/**` و `src/components/**` و `src/lib/mock-data.ts` مستثنی هستند.

بدون اجرای واقعی `vitest run --coverage`، تخمین coverage:

| ماژول | تعداد فایل‌های TS | فایل‌های تست شده | Coverage تخمینی |
|------|------------------|-------------------|-----------------|
| `src/lib/shared/` | ~40 فایل | 3 فایل تست (معادل 10 فایل) | ۲۵٪ |
| `src/lib/modules/` | ~10 فایل | 0 | ۰٪ |
| `src/lib/api-client.ts` | 1 فایل | 0 | ۰٪ |
| `src/lib/event-catalog.ts` | 1 فایل | 1 فایل تست | ۱۰۰٪ |
| `src/lib/saga/` | 1 فایل | 1 فایل تست | ۸۰٪ |
| `src/app/api/v1/` | 118 فایل | 0 | ۰٪ |
| `src/components/views/` | 17 فایل | 0 | ۰٪ |

**Coverage کلی تخمینی: کمتر از ۱۰٪.**

### ۱۹.۴ انواع تست‌های مفقود

| نوع تست | وضعیت | اولویت |
|---------|-------|--------|
| Unit Test (value objects, helpers) | ✅ موجود | — |
| Unit Test (services) | ❌ مفقود | High |
| Integration Test (API endpoints) | ❌ مفقود | Critical |
| Contract Test (event consumers) | ❌ مفقود | High |
| E2E Test (UI flows) | ❌ مفقود | High |
| Performance Test (load) | ❌ مفقود | Medium |
| Security Test (penetration) | ❌ مفقود | High |
| Concurrency Test (optimistic lock) | ❌ مفقود | High |
| Migration Test | ❌ مفقود | Medium |
| Snapshot Test (UI) | ❌ مفقود | Low |

### ۱۹.۵ تست‌های پیشنهادی برای اولویت

#### ۱۹.۵.۱ Integration Tests (Critical)

```
src/tests/integration/
├── api/
│   ├── products.test.ts          # CRUD + validation
│   ├── sales-orders.test.ts      # Create + idempotency + outbox event
│   ├── inventory-transactions.test.ts  # Ledger + transfer
│   ├── journal-entries.test.ts   # Double-entry + fiscal period
│   └── notifications.test.ts     # Dispatch + retry
├── workflows/
│   ├── sales-order-fulfillment.test.ts  # Saga end-to-end
│   └── return-processing.test.ts
└── laws/
    ├── law-05-ledger.test.ts     # StockItem has no on_hand
    ├── law-07-optimistic-lock.test.ts  # Concurrent updates
    └── law-08-outbox.test.ts     # Event delivery guarantee
```

#### ۱۹.۵.۲ E2E Tests (High)

```
src/tests/e2e/
├── auth/
│   ├── login.spec.ts
│   └── logout.spec.ts
├── inventory/
│   ├── create-product.spec.ts
│   ├── receive-stock.spec.ts
│   └── transfer-stock.spec.ts
└── sales/
    ├── create-order.spec.ts
    └── approve-order.spec.ts
```

### ۱۹.۶ ارزیابی تست

| شاخص | امتیاز | توضیح |
|------|--------|--------|
| Test Framework Setup | ۷/۱۰ | Vitest پیکربندی شده |
| Unit Test Coverage | ۳/۱۰ | فقط shared kernel |
| Integration Test Coverage | ۰/۱۰ | مفقود |
| E2E Test Coverage | ۰/۱۰ | مفقود |
| Test Quality | ۶/۱۰ | موجود خوب نوشته شده |
| Test Documentation | ۲/۱۰ | فقط comments |
| CI Test Execution | ⚠️ | broken (integration-tests job fail می‌شود) |

---

## ۲۰. کیفیت کد (Code Quality)

### ۲۰.۱ Type Safety

- ✅ TypeScript در کل پروژه استفاده می‌شود.
- ⚠️ `next.config.ts` سطر ۷: `ignoreBuildErrors: true` — type errors در build نادیده گرفته می‌شود.
- ❌ استفاده گسترده از `any` در مسیرها (مثلاً `function toDTO(order: any)` در sales-orders/route.ts سطر ۱۹۳).
- ❌ تضاد naming convention: `types.ts` snake_case، `api-client.ts` camelCase.

### ۲۰.۲ Code Style

- ✅ ESLint پیکربندی شده.
- ✅ Naming convention یکنواخت (camelCase برای variables، PascalCase برای types/classes، kebab-case برای files).
- ⚠️ برخی کامنت‌ها به‌جای توضیح why، صرفاً what می‌گویند (مثلاً `// 1. Idempotency pre-check`).

### ۲۰.۳ Code Duplication

#### ۲۰.۳.۱ الگوی try-catch در مسیرها

در تمام ۱۱۸ مسیر API، الگوی زیر تکرار می‌شود:

```typescript
try {
  // ...
} catch (e) {
  if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
  return errorResponse({ code: 'INTERNAL_ERROR', message: '...', statusCode: 500 })
}
```

این الگو باید به یک `withErrorHandler` wrapper استخراج شود.

#### ۲۰.۳.۲ الگوی toDTO

هر مسیر یک `toDTO` محلی دارد. این الگو باید به DTO classes یا transformer functions استخراج شود.

### ۲۰.۴ Code Complexity

#### ۲۰.۴.۱ `notification-service.ts` (882 lines)

این فایل شامل:

- `dispatch()` (طولانی)
- `processQueueItem()` (بسیار طولانی)
- `cancel()`, `retry()`, `list()`, `getById()`, `getStats()`

باید به کلاس‌های مجزا شکسته شود: `NotificationDispatcher`, `NotificationRetryEngine`, `NotificationQueryService`.

#### ۲۰.۴.۲ `page.tsx` (1464 lines)

شامل ۶+ view component inline. باید به فایل‌های مجزا شکسته شود.

### ۲۰.۵ Documentation

#### ۲۰.۵.۱ Inline Documentation

- ✅ JSDoc در فایل‌های shared kernel موجود.
- ✅ کامنت‌های گویا در Prisma schema.
- ⚠️ در مسیرها، کامنت‌ها غالباً LAW reference می‌دهند که مفید است اما توضیح why را کم می‌دهد.

#### ۲۰.۵.۲ Architecture Documentation

- ✅ `docs/adr-index.md` (فهرست ADRها).
- ✅ ۵۴ فایل LAW با description.
- ❌ **نبود** ADRهای مفصل (فقط فهرست).
- ❌ **نبود** sequence diagrams.
- ❌ **نبود** data flow diagrams.

### ۲۰.۶ Dependency Injection

- ❌ **نبود** DI container. تمام services به‌صورت static methods یا singleton هستند.
- ✅ این برای sandbox قابل قبول است، اما برای testability و replacement باید DI اضافه شود.

### ۲۰.۷ Error Handling

#### ۲۰.۷.۱ Domain Exception Hierarchy

```
DomainException (base)
├── NotFoundException
├── ValidationException
├── BusinessException
└── ConflictException
```

این hierarchy خوب است.

#### ۲۰.۷.۲ Operational Errors vs Programmer Errors

- ⚠️ در برخی مسیرها، خطاهای programmer (مانند `JSON.parse` failure) با `INTERNAL_ERROR` به client برمی‌گردد. باید log شود و generic 500 برگردانده شود.

### ۲۰.۸ Logging

- ❌ **نبود** structured logging. فقط `console.log` و `console.error`.
- ❌ **نبود** log levels (debug, info, warn, error).
- ❌ **نبود** log context (tenantId, userId, requestId).
- ❌ **نبود** log shipping (to ELK, Datadog, etc.).

### ۲۰.۹ ارزیابی کیفیت کد

| شاخص | امتیاز | توضیح |
|------|--------|--------|
| Type Safety | ۵/۱۰ | ignoreBuildErrors + any |
| Code Style | ۷/۱۰ | یکنواخت |
| Code Duplication | ۴/۱۰ | تکرار الگوی try-catch |
| Code Complexity | ۵/۱۰ | برخی فایل‌ها طولانی |
| Documentation | ۶/۱۰ | inline خوب، external کم |
| Error Handling | ۷/۱۰ | hierarchy خوب |
| Logging | ۲/۱۰ | فقط console.log |
| Testability | ۴/۱۰ | static methods، بدون DI |

---

## ۲۱. مشکلات کنونی (Current Issues)

### ۲۱.۱ Critical Issues (بحرانی — باید قبل از Production رفع شوند)

#### ۲۱.۱.۱ C-01: نبود احراز هویت واقعی

- **توضیح:** تمام ۱۱۸ مسیر `/api/v1/*` بدون auth قابل دسترسی هستند.
- **اثر:** هر کاربر anonymous می‌تواند CRUD روی تمام داده‌ها انجام دهد.
- **فایل‌های مرتبط:** تمام `src/app/api/v1/**/route.ts`، `src/lib/api-helpers.ts` (نبود auth check در `getTenantId`).
- **راه‌حل:** اضافه کردن `middleware.ts` با JWT validation، اضافه کردن فیلد `passwordHash` به `User`، پیاده‌سازی `/api/v1/auth/login`.

#### ۲۱.۱.۲ C-02: نبود RBAC enforcement

- **توضیح:** مدل‌های `Role` و `Permission` موجود اما هیچ `UserRole` و `RolePermission` join table‌ای پیاده نشده. هیچ مسیری permission check نمی‌کند.
- **اثر:** نقض امنیتی — حتی با auth، هر کاربر authenticated به همه چیز دسترسی دارد.
- **راه‌حل:** اضافه کردن join tables، پیاده‌سازی permission decorator/middleware، seed کردن permissions.

#### ۲۱.۱.۳ C-03: docker-compose.production.yml به فایل‌های مفقود ارجاع می‌دهد

- **توضیح:** سرویس‌های `outbox-worker`, `inbox-worker`, `snapshot-worker` به `src/workers/*.ts` ارجاع می‌دهند که وجود ندارند. سرویس `nginx` به `./nginx.conf` و `./ssl/` ارجاع می‌دهد که وجود ندارند.
- **اثر:** `docker-compose up` fail خواهد شد.
- **راه‌حل:** ایجاد `src/workers/{outbox,inbox,snapshot}-worker.ts` با wrapper around `OutboxDispatcher.start()`, `InboxWorker.start()`, `SnapshotScheduler.start()`. ایجاد `nginx.conf` و `ssl/` (یا حذف nginx و استفاده از Caddy با `Caddyfile` موجود).

#### ۲۱.۱.۴ C-04: `next.config.ts` با `ignoreBuildErrors: true`

- **توضیح:** TypeScript errors در build نادیده گرفته می‌شوند.
- **اثر:** production build ممکن است با type errors پنهان fail شود.
- **راه‌حل:** `ignoreBuildErrors: false` و رفع همه type errors.

#### ۲۱.۱.۵ C-05: CI/CD `bun audit || true`

- **توضیح:** security vulnerabilities در CI نادیده گرفته می‌شوند.
- **اثر:** dependency‌های آسیب‌پذیر بدون هشدار به production می‌روند.
- **راه‌حل:** `bun audit --production` بدون `|| true`، اضافه کردن `audit-ci` برای enforce severity thresholds.

#### ۲۱.۱.۶ C-06: CI/CD integration-tests job به مسیر مفقود ارجاع می‌دهد

- **توضیح:** `bunx vitest run src/tests/integration` اجرا می‌شود در حالی که مسیر `src/tests/integration/` وجود ندارد.
- **اثر:** CI pipeline fail می‌شود (یا اگر `vitest` با no-tests-found خروجی ۰ بدهد، false positive).
- **راه‌حل:** ایجاد integration tests یا حذف job تا زمان آماده‌سازی.

#### ۲۱.۱.۷ C-07: `log: ['query']` در production

- **توضیح:** در `src/lib/db.ts` سطر ۱۰، `log: ['query']` همیشه فعال است.
- **اثر:** I/O شدید، نشت احتمالی داده حساس در logs.
- **راه‌حل:** `log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error']`.

#### ۲۱.۱.۸ C-08: استفاده از mock data در page.tsx

- **توضیح:** `page.tsx` سطر ۳۴ از `mockUsers`, `mockRoles`, `mockParties`, `mockBranches`, `dashboardStats` استفاده می‌کند.
- **اثر:** UI نمایش داده‌های غیرواقعی است. Dashboard آمار واقعی نشان نمی‌دهد.
- **راه‌حل:** تبدیل به API calls با `api-client.ts`.

### ۲۱.۲ High Issues (مهم — باید در ۱-۲ اسپرینت رفع شوند)

#### ۲۱.۲.۱ H-01: نبود Zod validation در مسیرها

- **توضیح:** validation دستی با `if (!body.field)` ناقص است.
- **اثر:** data inconsistency، security risk (mass assignment).
- **راه‌حل:** تعریف Zod schema برای هر endpoint، استفاده از `safeParse`.

#### ۲۱.۲.۲ H-02: نبود rate limiting

- **توضیح:** هیچ محدودیتی روی مسیرها، مخصوصاً auth (در آینده).
- **اثر:** brute force، DDoS.
- **راه‌حل:** `@upstash/ratelimit` یا `rate-limiter-flexible`، ۴-tier policy (auth/sensitive/authenticated/public).

#### ۲۱.۲.۳ H-03: نبود security headers

- **توضیح:** CSP, HSTS, X-Frame-Options, X-Content-Type-Options مفقود.
- **اثر:** XSS، clickjacking.
- **راه‌حل:** `next.config.ts` `headers()` یا middleware.

#### ۲۱.۲.۴ H-04: نبود OpenAPI/Swagger documentation

- **توضیح:** ۱۱۸ مسیر بدون مستندات.
- **اثر:** onboarding کند، integration با clientهای third-party سخت.
- **راه‌حل:** `next-swagger-doc` یا `swagger-jsdoc`، generation از TypeScript types.

#### ۲۱.۲.۵ H-05: Test coverage کمتر از ۱۰٪

- **توضیح:** فقط ۳ فایل تست، ۶۸ تست.
- **اثر:** refactoring risk بالا، regression احتمالی.
- **راه‌حل:** هدف ۸۰٪ coverage برای `src/lib/` و ۶۰٪ برای `src/app/api/`.

#### ۲۱.۲.۶ H-06: تضاد snake_case/camelCase

- **توضیح:** `types.ts` snake_case، `api-client.ts` camelCase.
- **اثر:** type mismatch، runtime bugs.
- **راه‌حل:** یکپارچه‌سازی به camelCase (با تبدیل در API layer اگر backend snake_case برمی‌گرداند).

#### ۲۱.۲.۷ H-07: نبود audit log table

- **توضیح:** مدل `AuditLog` در Prisma schema مفقود.
- **اثر:** نقض الزامات قانونی و امنیتی.
- **راه‌حل:** اضافه کردن `AuditLog` با partitioning by month.

#### ۲۱.۲.۸ H-08: `actorId: null` در Outbox

- **توضیح:** در تمام outbox events، `actorId: null` چون auth نیست.
- **اثر:** audit trail ناقص.
- **راه‌حل:** بعد از پیاده‌سازی auth، از `getUserId()` برای actorId استفاده شود.

#### ۲۱.۲.۹ H-09: نبود cursor-based pagination

- **توضیح:** offset-based pagination در صفحات عمیق کند می‌شود.
- **اثر:** query timeout در حجم بالا.
- **راه‌حل:** اضافه کردن `cursor` parameter، استفاده از `cursor` + `take` در Prisma.

#### ۲۱.۲.۱۰ H-10: نبود structured logging

- **توضیح:** فقط `console.log`.
- **اثر:** debugging سخت، observability ضعیف.
- **راه‌حل:** `pino` یا `winston` با JSON format، اضافه کردن requestId, tenantId, userId context.

#### ۲۱.۲.۱۱ H-11: نبود i18n واقعی

- **توضیح:** `next-intl` نصب شده ولی به‌کار نرفته.
- **اثر:** تمام رشته‌ها hardcode فارسی، پشتیبانی از en/ar/ku مفقود.
- **راه‌حل:** ایجاد `app/[locale]/`, `messages/{fa,en,ar,ku}.json`, `NextIntlClientProvider` در layout.

#### ۲۱.۲.۱۲ H-12: نبود React Query / Zustand

- **توضیح:** پکیج‌ها نصب شده ولی استفاده نشده.
- **اثر:** تکرار کد fetch، نبود cache.
- **راه‌حل:** ایجاد hooks مبتنی بر `useQuery` برای هر entity، `zustand` برای global state.

### ۲۱.۳ Medium Issues (متوسط — باید در ۳-۵ اسپرینت رفع شوند)

#### ۲۱.۳.۱ M-01: `page.tsx` monolithic

- ۱۴۶۴ خط در یک فایل. باید به صفحات مجزا شکسته شود.

#### ۲۱.۳.۲ M-02: نبود code splitting در frontend

- تمام ۱۷ view در bundle اولیه. باید `dynamic()` استفاده شود.

#### ۲۱.۳.۳ M-03: نبود connection pool tuning

- Prisma default ۱۰ connection. برای production باید ۲۰-۵۰.

#### ۲۱.۳.۴ M-04: نبود Redis cache استفاده واقعی

- Redis در docker-compose اما هیچ cache pattern در کد.

#### ۲۱.۳.۵ M-05: الگوی Repository ناقص

- فقط `BusinessCodeRepository` پیاده شده. بقیه مستقیماً به Prisma دسترسی دارند.

#### ۲۱.۳.۶ M-06: `productInstance` unique constraint ناقص

- `@@unique([tenantId, serialNumber])` اما اگر `serialNumber` nullable باشد، چند null مجاز است.

#### ۲۱.۳.۷ M-07: `toDTO` با `any`

- در تمام مسیرها. باید type-safe باشد.

#### ۲۱.۳.۸ M-08: نبود ETag/If-None-Match

- برای HTTP caching.

#### ۲۱.۳.۹ M-09: نبود HATEOAS links

- REST سطح ۳ نیست.

#### ۲۱.۳.۱۰ M-10: نبود API versioning strategy برای v2

- فقط `/v1/` موجود. باید strategy برای `/v2/` تعریف شود.

#### ۲۱.۳.۱۱ M-11: نبود database partitioning

- InventoryTransaction و OutboxMessage نیاز به partitioning در volume بالا.

#### ۲۱.۳.۱۲ M-12: نبود backup自动化

- (در بخش ۱۴ پوشش داده شد.)

#### ۲۱.۳.۱۳ M-13: `reactStrictMode: false`

- باید `true` باشد برای تشخیص side effects.

#### ۲۱.۳.۱۴ M-14: نبود HEALTHCHECK در Dockerfile

- (در compose تعریف شده ولی نه در Dockerfile.)

#### ۲۱.۳.۱۵ M-15: نبود USER non-root در Dockerfile

- container به‌عنوان root اجرا می‌شود.

#### ۲۱.۳.۱۶ M-16: پکیج‌های بدون استفاده در package.json

- ۹+ پکیج نصب شده ولی استفاده نشده. bundle size افزایش می‌یابد.

#### ۲۱.۳.۱۷ M-17: `seed.ts` ناقص

- permissions، role-permission assignments، COA، tax codes، notification templates، workflow definitions، rule sets seed نشده.

#### ۲۱.۳.۱۸ M-18: نبود file upload/download

- هیچ ماژول file management موجود نیست (با وجود ADR-008 که Interface را الزامی می‌کند).

#### ۲۱.۳.۱۹ M-19: نبود WebSocket برای real-time

- `examples/websocket/` موجود ولی به‌کار نرفته. ADR-012 WebSocket + REST fallback را الزامی می‌کند.

#### ۲۱.۳.۲۰ M-20: `examples/websocket/server.ts` standalone است

- باید به Next.js integration داده شود.

---

## ۲۲. بدهی فنی (Technical Debt)

### ۲۲.۱ بدهی فنی شناسایی‌شده

| ID | عنوان | Severity | تخمین تلاش | دسته |
|----|-------|----------|-----------|------|
| TD-01 | page.tsx monolithic (1464 lines) | High | 5 days | Code Quality |
| TD-02 | نبود auth واقعی | Critical | 10 days | Security |
| TD-03 | نبود RBAC enforcement | Critical | 7 days | Security |
| TD-04 | mock-data در page.tsx | Critical | 3 days | Code Quality |
| TD-05 | ignoreBuildErrors: true | Critical | 2 days | Code Quality |
| TD-06 | log: ['query'] در production | Critical | 1 day | Performance |
| TD-07 | types.ts snake_case vs api-client camelCase | High | 5 days | Type Safety |
| TD-08 | نبود Zod validation | High | 7 days | Code Quality |
| TD-09 | نبود rate limiting | High | 3 days | Security |
| TD-10 | نبود security headers | High | 2 days | Security |
| TD-11 | نبود OpenAPI documentation | High | 5 days | Documentation |
| TD-12 | نبود audit log table | High | 3 days | Compliance |
| TD-13 | Test coverage < 10% | High | 20 days | Quality |
| TD-14 | نبود structured logging | High | 3 days | Observability |
| TD-15 | نبود i18n واقعی | High | 5 days | UX |
| TD-16 | نبود React Query | High | 5 days | Performance |
| TD-17 | نبود cursor pagination | High | 3 days | Performance |
| TD-18 | نبود Redis cache usage | Medium | 5 days | Performance |
| TD-19 | الگوی Repository ناقص | Medium | 10 days | Architecture |
| TD-20 | toDTO با any | Medium | 7 days | Type Safety |
| TD-21 | نبود DI container | Medium | 5 days | Architecture |
| TD-22 | نبود database partitioning | Medium | 5 days | Performance |
| TD-23 | seed.ts ناقص | Medium | 5 days | Data Quality |
| TD-24 | نبود file upload | Medium | 10 days | Feature |
| TD-25 | نبود WebSocket | Medium | 7 days | Feature |
| TD-26 | Laravel backend ناتمام | Medium | 30 days | Backend |
| TD-27 | docker-compose به فایل‌های مفقود | Critical | 3 days | Infrastructure |
| TD-28 | نبود backup automation | High | 5 days | Operations |
| TD-29 | نبود DR plan | High | 5 days | Operations |
| TD-30 | پکیج‌های بدون استفاده | Low | 1 day | Bundle Size |
| TD-31 | nbroadcast saga handlers فقط console.log | Medium | 5 days | Functionality |
| TD-32 | nbroadcast event handlers ناتمام | Medium | 10 days | Functionality |
| TD-33 | nbroadcast outbox-worker وجود ندارد | Critical | 3 days | Infrastructure |
| TD-34 | nbroadcast inbox-worker وجود ندارد | Critical | 3 days | Infrastructure |
| TD-35 | nbroadcast snapshot-worker وجود ندارد | Critical | 3 days | Infrastructure |
| TD-36 | nbroadcast nginx.conf وجود ندارد | Critical | 2 days | Infrastructure |
| TD-37 | nbroadcast ssl/ directory وجود ندارد | Critical | 1 day | Infrastructure |
| TD-38 | nbroadcast middleware.ts وجود ندارد | Critical | 5 days | Security |
| TD-39 | nbroadcast /api/v1/auth/* وجود ندارد | Critical | 5 days | Feature |
| TD-40 | nbroadcast UserRole و RolePermission join tables | Critical | 3 days | Database |

**مجموع تخمین تلاش: ~۲۵۰ روز-کار** (معادل ۱۲.۵ اسپرینت ۲-هفته‌ای برای یک توسعه‌دهنده).

### ۲۲.۲ بدهی فنی معماری

#### ۲۲.۲.۱ عدم استفاده از DI

- تمام services به‌صورت static methods. این testing را سخت می‌کند.
- **راه‌حل:** معرفی `tsyringe` یا `InversifyJS`.

#### ۲۲.۲.۲ نبود Repository abstraction کامل

- مسیرها مستقیماً به Prisma وابسته‌اند. اگر در آینده بخواهیم به PostgreSQL-native query یا SQL branching برویم، refactoring بزرگ لازم است.

#### ۲۲.۲.۳ نبود CQRS کامل

- جداسازی Command/Query صریح نیست. در حجم بالا، read models جداگانه لازم است.

### ۲۲.۳ بدهی فنی مستندسازی

- `docs/` فقط ۳ سند دارد.
- ۳۳ قانون LAW در `adr-index.md` فهرست شده اما ADR مفصل نوشته نشده.
- نبود API reference، sequence diagrams، data flow diagrams.

### ۲۲.۴ بدهی فنی تست

- Coverage < 10%.
- نبود integration، E2E، contract، performance، security tests.
- CI integration-tests job fail می‌شود.

### ۲۲.۵ بدهی فنی امنیتی

- نبود auth، RBAC، audit log، rate limiting، security headers.
- این بدهی **Critical** است و باید قبل از Production رفع شود.

### ۲۲.۶ بدهی فنی زیرساخت

- docker-compose به فایل‌های مفقود ارجاع می‌دهد.
- نبود backup، DR، monitoring، alerting.

### ۲۲.۷ بدهی فنی عملیاتی

- نبود structured logging.
- نبود distributed tracing.
- نبود error tracking (Sentry).

### ۲۲.۸ نرخ بدهی فنی

**نرخ بدهی فنی به کد:** ~۲۵۰ روز / ~۱۰۰۰۰ خط کد = ~۲.۵٪

این یعنی به ازای هر ۴۰ خط کد، ۱ روز بدهی فنی وجود دارد. این نرخ بالا است و نشان‌دهنده نیاز به یک اسپرینت اختصاصی «پرداخت بدهی فنی» است.

---

## ۲۳. معماری پیشنهادی (Recommended Architecture)

### ۲۳.۱ چشم‌انداز معماری آینده

برای تبدیل BISMARK ERP از sandbox به production-grade enterprise ERP، معماری پیشنهادی زیر را توصیه می‌کنیم:

```
┌─────────────────────────────────────────────────────────────────────┐
│                       Client Layer                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ Next.js 16 Web   │  │  Flutter Mobile  │  │  3rd-party API   │  │
│  │ (App Router)     │  │  (future)        │  │  Clients         │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  │
└───────────┼─────────────────────┼─────────────────────┼────────────┘
            │                     │                     │
            └─────────────────────┼─────────────────────┘
                                  │ HTTPS + JWT
┌─────────────────────────────────▼──────────────────────────────────┐
│                     API Gateway / Load Balancer                      │
│  (Caddy or Nginx) — TLS termination, rate limiting, routing         │
└─────────────────────────────────┬──────────────────────────────────┘
                                  │
                  ┌───────────────┼───────────────┐
                  │               │               │
        ┌─────────▼────┐  ┌──────▼───────┐  ┌────▼─────────┐
        │ Next.js App  │  │ Next.js App  │  │ Next.js App  │  (horizontal)
        │ (instance 1) │  │ (instance 2) │  │ (instance N) │
        └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
               │                 │                  │
               └────────┬────────┴──────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
   ┌────▼────┐    ┌─────▼─────┐   ┌────▼─────┐
   │ Outbox  │    │  Inbox    │   │ Snapshot │  (worker pool)
   │ Worker  │    │  Worker   │   │ Worker   │  (with leader election)
   └────┬────┘    └─────┬─────┘   └────┬─────┘
        │               │               │
        └───────────────┼───────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │   Redis (cache)  │
              │   + BullMQ queue │
              └──────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────┐
        │     PostgreSQL 16 (Primary)       │
        │  + Read Replicas (query)          │
        │  + PgBouncer (connection pool)    │
        │  + WAL Archival to S3             │
        └───────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────┐
        │   S3 / MinIO (file storage)       │
        │   + Backup snapshots              │
        └───────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────┐
        │  Observability Stack               │
        │  - Prometheus + Grafana (metrics)  │
        │  - Loki (logs)                     │
        │  - Sentry (errors)                 │
        │  - OpenTelemetry (traces)          │
        └───────────────────────────────────┘
```

### ۲۳.۲ توصیه‌های معماری

#### ۲۳.۲.۱ Frontend Architecture

1. **App Router با route groups**: `app/(auth)/login/page.tsx`, `app/(dashboard)/dashboard/page.tsx`.
2. **Server Components به‌عنوان default**: فقط کامپوننت‌هایی که interactivity دارند `'use client'`.
3. **React Query برای data fetching**: `useQuery` برای GET، `useMutation` برای POST/PATCH.
4. **Zustand برای global UI state**: theme, sidebar, locale.
5. **react-hook-form + Zod برای forms**: type-safe validation.
6. **next-intl برای i18n**: `app/[locale]/` با `messages/{fa,en,ar,ku}.json`.
7. **next-auth برای authentication**: JWT strategy با refresh token rotation.
8. **Code splitting با `dynamic()`**: lazy load view components.
9. **Error Boundaries**: `error.tsx` در هر route segment.
10. **Loading UI**: `loading.tsx` با skeleton.

#### ۲۳.۲.۲ Backend Architecture (Next.js API)

1. **Middleware برای auth + tenant + i18n**: `src/middleware.ts`.
2. **Zod schemas برای همه endpoints**: در `src/lib/api/schemas/`.
3. **Repository pattern کامل**: `src/lib/modules/{context}/repositories/`.
4. **Service layer کامل**: `src/lib/modules/{context}/services/`.
5. **DTOs در `src/lib/modules/{context}/contracts/dtos/`**: type-safe serialization.
6. **Error handler middleware**: wrapper around all routes.
7. **Rate limiting با Redis backend**: `@upstash/ratelimit`.
8. **OpenAPI generation**: `@asteasolutions/zod-to-openapi`.
9. **Health check کامل**: DB + Redis + Outbox + Inbox + Workers.
10. **Prometheus metrics endpoint**: `/api/v1/metrics`.

#### ۲۳.۲.۳ Database Architecture

1. **PostgreSQL 16** با UUID v7، JSONB، ENUM، partial index، GIN.
2. **Read replicas** برای queryهای GET.
3. **PgBouncer** برای connection pooling.
4. **Partitioning** برای InventoryTransaction (by month)، OutboxMessage (by status)، AuditLog (by month).
5. **Materialized views** برای BI aggregates.
6. **Trigger-based audit log** (یا application-level با middleware).
7. **Backup**: pg_dump daily + WAL archival every 5 min + S3 storage.
8. **PITR**: point-in-time recovery با WAL.
9. **Migration**: `prisma migrate deploy` در CI/CD.

#### ۲۳.۲.۴ Worker Architecture

1. **Outbox Worker**: poll Outbox، publish به Redis Stream یا RabbitMQ.
2. **Inbox Worker**: consume از Redis Stream، dispatch به handlers.
3. **Snapshot Worker**: nightly snapshot از StockBalance.
4. **Notification Worker**: poll NotificationQueue، send via providers.
5. **Audit Worker**: wildcard consumer، write to AuditLog.
6. **Leader Election**: `redlock` برای multi-instance coordination.

#### ۲۳.۲.۵ Event-Driven Architecture

1. **Redis Streams** یا **RabbitMQ** به‌عنوان message broker.
2. **Schema Registry** برای event schemas (با Zod یا Avro).
3. **Dead Letter Queue** برای failed events.
4. **Event Replay** capability برای debugging.
5. **Saga Orchestrator** با durable state (در DB).

#### ۲۳.۲.۶ Security Architecture

1. **JWT** با asymmetric signing (RS256).
2. **Refresh token rotation** با reuse detection.
3. **2FA TOTP** با `otplib`.
4. **Account lockout** با exponential backoff.
5. **Password policy** با `zxcvbn`.
6. **RBAC** با `Role > Permission > Action` hierarchy.
7. **ABAC** (Attribute-Based) برای rules پیچیده (مانند «فقط کاربران شعبه X»).
8. **Security headers**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options.
9. **CORS**: whitelist domains.
10. **CSRF**: SameSite cookies + CSRF token.
11. **Audit log**: append-only، partitioned by month.
12. **Secrets**: AWS Secrets Manager یا HashiCorp Vault.

#### ۲۳.۲.۷ Observability Architecture

1. **Structured logging** با `pino` و JSON format.
2. **Log context**: requestId, tenantId, userId, action.
3. **Log shipping** به Loki یا ELK.
4. **Metrics** با `prom-client`: request count, latency, error rate, queue depth.
5. **Grafana dashboards** برای application و infrastructure.
6. **Alerting** با Alertmanager (Prometheus) یا Grafana Alerts.
7. **Distributed tracing** با OpenTelemetry + Jaeger.
8. **Error tracking** با Sentry.
9. **Uptime monitoring** با Uptime Kuma یا Pingdom.
10. **RUM** (Real User Monitoring) با Sentry یا Vercel Analytics.

### ۲۳.۳ معماری پیشنهادی برای ماژول‌های Sprint 7.4+

#### ۲۳.۳.۱ Scheduler Module

```
src/lib/modules/scheduler/
├── contracts/
│   ├── scheduler-command-service.ts
│   ├── scheduler-query-service.ts
│   └── dtos/
│       ├── scheduled-job-dto.ts
│       └── job-execution-dto.ts
├── services/
│   ├── scheduler-command-service.ts  # CRUD jobs
│   ├── scheduler-query-service.ts    # List/get jobs
│   ├── cron-parser.ts                # Parse cron expressions
│   └── job-executor.ts               # Execute jobs
├── repositories/
│   └── scheduled-job-repository.ts
└── workers/
    └── scheduler-worker.ts           # Poll every minute
```

#### ۲۳.۳.۲ BI Module

```
src/lib/modules/bi/
├── contracts/
│   └── bi-query-service.ts
├── services/
│   ├── bi-query-service.ts           # Read from materialized views
│   ├── etl-service.ts                # ETL from operational DB
│   └── report-builder.ts             # Build custom reports
└── marts/                            # Materialized view definitions
    ├── sales-mart.ts
    ├── inventory-mart.ts
    └── financial-mart.ts
```

#### ۲۳.۳.۳ AI Module

```
src/lib/modules/ai/
├── contracts/
│   ├── ai-provider-interface.ts
│   └── dtos/
├── services/
│   ├── ai-orchestrator.ts
│   ├── prompt-templates/
│   └── response-cache.ts
└── providers/
    ├── z-ai-provider.ts              # Uses z-ai-web-dev-sdk
    ├── openai-provider.ts
    └── anthropic-provider.ts
```

### ۲۳.۴ Roadmap معماری

| Phase | مدت | توضیح |
|-------|------|--------|
| Phase 1: Security & Production-Readiness | ۲ اسپرینت | auth, RBAC, audit log, security headers, rate limiting, backup |
| Phase 2: Quality & Stability | ۲ اسپرینت | test coverage 80%, structured logging, error tracking |
| Phase 3: Performance & Scale | ۲ اسپرینت | cursor pagination, Redis cache, partitioning, read replicas |
| Phase 4: Feature Completion | ۳ اسپرینت | Scheduler, Automation, Monitoring, BI modules |
| Phase 5: AI & Advanced Features | ۲ اسپرینت | AI module, advanced reports, executive dashboard |
| Phase 6: Laravel Backend Production | ۴ اسپرینت | migration از Next.js sandbox به Laravel production |

**مجموع: ~۱۵ اسپرینت (۳۰ هفته)** برای رسیدن به production-grade ERP.

---

## ۲۴. نقشه راه توسعه (Development Roadmap)

### ۲۴.۱ نقشه راه پیشنهادی ۱۲ اسپرینتی

#### Sprint A: Security Critical (۲ هفته)

**هدف:** رفع تمام Critical issues امنیتی.

- [ ] پیاده‌سازی `middleware.ts` با JWT validation
- [ ] اضافه کردن فیلد `passwordHash`, `mfaSecret`, `failedLoginAttempts` به `User`
- [ ] پیاده‌سازی `/api/v1/auth/{login,refresh,logout,me}`
- [ ] اضافه کردن `UserRole` و `RolePermission` join tables
- [ ] Seed کردن ۵۰+ permission بر اساس module/action
- [ ] پیاده‌سازی permission middleware در تمام مسیرها
- [ ] اضافه کردن security headers در `next.config.ts`
- [ ] فعال‌سازی rate limiting با Redis backend
- [ ] رفع `ignoreBuildErrors: true`
- [ ] رفع `bun audit || true` در CI

**Definition of Done:**
- ۱۰۰٪ مسیرها auth check دارند.
- ۱۰۰٪ مسیرها permission check دارند.
- security headers در response موجود است.
- rate limiting فعال است.
- CI fail می‌شود روی vulnerability.

#### Sprint B: Production Infrastructure (۲ هفته)

**هدف:** آماده‌سازی زیرساخت برای production deployment.

- [ ] ایجاد `src/workers/{outbox,inbox,snapshot}-worker.ts`
- [ ] ایجاد `nginx.conf` (یا حذف nginx و استفاده از Caddy)
- [ ] ایجاد `ssl/` directory با self-signed cert برای dev
- [ ] فعال‌سازی `reactStrictMode: true`
- [ ] رفع `log: ['query']` در production
- [ ] ایجاد `.dockerignore`
- [ ] اضافه کردن USER non-root در Dockerfile
- [ ] اضافه کردن HEALTHCHECK در Dockerfile
- [ ] پیاده‌سازی multi-arch build
- [ ] پیاده‌سازی GitHub Actions برای push to GHCR
- [ ] پیاده‌سازی deployment to staging/production
- [ ] رفع CI integration-tests job

**Definition of Done:**
- `docker-compose up` در production موفق است.
- CI/CD pipeline end-to-end کار می‌کند.
- deployment به staging automated است.

#### Sprint C: Test Coverage (۲ هفته)

**هدف:** رسیدن به ۸۰٪ coverage.

- [ ] ایجاد `src/tests/integration/api/` با ۲۰+ تست
- [ ] ایجاد `src/tests/integration/laws/` با ۱۰+ تست
- [ ] ایجاد `src/tests/integration/workflows/` با ۵+ تست
- [ ] ایجاد `src/tests/e2e/` با ۱۰+ تست
- [ ] اضافه کردن codecov به CI
- [ ] هدف ۸۰٪ coverage برای `src/lib/`
- [ ] هدف ۶۰٪ coverage برای `src/app/api/`

**Definition of Done:**
- coverage ≥ ۸۰٪ برای lib.
- CI fail می‌شود اگر coverage کمتر از threshold باشد.

#### Sprint D: Code Quality & Refactoring (۲ هفته)

**هدف:** رفع بدهی فنی کد.

- [ ] شکستن `page.tsx` به صفحات مجزا
- [ ] حذف `mock-data.ts` و استفاده از API
- [ ] یکپارچه‌سازی snake_case/camelCase
- [ ] اضافه کردن Zod validation به تمام endpoints
- [ ] استخراج `withErrorHandler` wrapper
- [ ] استخراج DTO classes
- [ ] اضافه کردن `tsyringe` برای DI
- [ ] پیاده‌سازی Repository pattern برای تمام ماژول‌ها
- [ ] حذف پکیج‌های بدون استفاده

**Definition of Done:**
- `page.tsx` به ۱۰+ فایل شکسته شده.
- ۱۰۰٪ endpoints Zod validation دارند.
- ۱۰۰٪ repositories پیاده شده.
- coverage ≥ ۸۰٪ حفظ شده.

#### Sprint E: Performance & Scale (۲ هفته)

**هدف:** بهینه‌سازی کارایی.

- [ ] اضافه کردن cursor-based pagination
- [ ] فعال‌سازی Redis cache برای hot queries
- [ ] اضافه کردن connection pool tuning
- [ ] اضافه کردن database partitioning
- [ ] پیاده‌سازی ETag/If-None-Match
- [ ] پیاده‌سازی code splitting در frontend
- [ ] فعال‌سازی React Query
- [ ] پیاده‌سازی materialized views برای BI

**Definition of Done:**
- API latency < ۲۰۰ms برای p99.
- Frontend LCP < ۲.۵s.
- DB query latency < ۵۰ms برای p95.

#### Sprint F: Observability (۱ هفته)

**هدف:** observability کامل.

- [ ] اضافه کردن `pino` structured logging
- [ ] اضافه کردن log context (requestId, tenantId, userId)
- [ ] اضافه کردن Sentry error tracking
- [ ] اضافه کردن Prometheus metrics endpoint
- [ ] اضافه کردن OpenTelemetry tracing
- [ ] ایجاد Grafana dashboards
- [ ] تنظیم alerting rules

**Definition of Done:**
- ۱۰۰٪ logs structured JSON.
- ۱۰۰٪ errors در Sentry.
- dashboards Grafana فعال است.

#### Sprint G: Backup & DR (۱ هفته)

**هدف:** backup و disaster recovery.

- [ ] پیاده‌سازی pg_dump daily backup
- [ ] پیاده‌سازی WAL archival
- [ ] پیاده‌سازی PITR
- [ ] ایجاد `scripts/backup.sh` و `scripts/restore.sh`
- [ ] نوشتن `docs/disaster-recovery.md`
- [ ] اجرای DR drill
- [ ] پیاده‌سازی automated restore test

**Definition of Done:**
- backup automated روزانه.
- restore test موفق.
- DR plan مستند شده.

#### Sprint H: i18n & UX (۱ هفته)

**هدف:** پشتیبانی چندزبانه واقعی.

- [ ] ایجاد `app/[locale]/` structure
- [ ] ایجاد `messages/{fa,en,ar,ku}.json`
- [ ] اضافه کردن `NextIntlClientProvider`
- [ ] تبدیل تمام رشته‌های hardcoded به `t('key')`
- [ ] اضافه کردن locale switcher در Topbar
- [ ] فعال‌سازی RTL/LTR based on locale

**Definition of Done:**
- ۴ زبان پشتیبانی می‌شود.
- ۱۰۰٪ رشته‌ها از messages file می‌آیند.

#### Sprint I: Scheduler Module (۲ هفته)

**هدف:** پیاده‌سازی ماژول Scheduler (Sprint 7.4 ادعا شده).

- [ ] مدل `ScheduledJob` در Prisma
- [ ] `cron-parser` service
- [ ] `scheduler-worker` با leader election
- [ ] API `/api/v1/scheduler/jobs` CRUD
- [ ] UI `/scheduler-dashboard` و `/scheduler-jobs`
- [ ] تست‌های واحد و یکپارچه‌سازی

**Definition of Done:**
- cron jobs قابل تعریف و اجرا هستند.
- worker در multi-instance safe است.

#### Sprint J: Monitoring & BI Modules (۳ هفته)

**هدف:** پیاده‌سازی ماژول‌های Monitoring (Sprint 7.5) و BI (Sprint 8).

- [ ] ماژول Monitoring با metrics و alerts
- [ ] ماژول BI با dashboards و reports
- [ ] materialized views برای aggregates
- [ ] UI `/bi-dashboard`, `/executive-dashboard`, `/analytics`
- [ ] UI `/metrics`, `/integration-monitor`, `/event-explorer`, `/dead-letter-queue`

**Definition of Done:**
- ۵+ dashboard BI فعال.
- event explorer و DLQ مدیریت می‌شود.

#### Sprint K: Automation & AI Modules (۳ هفته)

**هدف:** پیاده‌سازی ماژول‌های Automation و AI.

- [ ] ماژول Automation با trigger-action rules
- [ ] ماژول AI با provider abstraction
- [ ] UI `/automations`, `/ai-assistant`
- [ ] تست‌های واحد و یکپارچه‌سازی

**Definition of Done:**
- automation rules قابل تعریف هستند.
- AI assistant به provider متصل است.

#### Sprint L: Laravel Backend Production (۴ هفته)

**هدف:** migration به Laravel backend برای production.

- [ ] ایجاد ۸۷ migration باقی‌مانده
- [ ] پیاده‌سازی controllers و routes
- [ ] پیاده‌سازی Sanctum auth
- [ ] پیاده‌سازی Spatie RBAC
- [ ] پیاده‌سازی audit log با Spatie activitylog
- [ ] تست Laravel (Pest)
- [ ] deployment Laravel + Next.js frontend
- [ ] موازی‌سازی با Next.js sandbox برای testing

**Definition of Done:**
- Laravel backend در production فعال.
- Next.js frontend به Laravel API متصل است.
- coverage ≥ ۸۰٪ برای Laravel.

### ۲۴.۲ خلاصه نقشه راه

| Sprint | مدت | اولویت | هدف اصلی |
|--------|------|--------|----------|
| A | ۲ هفته | Critical | Security |
| B | ۲ هفته | Critical | Infrastructure |
| C | ۲ هفته | High | Testing |
| D | ۲ هفته | High | Code Quality |
| E | ۲ هفته | High | Performance |
| F | ۱ هفته | High | Observability |
| G | ۱ هفته | High | Backup & DR |
| H | ۱ هفته | Medium | i18n |
| I | ۲ هفته | Medium | Scheduler |
| J | ۳ هفته | Medium | Monitoring & BI |
| K | ۳ هفته | Low | Automation & AI |
| L | ۴ هفته | Strategic | Laravel Backend |

**مجموع: ~۲۵ هفته (۶.۲۵ ماه)** برای رسیدن به production-grade ERP کامل.

---

## ۲۵. خلاصه اجرایی (Executive Summary)

### ۲۵.۱ وضعیت کلی

**BISMARK ERP** یک پروژه ERP با معماری Domain-Driven Design و الگوهای پیشرفته enterprise (Outbox/Inbox, Ledger, Saga, Event Sourcing) است. در وضعیت فعلی (Sprint 1 تا 7.3)، پروژه یک **sandbox قابل اجرا** با پایگاه داده SQLite ارائه می‌دهد که نشان‌دهنده طراحی معماری قوی و رعایت ۵۴ قانون معماری است.

### ۲۵.۲ نقطه قوت اصلی

1. **معماری Domain-Driven Design ممتاز**: Bounded Contextها به‌خوبی جدا شده‌اند، ۴۶ رویداد دامنه در Event Catalog ثبت شده، و الگوی Outbox/Inbox برای reliable event delivery پیاده شده است.
2. **رعایت Ledger Pattern**: LAW-05 به‌صورت کامل اعمال شده — هیچ مقدار aggregate به‌عنوان منبع حقیقت ذخیره نمی‌شود. این برای audit و گزارش‌گیری حیاتی است.
3. **۵۴ قانون معماری مستند**: هر قانون در یک فایل جداگانه با description کامل. این یک asset برای onboarding و maintenance است.
4. **۸۹ مدل Prisma** با طراحی normal شده، tenant-scoped، و optimistic locking.
5. **۱۱۸ مسیر API** با الگوی یکنواخت و RFC 7807 Problem Details.
6. **پیاده‌سازی Notification Service** به‌عنوان نمونه کامل Application Service با retry engine و DLQ.

### ۲۵.۳ نقطه ضعف اصلی

1. **نبود احراز هویت واقعی** (Critical): تمام ۱۱۸ مسیر API بدون auth قابل دسترسی هستند. این یک نقض امنیتی **Critical** است که باید قبل از هر deployment production رفع شود.
2. **نبود RBAC enforcement** (Critical): نقش‌ها و permissions تعریف شده اما هیچ join table و هیچ permission check در مسیرها وجود ندارد.
3. **docker-compose.production.yml به فایل‌های مفقود ارجاع می‌دهد** (Critical): `src/workers/*.ts`, `nginx.conf`, `ssl/` همگی مفقود. `docker-compose up` fail خواهد شد.
4. **`next.config.ts` با `ignoreBuildErrors: true`** (Critical): type errors در build نادیده گرفته می‌شوند.
5. **Coverage تست کمتر از ۱۰٪** (High): فقط ۳ فایل تست برای ۳۹۰۰+ خط shared kernel. هیچ تست API یا UI موجود نیست.
6. **استفاده از mock data در `page.tsx`** (Critical): علیرغم ادعای `api-client.ts`، Dashboard از mock data استفاده می‌کند.
7. **تضاد snake_case/camelCase** بین `types.ts` و `api-client.ts` (High): type safety را نقض می‌کند.
8. **نبود structured logging، monitoring، backup، DR** (High): project آماده production نیست.
9. **`worklog.md` بیش از ۶۳۷۴ خط ادعا** که با واقعیت مطابقت ندارد: قوانین ۵۸-۶۴، ماژول‌های Sprint 7.4+، فایل‌های تست، مسیرهای API، و viewهای UI همگی ادعا شده اما **وجود ندارند**.

### ۲۵.۴ سه یافته بحرانی برتر

1. **🚨 Critical Security: نبود احراز هویت و RBAC** — تمام مسیرهای API بدون auth قابل دسترسی هستند. هیچ JWT، هیچ session، هیچ permission checkی پیاده نشده. حتی `next-auth` که نصب شده به‌کار نرفته. این یعنی پروژه در حال حاضر **نامناسب برای هر نوع deployment production** است.

2. **🚨 Critical Infrastructure: docker-compose به فایل‌های مفقود ارجاع می‌دهد** — چهار سرویس (`outbox-worker`, `inbox-worker`, `snapshot-worker`, `nginx`) به فایل‌هایی ارجاع می‌دهند که در فایل‌سیستم موجود نیستند. `docker-compose up` در عمل fail خواهد شد. این نشان می‌دهد که ادعای production-readiness در `docs/production-readiness-checklist.md` نادرست است.

3. **🚨 Critical Code Quality: تضاد واقعیت و worklog** — `worklog.md` ادعا می‌کند ۹۶ مدل، ۲۴۴ مسیر API، ۳۶ view، ۲۱ فایل تست، ۷۵۸ تست، ۶۴ قانون، و ۷+ ماژول وجود دارد. واقعیت: ۸۹ مدل، ۱۱۸ مسیر، ۱۷ view، ۳ فایل تست، ۶۸ تست، ۵۴ قانون، و ۳ ماژول. Sprint 7.4 تا ۱۲ (شامل Scheduler, Automation, Monitoring, BI, AI, Performance, Security modules) **به‌طور کامل در کد وجود ندارند** و فقط در `worklog.md` توصیف شده‌اند.

### ۲۵.۵ توصیه‌های فوری

برای تبدیل این پروژه به یک system production-ready، اقدامات زیر با اولویت Critical لازم است:

1. **اسپرینت Security Critical (۲ هفته)**: پیاده‌سازی auth، RBAC، security headers، rate limiting.
2. **اسپرینت Infrastructure (۲ هفته)**: ایجاد worker files، nginx.conf، رفع docker-compose، رفع CI.
3. **اسپرینت Testing (۲ هفته)**: رسیدن به ۸۰٪ coverage با integration و E2E tests.
4. **اسپرینت Code Quality (۲ هفته)**: شکستن page.tsx، حذف mock data، یکپارچه‌سازی types، Zod validation.

**پس از این چهار اسپرینت (~۲ ماه)**، پروژه می‌تواند به‌عنوان MVP production deployment داشته باشد.

### ۲۵.۶ ارزیابی نهایی

| شاخص | امتیاز (۰-۱۰) | وضعیت |
|------|--------------|--------|
| Architecture Design | ۹/۱۰ | ممتاز |
| Architecture Implementation | ۷/۱۰ | خوب (Sprint 1-7.3) |
| Security | ۲/۱۰ | بحرانی |
| Test Coverage | ۲/۱۰ | ناکافی |
| Code Quality | ۵/۱۰ | متوسط |
| Performance | ۴/۱۰ | نیاز بهینه‌سازی |
| Production Readiness | ۲/۱۰ | نامناسب |
| Documentation Accuracy | ۳/۱۰ | تضاد با worklog |
| Future Extensibility | ۸/۱۰ | خوب |
| Overall Project Health | ۴/۱۰ | نیاز تلاش جدی |

### ۲۵.۷ جمع‌بندی نهایی

**BISMARK ERP یک پروژه با پتانسیل بالا و طراحی معماری قوی است، اما به‌دلیل نقص‌های امنیتی بحرانی، نبود تست‌های کافی، و نبود زیرساخت production-ready، در حال حاضر آماده production نیست.** با اجرای نقشه راه ۱۲-اسپرینتی پیشنهادی (۲۵ هفته)، این پروژه می‌تواند به یک ERP enterprise-grade کامل تبدیل شود.

**توصیه نهایی:** قبل از هر گونه deployment production، باید اسپرینت‌های A (Security) و B (Infrastructure) به‌طور کامل اجرا شوند. بدون این دو اسپرینت، هر deployment production یک ریسک امنیتی و عملیاتی جدی خواهد بود.

---

## پیوست A: فهرست فایل‌های کلیدی بررسی‌شده

| فایل | خطوط | توضیح |
|------|------|--------|
| `prisma/schema.prisma` | 2370 | ۸۹ مدل Prisma |
| `src/app/page.tsx` | 1464 | UI اصلی |
| `src/lib/api-client.ts` | 1110 | API client |
| `src/lib/event-catalog.ts` | 325 | ۴۶ رویداد دامنه |
| `src/lib/shared/index.ts` | 114 | Barrel export |
| `src/lib/shared/infra/unit-of-work.ts` | 65 | LAW-12 |
| `src/lib/shared/infra/idempotency-helper.ts` | 114 | LAW-06 |
| `src/lib/shared/infra/optimistic-lock-helper.ts` | 90 | LAW-07 |
| `src/lib/shared/outbox/dispatcher.ts` | 118 | LAW-08 |
| `src/lib/shared/inbox/inbox-worker.ts` | 128 | LAW-09/26 |
| `src/lib/saga/saga-manager.ts` | 280 | LAW-27 |
| `src/lib/event-handlers/index.ts` | 176 | Cross-context handlers |
| `src/lib/financial-handlers.ts` | 253 | LAW-34 |
| `src/lib/modules/notification/services/notification-service.ts` | 882 | Notification dispatcher |
| `src/lib/seed.ts` | 181 | Seed data |
| `src/lib/types.ts` | 136 | TypeScript types |
| `src/lib/mock-data.ts` | 425 | Mock data (نقص) |
| `src/lib/db.ts` | 12 | Prisma client |
| `src/lib/api-helpers.ts` | 77 | API utilities |
| `src/app/api/v1/sales-orders/route.ts` | 218 | نمونه API |
| `src/app/api/v1/inventory-transactions/route.ts` | 276 | نمونه API |
| `src/app/api/v1/journal-entries/route.ts` | 211 | نمونه API |
| `src/app/api/v1/system/health/route.ts` | 47 | Health check |
| `src/tests/unit/shared-kernel.test.ts` | 207 | تست |
| `src/tests/unit/architecture-laws.test.ts` | 145 | تست |
| `src/tests/unit/business-logic.test.ts` | 160 | تست |
| `Dockerfile` | 32 | Docker build |
| `docker-compose.production.yml` | 139 | Production compose |
| `.github/workflows/ci-cd.yml` | 87 | CI/CD |
| `package.json` | 96 | Dependencies |
| `next.config.ts` | 12 | Next config |
| `.env` | 1 | Environment |
| `vitest.config.ts` | 20 | Test config |
| `backend/bismark-laravel/composer.json` | ~70 | Laravel deps |
| `backend/.../create_users_table.php` | 77 | Laravel migration |
| `docs/adr-index.md` | 64 | ADR index |
| `docs/production-readiness-checklist.md` | 122 | Production checklist |
| `src/lib/shared/laws/law-04.ts` | 32 | LAW-04 |
| `src/lib/shared/laws/law-05.ts` | 44 | LAW-05 |
| `src/lib/shared/laws/law-07.ts` | 46 | LAW-07 |
| `src/lib/shared/laws/law-08.ts` | 58 | LAW-08 |
| `src/lib/shared/laws/law-57.ts` | ~60 | LAW-57 |

## پیوست B: فهرست فایل‌های ادعا شده اما مفقود

| فایل/مسیر ادعا شده | وضعیت | توضیح |
|-------------------|-------|--------|
| `src/lib/shared/laws/law-58.ts` تا `law-64.ts` | ❌ مفقود | قوانین ۵۸-۶۴ |
| `src/lib/modules/scheduler/` | ❌ مفقود | ماژول Scheduler |
| `src/lib/modules/automation/` | ❌ مفقود | ماژول Automation |
| `src/lib/modules/monitoring/` | ❌ مفقود | ماژول Monitoring |
| `src/lib/modules/bi/` | ❌ مفقود | ماژول BI |
| `src/lib/modules/ai/` | ❌ مفقود | ماژول AI |
| `src/lib/perf/` | ❌ مفقود | ماژول Performance |
| `src/lib/security/` | ❌ مفقود | ماژول Security |
| `src/workers/outbox-worker.ts` | ❌ مفقود | Worker |
| `src/workers/inbox-worker.ts` | ❌ مفقود | Worker |
| `src/workers/snapshot-worker.ts` | ❌ مفقود | Worker |
| `nginx.conf` | ❌ مفقود | Nginx config |
| `ssl/` | ❌ مفقود | SSL certs |
| `scripts/` | ❌ مفقود | Deployment scripts |
| `docs/backlog.md` | ❌ مفقود | Backlog |
| `docs/quality-gate.md` | ❌ مفقود | Quality gate |
| `docs/performance-report.md` | ❌ مفقود | Performance report |
| `docs/disaster-recovery.md` | ❌ مفقود | DR plan |
| `docs/deployment-guide.md` | ❌ مفقود | Deployment guide |
| `src/tests/integration/` | ❌ مفقود | Integration tests |
| `src/tests/e2e/` | ❌ مفقود | E2E tests |
| `/api/v1/auth/login` | ❌ مفقود | Auth API |
| `/api/v1/scheduler/*` | ❌ مفقود | Scheduler API |
| `/api/v1/automations/*` | ❌ مفقود | Automation API |
| `/api/v1/monitoring/*` | ❌ مفقود | Monitoring API |
| `/api/v1/events/*` | ❌ مفقود | Event explorer API |
| `/api/v1/dead-letters/*` | ❌ مفقود | DLQ API |
| `/api/v1/feature-flags/*` | ❌ مفقود | Feature flags API |
| `/api/v1/admin/*` | ❌ مفقود | Admin API |
| `/api/v1/bi/*` | ❌ مفقود | BI API |
| `/api/v1/analytics/*` | ❌ مفقود | Analytics API |
| `/api/v1/forecasts/*` | ❌ مفقود | Forecast API |
| `/api/v1/ai/*` | ❌ مفقود | AI API |
| `/api/v1/reports/definitions/*` | ❌ مفقود | Report definitions API |
| `/api/v1/executive/*` | ❌ مفقود | Executive API |
| `/api/v1/performance/*` | ❌ مفقود | Performance API |
| `/api/v1/security/*` | ❌ مفقود | Security API |
| `/api/v1/deployment/*` | ❌ مفقود | Deployment API |

## پیوست C: منابع و ارجاعات

- **Laws**: `src/lib/shared/laws/law-04.ts` تا `law-57.ts`
- **ADRs**: `docs/adr-index.md`
- **Schema**: `prisma/schema.prisma`
- **API**: `src/app/api/v1/`
- **UI**: `src/app/page.tsx` + `src/components/views/`
- **Shared Kernel**: `src/lib/shared/`
- **Event Catalog**: `src/lib/event-catalog.ts`
- **Saga**: `src/lib/saga/saga-manager.ts`
- **Notification Service**: `src/lib/modules/notification/services/notification-service.ts`
- **Docker**: `Dockerfile`, `docker-compose.production.yml`
- **CI/CD**: `.github/workflows/ci-cd.yml`
- **Tests**: `src/tests/unit/`

---

**پایان ممیزی.**

*این سند بر اساس کد واقعی موجود در فایل‌سیستم در تاریخ ۱۴۰۴/۰۵/۱۰ تدوین شده است. هرگونه تغییر در کد باید با بازبینی این ممیزی همراه باشد.*

**شناسه سند:** AUDIT-2025-01
**نسخه:** 1.0
**ممیز:** General-Purpose Sub Agent
**تاریخ:** ۱۴۰۴/۰۵/۱۰
**تعداد بخش‌ها:** ۲۵ + ۳ پیوست
**تعداد خطوط:** ~۳۲۰۰
