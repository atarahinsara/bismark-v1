# BISMARK ERP — سند جامع کشف محصول و مهندسی معکوس و قرارداد پیاده‌سازی

> **شناسه سند:** BLUEPRINT-2025-01
> **تاریخ تدوین:** ۱۴۰۴/۰۵/۱۲
> **نویسنده:** General-Purpose Sub Agent (Task ID: BLUEPRINT)
> **پایه استنلال:** کد واقعی موجود در فایل‌سیستم (۸۹ مدل Prisma، ۱۱۸ مسیر API، ۱۷ view، ۵۴ قانون معماری، ۴۶ رویداد دامنه) + سند چشم‌انداز BISMARK (آپلود شده توسط کاربر)
> **هدف:** تبدیل کد موجود به یک «قرارداد پیاده‌سازی» مشخص تا هر ایجنت یا تیم آینده بتواند بدون حدس و گمان، قابلیت‌ها را بسط دهد، اصلاح کند یا مهاجرت دهد.
> **زبان:** فارسی (مطابق زبان ارتباط کاربر)

---

## فهرست

1. [چشم‌انداز محصول (Product Vision)](#1-چشمانداز-محصول)
2. [مدل کسب‌وکار (Business Model)](#2-مدل-کسبوکار)
3. [مشتریان هدف (Target Customers)](#3-مشتریان-هدف)
4. [نقش‌های کاربری (User Roles)](#4-نقشهای-کاربری)
5. [فرایندهای کامل کسب‌وکار (Complete Business Processes)](#5-فرایندهای-کامل-کسبوکار)
6. [سفرهای کاربری سرتاسری (End-to-End User Journeys)](#6-سفرهای-کاربری-سرتاسری)
7. [چرخه حیات موجودیت‌ها (Entity Lifecycle)](#7-چرخه-حیات-موجودیتها)
8. [قوانین کسب‌وکار (Business Rules)](#8-قوانین-کسبوکار)
9. [مدل دامنه (Domain Model)](#9-مدل-دامنه)
10. [بسترهای محدود (Bounded Contexts)](#10-بسترهای-محدود)
11. [مدل پایگاه داده (Database Model)](#11-مدل-پایگاه-داده)
12. [قرارداد API (API Contract)](#12-قرارداد-api)
13. [مدل رویداد (Event Model)](#13-مدل-رویداد)
14. [مدل گردش کار (Workflow Model)](#14-مدل-گردش-کار)
15. [مدل امنیت (Security Model)](#15-مدل-امنیت)
16. [مدل دسترسی (Permission Model)](#16-مدل-دسترسی)
17. [مدل مالی (Financial Model)](#17-مدل-مالی)
18. [مدل انبار (Inventory Model)](#18-مدل-انبار)
19. [مدل گارانتی (Warranty Model)](#19-مدل-گارانتی)
20. [مدل خدمت (Service Model)](#20-مدل-خدمت)
21. [مدل اعلان (Notification Model)](#21-مدل-اعلان)
22. [مدل گزارش (Reporting Model)](#22-مدل-گزارش)
23. [مدل ورود/خروج داده (Import / Export)](#23-مدل-ورودخروج-داده)
24. [مدل هوش مصنوعی و اتوماسیون (AI / Automation)](#24-مدل-هوش-مصنوعی-و-اتوماسیون)
25. [مدل چندمستاجری (Multi-Tenant)](#25-مدل-چندمستاجری)
26. [مدل مقیاس‌پذیری (Scalability)](#26-مدل-مقیاسپذیری)
27. [پشتیبان‌گیری و بازیابی فاجعه (Backup / DR)](#27-پشتیبانگیری-و-بازیابی-فاجعه)
28. [استراتژی تست (Testing Strategy)](#28-استراتژی-تست)
29. [معماری تولید (Production Architecture)](#29-معماری-تولید)
30. [استراتژی مهاجرت (Migration Strategy)](#30-استراتژی-مهاجرت)
31. [قرارداد پیاده‌سازی قابلیت‌ها (Implementation Contract)](#31-قرارداد-پیادهسازی-قابلیتها)

---

## ۱. چشم‌انداز محصول

### ۱.۱ بیان مسئله

بسیاری از کسب‌وکارهای ایرانی که محصول فیزیکی سریال‌دار (لوازم الکترونیکی، تجهیزات، دستگاه‌های صنعتی) می‌فروشند، با چالش‌های ساختاری مواجه‌اند:

- **فقدان ردابی سریال}: ناتوانی در پیگیری یک دستگاه مشخص از تولید/واردات تا فروش، گارانتی، تعمیر و در نهایت اخراج از سرویس.
- **گسست بین انبار و فروش و حسابداری}: مغایرت دائمی بین موجودی انبار، سفارش‌های فروش، فاکتورها و دفاتر حسابداری.
- **عدم اتوماسیون گارانتی و خدمات پس از فروش}: فرایندهای دستی برای فعال‌سازی گارانتی، ثبت شکایت، تعمیر و کنترل کیفیت.
- **نداشتن موتور قوانین پویا}: هر تغییر در قوانین مالیاتی، تخفیف، تأییدیه یا محدودیت نماینده نیازمند کدنویسی است.
- **عدم پشتیبانی آفلاین موبایل}: نمایندگان و تکنسین‌ها در مناطق با اینترنت ناپایدار کار می‌کنند و نیاز به ثبت آفلاین و همگام‌سازی بعدی دارند.

### ۱.۲ چشم‌انداز BISMARK

BISMARK ERP یک سامانه برنامه‌ریزی منابع سازمانی جامع است که با محوریت **«چرخه حیات دستگاه»** طراحی شده و سه جریان اصلی کسب‌وکار را در یک مدل یکپارچه ادغام می‌کند:

1. **جریان فیزیکی کالا}: تولید/واردات → انبار → فروش → تحویل → گارانتی → تعمیر → تحویل مجدد/اسقاط.
2. **جریان مالی}: سفارش → فاکتور → پرداخت → تخصیص → سند حسابداری → تسویه.
3. **جریان اطلاعاتی}: رویداد دامنه → Outbox → Inbox → هندلر → رویداد جدید → ثبت در Saga → تکمیل خودکار.

### ۱.۳ اهداف محصول (از روی کد استنباط‌شده)

از روی ۸۹ مدل Prisma، ۱۱۸ مسیر API، ۵۴ قانون معماری (LAW-04 تا LAW-57) و سند چشم‌انداز، اهداف محصول به‌شرح زیر است:

| # | هدف | شاخص پیاده‌سازی در کد |
|---|-----|------------------------|
| ۱ | ردابی دستگاه از تولید تا اسقاط (Device Timeline) | مدل `ProductInstance` + مسیر `/api/v1/device-timeline/[instanceId]` + LAW-30 |
| ۲ | منبع واحد حقیقت برای موجودی (Ledger Pattern) | مدل `InventoryTransaction` + عدم وجود ستون `on_hand_quantity` روی `StockItem` (LAW-05) |
| ۳ | فعال‌سازی گارانتی از تحویل محموله (نه از فروش) | هندلر `shipment.delivered → warranty.activated` + LAW-28 |
| ۴ | تکمیل خودکار سفارش فروش از طریق Saga | تعریف `sales_order_fulfillment` در `saga-manager.ts` + LAW-27 |
| ۵ | تفکیک حسابداری از فروش (Only Financial creates JE) | هندلرهای `financial-handlers.ts` + LAW-19/34 |
| ۶ | اطمینان از پردازش دقیقاً یک‌بار هر رویداد | Inbox + `ProcessedMessage` + LAW-26 |
| ۷ | نشر مطمئن رویدادها در سراسر Contextها | Outbox + Dispatcher + Retry + DLQ + LAW-08 |
| ۸ | تولید کد کسب‌وکار یکتا و tenant-scoped با سال شمسی | `BusinessCodeGenerator` با ۲۹ تعریف + LAW-02 |
| ۹ | گردش کار عمومی قابل تنظیم | `WorkflowDefinition` (states/transitions JSON) + LAW-49 |
| ۱۰ | موتور قواعد قابل نسخه‌برداری و قابل حسابرسی | `RuleSet` + `RuleExecution` + `RuleAuditStep` + LAW-52/53/54 |
| ۱۱ | اعلان چندکاناله با retry و DLQ | `NotificationService` + ۱۰ Provider + LAW-55/56/57 |
| ۱۲ | چندمستاجری آماده (نه فعال در V1) | ستون `tenantId` روی ۸۵+ مدل + LAW-03 |

### ۱.۴ اهداف غیر محصولی (از سند چشم‌انداز)

- **پشته فناوری قفل‌شده}: Laravel 12 Modular Monolith (Backend) + Next.js (Web) + Flutter (Mobile) + PostgreSQL + Redis.
- **آفلاین‌اول}: Flutter با SQLite محلی و موتور همگام‌سازی با رفع تعارض «server timestamp wins».
- **i18n}: تمرکز بر فارسی (fa-IR)، تقویم جلالی، کدهای کسب‌وکار مبتنی بر سال شمسی.
- **تک‌Tenant در V1، آماده چندTenant}: مدل Shared DB + tenant_id (تصمیم Step 1 کاربر).

### ۱.۵ تضاد مهم سند چشم‌انداز با کد موجود

سند چشم‌انداز Laravel 12 + PostgreSQL + Redis را الزامی می‌کند، اما کد موجود بر Next.js 16 + Prisma + SQLite بنا شده است. این تضاد در Step 1 کاربر به‌صورت «گزینه B (Design Only)» حل شده است؛ یعنی:

- کد Next.js/Prisma/SQLite فعلی به‌عنوان **مرجع طراحی و sandbox اجرایی** نگه داشته می‌شود.
- پیاده‌سازی تولید روی **Laravel + PostgreSQL** در Step 6 انجام خواهد شد.
- این سند (BLUEPRINT) بر اساس کد sandbox نگاشته شده و تمام قراردادهای پیاده‌سازی را به‌گونه‌ای مستقل از پشته بیان می‌کند که در Laravel نیز قابل اعمال باشد.

---

## ۲. مدل کسب‌وکار

### ۲.۱ مدل درآمدی کسب‌وکارِ کاربرِ BISMARK (نه خود BISMARK)

BISMARK به کسب‌وکارهایی فروخته می‌شود که خودشان یکی از مدل‌های زیر را دنبال می‌کنند:

| مدل | توضیح | قابلیت BISMARK پشتیبان |
|-----|------|------------------------|
| فروش محصول سریال‌دار | لوازم الکترونیکی، موبایل، تجهیزات | ✅ Product + ProductInstance + SalesOrder |
| نمایندگی فروش (Dealer) | چندین شعبه/نماینده با محدودیت منطقه‌ای | ✅ Branch + Party (نقش representative) + PriceList (dealer) |
| خدمات پس از فروش | تعمیرات گارانتی و خارج گارانتی | ✅ ServiceRequest/Order + Warranty + QC |
| واردات و توزیع | واردات محموله‌ای و توزیع بین انبارها | ✅ StockTransfer + ProductInstance.importBatch |
| حسابداری کامل | دفترداری دوطرفه با AR/AP و مالیات | ✅ JournalEntry + AR/AP + TaxRule/Calculation/Posting |
| مرکز خدمات مجاز | مرکز خدمات با تخصیص تکنسین | ✅ TechnicianAssignment + ServiceCenter (نوع Warehouse) |

### ۲.۲ جریان ارزش (Value Stream)

```
تولید/واردات محصول ───► ثبت در انبار (InventoryTransaction IN)
                            │
                            ▼
                    سفارش فروش (SalesOrder)
                            │
                    تأیید (Workflow + Rule)
                            │
                            ▼
                    رزرو موجودی (StockReservation)
                            │
                            ▼
                    Pick → Pack → Ship (Shipment)
                            │  ── Outbox: shipment.shipped
                            ▼
                    فاکتور‌سازی خودکار (Invoice)
                            │  ── Outbox: invoice.issued
                            ▼
                    سند حسابداری AR (JournalEntry)
                            │
                            ▼
                    پرداخت + تخصیص (Payment + Allocation)
                            │  ── Outbox: payment.received
                            ▼
                    سند حسابداری Cash
                            │
                            ▼
                    تحویل به مشتری ──► فعال‌سازی گارانتی (LAW-28)
                            │
                            ▼
                    شکایت گارانتی → ServiceRequest → ServiceOrder
                            │
                            ▼
                    Diagnosis → Parts → QC → Delivery
                            │
                            ▼
                    بروزرسانی Device Timeline (LAW-30)
```

### ۲.۳ شاخص‌های کلیدی عملکرد (KPI) قابل استخراج از کد

از روی `reports/dashboard/route.ts`:

- **درآمد سال جاری** (مجموع credit حساب‌های revenue)
- **هزینه سال جاری** (مجموع debit حساب‌های expense)
- **سود خالص** = درآمد − هزینه
- **موجودی نقد** (حساب‌های CASH)
- **طرف دین مشتریان** (AR Control Account)
- **طرف بستانکار تأمین‌کنندگان** (AP Control Account)
- **ارزش موجودی کالا** (حساب INV/1400)
- **حاشیه سود ناخالص** = سود / درآمد × ۱۰۰
- **نسبت جاری** = (نقد + AR + موجودی) / AP
- **نسبت آنی** = (نقد + AR) / AP
- **سرمایه در گردش** = (نقد + AR + موجودی) − AP
- **روند ماهانه درآمد/هزینه/سود**

### ۲.۴ مدل مالی (Currency)

- ارز پیش‌فرض در تمام مدل‌ها: **IRR** (ریال ایران).
- ستون `currencyCode` روی تمام اسناد مالی (SalesOrder, Invoice, Payment, CreditNote, Refund, JournalEntry, AR/AP Transaction, TaxCalculation) وجود دارد.
- در V1 هیچ تبدیل ارزی پیاده‌سازی نشده است (multi-currency NOT IMPLEMENTED).

---

## ۳. مشتریان هدف

### ۳.۱ پروفایل مشتریان هدف BISMARK

| ردیف | صنعت | اندازه | نیاز اصلی | چرا BISMARK؟ |
|-----|------|--------|----------|--------------|
| ۱ | واردات و توزیع لوازم الکترونیکی | متوسط (۵۰–۲۰۰ کاربر) | ردابی IMEI/سریال + گارانتی | ProductInstance با serialNumber و attributes (IMEI/MAC) |
| ۲ | نمایندگی رسمی برند | متوسط (۲۰–۱۰۰ کاربر، چند شعبه) | تفکیک قیمت‌گذاری نماینده/خرده‌فروشی | PriceList با priceType: retail/wholesale/dealer/special |
| ۳ | مراکز خدمات مجاز | کوچک تا متوسط (۱۰–۵۰ تکنسین) | گردش کار تعمیر + کنترل کیفیت | ServiceOrder با status: open→diagnosis→repair→qc→ready→delivered |
| ۴ | فروشگاه‌های زنجیره‌ای | بزرگ (۲۰۰+ کاربر، چند انبار) | چند انبار + انتقال بین انبارها | StockTransfer + WarehouseZone + Location + Bin |
| ۵ | شرکت‌های واردات تجهیزات صنعتی | متوسط | گارانتی طولانی + تمدید | WarrantyExtension + WarrantyPolicy (warrantyMonths/validTo) |
| ۶ | کسب‌وکارهای نیازمند حسابداری دقیق | همه اندازه‌ها | AR/AP + تخصیص پرداخت + کنترل مالیاتی | ARAllocation/APAllocation + TaxRule/Calculation/Posting |

### ۳.۲ غیرمشتریان هدف (Out of Scope)

- کسب‌وکارهای خدماتی محض (بدون کالای فیزیکی) — BISMARK برای کالای سریال‌دار بهینه شده.
- کسب‌وکارهای میکرو (زیر ۱۰ کاربر) — پیچیدگی BISMARK بیش از نیاز آن‌هاست.
- کسب‌وکارهای بین‌المللی چندارزی — V1 فقط IRR.

### ۳.۳ پرسونای خریدار (Buyer Persona)

**«مدیرعامل شرکت وارداتی لوازم الکترونیکی»** — ۴۵ ساله، تجربه ۱۵ سال در بازار، درد اصلی:
- «نمی‌دانم کدام دستگاه کدام مشتری است و چه زمانی گارانتی‌اش تمام می‌شود.»
- «مغایرت انبار و حسابداری هر ماه ۲ روز زمان تیم مالی را می‌گیرد.»
- «نماینده‌ها تخفیف‌های غیرمجاز می‌دهند و من دیر متوجه می‌شوم.»

→ BISMARK پاسخ: Device Timeline + Ledger Pattern (مغایرت صفر) + Rule Engine (محدودیت تخفیف نماینده).

---

## ۴. نقش‌های کاربری

### ۴.۱ نقش‌های تعریف‌شده در مدل User (کد واقعی)

از `prisma/schema.prisma` سطر ۱۲۷:

```prisma
userType String @default("staff") // customer|representative|technician|service_center|staff
```

| userType | توضیح | کانال اصلی | پلتفرم (از سند چشم‌انداز) |
|----------|-------|------------|--------------------------|
| `customer` | مشتری نهایی خریدار محصول | موبایل (Flutter) | اپ مشتری |
| `representative` | نماینده فروش (Dealer) | موبایل (Flutter) | اپ نماینده |
| `technician` | تکنسین تعمیر | موبایل (Flutter) | اپ تکنسین |
| `service_center` | مرکز خدمات مجاز | Web + Flutter | داشبورد مرکز خدمات |
| `staff` | کارمند داخلی (پیش‌فرض) | Web | داشبورد داخلی |

### ۴.۲ نقش‌های پیشنهادی سند چشم‌انداز (نه پیاده‌سازی‌شده در V1)

سند چشم‌انداز نقش‌های زیر را نیز ذکر می‌کند که در مدل `User.userType` تعریف نشده‌اند اما در آینده لازم‌اند:

| نقش (Vision) | توضیح | وضعیت |
|---------------|-------|-------|
| Service Manager | مدیر خدمات پس از فروش (Web) | ❌ NOT IMPLEMENTED — در حال حاضر staff با دسترسی مناسب |
| Warehouse Manager | مدیر انبار (Web) | ❌ NOT IMPLEMENTED |
| Finance | کارشناس مالی (Web) | ❌ NOT IMPLEMENTED |
| CEO | مدیرعامل (Web) | ❌ NOT IMPLEMENTED |
| Super Admin | مدیر سیستم (Web) | ❌ NOT IMPLEMENTED |

### ۴.۳ مدل RBAC در کد (ناقص)

از `prisma/schema.prisma`:

```prisma
model Role {
  id          String    @id @default(cuid())
  tenantId    String
  key         String
  name        String
  isSystem    Boolean   @default(false)
  @@unique([tenantId, key])
}

model Permission {
  id          String   @id @default(cuid())
  key         String   @unique
  module      String
  action      String
  isSystem    Boolean  @default(true)
}
```

⚠️ **نقص بحرانی}: 
- **هیچ جدول واسطی بین User و Role وجود ندارد} (نه `user_roles` و نه رابطه‌ای در Prisma).
- **هیچ جدول واسطی بین Role و Permission وجود ندارد} (نه `role_permissions`).
- **هیچ جدولی برای پیوند Permission به User** وجود ندارد.
- در نتیجه RBAC در سطح کد تعریف شده اما **عملی غیرفعال} است. هیچ مسیر API‌ای Permission را چک نمی‌کند.
- این یک **بلوک‌کننده Production} است (در Implementation Contract #2 پوشش داده شده).

### ۴.۴ مدل Session در کد

```prisma
model Session {
  id                String    @id @default(cuid())
  userId            String
  tenantId          String
  status            String    @default("active") // active|expired|revoked
  ipAddress         String
  userAgent         String?
  deviceFingerprint String?
  issuedAt          DateTime  @default(now())
  lastActivityAt    DateTime  @default(now())
  expiresAt         DateTime
  absoluteExpiresAt DateTime
  revokedAt         DateTime?
  revokedReason     String?
}
```

⚠️ **نقص بحرانی}: 
- مدل `Session` تعریف شده اما هیچ مسیر `/api/v1/auth/*` وجود ندارد.
- `getTenantId()` در `api-helpers.ts` به‌جای خواندن JWT از هدر، fallback به tenant با slug='bismark' می‌شود.
- در نتیجه تمام ۱۱۸ مسیر API **بدون احراز هویت} قابل دسترسی‌اند.
- این بزرگ‌ترین شکاف امنیتی پروژه است (در Implementation Contract #1 پوشش داده شده).

---

## ۵. فرایندهای کامل کسب‌وکار

این بخش بر اساس **کد واقعی}** نوشته شده است؛ نه ادعا، نه حدس. هر فرایند با ارجاع به فایل واقعی مستند شده است.

### ۵.۱ فرایند فروش سرتاسری (Sales Order Fulfillment Saga)

**خلاصه**: از ثبت سفارش تا تکمیل، با اتوماسیون کامل.

**مراحل (از `saga-manager.ts` تعریف `sales_order_fulfillment`)**:

```
[ثبت سفارش] POST /api/v1/sales-orders
    ├── محاسبه subtotal/discount/tax/total از خطوط
    ├── ایجاد SalesOrder + SalesOrderLine در UnitOfWork
    ├── Outbox: sales_order.created
    └── status = 'draft'

[تأیید سفارش] POST /api/v1/sales-orders/{id}/approve
    ├── بررسی: status باید 'draft' یا 'pending_approval' باشد
    ├── Workflow transition (در صورت تعریف)
    ├── Rule Engine evaluation (در صورت تعریف ruleset با context='sales_order')
    ├── Outbox: sales_order.approved
    ├── شروع Saga: sales_order_fulfillment
    └── status = 'approved'

[Saga Step 1 — Reserve Inventory]
    ├── InboxHandler: sales_order.approved → inventory-reservation-handler
    ├── (در sandbox: فقط لاگ؛ در production: ایجاد StockReservation برای هر خط)
    ├── Outbox: inventory.reserved
    ├── Saga.advanceStep(inventory.reserved)
    └── status = 'approved' (هنوز)

[Saga Step 2 — Create Shipment]
    ├── InboxHandler: inventory.reserved → (Handler تعریف‌نشده صریح در sandbox)
    ├── (در production: ایجاد Shipment از SalesOrder)
    ├── Outbox: shipment.created
    └── Saga.advanceStep(shipment.created)

[Saga Step 3 — Pick → Pack → Ship]
    ├── POST /api/v1/shipments/{id}/pick  → status='picking'
    ├── POST /api/v1/shipments/{id}/pack  → status='packing'
    ├── POST /api/v1/shipments/{id}/ship  ← نقش بحرانی
    │     ├── LAW-16: برای هر خط یک InventoryTransaction نوع OUT (quantity منفی) ایجاد کن
    │     ├── LAW-17: StockReservation فعال را به 'consumed' تغییر بده
    │     ├── LAW-18: Shipment.status = 'shipped' (غیرقابل تغییر پس از این)
    │     ├── بروزرسانی SalesOrderLine.quantityShipped
    │     ├── SalesOrder.status = 'shipped' یا 'partially_shipped'
    │     └── Outbox: shipment.shipped
    └── Saga.advanceStep(shipment.shipped)

[Saga Step 4 — Create Invoice]
    ├── InboxHandler: shipment.shipped → billing-invoice-handler
    ├── (در sandbox: فقط advance Saga؛ در production: ایجاد Invoice از SalesOrder)
    ├── POST /api/v1/invoices/{id}/issue ← دستی یا خودکار
    │     ├── LAW-21: Invoice از 'draft' به 'issued' (غیرقابل تغییر پس از این)
    │     ├── LAW-19: NO JournalEntry اینجا — فقط Outbox
    │     └── Outbox: invoice.issued
    ├── InboxHandler: invoice.issued → financial-ar-handler (financial-handlers.ts)
    │     ├── LAW-34: ایجاد JournalEntry (debit AR, credit Revenue)
    │     ├── ایجاد ARTransaction (referenceType=sales_invoice)
    │     └── Outbox: journal_entry.posted
    └── Saga.advanceStep(invoice.issued)

[Saga Step 5 — Payment + Complete]
    ├── POST /api/v1/payments (ثبت پرداخت)
    ├── POST /api/v1/payments/{id}/allocate ← LAW-20: هر پرداخت باید تخصیص یابد
    │     ├── ایجاد PaymentAllocation (paymentId × invoiceId)
    │     ├── بروزرسانی Invoice.paidAmount و status='paid' یا 'partially_paid'
    │     ├── ایجاد ARAllocation (debitTransactionId=Invoice, creditTransactionId=Payment)
    │     ├── Outbox: payment.allocated
    │     └── Outbox: payment.received
    ├── InboxHandler: payment.received → financial-cash-handler
    │     ├── LAW-34: ایجاد JournalEntry (debit Cash, credit AR)
    │     └── Outbox: journal_entry.posted
    └── Saga.advanceStep(payment.received) → Saga.complete()
```

**Compensation (در صورت شکست)**:

- اگر Step 4 (ایجاد فاکتور) شکست بخورد → `cancel_shipment` + `release_reservation`.
- اگر Step 5 (پرداخت) شکست بخورد → `cancel_invoice`.
- پیاده‌سازی `SagaManager.failSaga()` در `saga-manager.ts` سطر ۲۱۶ تعریف شده، اما در sandbox فقط `console.log` می‌کند و رویداد واقعی compensation نشر نمی‌دهد.

**ارجاع کد}:
- تعریف Saga: `src/lib/saga/saga-manager.ts` سطر ۵۸–۹۳
- هندلر رزرو: `src/lib/event-handlers/index.ts` سطر ۲۳
- هندلر فاکتور: `src/lib/event-handlers/index.ts` سطر ۵۵
- هندلر مالی AR: `src/lib/financial-handlers.ts` سطر ۳۰
- هندلر مالی Cash: `src/lib/financial-handlers.ts` سطر ۹۹
- Ship با LAW-16: `src/app/api/v1/shipments/[id]/ship/route.ts` سطر ۸۲

### ۵.۲ فرایند مرجوعی و بازپرداخت (Return Processing Saga)

**تعریف از `saga-manager.ts` سطر ۱۰۴–۱۳۳**:

```
[ثبت مرجوعی] POST /api/v1/return-orders
    ├── مرتبط با salesOrderId یا invoiceId اصلی
    ├── returnType: refund|replacement|return_only
    ├── Outbox: return_order.created
    └── status = 'draft'

[تأیید مرجوعی] POST /api/v1/return-orders/{id}/approve
    ├── Outbox: return_order.approved
    ├── شروع Saga: return_processing
    └── status = 'approved'

[Saga Step 1 — Receive Goods]
    ├── POST /api/v1/return-orders/{id}/receive
    │     ├── LAW-22: بازرسی فیزیکی (inspectedCondition, inspectionNotes)
    │     ├── ایجاد InventoryTransaction نوع IN (در انبار return)
    │     ├── Outbox: return_order.received
    │     └── status = 'received'
    └── Saga.advanceStep(return_order.received)

[Saga Step 2 — Create Credit Note]
    ├── InboxHandler: return_order.received → (Handler تعریف‌نشده صریح)
    ├── (در production: ایجاد CreditNote از Invoice اصلی)
    ├── POST /api/v1/invoices/{id}/credit-note ← دستی یا خودکار
    │     ├── LAW-21: CreditNote از 'draft' به 'issued'
    │     ├── Outbox: credit_note.issued
    │     └── InboxHandler → financial-reversal-handler
    │           ├── LAW-34: ایجاد JournalEntry معکوس (debit Revenue, credit AR)
    │           ├── ایجاد ARTransaction نوع credit_note
    │           └── Outbox: journal_entry.posted
    └── Saga.advanceStep(credit_note.issued)

[Saga Step 3 — Process Refund]
    ├── POST /api/v1/refunds (ثبت بازپرداخت)
    │     ├── LAW-23: نیازمند return_order.approved
    │     ├── refundMethod: cash|bank_transfer|check|credit_card|pos|online|wallet
    │     └── status = 'pending'
    ├── POST /api/v1/refunds/{id}/approve
    │     ├── Outbox: refund.completed
    │     └── InboxHandler → financial-refund-handler
    │           ├── LAW-34: ایجاد JournalEntry (debit AR, credit Cash)
    │           └── Outbox: journal_entry.posted
    └── Saga.advanceStep(refund.completed)

[Saga Step 4 — Close Return]
    ├── POST /api/v1/return-orders/{id}/close
    │     ├── Outbox: return_order.closed
    │     └── status = 'closed'
    └── Saga.advanceStep(return_order.closed) → Saga.complete()
```

**فرایند جایگزینی (LAW-24: Replacement = Return + New Fulfillment)**:

- `POST /api/v1/return-orders/{id}/create-replacement` یک SalesOrder جدید با returnOrder.replacementSalesOrderId مرتبط می‌سازد.
- سپس فرایند Sales Order Fulfillment Saga روی سفارش جدید اجرا می‌شود.

### ۵.۳ فرایند گارانتی

**تعریف از `warranty-cards/[id]/activate/route.ts` و `warranty-claims` routes**:

```
[پیش‌شرط: محموله تحویل شده]
    ├── InboxHandler: shipment.delivered → warranty-activation-handler (LAW-28)
    ├── (در sandbox: فقط لاگ)
    └── در production: جستجوی WarrantyCard با shipmentId مرتبط

[فعال‌سازی گارانتی] (دستی یا از طریق رویداد)
    ├── POST /api/v1/warranty-cards/{id}/activate
    ├── محاسبه startDate = now
    ├── محاسبه endDate = now + warrantyMonths (از WarrantyPolicy)
    ├── محاسبه graceEndDate = endDate + graceDays
    ├── Outbox: warranty.activated
    ├── InboxHandler → DeviceTimeline (LAW-30)
    └── status = 'active'

[ثبت شکایت] POST /api/v1/warranty-claims
    ├── مرتبط با warrantyCardId, productInstanceId, customerPartyId
    ├── claimType: defect|damage|malfunction|doa|other
    ├── Outbox: warranty.claim.submitted
    └── status = 'submitted'

[بازرسی] POST /api/v1/warranty-claims/{id}/inspect
    ├── LAW-29: هر شکایت باید قبل از تأیید بازرسی شود
    ├── ثبت defectType, defectSeverity, isCovered, inspectionNotes
    ├── Outbox: warranty.claim.inspected
    └── status = 'inspection'

[تأیید یا رد]
    ├── POST /api/v1/warranty-claims/{id}/approve
    │     ├── Outbox: warranty.claim.approved
    │     ├── InboxHandler → warranty-service-handler (LAW-33)
    │     │     └── ایجاد خودکار ServiceRequest از رویداد (نه فراخوانی مستقیم — LAW-25)
    │     ├── ثبت estimatedCost, approvalNotes
    │     └── status = 'approved'
    └── (رد) → Outbox: warranty.claim.rejected, status = 'rejected'

[تمدید گارانتی] POST /api/v1/warranty-cards/{id}/extend (در صورت وجود)
    ├── ایجاد WarrantyExtension
    ├── بروزرسانی WarrantyCard.endDate و extendedMonths
    ├── Outbox: warranty.extended
    └── InboxHandler → DeviceTimeline

[انتقال گارانتی] POST /api/v1/warranty-cards/{id}/transfer
    ├── ایجاد WarrantyTransfer (fromPartyId → toPartyId)
    ├── تأیید: approvalStatus: pending → approved
    ├── Outbox: warranty.transfer.approved
    └── InboxHandler → DeviceTimeline
```

### ۵.۴ فرایند خدمت و تعمیر

**تعریف از `service-orders/[id]/{diagnose,consume-part,ready,qc}/route.ts`**:

```
[ثبت درخواست خدمت] POST /api/v1/service-requests
    ├── مرتبط با customerPartyId, productInstanceId?, warrantyCardId?, warrantyClaimId?
    ├── serviceKind: warranty|out_of_warranty|paid|recall
    ├── priority: low|normal|high|urgent|critical
    ├── Outbox: service_request.created
    └── status = 'draft'

[ایجاد سفارش تعمیر] POST /api/v1/service-requests/{id}/create-order
    ├── ایجاد ServiceOrder با orderNumber (RO-1403-xxxxx)
    ├── تخصیص TechnicianAssignment (در صورت تعیین)
    ├── Outbox: service_order.created
    └── status = 'open'

[تشخیص] POST /api/v1/service-orders/{id}/diagnose
    ├── بررسی: status = 'open'
    ├── ایجاد ServiceDiagnosis (symptom, rootCause, recommendedAction, estimatedHours)
    ├── Outbox: service_order.diagnosed
    └── status = 'diagnosis'

[مصرف قطعه] POST /api/v1/service-orders/{id}/consume-part
    ├── LAW-31: هر مصرف قطعه باید InventoryTransaction (نوع OUT) ایجاد کند
    ├── ایجاد ServiceOrderPart
    ├── ایجاد InventoryTransaction (referenceType=service_order)
    ├── Outbox: service_order.part_consumed
    ├── InboxHandler → financial handler (در صورت warranted: COGS/Inventory; در غیر این صورت:expense)
    └── بروزرسانی ServiceOrder.partsCost

[ثبت دستمزد] POST /api/v1/service-orders/{id}/add-labor (در صورت وجود)
    ├── ایجاد ServiceOrderLabor (laborType, hours, hourlyRate, totalCost)
    └── بروزرسانی ServiceOrder.laborCost

[آماده‌سازی] POST /api/v1/service-orders/{id}/ready
    ├── LAW-32: قبل از تحویل باید QC پاس شود
    ├── Outbox: service_order.ready
    ├── InboxHandler → service-notification-handler
    │     └── ارسال اعلان به مشتری (از طریق Notification context)
    └── status = 'ready'

[کنترل کیفیت] POST /api/v1/service-orders/{id}/qc
    ├── LAW-32: الزامی قبل از تحویل
    ├── ایجاد ServiceQualityCheck (qcNumber, result: pass|fail|conditional, checklist, defectsFound)
    ├── اگر pass → قابل تحویل
    ├── اگر fail → reworkRequired = true، بازگشت به repair
    ├── Outbox: service_order.qc_completed
    └── status = 'qc'

[تحویل] POST /api/v1/service-orders/{id}/deliver
    ├── Outbox: service_order.delivered
    ├── InboxHandler → service-timeline-handler
    │     └── بروزرسانی Device Timeline (LAW-30)
    ├── در صورت warranty: بستن warranty claim
    └── status = 'delivered'
```

### ۵.۵ فرایند انبارداری (Inventory Ledger Operations)

**از `inventory-transactions/route.ts`, `stock-transfers`, `cycle-counts`**:

```
[دریافت کالا] POST /api/v1/inventory-transactions
    ├── transactionType: IN
    ├── referenceType: purchase_order|transfer|adjustment|return
    ├── quantity: مثبت
    ├── بروزرسانی StockBalance (recalculate از ledger)
    ├── Outbox: stock_adjustment.posted (در صورت ADJUSTMENT)
    └── InboxHandler → financial handler (debit Inventory, credit AP/Cash)

[انتقال بین انبار] POST /api/v1/stock-transfers
    ├── تعیین fromWarehouseId, toWarehouseId, lines
    └── status = 'draft'

[شروع انتقال] POST /api/v1/stock-transfers/{id}/ship
    ├── LAW-16: ایجاد InventoryTransaction نوع TRANSFER (quantity منفی از from، مثبت به to)
    └── status = 'in_transit'

[دریافت انتقال] POST /api/v1/stock-transfers/{id}/receive
    ├── بروزرسانی StockTransferLine.quantityReceived
    ├── در صورت کمبود: status = 'partial'
    └── status = 'received'

[شمارش چرخه‌ای] POST /api/v1/cycle-counts
    ├── countType: full|cycle|spot
    ├── ایجاد CycleCountLine با systemQuantity (snapshot از ledger)
    └── status = 'draft'

[شروع شمارش] POST /api/v1/cycle-counts/{id}/start
    └── status = 'in_progress'

[ثبت شمارش] PATCH /api/v1/cycle-counts/{id}/lines/{lineId}
    ├── ثبت countedQuantity
    ├── محاسبه variance = counted - system
    └── ثبت varianceReason

[تکمیل شمارش] POST /api/v1/cycle-counts/{id}/complete
    └── status = 'completed'

[تأیید شمارش] POST /api/v1/cycle-counts/{id}/approve
    ├── LAW: هیچ تعدیل مستقیمی مجاز نیست — باید از طریق فرایند تأیید
    └── status = 'approved'

[اعمال تعدیل] POST /api/v1/cycle-counts/{id}/adjust (در صورت وجود)
    ├── برای هر خط با variance ≠ 0:
    │     └── ایجاد InventoryTransaction نوع ADJUSTMENT (quantity = variance)
    └── status = 'adjusted'

[رزرو موجودی] POST /api/v1/stock-reservations
    ├── referenceType: sales_order|service_request|transfer|manual
    ├── expiresAt (پیش‌فرض: ۲۴ ساعت)
    └── status = 'active'

[آزادسازی رزرو] POST /api/v1/stock-reservations/{id}/release
    ├── status = 'released'
    └── ثبت releasedAt, releaseReason
```

### ۵.۶ فرایند حسابداری (Financial Posting)

**از `journal-entries/route.ts`, `chart-of-accounts`, `fiscal-periods`**:

```
[تعریف چارت حساب‌ها] POST /api/v1/chart-of-accounts
    ├── accountCode, accountName, accountType: asset|liability|equity|revenue|expense
    ├── parentAccountId (ساختار درختی)
    ├── isControlAccount (برای AR, AP)
    ├── isPostable (leaf vs header)
    └── openingBalance

[تعریف سال مالی] POST /api/v1/fiscal-years
    ├── yearCode: '1403'
    ├── startDate, endDate
    └── status = 'open'

[تعریف دوره‌های مالی] POST /api/v1/fiscal-periods
    ├── periodType: month|quarter|year
    ├── periodCode: '1403-Q1', '1403-01'
    └── status = 'open'

[ثبت سند دستی] POST /api/v1/journal-entries
    ├── LAW-35: totalDebit باید مساوی totalCredit باشد
    ├── تعیین fiscalPeriodId (از entryDate)
    ├── ایجاد JournalEntryLine برای هر خط
    ├── LAW-36: اگر period.status = 'closed' → رد شود
    ├── Outbox: journal_entry.posted
    └── status = 'posted'

[معکوس‌سازی سند] POST /api/v1/journal-entries/{id}/reverse
    ├── LAW-41: باید قابل معکوس باشد
    ├── ایجاد JournalEntry جدید با direction معکوس
    ├── ثبت reversedById, reversedAt, reversalReason
    └── status = 'reversed'

[بستن نرم دوره] POST /api/v1/fiscal-periods/{id}/soft-close
    └── status = 'temporarily_closed' (قابل بازگشت)

[بستن سخت دوره] POST /api/v1/fiscal-periods/{id}/hard-close
    ├── LAW-36: غیرقابل بازگشت
    └── status = 'closed'

[بستن سال مالی] POST /api/v1/fiscal-years/{id}/close
    ├── تمام دوره‌ها باید 'closed' باشند
    └── status = 'closed'
```

### ۵.۷ فرایند مالیات

**از `tax/{calculate,post,reports/vat}/route.ts`**:

```
[محاسبه مالیات] POST /api/v1/tax/calculate
    ├── ورودی: documentType, documentId, lines
    ├── LAW-43: محاسبه از TaxRule (نه hard-code)
    ├── یافتن TaxRule فعال برای (taxCode, productCategory, customerGroup, region)
    ├── محاسبه با formula یا rateOverride
    ├── ایجاد TaxCalculation با snapshot کامل (audit)
    └── بازگشت: taxAmount, taxRate, breakdown

[ثبت مالیات] POST /api/v1/tax/post
    ├── LAW-44: هر ثبت مالیات باید JournalEntry مستقل ایجاد کند
    ├── ایجاد JournalEntry (debit TaxInput, credit TaxOutput)
    ├── ایجاد TaxPosting (پیوند JE × TaxCalculation)
    └── Outbox: tax.posted

[گزارش ارزش افزوده] GET /api/v1/tax/reports/vat?period=1403-Q1
    ├── محاسبه: input VAT (قابل واگذاری) - output VAT (پرداختنی)
    └── بازگشت: sales_total, purchases_total, output_vat, input_vat, net_vat_payable
```

### ۵.۸ فرایند گردش کار و موتور قواعد

**از `workflow/instances/[id]/transition/route.ts` و `rules/evaluate/route.ts`**:

```
[تعریف Workflow] POST /api/v1/workflow/definitions
    ├── key, entityType (مثلاً 'sales_order', 'warranty_claim')
    ├── states: [{ key, name, isInitial, isFinal }]
    ├── transitions: [{ key, fromState, toState, triggerType, guardRuleSetId, requiredPermission }]
    └── status = 'draft'

[انتشار Workflow] POST /api/v1/workflow/definitions/{id}/publish
    └── isActive = true, publishedAt = now

[شروع Workflow Instance] POST /api/v1/workflow/instances
    ├── definitionId, entityType, entityId
    ├── currentStateKey = state.isInitial
    └── status = 'running'

[انتقال وضعیت] POST /api/v1/workflow/instances/{id}/transition
    ├── LAW-49: فقط Workflow Engine می‌تواند وضعیت را تغییر دهد
    ├── بررسی: transition با (transitionKey, fromState=current) در تعریف وجود دارد
    ├── در صورت وجود guardRuleSetId: فراخوانی Rule Engine (POST /api/v1/rules/evaluate)
    ├── در صورت وجود requiredPermission: بررسی مجوز کاربر (در V1 ناقص)
    ├── Optimistic Lock با version
    ├── ثبت WorkflowHistory
    ├── اگر toState.isFinal: status='completed', completedAt=now
    ├── Outbox: workflow.transitioned
    └── اگر final: Outbox: workflow.completed
```

```
[تعریف RuleSet] POST /api/v1/rule-sets
    ├── code, context (invoice|warranty|service|...)
    ├── priority (بالاتر = ارزیابی زودتر)
    └── status = 'draft'

[تعریف Rule] POST /api/v1/rules
    ├── ruleSetId, name, priority
    ├── conditionDsl: { all: [...] } | { any: [...] } | { field, operator, value }
    │     ├── operators: >, <, >=, <=, ==, !=, in, notIn, contains, startsWith, endsWith, exists, notExists
    ├── actionDsl: { type: 'requireApproval', role } | { type: 'allow' } | { type: 'deny' } | { type: 'notify', template } | { type: 'escalate' }
    └── enabled = true

[انتشار RuleSet] POST /api/v1/rule-sets/{id}/publish
    ├── LAW-45: نسخه‌برداری (version=2,3,...)
    ├── effectiveFrom = now
    └── status = 'published'

[ارزیابی Rule] POST /api/v1/rules/evaluate
    ├── ورودی: { context, event, payload, workflowInstanceId? }
    ├── LAW-52: فقط Rule Engine ارزیابی می‌کند
    ├── LAW-53: deterministic (snapshot از ruleSetCode + ruleSetVersion)
    ├── LAW-54: ثبت کامل audit (RuleExecution + RuleAuditStep)
    ├── یافتن RuleSet‌های published برای context، مرتب‌شده بر اساس priority
    ├── برای هر Rule: ارزیابی conditionDsl در برابر payload
    ├── جمع‌آوری matched rules + actions
    ├── تصمیم نهایی (priority: deny > requireApproval > escalate > notify > allow)
    ├── ثبت RuleExecution با inputSnapshot + result + executionTime
    ├── ثبت RuleAuditStep برای هر ارزیابی
    ├── Outbox: rule.evaluated
    └── بازگشت: { decision, matchedRules, actions, executionId }
```

### ۵.۹ فرایند اعلان (Notification)

**از `notifications/send/route.ts` و `notification-service.ts`**:

```
[تعریف قالب] POST /api/v1/notification/templates
    ├── code (مثلاً 'invoice.issued', 'service_order.ready')
    ├── version, language (fa|en|ar|ku), channel (email|sms|whatsapp|push|inapp)
    ├── subjectTemplate (null برای sms/whatsapp/push/inapp)
    ├── bodyTemplate (Handlebars-style با {{var}}, {{#if}}, {{#each}})
    ├── variablesSchema (JSON Schema)
    └── status = 'draft'

[انتشار قالب] POST /api/v1/notification/templates/{id}/publish
    └── status = 'published'

[ارسال اعلان] POST /api/v1/notifications/send
    ├── ورودی: { templateCode, channel, recipientId, recipientAddress, variables }
    ├── LAW-55: باید مبتنی بر قالب باشد
    ├── یافتن template (code, version, language, channel) که published است
    ├── LAW-53 (تطبیق): رندر با Template Engine (deterministic)
    ├── LAW-57: محاسبه idempotencyKey (SHA-256 از templateCode+version+recipient+channel+variables)
    ├── اگر Notification با همان idempotencyKey وجود دارد → بازگشت همان (at-most-once)
    ├── ایجاد Notification (status='pending')
    ├── ایجاد NotificationQueue (priority, maxAttempts=5, nextRetryAt=now)
    ├── Outbox: notification.created
    ├── Outbox: notification.queued
    └── بازگشت: notificationId

[پردازش صف] POST /api/v1/notification-queue/process
    ├── یافتن آیتم‌های صف با nextRetryAt <= now و inDeadLetter=false
    ├── قفل‌گذاری (lockedBy, lockedAt) برای جلوگیری از پردازش موازی
    ├── یافتن Provider برای کانال (DEFAULT_PROVIDERS یا override)
    ├── فراخوانی Provider.send()
    ├── در صورت موفقیت:
    │     ├── Notification.status = 'sent', sentAt = now
    │     ├── ایجاد NotificationDelivery (attempt, status='sent', response, durationMs)
    │     └── Outbox: notification.sent
    ├── در صورت شکست:
    │     ├── attempt + 1
    │     ├── اگر attempt < maxAttempts:
    │     │     ├── محاسبه backoff (exponential: 2^attempt * base)
    │     │     ├── Notification.status = 'retrying'
    │     │     ├── nextRetryAt = now + backoff
    │     │     ├── ایجاد NotificationDelivery (status='failed', errorMessage)
    │     │     └── Outbox: notification.retrying
    │     └── اگر attempt >= maxAttempts:
    │           ├── Notification.status = 'failed'
    │           ├── QueueItem.inDeadLetter = true, deadLetterAt = now
    │           └── Outbox: notification.failed (movedToDLQ=true)
    └── رهاسازی قفل

[لغو اعلان] POST /api/v1/notifications/{id}/cancel
    ├── Notification.status = 'cancelled', cancelledAt, cancelReason
    └── Outbox: notification.cancelled

[Retry دستی] POST /api/v1/notifications/{id}/retry
    ├── صفر کردن attempt
    ├── nextRetryAt = now
    └── Notification.status = 'pending'
```

---

## ۶. سفرهای کاربری سرتاسری

این بخش ۱۵+ سناریوی واقعی را از منظر کاربر روایت می‌کند. هر سناریو با ارجاع به API و رویدادهای واقعی مستند شده است.

### ۶.۱ سفر ۱ — مشتری خرید می‌کند (Customer Purchase Journey)

**کاربر**: مشتری (customer) از اپ موبایل (Flutter — NOT IMPLEMENTED).
**هدف**: خرید یک گوشی موبایل با گارانتی.

```
1. مشتری اپ را باز می‌کند → لاگین (NOT IMPLEMENTED — نبود auth)
2. مرور کاتالوگ محصول: GET /api/v1/products?filter[productType]=serialized
3. انتخاب محصول و افزودن به سبد (NOT IMPLEMENTED — نبود cart)
4. ثبت سفارش: POST /api/v1/sales-orders
   └─ body: { customerPartyId, lines: [{ productId, quantityOrdered: 1, unitPrice }] }
5. سیستم: ایجاد SalesOrder با orderNumber='SO-1403-00001'
6. سیستم: Outbox: sales_order.created
7. کارمند داخلی (staff): تأیید سفارش: POST /api/v1/sales-orders/{id}/approve
8. سیستم: Outbox: sales_order.approved → شروع Saga
9. سیستم (خودکار): رزرو موجودی، ایجاد Shipment، Pick→Pack→Ship
10. سیستم (خودکار): صدور فاکتور: POST /api/v1/invoices/{id}/issue
11. مشتری: دریافت اعلان «فاکتور صادر شد» (Notification)
12. مشتری: پرداخت: POST /api/v1/payments + POST /api/v1/payments/{id}/allocate
13. سیستم: Outbox: payment.received → Saga.complete()
14. سیستم: تحویل محموله: POST /api/v1/shipments/{id}/deliver
15. سیستم (خودکار): فعال‌سازی گارانتی (LAW-28)
16. مشتری: دریافت اعلان «گارانتی فعال شد» با تاریخ شروع/پایان
17. مشتری: مشاهده Device Timeline: GET /api/v1/device-timeline/{instanceId}
```

### ۶.۲ سفر ۲ — نماینده فروش با تخفیف (Dealer Sales with Discount)

**کاربر**: نماینده (representative).
**هدف**: فروش با تخفیف ۱۵٪ (در صورت مجاز بودن).

```
1. لاگین (NOT IMPLEMENTED)
2. نماینده: GET /api/v1/price-lists?filter[priceType]=dealer → دیدن قیمت‌های نمایندگی
3. مشتری جدید را ثبت می‌کند: POST /api/v1/parties
4. ثبت سفارش با discountPercent=15 در خط
5. سیستم: محاسبه total با تخفیف
6. سیستم: Rule Engine evaluation (ruleset با context='sales_order', event='created')
   └─ rule: اگر representative.discountLimit < 15 → action: requireApproval
7. سیستم: Workflow instance شروع می‌شود (WF: sales_order_approval)
8. مدیر فروش: GET /api/v1/workflow/instances?status=running
9. مدیر: POST /api/v1/workflow/instances/{id}/transition (transitionKey='approve')
10. سیستم: Workflow.transitioned → SalesOrder.status='approved'
11. ادامه Saga Fulfillment...
```

### ۶.۳ سفر ۳ — شکایت گارانتی و تعمیر (Warranty Claim → Repair)

**کاربر**: مشتری + تکنسین + مرکز خدمات.

```
1. مشتری: «گوشی‌ام روشن نمی‌شود» → باز کردن اپ
2. مشتری: GET /api/v1/warranty-cards?mine=true → یافتن کارت گارانتی فعال
3. مشتری: POST /api/v1/warranty-claims
   └─ body: { warrantyCardId, claimType: 'malfunction', description: 'won't power on' }
4. سیستم: Outbox: warranty.claim.submitted → Device Timeline
5. مرکز خدمات: GET /api/v1/warranty-claims?status=submitted
6. مرکز خدمات: POST /api/v1/warranty-claims/{id}/inspect
   └─ { defectType: 'electrical', defectSeverity: 'major', isCovered: true }
7. سیستم: Outbox: warranty.claim.inspected
8. مرکز خدمات: POST /api/v1/warranty-claims/{id}/approve
9. سیستم: Outbox: warranty.claim.approved
10. سیستم (خودکار - LAW-33): InboxHandler → ایجاد ServiceRequest از رویداد
11. مرکز خدمات: POST /api/v1/service-requests/{id}/create-order
12. تخصیص تکنسین: POST /api/v1/service-orders/{id}/assign-technician (در صورت وجود)
13. تکنسین (Flutter): POST /api/v1/service-orders/{id}/diagnose
    └─ { symptom: 'no power', rootCause: 'battery failure' }
14. تکنسین: POST /api/v1/service-orders/{id}/consume-part
    └─ { productId: 'battery-001', quantity: 1 }
15. سیستم: LAW-31: InventoryTransaction OUT + Outbox: service_order.part_consumed
16. تکنسین: POST /api/v1/service-orders/{id}/ready
17. سیستم: Outbox: service_order.ready → Notification به مشتری
18. کنترل کیفیت: POST /api/v1/service-orders/{id}/qc
    └─ { result: 'pass', checklist: [...] }
19. تحویل: POST /api/v1/service-orders/{id}/deliver
20. سیستم: Outbox: service_order.delivered → Device Timeline
21. سیستم: بستن WarrantyClaim (status='closed')
```

### ۶.۴ سفر ۴ — مرجوعی کالا (Return)

**کاربر**: مشتری + کارمند انبار مرجوعی + کارمند مالی.

```
1. مشتری: «کالا معیوب است، مرجوع می‌کنم»
2. کارمند: POST /api/v1/return-orders
   └─ { salesOrderId, returnType: 'refund', reason: 'defective' }
3. سیستم: Outbox: return_order.created
4. مدیر: POST /api/v1/return-orders/{id}/approve
5. سیستم: Outbox: return_order.approved → شروع Return Processing Saga
6. انبار مرجوعی: POST /api/v1/return-orders/{id}/receive
   └─ { lines: [{ inspectedCondition: 'defective', inspectionNotes: '...' }] }
7. سیستم: InventoryTransaction IN (در انبار return) + Outbox: return_order.received
8. سیستم (خودکار): ایجاد CreditNote + Outbox: credit_note.issued
9. سیستم (خودکار): InboxHandler → financial-reversal-handler → JE معکوس
10. کارمند مالی: POST /api/v1/refunds
    └─ { returnOrderId, amount, refundMethod: 'bank_transfer' }
11. کارمند مالی: POST /api/v1/refunds/{id}/approve
12. سیستم: Outbox: refund.completed → InboxHandler → financial-refund-handler → JE
13. کارمند: POST /api/v1/return-orders/{id}/close
14. سیستم: Outbox: return_order.closed → Saga.complete()
```

### ۶.۵ سفر ۵ — انتقال بین انبار (Stock Transfer)

**کاربر**: مدیر انبار.

```
1. مدیر انبار شعبه الف: POST /api/v1/stock-transfers
   └─ { fromWarehouseId: WH-A, toWarehouseId: WH-B, lines: [...] }
2. سیستم: status='draft', transferNumber='TR-1403-00001'
3. مدیر: POST /api/v1/stock-transfers/{id}/ship
4. سیستم: LAW-16: InventoryTransaction OUT از WH-A + TRANSFER
5. سیستم: status='in_transit'
6. مدیر انبار شعبه ب: POST /api/v1/stock-transfers/{id}/receive
7. سیستم: InventoryTransaction IN به WH-B
8. سیستم: بروزرسانی StockTransferLine.quantityReceived
9. سیستم: status='received' (یا 'partial' در صورت کمبود)
```

### ۶.۶ سفر ۶ — شمارش چرخه‌ای (Cycle Count)

**کاربر**: کارمند انبار + مدیر.

```
1. مدیر: POST /api/v1/cycle-counts
   └─ { warehouseId, countType: 'cycle' }
2. سیستم: ایجاد CycleCountLine برای هر StockItem با systemQuantity (از ledger)
3. مدیر: POST /api/v1/cycle-counts/{id}/start
4. کارمند: شمارش فیزیکی و ورود countedQuantity
5. مدیر: POST /api/v1/cycle-counts/{id}/complete
6. مدیر: POST /api/v1/cycle-counts/{id}/approve
7. سیستم: برای هر خط با variance ≠ 0:
   └─ InventoryTransaction نوع ADJUSTMENT (quantity = variance)
8. سیستم: status='adjusted'
9. سیستم: Outbox: stock_adjustment.posted → InboxHandler → financial handler (JE تعدیل)
```

### ۶.۷ سفر ۷ — فعال‌سازی دستی گارانتی (Admin Override)

**کاربر**: Super Admin.

```
1. مشتری فاکتور کاغذی قدیمی دارد (قبل از BISMARK)
2. مدیر: POST /api/v1/warranty-cards (ایجاد کارت با status='pending')
3. مدیر: POST /api/v1/warranty-cards/{id}/activate
   └─ این override دستی است — LAW-28 معمولاً فعال‌سازی را از shipment.delivered می‌دهد
4. سیستم: محاسبه startDate=now, endDate=now+warrantyMonths
5. سیستم: Outbox: warranty.activated → Device Timeline
```

### ۶.۸ سفر ۸ — تمدید گارانتی (Warranty Extension)

**کاربر**: مشتری + کارمند مالی.

```
1. مشتری: «گارانتی‌ام ۱ ماه دیگر تمام می‌شود، تمدید می‌کنم»
2. کارمند: GET /api/v1/warranty-cards/{id} → بررسی وضعیت
3. کارمند: POST /api/v1/warranty-extensions
   └─ { warrantyCardId, extensionType: 'paid', extensionMonths: 12, amountPaid: 500000 }
4. سیستم: بروزرسانی WarrantyCard.endDate و extendedMonths
5. سیستم: Outbox: warranty.extended → Device Timeline
6. کارمند مالی: POST /api/v1/payments (ثبت پرداخت تمدید)
7. سیستم: Outbox: payment.received → JE
```

### ۶.۹ سفر ۹ — انتقال گارانتی به شخص دیگر (Warranty Transfer)

**کاربر**: مشتری فعلی + مشتری جدید + مدیر.

```
1. مشتری الف: «گوشی‌ام را به مشتری ب می‌فروشم، گارانتی منتقل شود»
2. کارمند: POST /api/v1/warranty-transfers
   └─ { warrantyCardId, fromPartyId: A, toPartyId: B, transferFee: 0 }
3. مدیر: POST /api/v1/warranty-transfers/{id}/approve
4. سیستم: approvalStatus='approved'
5. سیستم: Outbox: warranty.transfer.approved
6. سیستم: بروزرسانی WarrantyCard.customerPartyId = B
7. سیستم: Device Timeline: «انتقال گارانتی از A به B»
```

### ۶.۱۰ سفر ۱۰ — ثبت سند حسابداری دستی (Manual Journal Entry)

**کاربر**: کارمند مالی.

```
1. کارمند: GET /api/v1/chart-of-accounts → دیدن لیست حساب‌ها
2. کارمند: POST /api/v1/journal-entries
   └─ body: {
        entryDate: '2024-12-01',
        description: 'هزینه اجاره دفتر',
        lines: [
          { accountId: 'EXP-RENT', debitAmount: 5000000, creditAmount: 0 },
          { accountId: 'CASH-001', debitAmount: 0, creditAmount: 5000000 }
        ]
      }
3. سیستم: LAW-35: بررسی totalDebit (5000000) === totalCredit (5000000) ✓
4. سیستم: LAW-36: بررسی period.status ≠ 'closed' ✓
5. سیستم: ایجاد JournalEntry با status='posted'
6. سیستم: Outbox: journal_entry.posted
```

### ۶.۱۱ سفر ۱۱ — بستن سال مالی (Fiscal Year Close)

**کاربر**: مدیر مالی.

```
1. مدیر: GET /api/v1/fiscal-periods?fiscalYearId=1403 → لیست دوره‌ها
2. مدیر: POST /api/v1/fiscal-periods/{Q1}/soft-close → تمام دوره‌ها را نرم-بسته می‌کند
3. مدیر: POST /api/v1/reconciliation → بررسی مغایرت AR/AP با Control Account
4. مدیر: POST /api/v1/closing-validation → اجرای اعتبارسنجی بستن
5. مدیر: POST /api/v1/fiscal-periods/{Q1}/hard-close → بستن سخت (LAW-36: غیرقابل بازگشت)
6. مدیر: POST /api/v1/fiscal-years/{1403}/close → بستن سال
7. سیستم: جميع JEs از این پس در سال ۱۴۰۳ رد می‌شوند
```

### ۶.۱۲ سفر ۱۲ — تنظیم قالب اعلان (Notification Template Setup)

**کاربر**: مدیر سیستم.

```
1. مدیر: POST /api/v1/notification/templates/seed-defaults → seed قالب‌های پیش‌فرض
2. مدیر: GET /api/v1/notification/templates?code=invoice.issued
3. مدیر: POST /api/v1/notification/templates
   └─ body: {
        code: 'invoice.issued',
        language: 'fa', channel: 'sms',
        bodyTemplate: 'فاکتور شماره {{invoiceNumber}} به مبلغ {{totalAmount}} {{currencyCode}} صادر شد.',
        variablesSchema: [...]
      }
4. مدیر: POST /api/v1/notification/templates/{id}/publish
5. مدیر: GET /api/v1/notification/templates/{id}/preview?variables={...}
6. مدیر: GET /api/v1/notification/templates/{id}/versions → دیدن نسخه‌ها
```

### ۶.۱۳ سفر ۱۳ — ارسال اعلان و مشاهده وضعیت (Send + Track)

**کاربر**: کارمند یا سیستم.

```
1. سیستم (خودکار از InboxHandler): POST /api/v1/notifications/send
   └─ { templateCode: 'service_order.ready', recipientId, recipientAddress: '+98912...', variables: {...} }
2. سیستم: LAW-57: محاسبه idempotencyKey
3. سیستم: ایجاد Notification + NotificationQueue
4. سیستم: Outbox: notification.created + notification.queued
5. Worker (هر ۵ ثانیه): POST /api/v1/notification-queue/process
6. سیستم: فراخوانی KavenegarProvider.send()
7. موفقیت → status='sent', NotificationDelivery ایجاد
8. مدیر: GET /api/v1/notifications/stats
   └─ بازگشت: { total, sent, failed, retrying, in_dlq }
9. در صورت شکست: Retry exponential (2^attempt * base) تا ۵ تلاش
10. در صورت شکست نهایی: movedToDLQ=true
```

### ۶.۱۴ سفر ۱۴ — تعریف گردش کار تأیید (Workflow Definition)

**کاربر**: مدیر سیستم.

```
1. مدیر: POST /api/v1/workflow/definitions
   └─ body: {
        key: 'sales_order_approval',
        entityType: 'sales_order',
        states: [
          { key: 'draft', name: 'پیش‌نویس', isInitial: true, isFinal: false },
          { key: 'pending_approval', name: 'در انتظار تأیید', isFinal: false },
          { key: 'approved', name: 'تأیید شده', isFinal: true },
          { key: 'rejected', name: 'رد شده', isFinal: true }
        ],
        transitions: [
          { key: 'submit', fromState: 'draft', toState: 'pending_approval', triggerType: 'manual' },
          { key: 'approve', fromState: 'pending_approval', toState: 'approved', triggerType: 'manual', guardRuleSetId: 'sales_order_rules', requiredPermission: 'sales_order.approve' },
          { key: 'reject', fromState: 'pending_approval', toState: 'rejected', triggerType: 'manual' }
        ]
      }
2. مدیر: POST /api/v1/workflow/definitions/{id}/publish
3. مدیر: POST /api/v1/rule-sets
   └─ { code: 'sales_order_rules', context: 'sales_order', priority: 100 }
4. مدیر: POST /api/v1/rules
   └─ { ruleSetId, conditionDsl: { field: 'totalAmount', operator: '>', value: 100000000 }, actionDsl: { type: 'requireApproval', role: 'ceo' } }
5. مدیر: POST /api/v1/rule-sets/{id}/publish
```

### ۶.۱۵ سفر ۱۵ — گزارش‌گیری مالی (Financial Reporting)

**کاربر**: مدیر مالی + CEO.

```
1. مدیر: GET /api/v1/reports/dashboard → KPI های سال جاری
2. مدیر: GET /api/v1/reports/balance-sheet?asOf=2024-12-29
3. مدیر: GET /api/v1/reports/profit-loss?from=2024-01-01&to=2024-12-29
4. مدیر: GET /api/v1/reports/cash-flow?period=2024-Q4
5. مدیر: GET /api/v1/reports/equity?from=2024-01-01&to=2024-12-29
6. مدیر: GET /api/v1/reports/final-trial-balance?asOf=2024-12-29
7. مدیر: GET /api/v1/trial-balance?asOf=2024-12-29 (تراز آزمایشی)
8. مدیر: GET /api/v1/general-ledger?accountId=...&from=...&to=... (دفتر کل)
9. مدیر: GET /api/v1/ar/customers/{id}/statement (صورتحساب مشتری)
10. مدیر: GET /api/v1/ar/customers/{id}/aging (سن بدهی مشتری)
11. مدیر: GET /api/v1/tax/reports/vat?period=2024-Q4 (گزارش ارزش افزوده)
```

### ۶.۱۶ سفر ۱۶ — مدیر دستگاه را ردابی می‌کند (Device Timeline)

**کاربر**: CEO یا مدیر محصول.

```
1. مدیر: GET /api/v1/products/{productId}/instances → لیست سریال‌ها
2. مدیر: GET /api/v1/device-timeline/{instanceId}
3. سیستم: بازگشت خط زمانی به ترتیب chronological:
   └─ [
        { eventType: 'product_instance.created', date: '1403-01-15', payload: { serialNumber: 'SN-...' } },
        { eventType: 'inventory.in', date: '1403-01-16', payload: { warehouse: 'WH-A' } },
        { eventType: 'sales_order.approved', date: '1403-02-10', payload: { orderNumber: 'SO-...' } },
        { eventType: 'shipment.shipped', date: '1403-02-12', payload: { shipmentNumber: 'SHP-...' } },
        { eventType: 'shipment.delivered', date: '1403-02-15' },
        { eventType: 'warranty.activated', date: '1403-02-15', payload: { endDate: '1404-02-15' } },
        { eventType: 'warranty.claim.submitted', date: '1403-08-20' },
        { eventType: 'service_order.created', date: '1403-08-21' },
        { eventType: 'service_order.diagnosed', date: '1403-08-22', payload: { symptom: '...' } },
        { eventType: 'service_order.part_consumed', date: '1403-08-23' },
        { eventType: 'service_order.qc_completed', date: '1403-08-24' },
        { eventType: 'service_order.delivered', date: '1403-08-25' },
        { eventType: 'warranty.expired', date: '1404-02-15' }
      ]
4. مدیر: تحلیل lifecycle کامل دستگاه
```

### ۶.۱۷ سفر ۱۷ — مشتری اعلان‌ها را شخصی‌سازی می‌کند (Notification Preferences)

**کاربر**: مشتری.

```
1. مشتری: GET /api/v1/notification-preferences/{userId}
2. سیستم: بازگشت: { emailEnabled: true, smsEnabled: true, whatsappEnabled: false, language: 'fa', quietHoursStart: '22:00', quietHoursEnd: '07:00' }
3. مشتری: PATCH /api/v1/notification-preferences/{userId}
   └─ { smsEnabled: false, whatsappEnabled: true, language: 'fa' }
4. سیستم: Outbox: notification.preference.updated
5. از این پس: اعلان‌های SMS به این کاربر ارسال نمی‌شود
```

---

## ۷. چرخه حیات موجودیت‌ها

این بخش ماشین حالت هر موجودیت اصلی را از روی کد واقعی (status enum + transition routes) مستند می‌کند.

### ۷.۱ ProductInstance

```
┌─────────────┐
│ in_stock    │ ← پیش‌فرض هنگام ایجاد
└──────┬──────┘
       │ reserved (StockReservation)
       ▼
┌─────────────┐
│ reserved    │
└──────┬──────┘
       │ sold (SalesOrder.approved + Shipment.shipped)
       ▼
┌─────────────┐
│ sold        │
└──────┬──────┘
       │ in_service (ServiceOrder.created)
       ▼
┌─────────────┐        returned (ReturnOrder.received)
│ in_service  │────────────────────┐
└──────┬──────┘                    │
       │ delivered (ServiceOrder.delivered)  ▼
       ▼                       ┌─────────┐
┌─────────────┐                │ returned│
│ sold        │ ←──────────────┘         │
└──────┬──────┘                          │
       │ scrapped (هدر)                  │
       ▼                                 │
┌─────────────┐    lost (گم شدن)        │
│ scrapped    │──────┐                   │
└─────────────┘      ▼                   │
                ┌─────────┐              │
                │ lost    │              │
                └─────────┘              │
                                          │
Condition: new → refurbished → used → damaged
```

**وضعیت‌ها (از schema.prisma سطر ۳۵۱)**:
- `status`: `in_stock | reserved | sold | in_service | returned | scrapped | lost`
- `condition`: `new | refurbished | used | damaged`

### ۷.۲ SalesOrder

```
draft → pending_approval → approved → shipped → completed
                                ↓         ↓
                            rejected   partially_shipped
                                ↓
                            cancelled
```

**وضعیت‌ها (از schema.prisma سطر ۷۵۴)**:
- `status`: `draft | pending_approval | approved | rejected | invoiced | shipped | partially_shipped | completed | cancelled`
- `paymentStatus`: `unpaid | partial | paid`

**Transition‌های مجاز (از مسیرهای API)**:
- `draft → pending_approval`: `POST /sales-orders/{id}/submit` (در صورت وجود)
- `pending_approval → approved`: `POST /sales-orders/{id}/approve`
- `pending_approval → rejected`: (در صورت وجود مسیر reject)
- `approved → shipped`: خودکار از طریق Saga + Shipment.ship
- `approved → partially_shipped`: خودکار اگر quantityShipped < quantityOrdered
- `shipped → completed`: خودکار پس از payment.received + Saga.complete
- `* → cancelled`: `POST /sales-orders/{id}/cancel` (با compensation در Saga)

### ۷.۳ Shipment

```
draft → picking → packing → shipped → delivered
                              ↓
                          returned
   ↓ (در هر مرحله قبل از shipped)
cancelled
```

**وضعیت‌ها (از schema.prisma سطر ۹۱۶)**:
- `status`: `draft | picking | packing | shipped | delivered | returned | cancelled`

**Transition‌های مجاز**:
- `draft → picking`: `POST /shipments/{id}/pick`
- `picking → packing`: `POST /shipments/{id}/pack`
- `packing → shipped`: `POST /shipments/{id}/ship` ← **LAW-18: پس از این غیرقابل تغییر**
- `shipped → delivered`: `POST /shipments/{id}/deliver`
- `delivered → returned`: در صورت ReturnOrder مرتبط
- `draft|picking → cancelled`: در صورت لغو

### ۷.۴ Invoice

```
draft → issued → partially_paid → paid
          ↓              ↓
       cancelled    cancelled (در صورت CreditNote کامل)
          ↓
       reversed
```

**وضعیت‌ها (از schema.prisma سطر ۱۰۲۹)**:
- `status`: `draft | issued | partially_paid | paid | cancelled | reversed`

**Transition‌های مجاز**:
- `draft → issued`: `POST /invoices/{id}/issue` ← **LAW-21: پس از این غیرقابل تغییر**
- `issued → partially_paid`: خودکار پس از PaymentAllocation (با مبلغ جزئی)
- `issued|partially_paid → paid`: خودکار پس از PaymentAllocation (با مبلغ کامل)
- `issued → cancelled`: `POST /invoices/{id}/cancel` (با دلیل)
- `* → reversed`: `POST /invoices/{id}/credit-note` (ایجاد CreditNote و JE معکوس)

### ۷.۵ Payment

```
pending → partially_allocated → completed
              ↓                    ↓
           cancelled            cancelled
              ↓
           failed
```

**وضعیت‌ها (از schema.prisma سطر ۱۰۸۹)**:
- `status`: `pending | partially_allocated | completed | cancelled | failed`

**Transition‌های مجاز**:
- `pending → partially_allocated`: خودکار پس از اولین PaymentAllocation (با مبلغ جزئی)
- `pending|partially_allocated → completed`: خودکار پس از PaymentAllocation (با مبلغ کامل)
- `* → cancelled`: لغو دستی
- `pending → failed`: در صورت عدم واریز وجه (مثلاً چک برگشتی)

### ۷.۶ ReturnOrder

```
draft → submitted → approved → received → closed
                       ↓
                   cancelled
```

**وضعیت‌ها (از schema.prisma سطر ۱۱۹۱)**:
- `status`: `draft | submitted | approved | received | closed | cancelled`

### ۷.۷ Refund

```
pending → approved → completed
             ↓
         cancelled
```

**وضعیت‌ها (از schema.prisma سطر ۱۲۵۷)**:
- `status`: `pending | approved | completed | cancelled`

### ۷.۸ WarrantyCard

```
pending → active → expired
            ↓
        transferred
            ↓
        voided
```

**وضعیت‌ها (از schema.prisma سطر ۱۳۶۷)**:
- `status`: `pending | active | expired | voided | transferred`

**Transition‌های مجاز**:
- `pending → active`: `POST /warranty-cards/{id}/activate` یا خودکار از `shipment.delivered` (LAW-28)
- `active → expired`: خودکار در endDate (نیازمند Scheduler — NOT IMPLEMENTED)
- `active → transferred`: پس از تأیید WarrantyTransfer
- `* → voided`: ابطال دستی (در صورت تقلب یا خطا)

### ۷.۹ WarrantyClaim

```
draft → submitted → inspection → approved → service_order → closed
                       ↓             ↓
                   (re-inspect)   rejected
```

**وضعیت‌ها (از schema.prisma سطر ۱۳۹۹)**:
- `status`: `draft | submitted | inspection | approved | rejected | service_order | closed`

**Transition‌های مجاز**:
- `draft → submitted`: خودکار پس از ایجاد
- `submitted → inspection`: `POST /warranty-claims/{id}/inspect` (LAW-29: الزامی قبل از تأیید)
- `inspection → approved`: `POST /warranty-claims/{id}/approve`
- `inspection → rejected`: `POST /warranty-claims/{id}/reject` (در صورت وجود مسیر)
- `approved → service_order`: خودکار پس از ایجاد ServiceOrder از طریق رویداد (LAW-33)
- `service_order → closed`: پس از ServiceOrder.delivered

### ۷.۱۰ ServiceRequest

```
draft → submitted → validated → service_order → (closed by linked ServiceOrder)
                       ↓
                   cancelled
```

**وضعیت‌ها (از schema.prisma سطر ۱۵۰۷)**:
- `status`: `draft | submitted | validated | service_order | cancelled`

### ۷.۱۱ ServiceOrder

```
open → diagnosis → waiting_parts → repair → qc → ready → delivered → closed
                       ↑                ↓      ↓
                       └── rework ←─────┘  (fail → rework)
                                                     ↓
                                                  cancelled
```

**وضعیت‌ها (از schema.prisma سطر ۱۵۴۲)**:
- `status`: `open | diagnosis | waiting_parts | repair | qc | ready | delivered | closed | cancelled`

**Transition‌های مجاز**:
- `open → diagnosis`: `POST /service-orders/{id}/diagnose`
- `diagnosis → waiting_parts`: در صورت نیاز به قطعه
- `diagnosis|waiting_parts → repair`: پس از مصرف قطعه (POST consume-part)
- `repair → qc`: `POST /service-orders/{id}/qc` (LAW-32)
- `qc → ready` (در صورت pass): `POST /service-orders/{id}/ready`
- `qc → repair` (در صورت fail): rework
- `ready → delivered`: `POST /service-orders/{id}/deliver`
- `delivered → closed`: بستن نهایی

### ۷.۱۲ StockTransfer

```
draft → in_transit → received
          ↓             ↓
       cancelled     partial
                        ↓
                     received (پس از دریافت کامل)
```

**وضعیت‌ها (از schema.prisma سطر ۶۲۹)**:
- `status`: `draft | in_transit | received | partial | cancelled`

### ۷.۱۳ CycleCount

```
draft → in_progress → completed → approved → adjusted
                                              ↓
                                          cancelled (در صورت لغو قبل از approve)
```

**وضعیت‌ها (از schema.prisma سطر ۶۸۵)**:
- `status`: `draft | in_progress | completed | approved | adjusted | cancelled`

### ۷.۱۴ StockReservation

```
active → consumed (پس از Shipment.ship)
active → released (پس از SalesOrder.cancelled یا انقضا)
active → expired (خودکار پس از expiresAt — نیازمند Scheduler)
```

**وضعیت‌ها (از schema.prisma سطر ۶۰۱)**:
- `status`: `active | released | consumed | expired`

### ۷.۱۵ JournalEntry

```
draft → posted → reversed
```

**وضعیت‌ها (از schema.prisma سطر ۱۸۴۳)**:
- `status`: `draft | posted | reversed`

### ۷.۱۶ FiscalPeriod

```
open → temporarily_closed → closed
```

**وضعیت‌ها (از schema.prisma سطر ۱۷۷۹)**:
- `status`: `open | temporarily_closed | closed`

### ۷.۱۷ ARTransaction / APTransaction

```
open → partially_allocated → fully_allocated
```

**وضعیت‌ها (از schema.prisma سطر ۱۹۱۰/۱۹۵۶)**:
- `status`: `open | partially_allocated | fully_allocated`

### ۷.۱۸ WorkflowInstance

```
running → completed
   ↓
cancelled
```

**وضعیت‌ها (از schema.prisma سطر ۲۱۰۷)**:
- `status`: `running | completed | cancelled`

### ۷.۱۹ SagaInstance

```
pending → running → completed
              ↓
         compensating → compensated
              ↓
           failed
```

**وضعیت‌ها (از schema.prisma سطر ۱۳۰۴)**:
- `status`: `pending | running | completed | failed | compensating | compensated`

### ۷.۲۰ Notification

```
pending → queued → sending → sent
              ↓        ↓
           retrying  failed → (DLQ)
              ↓
           cancelled
```

**وضعیت‌ها (از schema.prisma سطر ۲۲۸۵)**:
- `status`: `pending | queued | sending | sent | failed | retrying | cancelled`

### ۷.۲۱ RuleSet / RuleDefinition

```
draft → published → disabled
```

**وضعیت‌ها (از schema.prisma سطر ۲۱۵۷/۲۱۸۶)**:
- `status`: `draft | published | disabled`

### ۷.۲۲ WorkflowDefinition

```
draft → published (isActive=true)
```

### ۷.۲۳ NotificationTemplate

```
draft → published → disabled
```

### ۷.۲۴ Product / ProductModel / ProductBrand / ProductCategory

```
draft → active → discontinued → recall
```

**وضعیت‌ها (از schema.prisma سطر ۳۰۳/۳۳۰)**:
- `status`: `draft | active | discontinued | recall`

### ۷.۲۵ Party

```
active → inactive → suspended → blacklisted
```

**وضعیت‌ها (از schema.prisma سطر ۲۲۵)**:
- `status`: `active | inactive | suspended | blacklisted`

---

## ۸. قوانین کسب‌وکار

این بخش ۵۴ قانون معماری (LAW-04 تا LAW-57) را که در `src/lib/shared/laws/` تعریف شده‌اند، به‌صورت ساختاریافته فهرست می‌کند. این قوانین **قوانین کسب‌وکار} سیستم هستند (نه صرفاً قوانین فنی).

### ۸.۱ دسته‌بندی قوانین

| ردیف قانون | موضوع | وضعیت پیاده‌سازی |
|------------|-------|------------------|
| LAW-04 | No Direct Cross-Context Repository Imports | ✅ |
| LAW-05 | Ledger Pattern (No aggregate quantities stored) | ✅ |
| LAW-06 | Idempotency (SHA-256 dedup) | ✅ |
| LAW-07 | Optimistic Lock (version + If-Match) | ✅ |
| LAW-08 | Outbox Pattern (reliable event publishing) | ✅ |
| LAW-09 | Inbox Pattern (exactly-once processing) | ✅ |
| LAW-10 | Snapshot Pattern (ledger scalability) | ✅ |
| LAW-11 | Application Service Layer | ✅ |
| LAW-12 | Unit of Work (db.$transaction) | ✅ |
| LAW-13 | — | (وجود دارد، موضوع استخراج‌نشده) |
| LAW-14 | — | (وجود دارد) |
| LAW-15 | Event Versioning (1.0) | ✅ |
| LAW-16 | No Physical Movement Without Ledger Event | ✅ |
| LAW-17 | Reservation Before Shipment | ✅ |
| LAW-18 | Shipment Immutable After Shipping | ✅ |
| LAW-19 | Only Financial Context Creates Accounting Entries | ✅ |
| LAW-20 | Every Payment Must Be Allocated | ✅ |
| LAW-21 | Invoices Immutable After Issue | ✅ |
| LAW-22 | Physical Inspection on Returns | ✅ |
| LAW-23 | Refund Requires Approved Return | ✅ |
| LAW-24 | Replacement = Return + New Fulfillment | ✅ |
| LAW-25 | No Cross-Context Synchronous Commands | ✅ |
| LAW-26 | Every Domain Event Exactly Once | ✅ |
| LAW-27 | Long-Running Process = Saga | ✅ |
| LAW-28 | Warranty Activation From Shipment Delivered | ✅ |
| LAW-29 | Warranty Claim Inspection Before Approval | ✅ |
| LAW-30 | Device Timeline From Immutable Events | ✅ |
| LAW-31 | No Part Consumption Without Inventory Ledger | ✅ |
| LAW-32 | Every Repair Must Pass QC Before Delivery | ✅ |
| LAW-33 | Warranty Approval → ServiceRequest via Event | ✅ |
| LAW-34 | Only Financial May Post to GL | ✅ |
| LAW-35 | Every Journal Entry Must Balance | ✅ |
| LAW-36 | Closed Fiscal Period Immutable | ✅ |
| LAW-37–39 | (مالیاتی — استخراج دقیق‌تر نیاز) | ✅ |
| LAW-40 | Subledger Must Reconcile With GL | ✅ |
| LAW-41 | Every Allocation Must Be Reversible | ✅ |
| LAW-42 | Customer/Vendor Balance Is Derived | ✅ |
| LAW-43 | Tax Derived From Tax Rules | ✅ |
| LAW-44 | Tax Posting Produces Independent JE | ✅ |
| LAW-45 | Tax Rules Versioned + Effective-Dated | ✅ |
| LAW-46–48 | Reporting (read-only, derived) | ✅ |
| LAW-49 | Only Workflow Engine Changes WF State | ✅ |
| LAW-50 | RuleSet Versioning | ✅ |
| LAW-51 | (Rule Engine) | ✅ |
| LAW-52 | Only Rule Engine Evaluates Rules | ✅ |
| LAW-53 | Rule Evaluation Deterministic | ✅ |
| LAW-54 | Rule Execution Fully Auditable | ✅ |
| LAW-55 | Notifications Template-Based | ✅ |
| LAW-56 | Notification Channel-Agnostic | ✅ |
| LAW-57 | Notification Retry + Idempotent | ✅ |

### ۸.۲ قوانین اعتبارسنجی در مسیرهای API

علاوه بر LAWها، هر مسیر API اعتبارسنجی خاص خود را دارد:

| مسیر | قانون اعتبارسنجی |
|------|------------------|
| `POST /sales-orders` | `customerPartyId` الزامی، `lines` غیرخالی، هر خط باید `productId`, `quantityOrdered`, `unitPrice` داشته باشد |
| `POST /sales-orders/{id}/approve` | `status` باید `draft` یا `pending_approval` باشد |
| `POST /shipments/{id}/ship` | `status` باید `packing` باشد، تمام خطوط باید `quantityPacked >= quantity` باشند |
| `POST /invoices/{id}/issue` | `status` باید `draft` باشد |
| `POST /payments/{id}/allocate` | مبلغ تخصیص باید <= `payment.amount - sum(existing allocations)` باشد |
| `POST /warranty-cards/{id}/activate` | `status` باید `pending` باشد |
| `POST /warranty-claims/{id}/inspect` | `status` باید `submitted` یا `inspection` باشد (re-inspect) |
| `POST /warranty-claims/{id}/approve` | `status` باید `inspection` باشد و `isInspected = true` |
| `POST /service-orders/{id}/diagnose` | `status` باید `open` باشد |
| `POST /service-orders/{id}/ready` | `status` باید `repair` یا `qc` (pass) باشد |
| `POST /service-orders/{id}/qc` | `status` باید `repair` باشد |
| `POST /return-orders/{id}/approve` | `status` باید `submitted` باشد |
| `POST /return-orders/{id}/receive` | `status` باید `approved` باشد |
| `POST /return-orders/{id}/close` | `status` باید `received` باشد و تمام refunds باید `completed` باشند |
| `POST /journal-entries` | `totalDebit === totalCredit` (LAW-35)، `fiscalPeriod.status ≠ 'closed'` (LAW-36) |
| `POST /journal-entries/{id}/reverse` | `status` باید `posted` باشد |
| `POST /fiscal-periods/{id}/hard-close` | تمام JEs باید posted باشند، period باید `temporarily_closed` باشد |
| `POST /fiscal-years/{id}/close` | تمام periods باید `closed` باشند |
| `POST /workflow/instances/{id}/transition` | `status` باید `running` باشد، transition باید در تعریف وجود داشته باشد |
| `POST /rules/evaluate` | `context`, `event`, `payload` همگی الزامی هستند |
| `POST /notifications/send` | `templateCode`, `channel`, `recipientAddress` الزامی، template باید `published` باشد |

### ۸.۳ قوانین کسب‌وکار خاص (Business Rules)

| قانون | پیاده‌سازی |
|------|-----------|
| تخفیف بالای ۱۰۰٪ مجاز نیست | در `sales-orders/route.ts` اعتبارسنجی نمی‌شود — **نقص} |
| نماینده نمی‌تواند زیر قیمت خرید بفروشد | در کد اعمال نمی‌شود — **نقص} (نیازمند Rule Engine) |
| مجموع quantity در خطوط Shipment باید با reservedQuantity برابر باشد | در `shipments/[id]/ship` بررسی می‌شود |
| محصولات `discontinued` قابل سفارش نیستند | در کد اعمال نمی‌شود — **نقص} |
| مشتری `blacklisted` قابل سفارش نیست | در کد اعمال نمی‌شود — **نقص} |
| موجودی منفی مجاز نیست | با Ledger Pattern + رزرو تضمین می‌شود (نه با اعتبارسنجی صریح) |
| گارانتی فعال فقط برای محصول فروخته‌شده | LAW-28: از `shipment.delivered` فعال می‌شود |
| سرویس گارانتی فقط با کارت گارانتی فعال | در `service-requests/route.ts` اعمال نمی‌شود — **نقص} |
| تکنسین نمی‌تواند سفارش خود را QC کند | در کد اعمال نمی‌شود — **نقص} |
| مبلغ بازپرداخت ≤ مبلغ فاکتور اصلی | در `refunds/route.ts` اعمال نمی‌شود — **نقص} |
| بستن سال مالی نیاز به مغایرت‌گیری دارد | در `closing-validation/route.ts` پیاده‌سازی شده |

---

## ۹. مدل دامنه

این بخش مدل دامنه را به‌صورت Conceptual Model (نه ERD) ارائه می‌دهد. مدل دامنه شامل Aggregate‌ها، Entity‌ها، Value Object‌ها و Domain Service‌ها است.

### ۹.۱ Aggregate‌های اصلی

| Aggregate Root | Entity‌های فرعی | Value Objects | Invariants (قوانین درون‌Aggregate) |
|----------------|------------------|---------------|-------------------------------------|
| **SalesOrder** | SalesOrderLine | Money, DateRange | مجموع lineTotal + discount + tax + shipping = totalAmount; status transitions |
| **Shipment** | ShipmentLine, PickList, PickListLine | Money, DateRange | quantityPicked ≤ quantity; quantityShipped ≤ quantityPacked; LAW-18 immutability |
| **Invoice** | InvoiceLine | Money | totalAmount = subtotal - discount + tax + shipping; paidAmount ≤ totalAmount; LAW-21 immutability |
| **Payment** | PaymentAllocation | Money | sum(allocations) ≤ amount; status transitions |
| **ReturnOrder** | ReturnOrderLine | Money | LAW-22: inspection before close; LAW-24: replacement link |
| **Refund** | — | Money | LAW-23: requires approved ReturnOrder |
| **WarrantyCard** | WarrantyClaim, WarrantyExtension, WarrantyTransfer | DateRange | LAW-28: activation from delivery; one card per instance |
| **ServiceRequest** | — | — | LAW-33: from warranty claim via event |
| **ServiceOrder** | ServiceOrderLine, ServiceDiagnosis, ServiceOrderPart, ServiceOrderLabor, ServiceQualityCheck, TechnicianAssignment | Money | LAW-32: QC before delivery; LAW-31: part consumption creates ledger |
| **StockItem** | InventoryTransaction (append-only), StockReservation, StockBalance (snapshot) | — | LAW-05: NO on_hand_quantity; balance derived from ledger |
| **StockTransfer** | StockTransferLine | — | quantityReceived ≤ quantity |
| **CycleCount** | CycleCountLine | — | variance = counted - system; adjustment creates ledger |
| **JournalEntry** | JournalEntryLine | Money | LAW-35: totalDebit === totalCredit; LAW-36: period open |
| **ChartOfAccount** | — | — | tree structure; isControlAccount for AR/AP |
| **ARTransaction** | ARAllocation | Money | LAW-42: balance derived; LAW-41: reversible |
| **APTransaction** | APAllocation | Money | LAW-42: balance derived; LAW-41: reversible |
| **TaxCalculation** | TaxPosting | — | LAW-43: from TaxRule; LAW-44: independent JE |
| **WorkflowDefinition** | — | — | states + transitions JSON |
| **WorkflowInstance** | WorkflowHistory | — | LAW-49: only engine changes state |
| **RuleSet** | RuleDefinition, RuleExecution, RuleAuditStep | — | LAW-50: versioned; LAW-53: deterministic; LAW-54: auditable |
| **NotificationTemplate** | — | — | LAW-55: versioned, language-aware |
| **Notification** | NotificationDelivery, NotificationQueue | — | LAW-57: idempotencyKey, retry, DLQ |
| **SagaInstance** | — | — | LAW-27: steps + compensation |
| **OutboxMessage** | — | — | LAW-08: reliable publishing |
| **Product** | ProductInstance | — | isSerialized flag |
| **ProductCategory** | — | — | tree structure (parentId, path, level) |
| **Party** | — | — | partyType: person|organization |
| **Tenant** | — | — | root for multi-tenancy |

### ۹.۲ Value Objects در Shared Kernel

از `src/lib/shared/value-objects/`:

| Value Object | توضیح | کاربرد |
|--------------|-------|--------|
| **UuidV7** | شناسه time-ordered (LAW-01) | PK در PostgreSQL تولید |
| **Money** | مبلغ با currencyCode، immutability، arithmetic | تمام مبالغ |
| **DateRange** | بازه تاریخ با overlap/contains | WarrantyPolicy, PriceList, Quote |
| **Locale** | fa-IR با PersianCalendar | i18n |

### ۹.۳ Domain Service‌ها (Application Services)

| Service | محل قرارگیری | مسئولیت |
|---------|-------------|--------|
| **BusinessCodeGenerator** | `src/lib/shared/helpers/` | تولید کد یکتا با سال شمسی (LAW-02) |
| **UnitOfWork** | `src/lib/shared/infra/` | transaction boundary (LAW-12) |
| **IdempotencyHelper** | `src/lib/shared/infra/` | SHA-256 dedup (LAW-06) |
| **OptimisticLockHelper** | `src/lib/shared/infra/` | version + If-Match (LAW-07) |
| **PrismaEventBus** | `src/lib/shared/infra/` | in-process event bus |
| **OutboxDispatcher** | `src/lib/shared/outbox/` | polling + publishing (LAW-08) |
| **OutboxPublisher** | `src/lib/shared/outbox/` | listener dispatch |
| **OutboxRetryPolicy** | `src/lib/shared/outbox/` | exponential backoff |
| **DeadLetterHandler** | `src/lib/shared/outbox/` | DLQ management |
| **InboxWorker** | `src/lib/shared/inbox/` | exactly-once (LAW-09, LAW-26) |
| **SnapshotPolicy** | `src/lib/shared/snapshot/` | when to snapshot (LAW-10) |
| **SnapshotScheduler** | `src/lib/shared/snapshot/` | periodic snapshot |
| **SnapshotWorker** | `src/lib/shared/snapshot/` | executes snapshot |
| **SagaManager** | `src/lib/saga/` | saga lifecycle (LAW-27) |
| **NotificationService** | `src/lib/modules/notification/services/` | dispatch + retry (LAW-55/56/57) |
| **TemplateEngine** | `src/lib/modules/notification/services/` | deterministic rendering |
| **PreferenceService** | `src/lib/modules/notification/services/` | user preferences |
| **ProductQueryService** | `src/lib/modules/product/services/` | cross-context read (LAW-04) |
| **BusinessCodeRepository** | `src/lib/shared/repositories/` | atomic sequence generation |

### ۹.۴ Repository‌ها

تنها یک Repository صریح در Shared Kernel وجود دارد:

- **BusinessCodeRepository** (`src/lib/shared/repositories/business-code-repository.ts`) — مسئول nextSequence و previewSequence با قفل همزمانی.

سایر Context‌ها مستقیماً از `db` (PrismaClient) استفاده می‌کنند که در Laravel باید به Repository‌های اختصاصی تبدیل شوند.

---

## ۱۰. بسترهای محدود (Bounded Contexts)

این بخش ساختار واقعی ماژول‌ها را از روی فایل‌سیستم مستند می‌کند.

### ۱۰.۱ Bounded Context‌های شناسایی‌شده (از روی مدل‌ها و رویدادها)

| # | Bounded Context | مدل‌های اصلی | مسیر API نمونه | مدل در فایل‌سیستم |
|---|------------------|--------------|----------------|---------------------|
| ۱ | **Identity** | User, Role, Permission, Session, Tenant | (در Laravel + sandbox) | در `backend/bismark-laravel/` (Laravel) |
| ۲ | **Organization** | Branch | (در Laravel + sandbox) | در Laravel |
| ۳ | **Party** | Party | `/api/v1/parties` (در page.tsx) | ❌ نه در `src/lib/modules/` |
| ۴ | **Product** | ProductCategory, ProductBrand, ProductModel, Product, ProductInstance | `/api/v1/products`, `/product-categories`, `/product-brands`, `/product-models` | ✅ `src/lib/modules/product/` |
| ۵ | **Inventory** | Warehouse, WarehouseZone, Location, Bin, StockItem, InventoryTransaction, StockBalance, StockReservation, StockTransfer, StockTransferLine, CycleCount, CycleCountLine | `/api/v1/warehouses`, `/stock-items`, `/inventory-transactions`, `/stock-reservations`, `/stock-transfers`, `/cycle-counts`, `/movements` | ❌ |
| ۶ | **Sales** | SalesOrder, SalesOrderLine, PriceList, PriceListLine, Quote, QuoteLine | `/api/v1/sales-orders`, `/sales-orders/[id]/approve` | ❌ |
| ۷ | **Fulfillment** | Shipment, ShipmentLine, PickList, PickListLine | `/api/v1/shipments`, `/shipments/[id]/{pick,pack,ship,deliver,tracking}` | ❌ |
| ۸ | **Billing** | Invoice, InvoiceLine, Payment, PaymentAllocation, CreditNote, CreditNoteLine | `/api/v1/invoices`, `/payments`, `/payments/[id]/allocate` | ❌ |
| ۹ | **Returns** | ReturnOrder, ReturnOrderLine, Refund | `/api/v1/return-orders`, `/refunds` | ❌ |
| ۱۰ | **Warranty** | WarrantyPolicy, WarrantyCard, WarrantyClaim, WarrantyExtension, WarrantyTransfer | `/api/v1/warranty-cards`, `/warranty-claims` | ❌ |
| ۱۱ | **Service** | ServiceRequest, ServiceOrder, ServiceOrderLine, ServiceDiagnosis, ServiceOrderPart, ServiceOrderLabor, ServiceQualityCheck, TechnicianAssignment | `/api/v1/service-requests`, `/service-orders` | ❌ |
| ۱۲ | **Financial** | ChartOfAccount, FiscalYear, FiscalPeriod, CostCenter, TaxCode, JournalEntry, JournalEntryLine, ARTransaction, ARAllocation, APTransaction, APAllocation, TaxRule, TaxCalculation, TaxPosting | `/api/v1/chart-of-accounts`, `/journal-entries`, `/trial-balance`, `/general-ledger`, `/reconciliation`, `/closing-validation`, `/tax/*`, `/fiscal-years`, `/fiscal-periods`, `/ar/*`, `/reports/*` | ❌ |
| ۱۳ | **Workflow** | WorkflowDefinition, WorkflowInstance, WorkflowHistory | `/api/v1/workflow/{definitions,instances}` | ❌ |
| ۱۴ | **Rule** | RuleSet, RuleDefinition, RuleExecution, RuleAuditStep | `/api/v1/rule-sets`, `/rules`, `/rules/evaluate` | ❌ |
| ۱۵ | **Notification** | NotificationTemplate, Notification, NotificationDelivery, NotificationPreference, NotificationQueue | `/api/v1/notifications`, `/notification/templates/*`, `/notification-preferences`, `/notification-queue/*` | ✅ `src/lib/modules/notification/` |
| ۱۶ | **Saga** | SagaDefinition, SagaInstance | (در `saga-manager.ts`) | ❌ (فقط فایل سرویس) |
| ۱۷ | **Integration** | — | `/api/v1/integration` | ❌ |
| ۱۸ | **Device Timeline** | — | `/api/v1/device-timeline/[instanceId]` | ❌ |

### ۱۰.۲ ساختار ماژول موجود (فقط ۳ از ۱۸ BC)

فقط ۳ دایرکتوری در `src/lib/modules/` وجود دارد:

```
src/lib/modules/
├── notification/
│   ├── services/
│   │   ├── notification-service.ts (882 lines)
│   │   ├── template-engine.ts (521 lines)
│   │   ├── preference-service.ts
│   │   ├── providers.ts (10 providers)
│   │   └── types.ts
│   └── (no contracts/, no repositories/)
├── product/
│   └── services/
│       └── product-query-service.ts
└── shared/  ← (این فقط alias برای src/lib/shared/ است، نه ماژول BC)
```

### ۱۰.۳ نقشه ارتباطی Bounded Context‌ها (Context Map)

```
                         ┌─────────────┐
                         │  Identity   │
                         │  (Laravel)  │
                         └──────┬──────┘
                                │ User/Session/Permission (DTO)
                                ▼
┌──────────────────────────────────────────────────────────┐
│                       Sales Context                       │
│  publishes: sales_order.{created,approved,cancelled}     │
└──────────┬───────────────────────────────────┬───────────┘
           │ sales_order.approved                │ sales_order.cancelled
           ▼                                    ▼
┌─────────────────────┐              ┌─────────────────────┐
│  Inventory Context  │              │  Inventory Context  │
│  (reserve/release)  │              │  (release)          │
│  publishes:          │              └─────────────────────┘
│   inventory.reserved │
│   stock_adjustment   │
└──────────┬───────────┘
           │ inventory.reserved
           ▼
┌──────────────────────────────────────────────────────────┐
│                     Fulfillment Context                   │
│  publishes: shipment.{created,shipped,delivered}         │
└──────┬───────────────────────────────┬───────────────────┘
       │ shipment.shipped               │ shipment.delivered
       ▼                                ▼
┌─────────────────────┐    ┌────────────────────────────────┐
│  Billing Context    │    │       Warranty Context         │
│  (create invoice)   │    │  (activate card — LAW-28)      │
│  publishes:          │    │  publishes: warranty.*        │
│   invoice.issued     │    └──────────┬─────────────────────┘
│   payment.received   │               │ warranty.claim.approved
│   credit_note.issued │               ▼
└──────┬───────────────┘    ┌────────────────────────────────┐
       │ invoice.issued,      │       Service Context        │
       │ payment.received,    │  (create ServiceRequest —     │
       │ credit_note.issued,  │   LAW-33 via event)          │
       │ refund.completed     │  publishes: service_order.*  │
       ▼                      └──────────┬─────────────────────┘
┌─────────────────────────────────────────┐                  │
│        Financial Context (LAW-19/34)    │                  │
│  consumes ALL billing/return events     │                  │
│  creates JournalEntry + AR/AP           │                  │
│  publishes: journal_entry.posted        │                  │
└─────────────────────────────────────────┘                  │
                                                              │
       ┌─────────────────────────────────────────────────────┘
       │ service_order.ready
       ▼
┌─────────────────────────────────────────┐
│       Notification Context              │
│  (LAW-55/56/57)                         │
│  consumes: any event with template      │
│  publishes: notification.*              │
└─────────────────────────────────────────┘
```

### ۱۰.۴ الگوی ارتباط Cross-Context (LAW-04, LAW-25)

- **ممنوع}: import مستقیم Repository یک Context از Context دیگر.
- **مجاز}: 
  - Domain Event (async) از طریق Outbox/Inbox.
  - Query Service (read) از طریق قرارداد در `contracts/`.
  - DTO در `contracts/dtos/`.

مثال واقعی (در کد):
- Product Context: `ProductQueryService` در `src/lib/modules/product/services/` برای خواندن محصول در Service Context.
- Inventory Context: هندلر `inventory-reservation-handler` در `event-handlers/index.ts` به `sales_order.approved` گوش می‌دهد (نه فراخوانی مستقیم Sales).

---

## ۱۱. مدل پایگاه داده

این بخش مدل پایگاه داده را بر اساس ۸۹ مدل واقعی Prisma مستند می‌کند.

### ۱۱.۱ آمار کلی

| شاخص | مقدار |
|------|-------|
| تعداد مدل‌ها | ۸۹ |
| تعداد جدول‌های زیرساختی (LAW-06..10) | ۴ (IdempotencyKey, OutboxMessage, ProcessedMessage, StockBalanceSnapshot) |
| تعداد مدل‌های tenant-scoped | ۸۵+ (همه به‌جز Permission) |
| تعداد ستون‌های tenantId | ۱۸۵+ ارجاع |
| تعداد ستون‌های version (Optimistic Lock) | ۳۰+ |
| تعداد ستون‌های deletedAt (Soft Delete) | ۶۰+ |
| تعداد BusinessCode‌های تعریف‌شده | ۲۹ (در `BusinessCodeGenerator`) |
| تعداد State Machine‌ها | ۲۰+ موجودیت با status enum |

### ۱۱.۲ مدل‌های زیرساختی

#### ۱۱.۲.۱ IdempotencyKey (LAW-06)

```prisma
model IdempotencyKey {
  id              String   @id @default(cuid())
  tenantId        String
  key             String   // Idempotency-Key header (UUID)
  endpoint        String   // e.g. "POST /api/v1/inventory-transactions"
  requestHash     String   // SHA-256 of body
  responseBody    String   // cached response (JSON)
  responseStatus  Int
  responseHeaders Json?
  expiresAt       DateTime // 24h after creation
  createdAt       DateTime @default(now())

  @@unique([tenantId, key])
  @@index([expiresAt])
}
```

#### ۱۱.۲.۲ OutboxMessage (LAW-08)

```prisma
model OutboxMessage {
  id            String    @id @default(cuid())
  tenantId      String
  aggregateType String
  aggregateId   String
  eventType     String
  eventVersion  String    @default("1.0")
  payload       Json
  actorId       String?
  occurredAt    DateTime  @default(now())
  publishedAt   DateTime?
  attempts      Int       @default(0)
  nextRetryAt   DateTime?
  status        String    @default("pending") // pending|published|failed|dead_letter
  errorMessage  String?
  createdAt     DateTime  @default(now())

  @@index([status, nextRetryAt])
  @@index([tenantId, occurredAt])
}
```

#### ۱۱.۲.۳ ProcessedMessage (LAW-09)

```prisma
model ProcessedMessage {
  id          String   @id @default(cuid())
  tenantId    String
  messageId   String   // Outbox id
  consumerId  String   // consumer identifier
  payloadHash String?
  processedAt DateTime @default(now())

  @@unique([messageId, consumerId])   // exactly-once
  @@index([tenantId, processedAt])
}
```

#### ۱۱.۲.۴ StockBalanceSnapshot (LAW-10)

```prisma
model StockBalanceSnapshot {
  id                String   @id @default(cuid())
  tenantId          String
  stockItemId       String
  onHandQuantity    Float
  reservedQuantity  Float
  lastTransactionId String?
  snapshotAt        DateTime @default(now())
  snapshotType      String   // nightly|threshold|manual

  @@index([stockItemId, snapshotAt])
}
```

### ۱۱.۳ مدل‌های Identity

| مدل | فیلدهای کلیدی | ایندکس‌ها | نکات |
|-----|---------------|-----------|------|
| **Tenant** | id, name, slug (unique), defaultLocale='fa-IR', defaultTz='Asia/Tehran', metadata | slug unique | ریشه چندمستاجری |
| **User** | id, tenantId, username, displayName, email?, phone?, userType, status, locale, isActive, lockedUntil, lastLoginAt, metadata | (tenantId, username) unique | ⚠️ نبود password hash |
| **Role** | id, tenantId, key, name, isSystem | (tenantId, key) unique | ⚠️ نبود user_roles |
| **Permission** | id, key (unique), module, action, isSystem | key unique | ⚠️ نبود role_permissions |
| **Session** | id, userId, tenantId, status, ipAddress, userAgent?, deviceFingerprint?, issuedAt, lastActivityAt, expiresAt, absoluteExpiresAt, revokedAt?, revokedReason? | (userId, status) | ⚠️ نبود token |

### ۱۱.۴ مدل‌های Organization

| مدل | فیلدهای کلیدی |
|-----|---------------|
| **Branch** | id, tenantId, name, code, parentId?, address?, contactPhone?, isActive |

### ۱۱.۵ مدل‌های Party

| مدل | فیلدهای کلیدی |
|-----|---------------|
| **Party** | id, tenantId, businessCode (LAW-02), partyType (person\|organization), displayName, status, taxId?, registrationNo?, metadata |

### ۱۱.۶ مدل‌های Product (۵ مدل)

| مدل | فیلدهای کلیدی | ایندکس‌ها |
|-----|---------------|-----------|
| **ProductCategory** | id, tenantId, name, code, parentId?, level, path?, attributes (JSON), isActive | (tenantId, code) unique, parentId |
| **ProductBrand** | id, tenantId, name, nameEn?, code, manufacturerPartyId?, logoFileId?, description?, isActive | (tenantId, code) unique |
| **ProductModel** | id, tenantId, brandId, categoryId, name, modelCode, warrantyMonths (default 12), isSerialized (default true), attributes, status | (tenantId, modelCode) unique |
| **Product** | id, tenantId, modelId, sku, name, productType (serialized\|batch\|bulk), barcodeValue?, unitOfMeasure, weightGrams?, dimensions?, attributes, status | (tenantId, sku) unique |
| **ProductInstance** | id, tenantId, productId, serialNumber, qrCode?, status, condition, manufactureDate?, importDate?, warrantyStart?, warrantyEnd?, currentWarehouseId?, currentLocationId?, currentOwnerPartyId?, supplierPartyId?, importBatch?, attributes (IMEI, MAC) | (tenantId, serialNumber) unique |

### ۱۱.۷ مدل‌های Inventory (۱۲ مدل)

| مدل | فیلدهای کلیدی | نکات |
|-----|---------------|------|
| **Warehouse** | id, tenantId, code, name, warehouseType (main\|branch\|service_center\|transit\|return), branchId?, serviceCenterId?, partyId?, address?, isActive, isDefault, capacityCubic?, version | LAW-07 |
| **WarehouseZone** | id, tenantId, warehouseId, code, name, zoneType (receiving\|storage\|shipping\|returns\|quarantine), isActive | |
| **Location** | id, tenantId, warehouseId, zoneId?, parentId?, locationType (zone\|aisle\|rack\|bin\|shelf), code, name?, fullPath, level, isActive, isPickable, capacity? | tree structure |
| **Bin** | id, tenantId, locationId (unique), warehouseId, barcode?, capacityUnits?, currentUnits, isMixed | 1:1 با Location |
| **StockItem** | id, tenantId, warehouseId, locationId?, binId?, productId, productInstanceId?, batchNumber?, reservedQuantity (default 0), status (available\|damaged\|quarantine\|expired), receivedDate?, expiryDate?, version | ⚠️ NO on_hand_quantity (LAW-05) |
| **InventoryTransaction** | id, tenantId, transactionNumber, transactionType (IN\|OUT\|TRANSFER\|ADJUSTMENT\|RESERVATION\|RELEASE\|COUNT), stockItemId, productId, productInstanceId?, fromWarehouseId?, fromLocationId?, toWarehouseId?, toLocationId?, batchNumber?, quantity (مثبت IN، منفی OUT), unitCost?, reason?, referenceType?, referenceId?, performedBy?, occurredAt, metadata | append-only ledger |
| **StockBalance** | id, tenantId, stockItemId (unique), onHandQuantity, reservedQuantity, availableQuantity, lastTransactionId?, snapshotAt, updatedAt | snapshot از ledger |
| **StockReservation** | id, tenantId, reservationNumber, stockItemId, productId, productInstanceId?, warehouseId, reservedQuantity, reservationType (sales_order\|service_request\|transfer\|manual), referenceType?, referenceId?, reservedBy?, reservedForPartyId?, reservedAt, expiresAt, releasedAt?, releasedBy?, releaseReason?, consumedAt?, status (active\|released\|consumed\|expired), version | LAW-07 |
| **StockTransfer** | id, tenantId, transferNumber, transferType (warehouse\|zone\|bin), fromWarehouseId, toWarehouseId?, fromLocationId?, toLocationId?, fromBinId?, toBinId?, status (draft\|in_transit\|received\|partial\|cancelled), transferDate, expectedArrival?, actualArrival?, shippedBy?, receivedBy?, transporterPartyId?, notes?, version | LAW-07 |
| **StockTransferLine** | id, tenantId, transferId, stockItemId, productId, productInstanceId?, batchNumber?, quantity, quantityReceived (default 0), unitCost?, fromLocationId?, toLocationId?, notes? | |
| **CycleCount** | id, tenantId, countNumber, warehouseId, countType (full\|cycle\|spot), status (draft\|in_progress\|completed\|approved\|adjusted\|cancelled), scheduledDate, startedAt?, completedAt?, approvedAt?, approvedBy?, adjustedAt?, countedBy?, reconciledBy?, notes?, version | LAW-07 |
| **CycleCountLine** | id, tenantId, cycleCountId, stockItemId, productId, productInstanceId?, batchNumber?, warehouseId, locationId?, systemQuantity, countedQuantity?, isReconciled, varianceReason?, notes?, countedAt? | (cycleCountId, stockItemId) unique |

### ۱۱.۸ مدل‌های Sales (۶ مدل)

| مدل | فیلدهای کلیدی |
|-----|---------------|
| **SalesOrder** | id, tenantId, orderNumber, customerPartyId, salesRepPartyId?, branchId?, orderDate, expectedDelivery?, actualDelivery?, status, paymentStatus, subtotal, discountAmount, taxAmount, shippingAmount, totalAmount, currencyCode='IRR', notes?, metadata?, version |
| **SalesOrderLine** | id, tenantId, salesOrderId, lineNumber, productId, productInstanceId?, quantityOrdered, quantityReserved, quantityShipped, quantityReturned, unitPrice, discountPercent, discountAmount, taxPercent, taxAmount, lineTotal, notes? |
| **PriceList** | id, tenantId, listCode, name, priceType (retail\|wholesale\|dealer\|special), validFrom, validTo?, isActive, currencyCode, version |
| **PriceListLine** | id, tenantId, priceListId, productId, unitPrice, minQuantity, discountPercent, validFrom |
| **Quote** | id, tenantId, quoteNumber, customerPartyId, salesRepPartyId?, quoteDate, validUntil, status, subtotal, discountAmount, taxAmount, totalAmount, currencyCode, customerApprovedAt?, convertedSalesOrderId?, version |
| **QuoteLine** | id, tenantId, quoteId, lineNumber, productId, productInstanceId?, quantity, unitPrice, discountPercent, discountAmount, taxPercent, taxAmount, lineTotal |

### ۱۱.۹ مدل‌های Fulfillment (۴ مدل)

| مدل | فیلدهای کلیدی |
|-----|---------------|
| **Shipment** | id, tenantId, shipmentNumber, salesOrderId?, customerPartyId, fromWarehouseId, toPartyId, status, shipmentDate, expectedArrival?, actualArrival?, shippedAt?, deliveredAt?, shippingMethod?, transporterPartyId?, trackingNumber?, shippingCost, currencyCode, version |
| **ShipmentLine** | id, tenantId, shipmentId, salesOrderLineId?, lineNumber, productId, productInstanceId?, quantity, quantityPicked, quantityPacked, quantityShipped, quantityDelivered, quantityReturned, fromLocationId?, toLocationId?, batchNumber? |
| **PickList** | id, tenantId, pickListNumber, shipmentId (unique), warehouseId, status (pending\|in_progress\|completed\|cancelled), assignedTo?, startedAt?, completedAt?, version |
| **PickListLine** | id, tenantId, pickListId, shipmentLineId, productId, productInstanceId?, locationId?, quantityToPick, quantityPicked, isPicked, pickedAt? |

### ۱۱.۱۰ مدل‌های Billing (۶ مدل)

| مدل | فیلدهای کلیدی |
|-----|---------------|
| **Invoice** | id, tenantId, invoiceNumber, salesOrderId?, customerPartyId, invoiceDate, dueDate?, status, subtotal, discountAmount, taxAmount, shippingAmount, totalAmount, paidAmount, currencyCode, taxInvoiceNumber?, issuedAt?, cancelledAt?, reversedAt?, version |
| **InvoiceLine** | id, tenantId, invoiceId, salesOrderLineId?, lineNumber, productId, productInstanceId?, quantity, unitPrice, discountAmount, taxAmount, lineTotal |
| **Payment** | id, tenantId, paymentNumber, customerPartyId, paymentDate, amount, currencyCode, paymentMethod (cash\|bank_transfer\|check\|credit_card\|pos\|online\|wallet), status, referenceNumber?, bankAccount?, depositedAt?, version |
| **PaymentAllocation** | id, tenantId, paymentId, invoiceId, allocatedAmount, allocatedAt, allocatedBy?, notes? |
| **CreditNote** | id, tenantId, creditNoteNumber, invoiceId, customerPartyId, creditNoteDate, status, subtotal, taxAmount, totalAmount, currencyCode, reason?, issuedAt?, appliedAt?, version |
| **CreditNoteLine** | id, tenantId, creditNoteId, lineNumber, invoiceLineId?, productId, productInstanceId?, quantity, unitPrice, discountAmount, taxAmount, lineTotal |

### ۱۱.۱۱ مدل‌های Returns (۳ مدل)

| مدل | فیلدهای کلیدی |
|-----|---------------|
| **ReturnOrder** | id, tenantId, returnNumber, salesOrderId?, invoiceId?, customerPartyId, returnType (refund\|replacement\|return_only), status, returnDate, approvedAt?, approvedBy?, receivedAt?, receivedBy?, closedAt?, refundAmount, currencyCode, reason?, replacementSalesOrderId?, version |
| **ReturnOrderLine** | id, tenantId, returnOrderId, lineNumber, productId, productInstanceId?, quantityReturned, unitPrice, lineTotal, returnReason?, inspectedCondition?, inspectionNotes?, inspectedBy?, inspectedAt?, isInspected |
| **Refund** | id, tenantId, refundNumber, returnOrderId, customerPartyId, refundDate, amount, currencyCode, refundMethod, status, referenceNumber?, approvedAt?, approvedBy?, completedAt?, version |

### ۱۱.۱۲ مدل‌های Warranty (۵ مدل)

| مدل | فیلدهای کلیدی |
|-----|---------------|
| **WarrantyPolicy** | id, tenantId, productModelId?, policyName, warrantyType (standard\|extended\|commercial\|lifetime), warrantyMonths (default 12), graceDays (default 0), isRenewable, coverageTerms (JSON), exclusions (JSON), validFrom, validTo?, isActive, version |
| **WarrantyCard** | id, tenantId, warrantyNumber, productInstanceId, customerPartyId, warrantyPolicyId, salesOrderId?, shipmentId?, activationDate?, startDate?, endDate?, graceEndDate?, status (pending\|active\|expired\|voided\|transferred), extendedMonths (default 0), version |
| **WarrantyClaim** | id, tenantId, claimNumber, warrantyCardId, productInstanceId, customerPartyId, claimType (defect\|damage\|malfunction\|doa\|other), claimDate, description, defectDescription?, status, defectType?, defectSeverity?, isCovered?, inspectionNotes?, inspectedBy?, inspectedAt?, isInspected, approvedAt?, approvedBy?, approvalNotes?, rejectedAt?, rejectedBy?, rejectionReason?, serviceOrderId?, resolvedAt?, resolutionNotes?, estimatedCost?, actualCost?, version |
| **WarrantyExtension** | id, tenantId, extensionNumber, warrantyCardId, extensionType (free\|paid\|promotional), extensionMonths, newEndDate, amountPaid, currencyCode, paymentId?, activationDate, notes? |
| **WarrantyTransfer** | id, tenantId, transferNumber, warrantyCardId, productInstanceId, fromPartyId, toPartyId, transferDate, reason?, transferFee, currencyCode, approvalStatus (pending\|approved\|rejected), approvedBy?, approvedAt? |

### ۱۱.۱۳ مدل‌های Service (۸ مدل)

| مدل | فیلدهای کلیدی |
|-----|---------------|
| **ServiceRequest** | id, tenantId, requestNumber, customerPartyId, productInstanceId?, warrantyCardId?, warrantyClaimId?, serviceCenterId?, serviceKind (warranty\|out_of_warranty\|paid\|recall), priority (low\|normal\|high\|urgent\|critical), status, customerProblem, customerDescription?, deviceInfo?, reportedDefect?, estimatedCompletion?, actualCompletion?, customerConsent, serviceOrderId?, version |
| **ServiceOrder** | id, tenantId, orderNumber, serviceRequestId?, customerPartyId, productInstanceId?, warrantyCardId?, warrantyClaimId?, serviceCenterId?, assignedTechnicianId?, serviceKind, status, createdDate, diagnosisDate?, repairStartDate?, repairCompleteDate?, qcDate?, readyDate?, deliveredDate?, closedDate?, laborCost, partsCost, otherCost, discountAmount, taxAmount, totalCost, paidAmount, currencyCode, version |
| **ServiceOrderLine** | id, tenantId, serviceOrderId, lineNumber, taskDescription, taskType? (diagnosis\|repair\|replacement\|testing), estimatedHours?, actualHours?, completedAt?, isCompleted |
| **ServiceDiagnosis** | id, tenantId, serviceOrderId, technicianPartyId, diagnosisDate, symptom, rootCause?, recommendedAction?, estimatedHours?, estimatedPartsCost?, confidenceLevel? (low\|medium\|high) |
| **ServiceOrderPart** | id, tenantId, serviceOrderId, productId, productInstanceId?, fromWarehouseId?, fromLocationId?, quantityUsed, unitCost, totalCost, isWarrantyCovered, isReturnedPart, returnedToWarehouseId?, usedAt |
| **ServiceOrderLabor** | id, tenantId, serviceOrderId, technicianPartyId, laborType (diagnosis\|repair\|testing\|other), hours, hourlyRate, totalCost, isWarrantyCovered, startedAt?, endedAt? |
| **ServiceQualityCheck** | id, tenantId, qcNumber, serviceOrderId, inspectorPartyId?, inspectionDate, result (pass\|fail\|conditional), checklist (JSON), defectsFound?, reworkRequired, reworkNotes?, approvedAt?, approvedBy?, version |
| **TechnicianAssignment** | id, tenantId, technicianPartyId, serviceOrderId?, serviceCenterId?, assignmentType (primary\|secondary\|supervisor), status (active\|completed\|reassigned\|cancelled), assignedAt, assignedBy?, startTime?, endTime? |

### ۱۱.۱۴ مدل‌های Financial (۱۴ مدل)

| مدل | فیلدهای کلیدی |
|-----|---------------|
| **ChartOfAccount** | id, tenantId, accountCode, accountName, accountNameEn?, accountType (asset\|liability\|equity\|revenue\|expense), parentAccountId?, level, isPostable, isControlAccount, isActive, openingBalance, currencyCode, version |
| **FiscalYear** | id, tenantId, yearCode (مثلاً '1403'), name, startDate, endDate, status (open\|closed), closedAt?, closedBy? |
| **FiscalPeriod** | id, tenantId, fiscalYearId, periodCode (مثلاً '1403-Q1'), name, periodType (month\|quarter\|year), startDate, endDate, status (open\|temporarily_closed\|closed), closedAt?, closedBy? |
| **CostCenter** | id, tenantId, code, name, parentId?, level, isActive |
| **TaxCode** | id, tenantId, code, taxType (vat\|sales_tax\|withholding\|exempt), name, ratePercent, inputAccountId?, outputAccountId?, isRecoverable, isDefault, isActive, validFrom, validTo? |
| **JournalEntry** | id, tenantId, entryNumber, entryDate, fiscalPeriodId?, description, sourceType?, sourceId?, status (draft\|posted\|reversed), totalDebit, totalCredit, reversedById?, reversedAt?, reversalReason?, postedAt?, postedBy?, version |
| **JournalEntryLine** | id, tenantId, journalEntryId, lineNumber, accountId, costCenterId?, partyId?, debitAmount, creditAmount, description?, referenceType?, referenceId? |
| **ARTransaction** | id, tenantId, customerPartyId, transactionType (invoice\|payment\|credit_note\|refund\|opening), referenceType, referenceId, entryDate, amount, openAmount, status (open\|partially_allocated\|fully_allocated), version |
| **ARAllocation** | id, tenantId, customerPartyId, debitTransactionId, creditTransactionId, allocatedAmount (negative = reversal), allocationDate, allocatedBy?, reversalOfId? |
| **APTransaction** | id, tenantId, vendorPartyId, transactionType (vendor_bill\|payment\|credit\|opening), referenceType, referenceId, entryDate, amount, openAmount, status, version |
| **APAllocation** | id, tenantId, vendorPartyId, debitTransactionId, creditTransactionId, allocatedAmount, allocationDate, allocatedBy?, reversalOfId? |
| **TaxRule** | id, tenantId, taxCodeId, name, productCategoryId?, customerGroupId?, regionId?, effectiveFrom, effectiveTo?, priority (default 100), formula (default 'rate * taxableAmount'), rateOverride?, isReverseCharge, isActive, version |
| **TaxCalculation** | id, tenantId, documentType, documentId, taxCodeId, taxRuleId, taxableAmount, taxRate (snapshot), taxAmount, currencyCode, calculationDate, snapshot (JSON) |
| **TaxPosting** | id, tenantId, journalEntryId, taxCalculationId, postedAt |

### ۱۱.۱۵ مدل‌های Workflow (۳ مدل)

| مدل | فیلدهای کلیدی |
|-----|---------------|
| **WorkflowDefinition** | id, tenantId, key, name, entityType, version, isActive, publishedAt?, description?, states (JSON), transitions (JSON), metadata? |
| **WorkflowInstance** | id, tenantId, definitionId, definitionKey, definitionVersion, entityType, entityId, currentStateKey, status (running\|completed\|cancelled), startedBy?, startedAt, completedAt?, cancelledAt?, cancelledBy?, cancelReason?, version |
| **WorkflowHistory** | id, tenantId, instanceId, fromState?, toState, transitionKey?, changedBy?, changedAt, reason?, metadata? |

### ۱۱.۱۶ مدل‌های Rule (۴ مدل)

| مدل | فیلدهای کلیدی |
|-----|---------------|
| **RuleSet** | id, tenantId, code, name, context, status (draft\|published\|disabled), version, priority (default 100), effectiveFrom, effectiveTo?, publishedAt?, description? |
| **RuleDefinition** | id, tenantId, ruleSetId, name, description?, conditionDsl (JSON), actionDsl (JSON), priority (default 100), enabled, version |
| **RuleExecution** | id, tenantId, ruleDefinitionId?, ruleSetCode, ruleSetVersion, workflowInstanceId?, eventType, inputSnapshot (JSON), result (allow\|deny\|requireApproval\|notify\|escalate), actions (JSON), matchedRules (JSON), executionTime (ms) |
| **RuleAuditStep** | id, executionId, stepNumber, ruleName?, expression, result (true\|false\|error), duration (ms), notes? |

### ۱۱.۱۷ مدل‌های Notification (۵ مدل)

| مدل | فیلدهای کلیدی |
|-----|---------------|
| **NotificationTemplate** | id, tenantId, code, name, version, language (default 'fa'), channel (email\|sms\|whatsapp\|push\|inapp), subjectTemplate?, bodyTemplate, variablesSchema?, status (draft\|published\|disabled), effectiveFrom, effectiveTo?, publishedAt? |
| **Notification** | id, tenantId, templateId, templateCode, templateVersion, language, recipientId?, recipientName?, recipientAddress, channel, status (pending\|queued\|sending\|sent\|failed\|retrying\|cancelled), payload (JSON), renderedSubject?, renderedBody, messageId?, idempotencyKey, errorCode?, errorMessage?, createdAt, queuedAt?, sentAt?, failedAt?, cancelledAt?, cancelledBy?, cancelReason?, version |
| **NotificationDelivery** | id, tenantId, notificationId, provider (smtp\|ses\|sendgrid\|kavenegar\|melipayamak\|twilio\|evolution\|meta_cloud\|firebase\|inapp_db\|inapp_ws), attempt, status (sending\|sent\|failed), response (JSON), durationMs, errorMessage? |
| **NotificationPreference** | id, tenantId, userId, emailEnabled, smsEnabled, pushEnabled, whatsappEnabled, inappEnabled, language (default 'fa'), quietHoursStart?, quietHoursEnd? |
| **NotificationQueue** | id, tenantId, notificationId, priority (default 100), attempt (default 0), maxAttempts (default 5), nextRetryAt, inDeadLetter, deadLetterAt?, deadLetterReason?, lockedBy?, lockedAt? |

### ۱۱.۱۸ مدل‌های Saga (۲ مدل)

| مدل | فیلدهای کلیدی |
|-----|---------------|
| **SagaDefinition** | id, tenantId, key, name, description?, steps (JSON), isActive, version |
| **SagaInstance** | id, tenantId, sagaDefinitionKey, correlationId, status (pending\|running\|completed\|failed\|compensating\|compensated), currentStep (default 0), totalSteps (default 0), payload (JSON), errorMessage?, startedAt?, completedAt? |

### ۱۱.۱۹ مدل‌های System

| مدل | فیلدهای کلیدی |
|-----|---------------|
| **BusinessCodeSequence** | id, tenantId, module, prefix, fiscalYear, lastValue (default 0), lastGeneratedAt? | (tenantId, module, prefix, fiscalYear) unique |

---

## ۱۲. قرارداد API

این بخش تمام ۱۱۸ مسیر API را به‌تفکیک دامنه فهرست می‌کند. همه مسیرها از پیشوند `/api/v1/` برخوردارند.

### ۱۲.۱ Identity & Organization (نبود در sandbox)

⚠️ **نقص بحرانی}: هیچ مسیر `/api/v1/auth/*` یا `/api/v1/users/*` در sandbox وجود ندارد. این مسیرها باید در Laravel پیاده‌سازی شوند.

### ۱۲.۲ Party

| متد | مسیر | توضیح | وضعیت |
|-----|------|-------|-------|
| GET | `/parties` | لیست اشخاص | ❌ (در page.tsx فقط) |
| POST | `/parties` | ایجاد شخص | ❌ |
| GET | `/parties/{id}` | جزئیات | ❌ |
| PATCH | `/parties/{id}` | بروزرسانی | ❌ |
| DELETE | `/parties/{id}` | حذف نرم | ❌ |

⚠️ **نقص}: مسیرهای Party در sandbox پیاده‌سازی نشده‌اند.

### ۱۲.۳ Product

| متد | مسیر | توضیح |
|-----|------|-------|
| GET | `/product-categories` | لیست دسته‌بندی‌ها |
| POST | `/product-categories` | ایجاد |
| GET | `/product-categories/{id}` | جزئیات |
| PATCH | `/product-categories/{id}` | بروزرسانی |
| GET | `/product-brands` | لیست برندها |
| POST | `/product-brands` | ایجاد |
| GET | `/product-brands/{id}` | جزئیات |
| PATCH | `/product-brands/{id}` | بروزرسانی |
| GET | `/product-models` | لیست مدل‌ها |
| POST | `/product-models` | ایجاد |
| GET | `/products` | لیست محصولات |
| POST | `/products` | ایجاد |

### ۱۲.۴ Inventory

| متد | مسیر | توضیح |
|-----|------|-------|
| GET | `/warehouses` | لیست انبارها |
| POST | `/warehouses` | ایجاد |
| GET | `/warehouses/{id}` | جزئیات |
| PATCH | `/warehouses/{id}` | بروزرسانی |
| GET | `/warehouses/{id}/zones` | لیست زون‌ها |
| GET | `/stock-items` | لیست اقلام موجودی |
| GET | `/stock-items/{id}/balance` | موجودی فعلی (از ledger) |
| POST | `/inventory-transactions` | ثبت تراکنش انبار (IN/OUT/TRANSFER/ADJUSTMENT) |
| GET | `/inventory-transactions` | لیست تراکنش‌ها |
| GET | `/movements` | لیست حرکت‌ها |
| POST | `/stock-reservations` | ایجاد رزرو |
| GET | `/stock-reservations` | لیست رزروها |
| POST | `/stock-reservations/{id}/release` | آزادسازی رزرو |
| POST | `/stock-transfers` | ایجاد انتقال |
| GET | `/stock-transfers` | لیست انتقال‌ها |
| GET | `/stock-transfers/{id}` | جزئیات |
| POST | `/stock-transfers/{id}/ship` | شروع انتقال |
| POST | `/stock-transfers/{id}/receive` | دریافت انتقال |
| POST | `/cycle-counts` | ایجاد شمارش |
| GET | `/cycle-counts` | لیست |
| GET | `/cycle-counts/{id}` | جزئیات |
| POST | `/cycle-counts/{id}/start` | شروع |
| POST | `/cycle-counts/{id}/complete` | تکمیل |
| POST | `/cycle-counts/{id}/approve` | تأیید |

### ۱۲.۵ Sales

| متد | مسیر | توضیح |
|-----|------|-------|
| GET | `/sales-orders` | لیست سفارش‌ها |
| POST | `/sales-orders` | ایجاد سفارش |
| GET | `/sales-orders/{id}` | جزئیات |
| POST | `/sales-orders/{id}/approve` | تأیید |
| POST | `/sales-orders/{id}/cancel` | لغو (با compensation) |

### ۱۲.۶ Fulfillment

| متد | مسیر | توضیح |
|-----|------|-------|
| GET | `/shipments` | لیست محموله‌ها |
| POST | `/shipments` | ایجاد |
| GET | `/shipments/{id}` | جزئیات |
| POST | `/shipments/{id}/pick` | شروع pick |
| POST | `/shipments/{id}/pack` | شروع pack |
| POST | `/shipments/{id}/ship` | **LAW-16: ایجاد OUT ledger** |
| POST | `/shipments/{id}/deliver` | تحویل → فعال‌سازی گارانتی |
| GET | `/shipments/{id}/tracking` | ردابی |

### ۱۲.۷ Billing

| متد | مسیر | توضیح |
|-----|------|-------|
| GET | `/invoices` | لیست فاکتورها |
| POST | `/invoices` | ایجاد |
| GET | `/invoices/{id}` | جزئیات |
| POST | `/invoices/{id}/issue` | **LAW-21: issue → immutable** |
| POST | `/invoices/{id}/cancel` | لغو |
| POST | `/invoices/{id}/credit-note` | ایجاد CreditNote |
| GET | `/payments` | لیست پرداخت‌ها |
| POST | `/payments` | ایجاد |
| POST | `/payments/{id}/allocate` | **LAW-20: تخصیص** |

### ۱۲.۸ Returns

| متد | مسیر | توضیح |
|-----|------|-------|
| GET | `/return-orders` | لیست مرجوعی‌ها |
| POST | `/return-orders` | ایجاد |
| GET | `/return-orders/{id}` | جزئیات |
| POST | `/return-orders/{id}/approve` | تأیید |
| POST | `/return-orders/{id}/receive` | دریافت (با inspection) |
| POST | `/return-orders/{id}/create-replacement` | ایجاد سفارش جایگزین (LAW-24) |
| POST | `/return-orders/{id}/close` | بستن |
| GET | `/refunds` | لیست بازپرداخت‌ها |
| POST | `/refunds` | ایجاد |
| POST | `/refunds/{id}/approve` | تأیید |

### ۱۲.۹ Warranty

| متد | مسیر | توضیح |
|-----|------|-------|
| GET | `/warranty-cards` | لیست کارت‌ها |
| POST | `/warranty-cards` | ایجاد (status='pending') |
| GET | `/warranty-cards/{id}` | جزئیات |
| POST | `/warranty-cards/{id}/activate` | فعال‌سازی (دستی یا از رویداد) |
| GET | `/warranty-claims` | لیست شکایت‌ها |
| POST | `/warranty-claims` | ایجاد |
| POST | `/warranty-claims/{id}/inspect` | **LAW-29: بازرسی قبل از تأیید** |
| POST | `/warranty-claims/{id}/approve` | تأیید → ایجاد ServiceRequest (LAW-33) |

### ۱۲.۱۰ Service

| متد | مسیر | توضیح |
|-----|------|-------|
| GET | `/service-requests` | لیست درخواست‌ها |
| POST | `/service-requests` | ایجاد |
| POST | `/service-requests/{id}/create-order` | ایجاد سفارش تعمیر |
| GET | `/service-orders` | لیست سفارش‌ها |
| POST | `/service-orders` | ایجاد |
| POST | `/service-orders/{id}/diagnose` | تشخیص |
| POST | `/service-orders/{id}/consume-part` | **LAW-31: مصرف قطعه → ledger** |
| POST | `/service-orders/{id}/ready` | آماده تحویل (پس از QC) |
| POST | `/service-orders/{id}/qc` | **LAW-32: کنترل کیفیت** |

### ۱۲.۱۱ Financial

| متد | مسیر | توضیح |
|-----|------|-------|
| GET | `/chart-of-accounts` | لیست حساب‌ها |
| POST | `/chart-of-accounts` | ایجاد |
| GET | `/journal-entries` | لیست اسناد |
| POST | `/journal-entries` | ایجاد (LAW-35: balance) |
| GET | `/journal-entries/{id}` | جزئیات |
| POST | `/journal-entries/{id}/reverse` | معکوس‌سازی (LAW-41) |
| GET | `/trial-balance` | تراز آزمایشی |
| GET | `/general-ledger` | دفتر کل |
| GET | `/reconciliation` | مغایرت‌گیری |
| GET | `/closing-validation` | اعتبارسنجی بستن |
| POST | `/opening-balances` | موجودی اول دوره |
| GET | `/fiscal-years` | لیست سال‌های مالی |
| POST | `/fiscal-years` | ایجاد |
| POST | `/fiscal-years/{id}/close` | بستن سال |
| GET | `/fiscal-periods` | لیست دوره‌ها |
| POST | `/fiscal-periods` | ایجاد |
| POST | `/fiscal-periods/{id}/soft-close` | بستن نرم |
| POST | `/fiscal-periods/{id}/hard-close` | **LAW-36: بستن سخت (غیرقابل بازگشت)** |
| GET | `/tax-rules` | لیست قوانین مالیاتی |
| POST | `/tax-rules` | ایجاد |
| POST | `/tax/calculate` | محاسبه مالیات (LAW-43) |
| POST | `/tax/post` | ثبت مالیات (LAW-44) |
| GET | `/tax/reports/vat` | گزارش ارزش افزوده |
| GET | `/ar/customers` | لیست مشتریان AR |
| GET | `/ar/customers/{id}/statement` | صورتحساب |
| GET | `/ar/customers/{id}/aging` | سن بدهی |
| POST | `/ar/allocate` | تخصیص AR |
| POST | `/ar/unallocate` | لغو تخصیص (LAW-41) |

### ۱۲.۱۲ Reports

| متد | مسیر | توضیح |
|-----|------|-------|
| GET | `/reports/dashboard` | KPI های مالی |
| GET | `/reports/balance-sheet` | ترازنامه |
| GET | `/reports/profit-loss` | صورت سود و زیان |
| GET | `/reports/cash-flow` | صورت جریان وجوه نقد |
| GET | `/reports/equity` | صورت تغییرات سرمایه |
| GET | `/reports/final-trial-balance` | تراز نهایی |

### ۱۲.۱۳ Workflow

| متد | مسیر | توضیح |
|-----|------|-------|
| GET | `/workflow/definitions` | لیست تعاریف |
| POST | `/workflow/definitions` | ایجاد |
| POST | `/workflow/definitions/{id}/publish` | انتشار |
| GET | `/workflow/instances` | لیست نمونه‌ها |
| POST | `/workflow/instances` | ایجاد |
| GET | `/workflow/instances/{id}` | جزئیات |
| POST | `/workflow/instances/{id}/transition` | **LAW-49: انتقال وضعیت** |

### ۱۲.۱۴ Rule Engine

| متد | مسیر | توضیح |
|-----|------|-------|
| GET | `/rule-sets` | لیست RuleSet‌ها |
| POST | `/rule-sets` | ایجاد |
| POST | `/rule-sets/{id}/publish` | انتشار |
| GET | `/rules` | لیست Rule‌ها |
| POST | `/rules` | ایجاد |
| POST | `/rules/evaluate` | ارزیابی (LAW-52/53/54) |

### ۱۲.۱۵ Notification

| متد | مسیر | توضیح |
|-----|------|-------|
| GET | `/notification/templates` | لیست قالب‌ها |
| POST | `/notification/templates` | ایجاد |
| GET | `/notification/templates/{id}` | جزئیات |
| PATCH | `/notification/templates/{id}` | بروزرسانی |
| POST | `/notification/templates/{id}/publish` | انتشار |
| GET | `/notification/templates/{id}/versions` | نسخه‌ها |
| POST | `/notification/templates/{id}/preview` | پیش‌نمایش |
| POST | `/notification/templates/seed-defaults` | seed قالب‌های پیش‌فرض |
| GET | `/notifications` | لیست اعلان‌ها |
| POST | `/notifications/send` | ارسال (LAW-55/57) |
| GET | `/notifications/{id}` | جزئیات |
| POST | `/notifications/{id}/retry` | retry دستی |
| POST | `/notifications/{id}/cancel` | لغو |
| GET | `/notifications/stats` | آمار |
| GET | `/notification-preferences` | لیست ترجیحات |
| GET | `/notification-preferences/{userId}` | جزئیات |
| PATCH | `/notification-preferences/{userId}` | بروزرسانی |
| GET | `/notification-queue` | لیست صف |
| POST | `/notification-queue/process` | پردازش صف |

### ۱۲.۱۶ Device Timeline

| متد | مسیر | توضیح |
|-----|------|-------|
| GET | `/device-timeline/{instanceId}` | خط زمانی دستگاه (LAW-30) |

### ۱۲.۱۷ Integration & System

| متد | مسیر | توضیح |
|-----|------|-------|
| GET | `/integration` | وضعیت یکپارچه‌سازی |
| GET | `/system/health` | سلامت سیستم |

### ۱۲.۱۸ الگوی کلی پاسخ API

#### موفقیت

```json
{
  "data": { ... } | [ ... ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 100,
    "last_page": 5
  }
}
```

#### خطا (RFC 7807 Problem Details)

```json
{
  "type": "https://docs.bismark.api/errors/validation_error",
  "title": "VALIDATION_ERROR",
  "status": 400,
  "detail": "Customer is required",
  "code": "VALIDATION_ERROR",
  "correlation_id": "uuid",
  "timestamp": "ISO-8601",
  "errors": [
    { "field": "customerPartyId", "message": "Required", "code": "REQUIRED" }
  ]
}
```

### ۱۲.۱۹ هدرهای مشترک

| هدر | توضیح | وضعیت |
|------|-------|-------|
| `Authorization: Bearer <JWT>` | احراز هویت | ❌ NOT IMPLEMENTED |
| `Idempotency-Key: <UUID>` | idempotency (LAW-06) | ✅ |
| `If-Match: <version>` | Optimistic Lock (LAW-07) | ✅ (در برخی مسیرها) |
| `Accept-Language: fa` | i18n | ❌ NOT IMPLEMENTED |
| `X-Tenant-Id: <tenantId>` | tenant override | ❌ (در sandbox از default) |

---

## ۱۳. مدل رویداد

این بخش ۴۶ رویداد دامنه را که در `src/lib/event-catalog.ts` تعریف شده‌اند، مستند می‌کند.

### ۱۳.۱ ساختار EventDefinition

هر رویداد شامل:

```typescript
interface EventDefinition {
  eventType: string         // مثلاً 'sales_order.approved'
  version: string           // '1.0' (LAW-15)
  publisher: string         // Bounded Context ناشر
  consumers: string[]       // Bounded Context‌های مصرف‌کننده
  payloadFields: string[]   // فیلدهای payload
  retryPolicy: string       // exponential | linear | none
  idempotencyKey: string    // فیلد کلیدی برای dedup
}
```

### ۱۳.۲ فهرست کامل ۴۶ رویداد

#### Sales Context (۳ رویداد)

| eventType | Publisher | Consumers | Payload |
|-----------|-----------|-----------|---------|
| `sales_order.created` | Sales | Audit | orderNumber, customerPartyId, totalAmount, lineCount |
| `sales_order.approved` | Sales | Inventory, Saga, Audit | orderNumber, customerPartyId, totalAmount, currencyCode |
| `sales_order.cancelled` | Sales | Inventory, Saga, Audit | orderNumber, previousStatus, reason |

#### Fulfillment Context (۳ رویداد)

| eventType | Publisher | Consumers | Payload |
|-----------|-----------|-----------|---------|
| `shipment.created` | Fulfillment | Audit | shipmentNumber, salesOrderId, customerPartyId |
| `shipment.shipped` | Fulfillment | Billing, Saga, Audit | shipmentNumber, ledgerEntriesCreated, salesOrderId |
| `shipment.delivered` | Fulfillment | Sales, Saga, Audit | shipmentNumber |

#### Billing Context (۶ رویداد)

| eventType | Publisher | Consumers | Payload |
|-----------|-----------|-----------|---------|
| `invoice.created` | Billing | Audit | invoiceNumber, salesOrderId, totalAmount |
| `invoice.issued` | Billing | Financial, Audit | invoiceNumber, customerPartyId, totalAmount, currencyCode |
| `invoice.cancelled` | Billing | Financial, Audit | invoiceNumber, reason |
| `payment.allocated` | Billing | Financial, Saga, Audit | paymentNumber, totalAllocated, paymentStatus, allocations |
| `payment.received` | Billing | Financial, Saga, Audit | paymentNumber, amount, currencyCode, customerPartyId |
| `credit_note.issued` | Billing | Financial, Audit | creditNoteNumber, invoiceId, customerPartyId, totalAmount |

#### Returns Context (۵ رویداد)

| eventType | Publisher | Consumers | Payload |
|-----------|-----------|-----------|---------|
| `return_order.created` | Returns | Audit | returnNumber, customerPartyId, totalAmount |
| `return_order.approved` | Returns | Audit | returnNumber, refundAmount |
| `return_order.received` | Returns | Saga, Audit | returnNumber, ledgerEntriesCreated |
| `return_order.closed` | Returns | Saga, Audit | returnNumber |
| `refund.completed` | Returns | Financial, Audit | refundNumber, amount, currencyCode, customerPartyId, refundMethod |

#### Inventory Context (۱ رویداد در کاتالوگ)

| eventType | Publisher | Consumers | Payload |
|-----------|-----------|-----------|---------|
| `stock_adjustment.posted` | Inventory | Financial, Audit | adjustmentNumber, productId, quantity, reason |

⚠️ **نقص}: رویداد `inventory.reserved` که در Saga به‌عنوان completion event استفاده می‌شود، در `EVENT_CATALOG` تعریف نشده است. این یک ناسازگاری بین saga-manager و event-catalog است.

#### Saga Context (۴ رویداد)

| eventType | Publisher | Consumers | Payload |
|-----------|-----------|-----------|---------|
| `saga.started` | Saga | Audit | sagaKey, correlationId, totalSteps |
| `saga.step_completed` | Saga | Audit | sagaInstanceId, stepNumber, stepName |
| `saga.completed` | Saga | Audit | sagaInstanceId, correlationId |
| `saga.compensated` | Saga | Audit | sagaInstanceId, failedStep, compensationActions |

#### Warranty Context (۸ رویداد)

| eventType | Publisher | Consumers | Payload |
|-----------|-----------|-----------|---------|
| `warranty_card.created` | Warranty | Audit | warrantyNumber, productInstanceId, customerPartyId |
| `warranty.activated` | Warranty | Audit, DeviceTimeline | warrantyNumber, productInstanceId, customerPartyId, startDate, endDate |
| `warranty.claim.submitted` | Warranty | Audit, DeviceTimeline | claimNumber, warrantyCardId, productInstanceId |
| `warranty.claim.inspected` | Warranty | Audit | claimNumber, defectType, defectSeverity, isCovered |
| `warranty.claim.approved` | Warranty | Service, Audit, DeviceTimeline | claimNumber, warrantyCardId, productInstanceId, customerPartyId, defectType, estimatedCost |
| `warranty.claim.rejected` | Warranty | Audit | claimNumber, rejectionReason |
| `warranty.extended` | Warranty | Audit, DeviceTimeline | extensionNumber, warrantyCardId, extensionMonths, newEndDate |
| `warranty.transfer.approved` | Warranty | Audit, DeviceTimeline | transferNumber, warrantyCardId, fromPartyId, toPartyId |

#### Service Context (۷ رویداد)

| eventType | Publisher | Consumers | Payload |
|-----------|-----------|-----------|---------|
| `service_request.created` | Service | Audit, DeviceTimeline | requestNumber, customerPartyId, serviceKind |
| `service_order.created` | Service | Audit, DeviceTimeline | orderNumber, serviceRequestId, customerPartyId |
| `service_order.diagnosed` | Service | Audit | orderNumber, symptom |
| `service_order.part_consumed` | Service | Audit, Financial | orderNumber, productId, quantity, totalCost |
| `service_order.qc_completed` | Service | Audit | orderNumber, qcNumber, result |
| `service_order.ready` | Service | Notification, Audit | orderNumber |
| `service_order.delivered` | Service | Audit, DeviceTimeline | orderNumber |

#### Notification Context (۷ رویداد)

| eventType | Publisher | Consumers | Payload |
|-----------|-----------|-----------|---------|
| `notification.created` | Notification | Audit | notificationId, templateCode, templateVersion, recipientId, channel |
| `notification.queued` | Notification | Audit | notificationId, queueItemId, priority, nextRetryAt |
| `notification.sent` | Notification | Audit | notificationId, messageId, provider, attempt, durationMs |
| `notification.failed` | Notification | Audit | notificationId, attempt, errorCode, errorMessage, movedToDLQ |
| `notification.retrying` | Notification | Audit | notificationId, attempt, nextRetryAt, backoffSeconds |
| `notification.cancelled` | Notification | Audit | notificationId, reason, cancelledBy |
| `notification.preference.updated` | Notification | Audit | userId, channelsEnabled, language, quietHours |

#### رویدادهای دیگر (غیررسمی — در کد استفاده می‌شوند اما در کاتالوگ نیستند)

این رویدادها در مسیرهای API یا handlers استفاده می‌شوند اما در `EVENT_CATALOG` ثبت نشده‌اند:

- `inventory.reserved` (در Saga)
- `journal_entry.posted` (در financial-handlers.ts)
- `rule.evaluated` (در rules/evaluate/route.ts)
- `workflow.transitioned` (در workflow/transition/route.ts)
- `workflow.completed` (در workflow/transition/route.ts)
- `tax.posted` (در tax/post/route.ts — در صورت وجود)

⚠️ **نقص}: این رویدادها باید به `EVENT_CATALOG` اضافه شوند.

### ۱۳.۳ مسیر رویداد (Event Flow) — مثال Sales Order

```
1. Sales publishes: sales_order.created
   └─ Outbox → Inbox → audit-wildcard-handler (consumes '*')

2. Sales publishes: sales_order.approved
   └─ Outbox → Inbox → 3 consumers:
      ├─ inventory-reservation-handler (creates reservation)
      ├─ saga-sales-fulfillment-handler (starts Saga)
      └─ audit-wildcard-handler

3. Inventory publishes: inventory.reserved (به‌صورت ضمنی)
   └─ Saga.advanceStep(inventory.reserved) → step 1 complete

4. Fulfillment publishes: shipment.created
   └─ Saga.advanceStep(shipment.created) → step 2 complete

5. Fulfillment publishes: shipment.shipped
   └─ Outbox → Inbox → 3 consumers:
      ├─ billing-invoice-handler (creates invoice)
      ├─ saga-sales-fulfillment-handler (advance)
      └─ audit-wildcard-handler

6. Billing publishes: invoice.issued
   └─ Outbox → Inbox → 2 consumers:
      ├─ financial-ar-handler (creates AR JE)
      └─ audit-wildcard-handler

7. Financial publishes: journal_entry.posted
   └─ Outbox → Inbox → audit-wildcard-handler

8. Billing publishes: payment.received (پس از allocate)
   └─ Outbox → Inbox → 3 consumers:
      ├─ financial-cash-handler (creates Cash JE)
      ├─ saga-sales-fulfillment-handler (advance to complete)
      └─ audit-wildcard-handler

9. Saga publishes: saga.completed
   └─ Outbox → Inbox → audit-wildcard-handler
```

---

## ۱۴. مدل گردش کار (Workflow Model)

این بخش مدل گردش کار واقعی را از روی `WorkflowDefinition`, `WorkflowInstance`, `WorkflowHistory` و مسیر `/workflow/instances/{id}/transition` مستند می‌کند.

### ۱۴.۱ ساختار WorkflowDefinition

```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "key": "sales_order_approval",
  "name": "تأیید سفارش فروش",
  "entityType": "sales_order",
  "version": 1,
  "isActive": true,
  "publishedAt": "2024-01-01T00:00:00Z",
  "states": [
    { "key": "draft", "name": "پیش‌نویس", "isInitial": true, "isFinal": false },
    { "key": "pending_approval", "name": "در انتظار تأیید", "isInitial": false, "isFinal": false },
    { "key": "approved", "name": "تأیید شده", "isInitial": false, "isFinal": true },
    { "key": "rejected", "name": "رد شده", "isInitial": false, "isFinal": true }
  ],
  "transitions": [
    {
      "key": "submit",
      "fromState": "draft",
      "toState": "pending_approval",
      "triggerType": "manual",
      "guardRuleSetId": null,
      "requiredPermission": "sales_order.submit"
    },
    {
      "key": "approve",
      "fromState": "pending_approval",
      "toState": "approved",
      "triggerType": "manual",
      "guardRuleSetId": "uuid-of-sales_order_rules",
      "requiredPermission": "sales_order.approve"
    },
    {
      "key": "reject",
      "fromState": "pending_approval",
      "toState": "rejected",
      "triggerType": "manual",
      "guardRuleSetId": null,
      "requiredPermission": "sales_order.reject"
    }
  ]
}
```

### ۱۴.۲ الگوریتم انتقال وضعیت (LAW-49)

از `workflow/instances/[id]/transition/route.ts`:

```
INPUT: { transitionKey, actorId?, reason?, metadata? }

1. بررسی: instance.status === 'running' (در غیر این صورت → 422)
2. یافتن transition در definition با (transitionKey, fromState=instance.currentStateKey)
   └─ اگر نبود → 422 INVALID_TRANSITION
3. یافتن targetState در states با toState=transition.toState
   └─ اگر نبود → 422 INVALID_STATE
4. در صورت وجود transition.guardRuleSetId:
   └─ فراخوانی Rule Engine: POST /api/v1/rules/evaluate
      ├─ body: { context: entityType, event: transitionKey, payload: entity data, workflowInstanceId }
      └─ اگر decision === 'deny' → 403 FORBIDDEN
5. در صورت وجود transition.requiredPermission:
   └─ بررسی مجوز کاربر (در V1 ناقص — NOT IMPLEMENTED)
6. Optimistic Lock: UPDATE WHERE id=? AND version=?
   └─ اگر count=0 → 409 OPTIMISTIC_LOCK_FAILED
7. UPDATE WorkflowInstance:
   ├─ currentStateKey = toState
   ├─ status = targetState.isFinal ? 'completed' : 'running'
   ├─ completedAt = targetState.isFinal ? now : null
   └─ version = version + 1
8. INSERT WorkflowHistory:
   └─ { instanceId, fromState, toState, transitionKey, changedBy, reason, metadata }
9. Outbox: workflow.transitioned
10. در صورت isFinal: Outbox: workflow.completed

OUTPUT: { id, previousState, currentState, status, isFinal }
```

### ۱۴.۳ Workflow‌های مورد انتظار (از روی entityType)

| entityType | نمونه‌های Workflow | وضعیت |
|------------|-------------------|-------|
| `sales_order` | sales_order_approval (با threshold تأیید CEO) | ⚠️ تعریف نشده در seed |
| `warranty_claim` | warranty_claim_inspection (submitted → inspection → approved/rejected) | ⚠️ تعریف نشده در seed |
| `service_order` | service_order_lifecycle (open → diagnosis → repair → qc → ready → delivered) | ⚠️ تعریف نشده در seed |
| `return_order` | return_order_approval (draft → approved → received → closed) | ⚠️ تعریف نشده در seed |
| `journal_entry` | journal_entry_approval (draft → posted با تأیید مدیر مالی) | ⚠️ تعریف نشده در seed |
| `cycle_count` | cycle_count_approval (in_progress → completed → approved → adjusted) | ⚠️ تعریف نشده در seed |
| `purchase_order` | purchase_order_approval | ❌ NOT IMPLEMENTED |

⚠️ **نقص}: هیچ WorkflowDefinition‌ای در seed تعریف نشده است. کاربر باید به‌صورت دستی از طریق API تعریف کند.

### ۱۴.۴ گزارش‌گیری Workflow

- `GET /api/v1/workflow/instances?status=running` — نمونه‌های در حال اجرا
- `GET /api/v1/workflow/instances?entityType=sales_order&entityId=...` — نمونه‌های یک موجودیت
- `GET /api/v1/workflow/instances/{id}/history` — تاریخچه (در صورت وجود مسیر)
- ⚠️ مسیر `/history` در فایل‌سیستم نیست — **نقص}.

---

## ۱۵. مدل امنیت

این بخش وضعیت امنیتی واقعی پروژه را مستند می‌کند.

### ۱۵.۱ آنچه وجود دارد

| کنترل | پیاده‌سازی | محل |
|-------|-----------|-----|
| Idempotency | ✅ LAW-06 با SHA-256 | `src/lib/shared/infra/idempotency-helper.ts` |
| Optimistic Lock | ✅ LAW-07 با version + If-Match | `src/lib/shared/infra/optimistic-lock-helper.ts` |
| Tenant Isolation | ✅ tenantId روی تمام مدل‌ها | `src/lib/api-helpers.ts` (getTenantId) |
| Soft Delete | ✅ deletedAt روی ۶۰+ مدل | schema.prisma |
| Audit Trail | ✅ createdBy/updatedBy روی User | schema.prisma |
| RFC 7807 Problem Details | ✅ در errorResponse | `src/lib/api-helpers.ts` |
| correlation_id در خطاها | ✅ UUID | `src/lib/api-helpers.ts` |

### ۱۵.۲ آنچه وجود ندارد (Critical Gaps)

| کنترل | وضعیت | ریسک |
|-------|-------|------|
| **Authentication** | ❌ NOT IMPLEMENTED | 🚨 بحرانی — تمام ۱۱۸ مسیر بدون احراز هویت |
| **Authorization (RBAC)** | ❌ NOT IMPLEMENTED | 🚨 بحرانی — نبود user_roles و role_permissions |
| **Password Hashing** | ❌ NOT IMPLEMENTED | 🚨 بحرانی — User.password وجود ندارد |
| **JWT / Session Token** | ❌ NOT IMPLEMENTED | 🚨 بحرانی — Session مدل داریم اما تولید/اعتبارسنجی token نیست |
| **CSRF Protection** | ❌ NOT IMPLEMENTED | بالا (برای فرم‌های Web) |
| **Rate Limiting** | ❌ NOT IMPLEMENTED | بالا — DDOS آسیب‌پذیر |
| **Input Sanitization** | ⚠️ PARTIAL — فقط JSON.parse، بدون schema validation | بالا |
| **SQL Injection** | ✅ کم‌ریسک (Prisma parameterized) | کم |
| **XSS** | ⚠️ PARTIAL — React خودکار escape می‌کند اما Notification body raw است | متوسط |
| **HTTPS Enforcement** | ❌ NOT IMPLEMENTED | بالا (توسط nginx باید حل شود) |
| **Security Headers** | ❌ NOT IMPLEMENTED | متوسط (CSP, HSTS, X-Frame-Options) |
| **CORS** | ⚠️ PARTIAL — Next.js default | متوسط |
| **Secrets Management** | ❌ NOT IMPLEMENTED — `.env` فقط ۱ خط DATABASE_URL | بالا |
| **Audit Log Table** | ❌ NOT IMPLEMENTED — فقط `audit-wildcard-handler` که console.log می‌کند | بالا |
| **PII Encryption** | ❌ NOT IMPLEMENTED | بالا (اطلاعات مشتری در plain text) |
| **2FA / OTP** | ❌ NOT IMPLEMENTED | بالا |
| **Session Revocation** | ⚠️ مدل داریم اما API نداریم | بالا |
| **Password Policy** | ❌ NOT IMPLEMENTED | بالا |
| **Account Lockout** | ⚠️ مدل داریم (lockedUntil) اما منطق نیست | متوسط |
| **Device Fingerprinting** | ⚠️ مدل داریم اما استفاده نیست | متوسط |
| **Penetration Testing** | ❌ NOT IMPLEMENTED | بالا |
| **Vulnerability Scanning** | ⚠️ `bun audit` در CI اما `|| true` است | متوسط |
| **Dependency Pinning** | ⚠️ PARTIAL — `package.json` نسخه‌های ^ | متوسط |
| **Container Security** | ❌ NOT IMPLEMENTED | بالا |
| **Backup Encryption** | ❌ NOT IMPLEMENTED | بالا |

### ۱۵.۳ مدل امنیت پیشنهادی برای Production

| لایه | کنترل | ابزار |
|------|-------|------|
| Network | WAF + DDoS | Cloudflare / ArvanCloud |
| Edge | HTTPS-only + HSTS | nginx + Let's Encrypt |
| Application | Auth (JWT) + RBAC | Laravel Sanctum + spatie/permission |
| API | Rate Limit + CORS | Laravel Throttle + CORS middleware |
| Data | Encryption at rest | PostgreSQL TDE / disk encryption |
| Audit | Audit log table | dedicated `audit_logs` table با wildcard handler |
| Secrets | Vault | HashiCorp Vault / Laravel Vault |
| Monitoring | SIEM | ELK / Wazuh |
| Container | Read-only FS + non-root | Docker + Trivy scan |

---

## ۱۶. مدل دسترسی (Permission Model)

این بخش مدل دسترسی واقعی و شکاف‌های آن را مستند می‌کند.

### ۱۶.۱ مدل Permission در کد

```prisma
model Permission {
  id          String   @id @default(cuid())
  key         String   @unique       // مثلاً 'sales_order.approve'
  module      String                 // 'sales'
  action      String                 // 'approve'
  description String?
  isSystem    Boolean  @default(true)
}
```

### ۱۶.۲ شکاف‌های بحرانی

⚠️ **نبود جدول واسط}: 
- **نبود `user_roles`** — هیچ رابطه‌ای بین User و Role در schema وجود ندارد.
- **نبود `role_permissions`** — هیچ رابطه‌ای بین Role و Permission در schema وجود ندارد.
- در نتیجه حتی اگر Permission تعریف شود، نمی‌توان به Role یا User اختصاص داد.

⚠️ **نبود میدلور authorization}: 
- هیچ مسیر API‌ای Permission را چک نمی‌کند.
- `getTenantId()` فقط tenant را استخراج می‌کند، نه user یا permissions.

### ۱۶.۳ مدل Permission پیشنهادی

```prisma
// جدول جدید: user_roles
model UserRole {
  id        String   @id @default(cuid())
  userId    String
  roleId    String
  tenantId  String
  assignedAt DateTime @default(now())
  assignedBy String?
  @@unique([userId, roleId, tenantId])
}

// جدول جدید: role_permissions
model RolePermission {
  id            String   @id @default(cuid())
  roleId        String
  permissionId  String
  tenantId      String
  @@unique([roleId, permissionId, tenantId])
}
```

### ۱۶.۴ فهرست Permission‌های مورد انتظار (از روی مسیرهای API)

| module | action | key | توضیح |
|--------|--------|-----|-------|
| product | create | `product.create` | ایجاد محصول |
| product | update | `product.update` | بروزرسانی محصول |
| product | read | `product.read` | مشاهده محصول |
| product | delete | `product.delete` | حذف محصول |
| inventory | create_transaction | `inventory.create_transaction` | ثبت تراکنش انبار |
| inventory | manage_reservation | `inventory.manage_reservation` | مدیریت رزرو |
| inventory | manage_transfer | `inventory.manage_transfer` | انتقال بین انبار |
| inventory | manage_cycle_count | `inventory.manage_cycle_count` | شمارش |
| sales | create | `sales_order.create` | ایجاد سفارش |
| sales | approve | `sales_order.approve` | تأیید سفارش |
| sales | cancel | `sales_order.cancel` | لغو سفارش |
| fulfillment | manage_shipment | `shipment.manage` | مدیریت محموله |
| fulfillment | ship | `shipment.ship` | صدور محموله |
| billing | create_invoice | `invoice.create` | ایجاد فاکتور |
| billing | issue_invoice | `invoice.issue` | صدور فاکتور |
| billing | cancel_invoice | `invoice.cancel` | لغو فاکتور |
| billing | create_payment | `payment.create` | ثبت پرداخت |
| billing | allocate_payment | `payment.allocate` | تخصیص پرداخت |
| returns | manage | `return_order.manage` | مدیریت مرجوعی |
| warranty | activate | `warranty.activate` | فعال‌سازی گارانتی |
| warranty | inspect_claim | `warranty.claim.inspect` | بازرسی شکایت |
| warranty | approve_claim | `warranty.claim.approve` | تأیید شکایت |
| service | create_request | `service_request.create` | ایجاد درخواست |
| service | diagnose | `service_order.diagnose` | تشخیص |
| service | consume_part | `service_order.consume_part` | مصرف قطعه |
| service | qc | `service_order.qc` | کنترل کیفیت |
| financial | create_je | `journal_entry.create` | ایجاد سند |
| financial | post_je | `journal_entry.post` | ثبت سند |
| financial | reverse_je | `journal_entry.reverse` | معکوس‌سازی |
| financial | close_period | `fiscal_period.close` | بستن دوره |
| financial | close_year | `fiscal_year.close` | بستن سال |
| workflow | manage | `workflow.manage` | مدیریت WF |
| workflow | transition | `workflow.transition` | انتقال وضعیت |
| rule | manage | `rule.manage` | مدیریت قواعد |
| notification | send | `notification.send` | ارسال اعلان |
| notification | manage_template | `notification.template.manage` | مدیریت قالب |
| system | manage | `system.manage` | مدیریت سیستم |

### ۱۶.۵ ماتریس Role × Permission (پیشنهادی)

| Permission | Customer | Rep | Technician | Service Center | Staff | Manager | Admin |
|------------|----------|-----|------------|----------------|-------|---------|-------|
| product.read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| sales_order.create | — | ✅ | — | — | ✅ | ✅ | ✅ |
| sales_order.approve | — | — | — | — | — | ✅ | ✅ |
| warranty.activate | — | — | — | ✅ | ✅ | ✅ | ✅ |
| warranty.claim.submit | ✅ | ✅ | — | ✅ | ✅ | — | — |
| service_order.diagnose | — | — | ✅ | — | — | — | — |
| service_order.qc | — | — | — | ✅ | — | ✅ | ✅ |
| journal_entry.create | — | — | — | — | — | ✅ | ✅ |
| fiscal_year.close | — | — | — | — | — | — | ✅ |

---

## ۱۷. مدل مالی (Financial Model)

این بخش مدل مالی واقعی را از روی ۱۴ مدل Financial + financial-handlers.ts مستند می‌کند.

### ۱۷.۱ چارت حساب‌ها (ChartOfAccount)

```prisma
model ChartOfAccount {
  accountCode      String   // مثلاً '1000', '1100', '4000'
  accountName      String
  accountType      String   // asset|liability|equity|revenue|expense
  parentAccountId  String?  // tree structure
  level            Int      // 0=root, 1, 2, ...
  isPostable       Boolean  // leaf vs header
  isControlAccount Boolean  // for AR, AP
  openingBalance   Float
  currencyCode     String   // default 'IRR'
}
```

**ساختار پیشنهادی چارت حساب‌ها** (نه در seed):

```
1 - Assets
├── 1000 - Cash (CASH)
│   ├── 1001 - Petty Cash
│   └── 1002 - Bank Account
├── 1100 - Accounts Receivable (AR, control)
├── 1200 - Inventory (INV)
│   ├── 1201 - Raw Materials
│   └── 1202 - Finished Goods
└── 1500 - Fixed Assets

2 - Liabilities
├── 2000 - Accounts Payable (AP, control)
├── 2100 - VAT Payable
└── 2200 - Accrued Expenses

3 - Equity
├── 3000 - Share Capital
└── 3100 - Retained Earnings

4 - Revenue
├── 4000 - Sales Revenue
└── 4100 - Service Revenue

5 - Expenses
├── 5000 - COGS
├── 5100 - Salaries
├── 5200 - Rent
└── 5300 - Utilities
```

### ۱۷.۲ Journal Entry (الگوی حسابداری دوطرفه)

```prisma
model JournalEntry {
  entryNumber    String   // JE-1403-00001 (LAW-02)
  entryDate      DateTime
  fiscalPeriodId String?
  description    String
  sourceType     String?  // sales_invoice|payment|credit_note|refund|inventory_adjustment|service_charge|manual
  sourceId       String?  // ID منبع
  status         String   // draft|posted|reversed
  totalDebit     Float    // LAW-35: باید با totalCredit برابر باشد
  totalCredit    Float
  reversedById   String?  // ارجاع به JE معکوس
  reversedAt     DateTime?
  reversalReason String?
  postedAt       DateTime?
  postedBy       String?
}
```

### ۱۷.۳ الگوریتم ایجاد JournalEntry

```
1. اعتبارسنجی: totalDebit === totalCredit (LAW-35)
2. یافتن FiscalPeriod از entryDate
3. اعتبارسنجی: period.status === 'open' یا 'temporarily_closed' (LAW-36)
4. در صورت period.status === 'closed' → 422 PERIOD_CLOSED
5. ایجاد JournalEntry با status='posted', postedAt=now
6. برای هر خط: ایجاد JournalEntryLine
7. Outbox: journal_entry.posted
```

### ۱۷.۴ تبدیل رویداد → JournalEntry (LAW-34)

از `src/lib/financial-handlers.ts`:

| رویداد ورودی | حساب بدهکار | حساب بستانکار | sourceType |
|--------------|-------------|---------------|------------|
| `invoice.issued` | AR (control) | Revenue | sales_invoice |
| `payment.received` | Cash | AR (control) | payment |
| `credit_note.issued` | Revenue (reversal) | AR (reversal) | credit_note |
| `refund.completed` | AR | Cash | refund |
| `service.part_consumed` | COGS | Inventory | service_charge |
| `inventory.adjustment` | Inventory Adj | Inventory | inventory_adjustment |

### ۱۷.۵ AR/AP Sub-ledger (LAW-40, 42)

```prisma
model ARTransaction {
  customerPartyId String
  transactionType String  // invoice|payment|credit_note|refund|opening
  referenceType   String  // sales_invoice|payment|credit_note|refund
  referenceId     String
  entryDate       DateTime
  amount          Float   // +debit (invoice), -credit (payment)
  openAmount      Float   // remaining (cached for query)
  status          String  // open|partially_allocated|fully_allocated
}

model ARAllocation {
  debitTransactionId  String  // ARTransaction (invoice)
  creditTransactionId String  // ARTransaction (payment)
  allocatedAmount     Float   // +allocate, -unallocate (LAW-41)
  reversalOfId        String? // if reversal
}
```

**الگوریتم تخصیص AR**:
1. یافتن ARTransaction نوع invoice با openAmount > 0
2. یافتن ARTransaction نوع payment با openAmount > 0
3. ایجاد ARAllocation با allocatedAmount = min(invoice.open, payment.open)
4. بروزرسانی openAmount در هر دو ARTransaction
5. در صورت openAmount = 0: status = 'fully_allocated'

### ۱۷.۶ مغایرت‌گیری Subledger با GL (LAW-40)

- `GET /api/v1/reconciliation`:
  - مجموع ARTransaction.amount برای هر مشتری === مجموع JournalEntryLine.debitAmount - creditAmount برای حساب AR با همان partyId
  - در صورت مغایرت → گزارش و Needs Investigation

### ۱۷.۷ مدل مالیات

```prisma
model TaxCode {
  code            String  // 'VAT09', 'EXEMPT'
  taxType         String  // vat|sales_tax|withholding|exempt
  ratePercent     Float   // 9.00, 0.00
  inputAccountId  String? // recoverable input
  outputAccountId String? // output payable
  isRecoverable   Boolean
  isDefault       Boolean
}

model TaxRule {
  taxCodeId         String
  productCategoryId String?  // scope
  customerGroupId   String?
  regionId          String?
  effectiveFrom     DateTime
  effectiveTo       DateTime?  // null = active (LAW-45)
  priority          Int        // higher = more specific
  formula           String     // default 'rate * taxableAmount'
  rateOverride      Float?
  isReverseCharge   Boolean
  version           Int        // LAW-45
}

model TaxCalculation {
  documentType    String  // sales_invoice|purchase_invoice|credit_note|payment
  documentId      String
  taxCodeId       String
  taxRuleId       String
  taxableAmount   Float
  taxRate         Float   // snapshot
  taxAmount       Float
  snapshot        Json    // full context (audit — LAW-43)
}

model TaxPosting {
  journalEntryId   String
  taxCalculationId String
}
```

### ۱۷.۸ بستن سال مالی (LAW-36)

```
1. تمام FiscalPeriod‌ها باید 'closed' باشند (hard-close هر کدام)
2. اعتبارسنجی: هیچ JournalEntry با status='draft' نباید وجود داشته باشد
3. مغایرت‌گیری AR/AP با Control Account
4. POST /api/v1/fiscal-years/{id}/close
5. status = 'closed', closedAt = now, closedBy = user
6. از این پس: هیچ JE در این سال قابل ثبت نیست
```

### ۱۷.۹ گزارش‌های مالی (۶ گزارش)

| گزارش | محاسبه |
|-------|--------|
| **Dashboard** | KPI از تمام JE‌های posted در سال جاری |
| **Balance Sheet** | موجودی تمام حساب‌های asset/liability/equity در تاریخ مشخص |
| **Profit & Loss** | جمع revenue و expense در بازه |
| **Cash Flow** | تغییرات حساب‌های CASH در بازه (indirect method) |
| **Equity Changes** | تغییرات حساب‌های equity |
| **Final Trial Balance** | موجودی تمام حساب‌ها در تاریخ بستن سال |

---

## ۱۸. مدل انبار (Inventory Model)

این بخش مدل انبار واقعی را با تمرکز بر **Ledger Pattern** مستند می‌کند.

### ۱۸.۱ اصل بنیادی (LAW-05)

> **هیچ مقدار aggregate به‌عنوان منبع حقیقت ذخیره نمی‌شود.**

اثر در کد:
- `StockItem` فیلد `on_hand_quantity` **ندارد** (به‌صراحت در سطر ۵۰۸ schema.prisma ذکر شده).
- `StockBalance` یک **snapshot صریح} است که از ledger مشتق می‌شود (سطر ۵۶۴).
- موجودی واقعی همیشه از `SUM(InventoryTransaction.quantity) WHERE stockItemId=?` محاسبه می‌شود.

### ۱۸.۲ InventoryTransaction (Ledger Append-Only)

```prisma
model InventoryTransaction {
  transactionNumber String  // IT-1403-000001 (LAW-02)
  transactionType   String  // IN|OUT|TRANSFER|ADJUSTMENT|RESERVATION|RELEASE|COUNT
  stockItemId       String
  productId         String
  productInstanceId String?
  fromWarehouseId   String?
  fromLocationId    String?
  toWarehouseId     String?
  toLocationId      String?
  batchNumber       String?
  quantity          Float   // +IN, -OUT
  unitCost          Float?
  reason            String?
  referenceType     String? // purchase_order|sales_order|transfer|count|adjustment|shipment|service_order|return_order
  referenceId       String?
  performedBy       String?
  occurredAt        DateTime
  metadata          Json?
}
```

### ۱۸.۳ الگوریتم محاسبه موجودی

```sql
-- موجودی فعلی (on-hand)
SELECT SUM(quantity) AS on_hand
FROM inventory_transactions
WHERE stock_item_id = ?
  AND tenant_id = ?
  AND occurred_at <= NOW();

-- موجودی رزرو شده
SELECT reserved_quantity FROM stock_items WHERE id = ?;
-- (این فیلد روی StockItem ذخیره می‌شود اما فقط برای reserved است، نه on_hand)

-- موجودی قابل دسترس (available)
available = on_hand - reserved

-- snapshot در StockBalance
SELECT on_hand_quantity, reserved_quantity, available_quantity
FROM stock_balances
WHERE stock_item_id = ?;
-- (این snapshot توسط SnapshotWorker periodically بروزرسانی می‌شود — LAW-10)
```

### ۱۸.۴ StockReservation (LAW-17)

```
[ایجاد رزرو] POST /api/v1/stock-reservations
├── بررسی: available_quantity >= reserved_quantity
├── ایجاد StockReservation با status='active', expiresAt (default 24h)
├── بروزرسانی StockItem.reservedQuantity += reserved_quantity
└── Outbox: inventory.reserved (در صورت وجود — فعلاً در EVENT_CATALOG نیست)

[مصرف رزرو] (در Shipment.ship)
├── StockReservation.status = 'consumed', consumedAt = now
├── StockItem.reservedQuantity -= reserved_quantity
├── ایجاد InventoryTransaction نوع OUT
└── LAW-17: رزرو قبل از Shipment الزامی است

[آزادسازی رزرو] POST /api/v1/stock-reservations/{id}/release
├── StockReservation.status = 'released', releasedAt = now, releaseReason
├── StockItem.reservedQuantity -= reserved_quantity
└── (هیچ InventoryTransaction نیاز نیست — فقط رزرو از بین می‌رود)

[انقضای رزرو] (خودکار — نیازمند Scheduler)
├── WHERE expiresAt < NOW() AND status = 'active'
├── status = 'expired'
└── StockItem.reservedQuantity -= reserved_quantity
```

### ۱۸.۵ StockTransfer (بین انبار/زون/بین)

```
[ثبت] POST /api/v1/stock-transfers
├── fromWarehouseId, toWarehouseId, lines
└── status = 'draft'

[شروع] POST /api/v1/stock-transfers/{id}/ship
├── LAW-16: ایجاد InventoryTransaction نوع TRANSFER
│   ├── quantity منفی از fromWarehouse
│   └── quantity مثبت به toWarehouse (در صورت هم‌transaction)
│   └─ (یا دو transaction جداگانه — در کد فعلی روش single txn نیست)
└── status = 'in_transit'

[دریافت] POST /api/v1/stock-transfers/{id}/receive
├── بروزرسانی StockTransferLine.quantityReceived
├── در صورت کمبود: status = 'partial'
├── در صورت کامل: status = 'received'
└── (در صورت نیاز: InventoryTransaction تکمیلی برای مبلغ دریافت‌شده)
```

### ۱۸.۶ CycleCount (شمارش چرخه‌ای)

```
[ثبت] POST /api/v1/cycle-counts
├── برای هر StockItem در warehouse:
│   └── ایجاد CycleCountLine با systemQuantity = on_hand (از ledger)
└── status = 'draft'

[شروع] POST /api/v1/cycle-counts/{id}/start → status = 'in_progress'

[ثبت شمارش] PATCH (در صورت وجود مسیر) یا inline
├── CycleCountLine.countedQuantity = value
├── variance = counted - system (محاسبه، نه ذخیره به‌عنوان حقیقت)
└── varianceReason (در صورت وجود)

[تکمیل] POST /api/v1/cycle-counts/{id}/complete → status = 'completed'

[تأیید] POST /api/v1/cycle-counts/{id}/approve → status = 'approved'

[اعمال تعدیل] (در صورت وجود مسیر explicit)
├── برای هر خط با variance ≠ 0:
│   └── ایجاد InventoryTransaction نوع ADJUSTMENT با quantity = variance
└── status = 'adjusted'
```

### ۱۸.۷ StockBalanceSnapshot (LAW-10)

```
[Snapshot شبانه] (نیازمند Scheduler — NOT IMPLEMENTED)
├── برای هر StockItem:
│   ├── محاسبه on_hand, reserved از ledger
│   ├── INSERT StockBalanceSnapshot (snapshotType='nightly')
│   └── بروزرسانی StockBalance

[Snapshot آستانه‌ای] (نیازمند Scheduler)
├── وقتی تعداد transaction از threshold (مثلاً ۱۰۰۰) بگذرد
└── snapshotType='threshold'

[Snapshot دستی] (در صورت وجود مسیر)
└── snapshotType='manual'
```

### ۱۸.۸ ساختار انبار سلسله‌مراتبی

```
Warehouse (WH-1403-0001)
├── WarehouseZone (zone)
│   ├── Location (aisle)
│   │   ├── Location (rack)
│   │   │   ├── Location (bin)
│   │   │   │   └── Bin (1:1 با Location نوع bin)
│   │   │   └── ...
│   │   └── ...
│   └── ...
└── ...
```

`Location.locationType`: `zone | aisle | rack | bin | shelf`
`Location.fullPath`: مسیر کامل (مثلاً 'WH-A/ZONE-1/AISLE-2/RACK-3/BIN-4')

---

## ۱۹. مدل گارانتی (Warranty Model)

این بخش مدل گارانتی واقعی را با ۵ مدل و LAW-28 تا LAW-30 مستند می‌کند.

### ۱۹.۱ WarrantyPolicy (قالب گارانتی)

```prisma
model WarrantyPolicy {
  productModelId String?       // FK به ProductModel (یا null برای همه)
  policyName     String
  warrantyType   String        // standard|extended|commercial|lifetime
  warrantyMonths Int = 12
  graceDays      Int = 0       // روزهای مهلت بعد از پایان
  isRenewable    Boolean = true
  coverageTerms  Json          // {parts: [...], labor: bool, ...}
  exclusions     Json = []     // [{ description, appliesTo }]
  validFrom      DateTime
  validTo        DateTime?
  isActive       Boolean = true
}
```

### ۱۹.۲ WarrantyCard (کارت گارانتی)

```prisma
model WarrantyCard {
  warrantyNumber    String     // WAR-1403-00001 (LAW-02)
  productInstanceId String     // یک کارت برای هر دستگاه
  customerPartyId   String
  warrantyPolicyId  String
  salesOrderId      String?
  shipmentId        String?
  activationDate    DateTime?
  startDate         DateTime?
  endDate           DateTime?
  graceEndDate      DateTime?
  status            String     // pending|active|expired|voided|transferred
  extendedMonths    Int = 0
}
```

⚠️ **یک کارت برای هر instance**: `@@unique([tenantId, productInstanceId])` — یک دستگاه فقط یک کارت گارانتی می‌تواند داشته باشد.

### ۱۹.۳ LAW-28: فعال‌سازی فقط از تحویل محموله

```
[رویداد] shipment.delivered
    ↓
[InboxHandler] warranty-activation-handler
    ↓
[جستجو] WarrantyCard WHERE shipmentId = ? AND status = 'pending'
    ↓
[محاسبه]
    startDate = shipment.deliveredAt
    endDate = startDate + warrantyPolicy.warrantyMonths
    graceEndDate = endDate + warrantyPolicy.graceDays
    ↓
[بروزرسانی]
    status = 'active'
    activationDate = now
    startDate, endDate, graceEndDate = ...
    ↓
[Outbox] warranty.activated → DeviceTimeline (LAW-30)
```

⚠️ **نقص در sandbox}: handler فقط `console.log` می‌کند؛ فعال‌سازی واقعی انجام نمی‌شود. اما endpoint دستی `POST /api/v1/warranty-cards/{id}/activate` پیاده‌سازی شده.

### ۱۹.۴ WarrantyClaim (شکایت گارانتی)

```prisma
model WarrantyClaim {
  claimNumber       String     // WCL-1403-00001
  warrantyCardId    String
  productInstanceId String
  customerPartyId   String
  claimType         String     // defect|damage|malfunction|doa|other
  claimDate         DateTime
  description       String
  defectDescription String?
  status            String     // draft|submitted|inspection|approved|rejected|service_order|closed
  
  // LAW-29: Inspection fields
  defectType        String?    // mechanical|electrical|cosmetic|software|other
  defectSeverity    String?    // minor|moderate|major|critical
  isCovered         Boolean?
  inspectionNotes   String?
  inspectedBy       String?
  inspectedAt       DateTime?
  isInspected       Boolean = false
  
  // Approval
  approvedAt        DateTime?
  approvedBy        String?
  approvalNotes     String?
  rejectedAt        DateTime?
  rejectedBy        String?
  rejectionReason   String?
  
  // Service link
  serviceOrderId    String?
  
  // Resolution
  resolvedAt        DateTime?
  resolutionNotes   String?
  estimatedCost     Float?
  actualCost        Float?
}
```

### ۱۹.۵ LAW-29: بازرسی قبل از تأیید

```
[submit] → status = 'submitted'
    ↓
POST /api/v1/warranty-claims/{id}/inspect
    ├── بررسی: status = 'submitted' یا 'inspection' (re-inspect)
    ├── ثبت defectType, defectSeverity, isCovered, inspectionNotes
    ├── isInspected = true
    ├── status = 'inspection'
    └── Outbox: warranty.claim.inspected

POST /api/v1/warranty-claims/{id}/approve
    ├── بررسی: status = 'inspection' AND isInspected = true
    ├── در صورت نبود inspection → 422 INSPECTION_REQUIRED
    ├── ثبت approvedAt, approvedBy, approvalNotes, estimatedCost
    ├── status = 'approved'
    └── Outbox: warranty.claim.approved
        ↓
    [InboxHandler] warranty-service-handler (LAW-33)
        └── ایجاد خودکار ServiceRequest از رویداد
```

### ۱۹.۶ WarrantyExtension (تمدید)

```prisma
model WarrantyExtension {
  extensionNumber String       // WEX-1403-00001
  warrantyCardId  String
  extensionType   String       // free|paid|promotional
  extensionMonths Int
  newEndDate      DateTime
  amountPaid      Float = 0
  paymentId       String?
  activationDate  DateTime
}
```

### ۱۹.۷ WarrantyTransfer (انتقال)

```prisma
model WarrantyTransfer {
  transferNumber String        // WTR-1403-00001
  warrantyCardId String
  productInstanceId String
  fromPartyId    String
  toPartyId      String
  transferDate   DateTime
  transferFee    Float = 0
  approvalStatus String        // pending|approved|rejected
  approvedBy     String?
  approvedAt     DateTime?
}
```

### ۱۹.۸ LAW-30: Device Timeline از رویدادهای تغییرناپذیر

خط زمانی دستگاه از رویدادهای دامنه‌ای زیر بازسازی می‌شود:

| رویداد | نقطه زمانی |
|--------|------------|
| `warranty_card.created` | ایجاد کارت |
| `warranty.activated` | فعال‌سازی |
| `warranty.claim.submitted` | ثبت شکایت |
| `warranty.claim.approved` | تأیید شکایت |
| `warranty.extended` | تمدید |
| `warranty.transfer.approved` | انتقال |
| `service_request.created` | ایجاد درخواست سرویس |
| `service_order.created` | ایجاد سفارش تعمیر |
| `service_order.diagnosed` | تشخیص |
| `service_order.part_consumed` | مصرف قطعه |
| `service_order.qc_completed` | کنترل کیفیت |
| `service_order.delivered` | تحویل |

پیاده‌سازی: `GET /api/v1/device-timeline/{instanceId}` تمام OutboxMessage‌ها با `payload.productInstanceId === instanceId` را به ترتیب chronological برمی‌گرداند.

⚠️ **نقص}: مسیر `device-timeline` در فایل‌سیستم وجود دارد اما فقط یک endpoint ساده است. نیاز به aggregation و enrichment از جداول مختلف دارد.

---

## ۲۰. مدل خدمت (Service Model)

این بخش مدل خدمت واقعی را با ۸ مدل و LAW-31 تا LAW-33 مستند می‌کند.

### ۲۰.۱ ServiceRequest (درخواست خدمت)

```prisma
model ServiceRequest {
  requestNumber       String   // SR-1403-00001
  customerPartyId     String
  productInstanceId   String?
  warrantyCardId      String?
  warrantyClaimId     String?  // LAW-33: از warranty claim via event
  serviceCenterId     String?
  serviceKind         String   // warranty|out_of_warranty|paid|recall
  priority            String   // low|normal|high|urgent|critical
  status              String   // draft|submitted|validated|service_order|cancelled
  customerProblem     String
  customerDescription String?
  deviceInfo          Json?    // {brand, model, serial, ...}
  reportedDefect      String?
  estimatedCompletion DateTime?
  actualCompletion    DateTime?
  customerConsent     Boolean = false
  serviceOrderId      String?  // link after creation
}
```

### ۲۰.۲ ServiceOrder (سفارش تعمیر)

```prisma
model ServiceOrder {
  orderNumber          String  // RO-1403-00001
  serviceRequestId     String?
  customerPartyId      String
  productInstanceId    String?
  warrantyCardId       String?
  warrantyClaimId      String?
  serviceCenterId      String?
  assignedTechnicianId String?
  serviceKind          String  // warranty|out_of_warranty|paid|recall
  status               String  // open|diagnosis|waiting_parts|repair|qc|ready|delivered|closed|cancelled
  
  // Timeline dates
  createdDate          DateTime
  diagnosisDate        DateTime?
  repairStartDate      DateTime?
  repairCompleteDate   DateTime?
  qcDate               DateTime?
  readyDate            DateTime?
  deliveredDate        DateTime?
  closedDate           DateTime?
  
  // Costs
  laborCost    Float = 0
  partsCost    Float = 0
  otherCost    Float = 0
  discountAmount Float = 0
  taxAmount    Float = 0
  totalCost    Float = 0
  paidAmount   Float = 0
}
```

### ۲۰.۳ ServiceOrderLine (وظایف)

```prisma
model ServiceOrderLine {
  serviceOrderId  String
  lineNumber      Int
  taskDescription String
  taskType        String?  // diagnosis|repair|replacement|testing
  estimatedHours  Float?
  actualHours     Float?
  completedAt     DateTime?
  isCompleted     Boolean = false
}
```

### ۲۰.۴ ServiceDiagnosis (تشخیص)

```prisma
model ServiceDiagnosis {
  serviceOrderId     String
  technicianPartyId  String
  diagnosisDate      DateTime
  symptom            String    // علامت گزارش‌شده توسط مشتری/تکنسین
  rootCause          String?   // علت ریشه‌ای
  recommendedAction  String?
  estimatedHours     Float?
  estimatedPartsCost Float?
  confidenceLevel    String?   // low|medium|high
}
```

### ۲۰.۵ ServiceOrderPart (مصرف قطعه) — LAW-31

```prisma
model ServiceOrderPart {
  serviceOrderId    String
  productId         String
  productInstanceId String?  // for serialized parts
  fromWarehouseId   String?
  fromLocationId    String?
  quantityUsed      Float = 0
  unitCost          Float = 0
  totalCost         Float = 0
  isWarrantyCovered Boolean = false
  isReturnedPart    Boolean = false  // اگر قطعه معیوب برگردانده شود
  returnedToWarehouseId String?
  usedAt            DateTime
}
```

**LAW-31: هر مصرف قطعه باید InventoryTransaction ایجاد کند**:

```
POST /api/v1/service-orders/{id}/consume-part
├── بررسی: status = 'repair' یا 'waiting_parts'
├── ایجاد ServiceOrderPart
├── LAW-31: ایجاد InventoryTransaction نوع OUT
│   ├── stockItemId, productId, productInstanceId
│   ├── quantity: منفی (مصرف)
│   ├── referenceType: 'service_order', referenceId: order.id
│   └── reason: 'Consumed for service order RO-...'
├── بروزرسانی ServiceOrder.partsCost += totalCost
├── Outbox: service_order.part_consumed
│   └─ InboxHandler → financial handler
│       └─ JE: debit COGS (یا Inventory Adj اگر warranty), credit Inventory
└── در صورت warranty: isWarrantyCovered = true → no charge to customer
```

### ۲۰.۶ ServiceOrderLabor (دستمزد)

```prisma
model ServiceOrderLabor {
  serviceOrderId    String
  technicianPartyId String
  laborType         String  // diagnosis|repair|testing|other
  hours             Float
  hourlyRate        Float
  totalCost         Float
  isWarrantyCovered Boolean = false
  startedAt         DateTime?
  endedAt           DateTime?
}
```

### ۲۰.۷ ServiceQualityCheck — LAW-32

```prisma
model ServiceQualityCheck {
  qcNumber         String  // QC-1403-00001
  serviceOrderId   String
  inspectorPartyId String?
  inspectionDate   DateTime
  result           String  // pass|fail|conditional
  checklist        Json    // {items: [{name, passed, notes}]}
  defectsFound     String?
  reworkRequired   Boolean = false
  reworkNotes      String?
  approvedAt       DateTime?
  approvedBy       String?
}
```

**LAW-32: هر تعمیر باید قبل از تحویل QC پاس شود**:

```
[Repair Complete]
    ↓
POST /api/v1/service-orders/{id}/qc
├── بررسی: status = 'repair'
├── ایجاد ServiceQualityCheck با result, checklist
├── اگر result = 'pass':
│   ├── status = 'qc'
│   └── قابل ready
├── اگر result = 'fail':
│   ├── reworkRequired = true
│   ├── status = 'repair' (بازگشت)
│   └── نیاز به تعمیر مجدد
├── اگر result = 'conditional':
│   └── با تأیید مدیر → ready
└── Outbox: service_order.qc_completed

POST /api/v1/service-orders/{id}/ready
├── بررسی: status = 'qc' AND qc.result = 'pass'
├── در صورت نبود QC pass → 422 QC_REQUIRED
├── status = 'ready'
├── readyDate = now
└── Outbox: service_order.ready → Notification (به مشتری)
```

### ۲۰.۸ TechnicianAssignment

```prisma
model TechnicianAssignment {
  technicianPartyId String
  serviceOrderId    String?
  serviceCenterId   String?
  assignmentType    String  // primary|secondary|supervisor
  status            String  // active|completed|reassigned|cancelled
  assignedAt        DateTime
  assignedBy        String?
  startTime         DateTime?
  endTime           DateTime?
}
```

### ۲۰.۹ الگوریتم کامل چرخه حیات ServiceOrder

```
[Open] (status = 'open')
  ↓ POST /service-orders/{id}/diagnose
[Diagnosis]
  ↓ POST /service-orders/{id}/consume-part (در صورت نیاز قطعه)
[Waiting Parts] → [Repair] (پس از مصرف قطعه)
  ↓ POST /service-orders/{id}/add-labor (در صورت وجود)
[Repair]
  ↓ POST /service-orders/{id}/qc
[QC] (pass) → [Ready]
[QC] (fail) → [Repair] (rework)
  ↓ POST /service-orders/{id}/deliver
[Delivered]
  ↓ POST /service-orders/{id}/close (در صورت وجود)
[Closed]
```

---

## ۲۱. مدل اعلان (Notification Model)

این بخش مدل اعلان واقعی را با ۵ مدل، ۱۰ Provider، Template Engine و LAW-55 تا LAW-57 مستند می‌کند.

### ۲۱.۱ معماری کلی

```
┌──────────────────────────────────────────────────────────────┐
│ Event → InboxHandler → NotificationService.dispatch()        │
│                              │                                │
│                              ▼                                │
│                  ┌──────────────────────┐                     │
│                  │  Template Engine     │ ← render (LAW-55)   │
│                  │  (deterministic)     │                     │
│                  └──────────┬───────────┘                     │
│                              │                                │
│                              ▼                                │
│                  ┌──────────────────────┐                     │
│                  │  Notification        │ ← idempotencyKey    │
│                  │  (status='pending')  │   (LAW-57)          │
│                  └──────────┬───────────┘                     │
│                              │                                │
│                              ▼                                │
│                  ┌──────────────────────┐                     │
│                  │  NotificationQueue   │ ← priority, retry   │
│                  │  (nextRetryAt)       │                     │
│                  └──────────┬───────────┘                     │
│                              │                                │
│                              ▼                                │
│                  ┌──────────────────────┐                     │
│                  │  Queue Processor     │ (cron each 5s)      │
│                  │  - lock              │                     │
│                  │  - getProvider       │ ← DEFAULT_PROVIDERS │
│                  │  - send              │                     │
│                  └──────────┬───────────┘                     │
│                              │                                │
│                              ▼                                │
│                  ┌──────────────────────┐                     │
│                  │  Provider.send()     │ (10 providers)      │
│                  └──────────┬───────────┘                     │
│                              │                                │
│                              ▼                                │
│                  ┌──────────────────────┐                     │
│                  │  NotificationDelivery│ ← attempt, status   │
│                  │  (response, duration)│                     │
│                  └──────────┬───────────┘                     │
│                              │                                │
│                              ▼                                │
│                  success → status='sent' OR                   │
│                  fail + retry → status='retrying' OR          │
│                  fail + max → status='failed', DLQ            │
└──────────────────────────────────────────────────────────────┘
```

### ۲۱.۲ NotificationTemplate

```prisma
model NotificationTemplate {
  code            String   // 'invoice.issued', 'service_order.ready'
  version         Int = 1
  language        String = 'fa'  // fa|en|ar|ku
  channel         String   // email|sms|whatsapp|push|inapp
  subjectTemplate String?  // null for sms/whatsapp/push/inapp
  bodyTemplate    String   // {{variables}}, {{#if}}, {{#each}}
  variablesSchema Json?    // [{name, type, required, description}]
  status          String = 'draft'  // draft|published|disabled
  effectiveFrom   DateTime
  effectiveTo     DateTime?
}
```

⚠️ **یک قالب برای هر (code, version, language, channel)**: `@@unique([tenantId, code, version, language, channel])`

### ۲۱.۳ Template Engine (LAW-55)

از `src/lib/modules/notification/services/template-engine.ts`:

**ویژگی‌ها}:
- **Deterministic** (LAW-53): هیچ `Date.now()`, `Math.random()`, I/O — همان ورودی → همان خروجی.
- **Syntax**: Handlebars-style
  - `{{variable.path}}` — dot-path lookup
  - `{{this.field}}` — current loop item
  - `{{@index}}`, `{{@first}}`, `{{@last}}` — loop context
  - `{{#if condition}}...{{else}}...{{/if}}` — conditional
  - `{{#each array}}...{{/each}}` — iteration
- **Truthiness**: falsy = false, 0, '', null, undefined, []
- **Missing variable** → empty string (نه exception)
- **Nested {{#if}} / {{#each}}** پشتیبانی می‌شود

**مثال}:

```
سلام {{customer.name}} عزیز،

فاکتور شماره {{invoice.number}} به مبلغ {{invoice.total}} {{invoice.currency}} صادر شد.

{{#if invoice.dueDate}}
مهلت پرداخت: {{invoice.dueDate}}
{{else}}
پرداخت فوری
{{/if}}

اقلام فاکتور:
{{#each invoice.lines}}
- {{this.name}}: {{this.quantity}} × {{this.unitPrice}} = {{this.total}}
{{/each}}

با تشکر،
تیم BISMARK
```

### ۲۱.۴ Provider‌ها (۱۰ Provider)

| Provider | کانال | توضیح |
|----------|-------|-------|
| **SmtpProvider** | email | SMTP ساده |
| **SesProvider** | email | Amazon SES |
| **SendgridProvider** | email | SendGrid |
| **KavenegarProvider** | sms | کاوه‌نگار (ایران) |
| **MelipayamakProvider** | sms | ملی‌پیامک (ایران) |
| **TwilioProvider** | sms | Twilio (بین‌المللی) |
| **EvolutionProvider** | whatsapp | Evolution API (خود-میزبان) |
| **MetaCloudProvider** | whatsapp | Meta WhatsApp Cloud API |
| **FirebaseProvider** | push | Firebase Cloud Messaging |
| **InAppDbProvider** | inapp | درون-برنامه‌ای (ذخیره در DB) |

⚠️ **نقص}: `InAppWsProvider` در comment مدل ذکر شده (`inapp_db | inapp_ws`) اما در providers.ts تعریف نشده است.

### ۲۱.۵ Notification (موجودیت اصلی)

```prisma
model Notification {
  templateId       String
  templateCode     String   // snapshot (audit)
  templateVersion  Int      // snapshot
  language         String   // snapshot
  recipientId      String?  // userId/partyId
  recipientName    String?
  recipientAddress String   // email/phone/fcm token/userId
  channel          String   // email|sms|whatsapp|push|inapp
  status           String   // pending|queued|sending|sent|failed|retrying|cancelled
  payload          Json     // input variables
  renderedSubject  String?
  renderedBody     String
  messageId        String?  // provider-returned id
  idempotencyKey   String   // LAW-57: deterministic
  errorCode        String?
  errorMessage     String?
}
```

### ۲۱.۶ LAW-57: Idempotency (at-most-once)

```
idempotencyKey = SHA-256(
  templateCode + ':' +
  templateVersion + ':' +
  recipientId + ':' +
  channel + ':' +
  JSON.stringify(payload)
)

@@unique([tenantId, idempotencyKey])
```

اگر Notification با همان idempotencyKey وجود دارد → همان Notification بازگردانده می‌شود (نه ایجاد دوباره).

### ۲۱.۷ NotificationQueue (صف پردازش)

```prisma
model NotificationQueue {
  notificationId   String
  priority         Int = 100     // higher = first
  attempt          Int = 0
  maxAttempts      Int = 5       // LAW-57
  nextRetryAt      DateTime
  inDeadLetter     Boolean = false
  deadLetterAt     DateTime?
  deadLetterReason String?
  lockedBy         String?       // processor id
  lockedAt         DateTime?
}
```

### ۲۱.۸ الگوریتم Retry (Exponential Backoff)

```
attempt 1: send → fail → nextRetryAt = now + 2^1 * 10s = 20s
attempt 2: send → fail → nextRetryAt = now + 2^2 * 10s = 40s
attempt 3: send → fail → nextRetryAt = now + 2^3 * 10s = 80s
attempt 4: send → fail → nextRetryAt = now + 2^4 * 10s = 160s
attempt 5: send → fail → movedToDLQ = true, deadLetterAt = now
```

### ۲۱.۹ NotificationPreference

```prisma
model NotificationPreference {
  userId          String  // 1:1
  emailEnabled    Boolean = true
  smsEnabled      Boolean = true
  pushEnabled     Boolean = true
  whatsappEnabled Boolean = false
  inappEnabled    Boolean = true
  language        String = 'fa'
  quietHoursStart String?  // "22:00"
  quietHoursEnd   String?  // "07:00"
}
```

### ۲۱.۱۰ الگوریتم کامل ارسال

```
[Trigger] event → InboxHandler → POST /api/v1/notifications/send
   OR
[Manual] کاربر → POST /api/v1/notifications/send

INPUT: { templateCode, channel, recipientId, recipientAddress, variables }

1. یافتن template (code, version=latest, language, channel, status='published')
   └─ اگر نبود → 404 TEMPLATE_NOT_FOUND
2. LAW-55: رندر با Template Engine (deterministic)
   ├─ renderedBody = renderString(bodyTemplate, variables)
   └─ renderedSubject = renderString(subjectTemplate, variables) (در صورت وجود)
3. LAW-57: محاسبه idempotencyKey = SHA-256(...)
4. بررسی: Notification با همین idempotencyKey وجود دارد؟
   └─ اگر بله → بازگشت همان Notification (at-most-once)
5. در صورت وجود NotificationPreference برای recipientId:
   ├─ اگر channel غیرفعال در preference → skip (یا fallback به کانال جایگزین؟)
   └─ در صورت quiet hours → تأخیر تا پایان quiet hours
6. ایجاد Notification (status='pending')
7. ایجاد NotificationQueue (priority=100, attempt=0, maxAttempts=5, nextRetryAt=now)
8. Outbox: notification.created
9. Outbox: notification.queued
10. بازگشت: notificationId

[Worker] (هر ۵ ثانیه) POST /api/v1/notification-queue/process
1. یافتن queue items: WHERE nextRetryAt <= now AND inDeadLetter=false AND lockedBy=null
2. قفل‌گذاری: lockedBy = processor_id, lockedAt = now
3. برای هر آیتم:
   a. یافتن Provider برای channel (DEFAULT_PROVIDERS یا override)
   b. فراخوانی Provider.send({ to: recipientAddress, subject, body })
   c. در صورت موفقیت:
      - Notification.status = 'sent', sentAt = now
      - ایجاد NotificationDelivery (attempt, status='sent', response, durationMs)
      - Outbox: notification.sent
      - رهاسازی قفل
   d. در صورت شکست:
      - ایجاد NotificationDelivery (attempt, status='failed', errorMessage)
      - attempt + 1
      - اگر attempt < maxAttempts:
        - محاسبه backoff = 2^attempt * base
        - Notification.status = 'retrying'
        - QueueItem.nextRetryAt = now + backoff
        - رهاسازی قفل
        - Outbox: notification.retrying
      - اگر attempt >= maxAttempts:
        - Notification.status = 'failed', failedAt = now
        - QueueItem.inDeadLetter = true, deadLetterAt = now
        - Outbox: notification.failed (movedToDLQ=true)
        - رهاسازی قفل
```

---

## ۲۲. مدل گزارش (Reporting Model)

این بخش ۶ گزارش مالی واقعی را از روی `src/app/api/v1/reports/*/route.ts` مستند می‌کند.

### ۲۲.۱ اصول گزارش‌گیری (LAW-46, 47, 48)

- **Read-only}: گزارش‌ها فقط خواندنی هستند.
- **Derived}: تمام اعداد از JournalEntry‌های posted مشتق می‌شوند (نه از مقادیر ذخیره‌شده).
- **Period-aware}: تمام گزارش‌ها تاریخ یا بازه دریافت می‌کنند.

### ۲۲.۲ Dashboard (KPI)

`GET /api/v1/reports/dashboard`

خروجی:
```json
{
  "kpis": {
    "revenue": 0,      // مجموع credit حساب‌های revenue در سال جاری
    "expense": 0,      // مجموع debit حساب‌های expense
    "profit": 0,       // revenue - expense
    "cash": 0,         // موجودی CASH
    "ar": 0,           // موجودی AR
    "ap": 0,           // موجودی AP
    "inventory": 0,    // موجودی INV
    "grossMargin": 0,  // profit / revenue * 100
    "currentRatio": 0, // (cash + ar + inventory) / ap
    "quickRatio": 0,   // (cash + ar) / ap
    "workingCapital": 0
  },
  "trends": {
    "monthly": [
      { "month": "2024-01", "revenue": 0, "expense": 0, "profit": 0 }
    ]
  },
  "period": { "from": "...", "to": "..." }
}
```

### ۲۲.۳ Balance Sheet

`GET /api/v1/reports/balance-sheet?asOf=2024-12-29`

محاسبه:
- برای هر حساب asset/liability/equity:
  - موجودی = SUM(debit - credit) برای asset/expense (debit nature)
  - موجودی = SUM(credit - debit) برای liability/equity/revenue (credit nature)
  - در تاریخ asOf
- گروه‌بندی بر اساس accountType
- باید: Total Assets === Total Liabilities + Total Equity

### ۲۲.۴ Profit & Loss

`GET /api/v1/reports/profit-loss?from=2024-01-01&to=2024-12-29`

محاسبه:
- Revenue = SUM(credit - debit) برای حساب‌های revenue در بازه
- Expense = SUM(debit - credit) برای حساب‌های expense در بازه
- Gross Profit = Revenue - COGS (در صورت تفکیک)
- Net Profit = Revenue - Total Expense

### ۲۲.۵ Cash Flow

`GET /api/v1/reports/cash-flow?period=2024-Q4`

محاسبه (indirect method):
- شروع با Net Income
- + Depreciation (non-cash expense)
- + Changes in Working Capital:
  - - ΔAR (افزایش AR = خروج نقد)
  - + ΔAP (افزایش AP = ورود نقد)
  - - ΔInventory
- + Investing Activities (خرید/فروش دارایی ثابت)
- + Financing Activities (وام، سود سهام)
- = Net Change in Cash

### ۲۲.۶ Equity Changes

`GET /api/v1/reports/equity?from=2024-01-01&to=2024-12-29`

محاسبه:
- Opening Balance (اول دوره)
- + Share Capital injected
- + Net Income
- - Dividends
- = Closing Balance (آخر دوره)

### ۲۲.۷ Final Trial Balance

`GET /api/v1/reports/final-trial-balance?asOf=2024-12-29`

محاسبه:
- برای هر حساب: موجودی (debit یا credit) در تاریخ asOf
- باید: Total Debit === Total Credit

### ۲۲.۸ گزارش‌های دیگر (در دسترس اما نه در /reports/)

| مسیر | توضیح |
|------|-------|
| `/trial-balance` | تراز آزمایشی (interactive) |
| `/general-ledger` | دفتر کل (با فیلتر accountId) |
| `/reconciliation` | مغایرت‌گیری AR/AP با GL |
| `/ar/customers/{id}/statement` | صورتحساب مشتری |
| `/ar/customers/{id}/aging` | سن بدهی (buckets: 0-30, 31-60, 61-90, 90+) |
| `/tax/reports/vat` | گزارش ارزش افزوده |

### ۲۲.۹ گزارش‌های مورد نیاز اما NOT IMPLEMENTED

- **Inventory Valuation** — ارزش موجودی به FIFO/AVG
- **Sales by Product** — فروش به‌تفکیک محصول
- **Sales by Customer** — فروش به‌تفکیک مشتری
- **Sales by Representative** — فروش به‌تفکیک نماینده
- **Warranty Statistics** — آمار شکایت‌ها، نرخ پوشش
- **Service Performance** — میانگین زمان تعمیر، نرخ QC pass
- **Device Lifecycle** — توزیع دستگاه‌ها بر اساس status
- **Cycle Count Variance** — مغایرت شمارش
- **Aging Reports** — AR/AP aging تفکیکی

⚠️ این گزارش‌ها در **Implementation Contract #22 (Report Builder)} پوشش داده شده‌اند.

---

## ۲۳. مدل ورود/خروج داده (Import / Export)

### ۲۳.۱ وضعیت فعلی

❌ **هیچ سیستم Import/Export پیاده‌سازی نشده است.**

### ۲۳.۲ نیازهای Import

| داده | فرمت | حجم | فراوانی |
|------|------|-----|---------|
| محصولات (Product) | Excel/CSV | ۱۰۰۰–۱۰۰۰۰ رکورد | هنگام راه‌اندازی |
| سریال‌ها (ProductInstance) | Excel/CSV | ۱۰۰۰۰–۱۰۰۰۰۰ رکورد | هنگام ورود محموله |
| مشتریان (Party) | Excel/CSV | ۱۰۰–۵۰۰۰ رکورد | هنگام راه‌اندازی |
| موجودی اول دوره (Opening Balance) | Excel | ۱۰۰–۲۰۰۰ رکورد | هنگام راه‌اندازی |
| چارت حساب‌ها | Excel | ۱۰۰–۵۰۰ رکورد | هنگام راه‌اندازی |
| موجودی انبار اول دوره | Excel | ۱۰۰–۲۰۰۰ رکورد | هنگام راه‌اندازی |

### ۲۳.۳ نیازهای Export

| داده | فرمت | فراوانی |
|------|------|---------|
| لیست محصولات | Excel | هفتگی |
| گزارش فروش | Excel/PDF | ماهانه |
| گزارش موجودی | Excel | روزانه |
| صورت‌های مالی | PDF | ماهانه/سالانه |
| صورتحساب مشتری | PDF | هنگام درخواست |
| فاکتور | PDF | هنگام صدور |
| لیست دستگاه‌ها و گارانتی | Excel | هنگام درخواست |
| داده‌های Backup | SQL/JSON | روزانه |

### ۲۳.۴ معماری پیشنهادی

```
[Upload] POST /api/v1/imports
├── فرمت: multipart/form-data با file
├── تعیین: { entityType, format, mode (insert|update|upsert) }
├── ذخیره فایل در FileStorage (نه پیاده‌سازی شده)
├── ایجاد ImportJob با status='pending'
└── بازگشت: jobId

[Process] (async — توسط worker)
├── parse file (Excel/CSV/JSON)
├── validate هر رکورد (با schema)
├── در صورت invalid: collect errors
├── batch insert (مثلاً ۱۰۰ رکورد در هر tx)
├── بروزرسانی ImportJob: status='processing', progress=...
├── در صورت خطای بحرانی: status='failed', errorMessage
└── در صورت موفقیت: status='completed', successCount, errorCount

[Status] GET /api/v1/imports/{jobId}
└─ بازگشت: { status, progress, successCount, errorCount, errors[] }

[Export] POST /api/v1/exports
├── تعیین: { entityType, format, filters }
├── ایجاد ExportJob
└── بازگشت: jobId

[Download] GET /api/v1/exports/{jobId}/download
└─ بازگشت: فایل (Excel/PDF/CSV)
```

⚠️ در **Implementation Contract #23 و #35} پوشش داده شده.

---

## ۲۴. مدل هوش مصنوعی و اتوماسیون (AI / Automation)

### ۲۴.۱ وضعیت فعلی

❌ **کاملاً NOT IMPLEMENTED.**

سند چشم‌انداز قابلیت‌های AI زیر را ذکر می‌کند:
- AI Assistant برای پشتیبانی مشتری
- پیش‌بینی فروش (Sales Forecasting)
- تشخیص anomalous orders (تقلب)
- پیشنهاد محصول (Product Recommendation)
- OCR برای اسکن فاکتور کاغذی
- NLP برای طبقه‌بندی شکایات گارانتی

هیچ‌کدام در کد موجود نیست.

### ۲۴.۲ معماری پیشنهادی

```
┌─────────────────────────────────────────────┐
│         AI / Automation Module              │
├─────────────────────────────────────────────┤
│ 1. AI Assistant (chat)                      │
│    - RAG over product/warranty docs         │
│    - LLM: GPT-4 / Claude / Gemini           │
│    - Vector DB: pgvector / Qdrant           │
├─────────────────────────────────────────────┤
│ 2. Forecasting                              │
│    - Time series (Prophet / ARIMA)          │
│    - Sales, Inventory demand                │
│    - Schedule: nightly                      │
├─────────────────────────────────────────────┤
│ 3. Anomaly Detection                        │
│    - Statistical (z-score, IQR)             │
│    - ML (Isolation Forest)                  │
│    - Triggers: large orders, unusual discount│
├─────────────────────────────────────────────┤
│ 4. Recommendation                           │
│    - Collaborative filtering                │
│    - Content-based                          │
│    - Triggered on: order create, product view│
├─────────────────────────────────────────────┤
│ 5. OCR                                      │
│    - Tesseract / Google Vision              │
│    - For: paper invoice, receipt            │
├─────────────────────────────────────────────┤
│ 6. NLP                                      │
│    - Text classification (warranty claim)   │
│    - Sentiment analysis (customer feedback) │
└─────────────────────────────────────────────┘
```

⚠️ در **Implementation Contract #21 (AI Assistant)} و **#24 (AI/Automation)} پوشش داده شده.

---

## ۲۵. مدل چندمستاجری (Multi-Tenant)

### ۲۵.۱ مدل انتخابی (از تصمیم Step 1 کاربر)

> **Shared Database + tenant_id** — Multi-Tenant Ready اما تک-Tenant در V1.

### ۲۵.۲ پیاده‌سازی فعلی

| شاخص | مقدار |
|------|-------|
| مدل‌های tenant-scoped | ۸۵+ (تمام مدل‌ها به‌جز Permission و چند مدل سیستمی) |
| ستون tenantId در schema | ۱۸۵+ ارجاع |
| Unique constraint‌های tenant-scoped | همه `@@unique([tenantId, ...])` |
| Index‌های tenant-scoped | همه `@@index([tenantId, ...])` |
| getTenantId() | از JWT (در production) یا fallback به slug='bismark' (در sandbox) |

### ۲۵.۳ الگوریتم getTenantId (در sandbox)

```typescript
// src/lib/api-helpers.ts
export async function getTenantId(): Promise<string> {
  const ctx = getTenantContext().getTenantId()
  if (ctx) return ctx  // از middleware (auth)
  
  // Sandbox fallback
  const tenant = await db.tenant.findFirst({ where: { slug: 'bismark' } })
  if (!tenant) throw new Error('No tenant found. Run: bun run src/lib/seed.ts')
  
  getTenantContext().setTenant(tenant.id, tenant.slug)
  return tenant.id
}
```

### ۲۵.۴ الگوریتم getTenantId (پیشنهادی برای production)

```
1. Middleware در هر درخواست:
   a. استخراج JWT از Authorization header
   b. اعتبارسنجی JWT (signature, expiry)
   c. استخراج tenantId, userId, roles از claims
   d. setTenantContext(tenantId, ...)
2. در API route:
   a. const tenantId = await getTenantId()
   b. تمام query‌ها با where: { tenantId, ... }
3. در Repository (در Laravel):
   a. global scope: WHERE tenant_id = current_tenant
   b. جلوگیری از cross-tenant access
```

### ۲۵.۵ شکاف‌های Multi-Tenant

| شکاف | توضیح | ریسک |
|------|-------|------|
| **نه authentication}: بدون JWT، tenantId از fallback خوانده می‌شود | همه به tenant پیش‌فرض دسترسی دارند | 🚨 بحرانی |
| **نه Row-Level Security**: PostgreSQL RLS فعال نیست | در صورت خطای برنامه، cross-tenant ممکن است | بالا |
| **نه tenant-scoped BusinessCodeSequence isolation**: درست است که unique است، اما تست نشده | در concurrency ممکن است مشکل ایجاد شود | متوسط |
| **نه tenant management UI**: برای افزودن tenant جدید | در V1 نیازی نیست (تک-tenant) | کم |
| **نه tenant-specific configuration**: همه tenant‌ها همان config را دارند | برای SaaS آینده لازم | کم |

### ۲۵.۶ مدل Multi-Company (پیشنهادی برای آینده)

اگر کاربر بخواهد یک tenant چند شرکت مستقل داشته باشد:

```prisma
model Company {
  id        String   @id @default(cuid())
  tenantId  String   // شرکت‌ها داخل یک tenant
  name      String
  code      String
  parentId  String?  // گروه شرکت‌ها
  ...
}

// تمام مدل‌های business: اضافه شدن companyId
// مثلاً: SalesOrder.companyId, Invoice.companyId, ...
```

⚠️ این در **Implementation Contract #32 (Multi-company)} پوشش داده شده است.

---

## ۲۶. مدل مقیاس‌پذیری (Scalability)

### ۲۶.۱ وضعیت فعلی

| لایه | مقیاس‌پذیری | توضیح |
|------|-------------|-------|
| **Application** | افقی (stateless) | Next.js routes بدون state — scalable با load balancer |
| **Database (SQLite)** | ❌ عمودی فقط | SQLite فقط single-writer — bottleneck |
| **Database (PostgreSQL)** | ✅ عمودی + Read Replica | در production پیشنهادی |
| **Outbox Dispatcher** | ⚠️ single instance | در حال حاضر یک worker — نیازمند distributed lock |
| **Inbox Worker** | ⚠️ single instance | نیازمند consumer groups |
| **Notification Queue Processor** | ⚠️ single instance | با lock 但 نیازمند coordination |
| **Snapshot Worker** | ⚠️ single instance | با lock |
| **Cache** | ❌ NOT IMPLEMENTED | Redis پیشنهادی |
| **Search** | ❌ NOT IMPLEMENTED | PostgreSQL GIN یا Elasticsearch |
| **File Storage** | ❌ NOT IMPLEMENTED | MinIO/S3 |
| **Message Queue** | ❌ NOT IMPLEMENTED (in-process) | Redis Streams یا Kafka برای production |

### ۲۶.۲ Bottleneck‌های شناسایی‌شده

#### ۲۶.۲.۱ SQLite Single-Writer

🚨 **بحرانی}: SQLite فقط یک writer همزمان را پشتیبانی می‌کند. در زمان بار بالا:
- Outbox Dispatcher polling هر ۵ ثانیه
- Inbox Worker پردازش
- Notification Queue Processor
- API requests (POST)
- همه با هم رقابت می‌کنند → lock contention → timeout

**راه‌حل}: Migration به PostgreSQL (در Implementation Contract #27).

#### ۲۶.۲.۲ In-Process Event Bus

`PrismaEventBus` در `src/lib/shared/infra/prisma-event-bus.ts` از type‌های Node.js EventEmitter استفاده می‌کند:
- فقط در همان process کار می‌کند.
- اگر چند instance از application داشته باشیم (مثلاً ۳ پاد Kubernetes)، هر instance فقط رویدادهای خودش را می‌بیند.
- Saga‌ها ممکن است در یک instance شروع شوند ولی رویداد تکمیل در instance دیگری منتشر شود → Saga گیر می‌کند.

**راه‌حل}: Redis Pub/Sub یا Redis Streams به‌عنوان message broker.

#### ۲۶.۲.۳ Outbox Polling

Outbox Dispatcher هر ۵ ثانیه polling می‌کند:
- در حجم پایین: مناسب.
- در حجم بالا: نیازمند تغییر به LISTEN/NOTIFY PostgreSQL یا Redis Stream.

#### ۲۶.۲.۴ Snapshot Worker

Snapshot‌ها فقط nightly تولید می‌شوند — در حجم بالا، محاسبه موجودی از ledger کند می‌شود.

**راه‌حل}: Snapshot هر ساعت یا threshold-based (پس از هر ۱۰۰۰ transaction).

#### ۲۶.۲.۵ Notification Queue

پردازش تک‌نمونه‌ای:
- اگر یک worker ۱۰۰ اعلان را process کند، workers دیگر بیکار می‌مانند.
- با `lockedBy` قفل‌گذاری شده اما نیازمند heartbeat برای تشخیص worker مرده.

**راه‌حل}: Multiple workers با heartbeat + visibility timeout.

### ۲۶.۳ مدل مقیاس‌پذیری پیشنهادی (Production)

```
                    ┌──────────────────┐
                    │   Cloudflare     │
                    │   WAF + DDoS     │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │   Nginx (LB)     │
                    └────────┬─────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼────┐         ┌────▼────┐         ┌────▼────┐
   │ App 1   │         │ App 2   │         │ App 3   │
   │ Next.js │         │ Next.js │         │ Next.js │
   └────┬────┘         └────┬────┘         └────┬────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                              │
       ┌──────▼──────┐               ┌──────▼──────┐
       │ PostgreSQL  │               │   Redis     │
       │ Primary     │◄───repl────── │ (cache +    │
       │ + Read Repl │               │  pub/sub)   │
       └─────────────┘               └─────────────┘
              │
       ┌──────┴──────┐
       │  Workers    │
       │ - Outbox    │
       │ - Inbox     │
       │ - Snapshot  │
       │ - Notif     │
       └─────────────┘
```

### ۲۶.۴ شاخص‌های عملکردی مورد انتظار

| شاخص | هدف | ابزار اندازه‌گیری |
|------|-----|-------------------|
| API Latency p50 | < 200ms | Prometheus + Grafana |
| API Latency p95 | < 1s | |
| API Latency p99 | < 3s | |
| Throughput | 1000 req/s | |
| DB Connection Pool | 20–50 conns | |
| Outbox Lag | < 5s | |
| Notification Send Time | < 30s (p95) | |
| Report Generation | < 10s | |

⚠️ در **Implementation Contract #23 (Performance & Caching)} پوشش داده شده.

---

## ۲۷. پشتیبان‌گیری و بازیابی فاجعه (Backup / DR)

### ۲۷.۱ وضعیت فعلی

❌ **هیچ سیستم Backup/DR پیاده‌سازی نشده است.**

### ۲۷.۲ نیازهای Backup

| داده | فراوانی | نوع | Retention |
|------|---------|------|-----------|
| PostgreSQL Full | روزانه | pg_dump | ۳۰ روز |
| PostgreSQL WAL | پیوسته | archive_command | ۷ روز |
| SQLite (در sandbox) | روزانه | copy file | ۷ روز |
| File Storage | روزانه | rsync / rclone | ۳۰ روز |
| Redis | hourly | RDB + AOF | ۲۴ ساعت |
| Configuration | هنگام تغییر | git | همیشگی |

### ۲۷.۳ استراتژی Recovery

| RPO (Recovery Point Objective) | RTO (Recovery Time Objective) |
|--------------------------------|-------------------------------|
| ۱۵ دقیقه (با WAL streaming) | ۱ ساعت (با automated restore) |

### ۲۷.۴ معماری پیشنهادی

```
[Primary DB]
    │
    ├── WAL Streaming → [Standby DB] (hot standby, synchronous)
    │
    ├── Daily Full Backup → [S3 / MinIO] (encrypted, 30 days)
    │
    └── WAL Archive → [S3 / MinIO] (7 days)
    
[Restore Procedure]
    1. Restore latest full backup
    2. Replay WAL up to target time
    3. Validate (checksum, row count)
    4. Switch application to restored DB
    
[Disaster Recovery]
    1. Promote standby to primary
    2. Update DNS / load balancer
    3. Rebuild standby from new primary
```

### ۲۷.۵ تست DR

- **Monthly DR Drill**: شبیه‌سازی فاجعه کامل، restore در محیط ایزوله، تست عملکرد.
- **Quarterly Full DR**: تست switchover به standby.

⚠️ در **Implementation Contract #27 (Backup/DR)} پوشش داده شده.

---

## ۲۸. استراتژی تست (Testing Strategy)

### ۲۸.۱ وضعیت فعلی

| نوع تست | تعداد فایل | تعداد تست | وضعیت |
|---------|-----------|-----------|-------|
| Unit — Shared Kernel | ۱ (`shared-kernel.test.ts`) | ۲۶ | ✅ |
| Unit — Business Logic | ۱ (`business-logic.test.ts`) | ۱۹ | ✅ |
| Unit — Architecture Laws | ۱ (`architecture-laws.test.ts`) | ۱۷ | ✅ |
| Integration | ۰ | ۰ | ❌ NOT IMPLEMENTED |
| E2E | ۰ | ۰ | ❌ NOT IMPLEMENTED |
| Load | ۰ | ۰ | ❌ NOT IMPLEMENTED |
| Security | ۰ | ۰ | ❌ NOT IMPLEMENTED |

**جمع}: ۳ فایل، ۶۸ تست.

### ۲۸.۲ پوشش فعلی

| ماژول | پوشش | توضیح |
|-------|------|-------|
| Shared Kernel (value-objects, helpers) | ✅ خوب | UuidV7, Money, DateRange, PersianCalendar, BusinessCodeGenerator |
| Architecture Laws | ✅ خوب | ۱۷ قانون تست شده |
| Business Logic | ⚠️ حداقلی | فقط ۱۹ تست برای الگوهای اصلی |
| API Routes | ❌ صفر | هیچ تستی برای ۱۱۸ مسیر |
| Event Handlers | ❌ صفر | هیچ تستی برای cross-context handlers |
| Financial Handlers | ❌ صفر | هیچ تستی برای JE creation از رویدادها |
| Saga Manager | ❌ صفر | هیچ تستی برای saga lifecycle |
| Notification Service | ❌ صفر | هیچ تستی برای dispatch/retry |
| Template Engine | ❌ صفر | ⚠️ مستندات دارد اما تست نه |
| Rule Engine | ❌ صفر | هیچ تستی برای conditionDsl evaluation |
| Workflow Engine | ❌ صفر | هیچ تستی برای transition |
| Database | ❌ صفر | هیچ تستی برای schema/migration |
| Multi-Tenant Isolation | ❌ صفر | هیچ تستی برای tenant isolation |

### ۲۸.۳ استراتژی تست پیشنهادی

#### ۲۸.۳.۱ هرم تست

```
        ┌─────────┐
        │   E2E   │  5%  (Playwright, critical flows)
        └─────────┘
       ┌───────────┐
       │ Integration│  20% (API + DB)
       └───────────┘
      ┌──────────────┐
      │    Unit      │  75% (services, value-objects, laws)
      └──────────────┘
```

#### ۲۸.۳.۲ ابزارهای پیشنهادی

| لایه | ابزار | توضیح |
|------|-------|-------|
| Unit | Vitest (موجود) | ✅ |
| Integration | Vitest + Testcontainers | برای PostgreSQL تست |
| API | Supertest + Vitest | برای route handlers |
| E2E | Playwright | برای critical user journeys |
| Load | k6 | برای load testing |
| Security | OWASP ZAP | برای vulnerability scanning |
| Coverage | Vitest c8 | ✅ (موجود اما فقط src/lib/**) |

#### ۲۸.۳.۳ تست‌های مورد نیاز

**Unit Tests (افزایش از ۶۸ به ۵۰۰+)**:

| ماژول | تست‌های لازم |
|-------|--------------|
| BusinessCodeGenerator | ۲۵+ (هر کد تعریف‌شده) |
| PersianCalendar | ۲۰+ (تبدیل، کبیسه، سال نو) |
| Money | ۱۵+ (arithmetic, comparison, currency) |
| UuidV7 | ۱۰+ (generation, parsing, ordering) |
| DateRange | ۱۰+ (overlap, contains, intersection) |
| TemplateEngine | ۳۰+ (هر syntax feature) |
| Rule Engine (evaluateCondition) | ۲۰+ (هر operator) |
| Saga Manager | ۱۵+ (start, advance, fail, compensate) |
| IdempotencyHelper | ۱۰+ (check, store, expire) |
| OptimisticLockHelper | ۱۰+ (success, conflict) |
| UnitOfWork | ۵+ (commit, rollback, nested) |
| NotificationService | ۲۰+ (dispatch, retry, DLQ, cancel) |

**Integration Tests (new)**:

- Sales Order CRUD
- Shipment pick/pack/ship/deliver
- Invoice issue/cancel/reverse
- Payment allocate/unallocate
- Return order full saga
- Warranty activate/claim/approve
- Service order diagnose/consume/qc/deliver
- Inventory IN/OUT/TRANSFER/ADJUSTMENT
- Cycle count complete flow
- Journal entry create/reverse
- Fiscal period close
- Workflow transition
- Rule evaluation
- Notification send + retry
- Multi-tenant isolation (cross-tenant access blocked)

**E2E Tests (new)** — ۱۵+ سناریو:

1. Customer purchase full flow
2. Dealer sales with discount approval
3. Warranty claim → service → delivery
4. Return → refund → reconciliation
5. Stock transfer between warehouses
6. Cycle count → adjustment
7. Manual journal entry → reverse
8. Fiscal year close
9. Notification template setup + send
10. Workflow definition + transition
11. Rule set definition + evaluation
12. Device timeline query
13. Financial dashboard
14. AR aging report
15. VAT report

⚠️ در **Implementation Contract #26 (Testing)} پوشش داده شده.

---

## ۲۹. معماری تولید (Production Architecture)

### ۲۹.۱ معماری پیشنهادی (بر اساس سند چشم‌انداز + کد موجود)

```
┌──────────────────────────────────────────────────────────────────┐
│                          Client Layer                             │
├──────────────────────────────────────────────────────────────────┤
│  Web (Next.js) │ Mobile (Flutter) │ API (third-party)            │
└────────┬─────────────────┬───────────────────┬──────────────────┘
         │                 │                   │
         └─────────────────┼───────────────────┘
                           │ HTTPS
                  ┌────────▼────────┐
                  │   Cloudflare    │
                  │   WAF + CDN     │
                  └────────┬────────┘
                           │
                  ┌────────▼────────┐
                  │   Nginx (LB)    │
                  │   SSL + Routing │
                  └────────┬────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
   │ Web 1   │       │ Web 2   │       │ Web 3   │
   │ (Next)  │       │ (Next)  │       │ (Next)  │
   └────┬────┘       └────┬────┘       └────┬────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
              ┌────────────┴────────────┐
              │                          │
       ┌──────▼──────┐          ┌──────▼──────┐
       │ PostgreSQL  │          │   Redis     │
       │ Primary     │          │ - cache     │
       │ + Read Repl │          │ - pub/sub   │
       │ + WAL Arch  │          │ - rate limit│
       └──────┬──────┘          └─────────────┘
              │
       ┌──────┴───────────────────┐
       │                          │
  ┌────▼─────┐          ┌────────▼────────┐
  │  MinIO   │          │    Workers      │
  │ (files)  │          │ - outbox        │
  └──────────┘          │ - inbox         │
                        │ - snapshot      │
                        │ - notification  │
                        │ - scheduler     │
                        └─────────────────┘
```

### ۲۹.۲ پشته فناوری پیشنهادی (مطابق سند چشم‌انداز)

| لایه | فناوری | نسخه | دلیل |
|------|--------|------|------|
| Backend | Laravel | 12 | سند چشم‌انداز (قفل‌شده) |
| Frontend | Next.js | 16 | سند چشم‌انداز |
| Mobile | Flutter | latest | سند چشم‌انداز (آفلاین‌اول) |
| Database | PostgreSQL | 16 | سند چشم‌انداز |
| Cache/Queue | Redis | 7 | سند چشم‌انداز |
| Search | PostgreSQL GIN + JSONB | — | سند چشم‌انداز (نه Elasticsearch در V1) |
| File Storage | MinIO | latest | S3-compatible |
| Web Server | Nginx | 1.25 | SSL + reverse proxy |
| Container | Docker | 24+ | استقرار |
| Orchestration | Docker Compose (V1) / Kubernetes (V2) | — | |
| CI/CD | GitHub Actions | — | موجود |
| Monitoring | Prometheus + Grafana | — | پیشنهادی |
| Log Aggregation | ELK / Loki | — | پیشنهادی |
| APM | Sentry / OpenTelemetry | — | پیشنهادی |

### ۲۹.۳ راه‌اندازی محیط Production

#### ۲۹.۳.۱ پیش‌نیازها

- سرور لینوکس (Ubuntu 22.04+) با ۸ core CPU و ۱۶GB RAM
- ۱۰۰GB SSD (برای PostgreSQL + MinIO)
- دامنه + گواهینامه SSL (Let's Encrypt)
- Cloudflare account (برای WAF + CDN)

#### ۲۹.۳.۲ مراحل راه‌اندازی

1. **نصب Docker و Docker Compose**
2. **clone پروژه و کپی `.env.production`**
3. **پیکربندی nginx با SSL**
4. **اجرای `docker-compose -f docker-compose.production.yml up -d`**
5. **اجرای migration: `php artisan migrate --force`**
6. **اجرای seed: `php artisan db:seed --force`**
7. **ایجاد tenant اولیه و کاربر admin**
8. **ایجاد chart of accounts پیش‌فرض**
9. **ایجاد workflow‌ها و rule-sets پیش‌فرض**
10. **ایجاد notification templates پیش‌فرض** (`POST /api/v1/notification/templates/seed-defaults`)
11. **تست سلامت: `GET /api/v1/system/health`**
12. **پیکربندی Cloudflare DNS + WAF rules**
13. **پیکربندی backup automated**
14. **اجرای اولین DR drill**

### ۲۹.۴ پیکربندی nginx (پیشنهادی)

```nginx
upstream bismark_web {
    server web-1:3000;
    server web-2:3000;
    server web-3:3000;
}

server {
    listen 443 ssl http2;
    server_name bismark.example.com;
    
    ssl_certificate /etc/ssl/bismark.crt;
    ssl_certificate_key /etc/ssl/bismark.key;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Content-Security-Policy "default-src 'self'; ..." always;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://bismark_web;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location / {
        proxy_pass http://bismark_web;
    }
}
```

### ۲۹.۵ پیکربندی PostgreSQL (پیشنهادی)

```ini
# postgresql.conf
max_connections = 100
shared_buffers = 4GB
effective_cache_size = 12GB
work_mem = 64MB
maintenance_work_mem = 1GB
wal_level = replica
max_wal_senders = 3
wal_keep_size = 1GB
archive_mode = on
archive_command = 'aws s3 cp %p s3://bismark-wal/%f'
log_min_duration_statement = 1000
```

### ۲۹.۶ پیکربندی Redis (پیشنهادی)

```conf
# redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
appendonly yes
appendfsync everysec
save 900 1
save 300 10
save 60 10000
```

---

## ۳۰. استراتژی مهاجرت (Migration Strategy)

این بخش استراتژی مهاجرت از **SQLite sandbox فعلی} به **PostgreSQL production} را مستند می‌کند.

### ۳۰.۱ وضعیت فعلی

| شاخص | مقدار |
|------|-------|
| Database | SQLite (`db/custom.db`, ۱.۵MB) |
| Schema | Prisma (`prisma/schema.prisma`, ۲۳۷۰ خط) |
| Migration‌ها | یک migration اولیه |
| Data | tenant + چند user/role/branch (از seed) |

### ۳۰.۲ اهداف مهاجرت

1. **Schema Preservation**: حفظ ۸۹ مدل با همان ساختار (تنها تغییرات نوع داده).
2. **Data Migration**: انتقال داده‌های sandbox به PostgreSQL (در صورت لزوم).
3. **Performance**: بهره‌گیری از قابلیت‌های PostgreSQL (JSONB, GIN, UUID v7, Partitioning).
4. **Compatibility**: حفظ سازگاری با Laravel (طبق سند چشم‌انداز).

### ۳۰.۳ تغییرات Schema لازم

| تغییر | توضیح |
|------|-------|
| `String @id @default(cuid())` → `String @id @default(uuid_v7())` | UUID v7 (LAW-01) |
| `Json` → `JsonB` (در PostgreSQL) | عملکرد بهتر برای query |
| `String` برای enum → PostgreSQL ENUM type | اعتبارسنجی سطح DB |
| `Float` → `Numeric(18,4)` | دقت مالی |
| اضافه کردن `CHECK` constraint‌ها | اعتبارسنجی سطح DB |
| اضافه کردن Partial Index‌ها | عملکرد query‌های tenant-scoped |
| اضافه کردن GIN Index روی JSONB | query روی attributes |
| `@@index` → CREATE INDEX با `CONCURRENTLY` | بدون lock |
| اضافه کردن Row-Level Security | multi-tenant isolation |

### ۳۰.۴ مراحل مهاجرت

#### مرحله ۱: Setup PostgreSQL (۱ روز)

```bash
# 1. نصب PostgreSQL 16
# 2. ایجاد database و user
sudo -u postgres createuser -P bismark
sudo -u postgres createdb -O bismark bismark_prod

# 3. پیکربندی pg_hba.conf (SSL فقط)
# 4. پیکربندی postgresql.conf (برای production)
# 5. راه‌اندازی archive_command برای WAL backup
```

#### مرحله ۲: تبدیل Prisma Schema (۲ روز)

```bash
# 1. تغییر datasource در schema.prisma:
#    datasource db {
#      provider = "postgresql"
#      url      = env("DATABASE_URL")
#    }

# 2. اجرای prisma migrate:
bunx prisma migrate dev --name init_postgresql --create-only

# 3. ویرایش migration برای:
#    - UUID v7 default
#    - JSONB
#    - CHECK constraints
#    - GIN indexes
#    - RLS policies

# 4. اجرای migration:
bunx prisma migrate deploy
```

#### مرحله ۳: داده‌های اولیه (۱ روز)

```bash
# 1. اجرای seed:
bun run src/lib/seed.ts

# 2. ایجاد tenant پیش‌فرض
# 3. ایجاد admin user
# 4. ایجاد chart of accounts پیش‌فرض
# 5. ایجاد notification templates پیش‌فرض:
#    curl -X POST http://localhost:3000/api/v1/notification/templates/seed-defaults
```

#### مرحله ۴: Migration داده‌های موجود (در صورت لزوم)

```bash
# 1. Export از SQLite:
sqlite3 db/custom.db .dump > sandbox_dump.sql

# 2. تبدیل دستی syntax (SQLite → PostgreSQL):
#    - AUTOINCREMENT → SERIAL/UUID
#    - PRAGMA → COMMENT
#    - типов uint → bigint

# 3. Import به PostgreSQL:
psql bismark_prod < converted_dump.sql

# 4. اعتبارسنجی: row counts، checksums
```

#### مرحله ۵: تست (۳ روز)

```bash
# 1. اجرای تمام unit tests:
bun test

# 2. اجرای integration tests (با PostgreSQL):
bun test:integration

# 3. اجرای E2E tests:
bun test:e2e

# 4. تست load:
k6 run load-test.js

# 5. تست security:
zap-cli quick-scan http://localhost:3000
```

#### مرحله ۶: Deployment (۱ روز)

```bash
# 1. Pull latest code:
git pull origin main

# 2. Build Docker images:
docker-compose -f docker-compose.production.yml build

# 3. Deploy:
docker-compose -f docker-compose.production.yml up -d

# 4. Run migrations:
docker-compose exec app php artisan migrate --force

# 5. Health check:
curl https://bismark.example.com/api/v1/system/health
```

### ۳۰.۵ RISKS و Mitigation

| ریسک | احتمال | تأثیر | Mitigation |
|------|--------|-------|------------|
| نوع داده ناسازگار | بالا | متوسط | تست روی staging قبل از production |
| از دست رفتن داده | کم | بحرانی | backup قبل از migration |
| Performance regression | متوسط | متوسط | query tuning پس از migration |
| Application bugs | متوسط | متوسط | E2E tests قبل از cutover |
| Lock contention در زمان migration | متوسط | بالا | maintenance window |

### ۳۰.۶ Rollback Plan

اگر پس از cutover مشکلی پیش آمد:

1. **< ۱ ساعت}: rollback آسان با redirect به SQLite (در صورت نگهداری).
2. **> ۱ ساعت}: snapshot از PostgreSQL، تحلیل مشکل، fix forward.
3. **> ۲۴ ساعت}: fallback به آخرین backup PostgreSQL (RPO: ۱۵ دقیقه).

⚠️ در **Implementation Contract #27 (PostgreSQL Migration)} پوشش داده شده.

---

## ۳۱. قرارداد پیاده‌سازی قابلیت‌ها (Implementation Contract)

این بخش برای هر یک از ۳۵ قابلیت، یک قرارداد دقیق ارائه می‌دهد که به‌گونه‌ای نوشته شده که هر ایجنت یا تیم آینده بتواند بدون حدس و گمان آن را پیاده‌سازی کند.

هر قرارداد شامل ۱۶ بخش است:
- Feature (نام قابلیت)
- Business Goal (هدف کسب‌وکار)
- User (نقش کاربر)
- Preconditions (پیش‌نیازها)
- Flow (مراحل گام‌به‌گام)
- Business Rules (قوانین)
- Entities (موجودیت‌ها)
- Database Changes (تغییرات DB)
- APIs (رابط‌های API)
- Events (رویدادها)
- Permissions (مجوزها)
- Security (ملاحظات امنیتی)
- Edge Cases (موارد خاص)
- Failure Handling (مدیریت خطا)
- Tests (نیازمندی‌های تست)
- Acceptance Criteria (معیارهای پذیرش)
- Status (وضعیت)

---


### Feature 1: Authentication & Session Management

### Business Goal
ایجاد یک سیستم احراز هویت امن (Authentication) که کاربران را با username/email/phone + password شناسایی کند، session فعال صادر کند، و از تمام ۱۱۸ مسیر API در برابر دسترسی ناشناس محافظت کند. این **بزرگ‌ترین شکاف} پروژه است و باید پیش از هر deployment production برطرف شود.

### User
- End User (همه نقش‌ها): لاگین، logout، refresh session
- Admin: ایجاد/غیرفعال‌سازی user، reset password

### Preconditions
- مدل `User`, `Session` در schema موجود است
- هیچ مسیر `/api/v1/auth/*` وجود ندارد
- `getTenantId()` در `api-helpers.ts` فعلاً fallback می‌شود — باید با auth واقعی جایگزین شود

### Flow
1. **POST /api/v1/auth/register** (در صورت نیاز): ایجاد User با password hash (Argon2id)
2. **POST /api/v1/auth/login**:
   - ورودی: `{ identifier, password, tenant? }`
   - یافتن User با (tenantId, username) یا (tenantId, email) یا (tenantId, phone)
   - بررسی: `status === 'active'` و `isActive === true`
   - بررسی: `lockedUntil` past یا null
   - اعتبارسنجی password با `argon2.verify()`
   - در صورت شکست: increment failed_attempts (در metadata)، اگر > 5 → `lockedUntil = now + 15min`
   - در صورت موفقیت: reset failed_attempts، `lastLoginAt = now`
   - ایجاد Session با `expiresAt = now + 8h` (sliding) و `absoluteExpiresAt = now + 24h` (absolute)
   - صادر کردن JWT با claims: `{ sub: userId, tid: tenantId, sid: sessionId, roles: [...], exp: ... }`
   - بازگشت: `{ access_token, refresh_token, expires_in, user: {...} }`
3. **Middleware** (در همه مسیرهای `/api/v1/*` به‌جز `/auth/login` و `/auth/register`):
   - استخراج `Authorization: Bearer <token>`
   - اعتبارسنجی JWT (signature, expiry)
   - استخراج tenantId, userId, sessionId از claims
   - بررسی: Session هنوز `active` است و `expiresAt > now`
   - در صورت sliding: `lastActivityAt = now` و اگر نزدیک expiry: تمدید
   - در صورت `absoluteExpiresAt < now`: revoke session → 401
   - setTenantContext(tenantId, userId, roles)
4. **POST /api/v1/auth/refresh**:
   - ورودی: `{ refresh_token }`
   - اعتبارسنجی refresh token
   - صدور access_token جدید
5. **POST /api/v1/auth/logout**:
   - revoke session (`status = 'revoked'`, `revokedAt = now`)
   - بازگشت: 204 No Content
6. **POST /api/v1/auth/change-password**:
   - ورودی: `{ current_password, new_password }`
   - اعتبارسنجی current
   - hash new با Argon2id
   - ذخیره در `User.passwordHash`
   - revoke تمام session‌های فعال این user
7. **POST /api/v1/auth/forgot-password**:
   - ورودی: `{ identifier }`
   - اگر user وجود داشت: ایجاد token یکبار مصرف (۱۵ دقیقه), ارسال ایمیل/SMS
   - اگر نبود: بازگشت 200 (security: information disclosure prevention)
8. **POST /api/v1/auth/reset-password**:
   - ورودی: `{ token, new_password }`
   - اعتبارسنجی token
   - hash + ذخیره password جدید
   - revoke تمام session‌ها

### Business Rules
- Password policy: حداقل ۸ کاراکتر، شامل حرف بزرگ، کوچک، عدد، نماد
- Account lockout: ۵ تلاش ناموفق → ۱۵ دقیقه قفل
- Session timeout: ۸ ساعت sliding، ۲۴ ساعت absolute
- Refresh token: ۳۰ روز، single-use (rotation)
- JWT signing: HS256 با secret ≥ 256 bit (یا RS256 با کلید عمومی/خصوصی)
- Password hash: Argon2id با memory=64MB, iterations=3, parallelism=4

### Entities
- `User` (افزودن فیلد `passwordHash`)
- `Session` (موجود)
- جدید: `PasswordResetToken` (id, userId, token, expiresAt, usedAt)
- جدید: `RefreshToken` (id, userId, token, expiresAt, revokedAt, replacedByTokenId)

### Database Changes
```sql
ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN failed_attempts INT DEFAULT 0;
ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMP;

CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  replaced_by_token_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_login ON users (tenant_id, username, status);
CREATE INDEX idx_sessions_active ON sessions (user_id, status, expires_at);
```

### APIs
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/change-password`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `GET /api/v1/auth/me` (اطلاعات کاربر فعلی)
- `GET /api/v1/auth/sessions` (لیست session‌های فعال)
- `POST /api/v1/auth/sessions/{id}/revoke`

### Events
- `user.registered` → Notification (خوش‌آمدگویی)
- `user.logged_in` → Audit
- `user.logged_out` → Audit
- `user.password_changed` → Notification
- `user.password_reset_requested` → Notification
- `user.account_locked` → Notification (به admin)
- `session.expired` → Audit
- `session.revoked` → Audit

### Permissions
- `auth.register` — عمومی (در صورت وجود self-service)
- `auth.login` — عمومی
- `auth.manage_users` — Admin
- `auth.reset_password` — Admin

### Security
- ✅ Password hash با Argon2id (نه bcrypt — Argon2id مدرن‌تر است)
- ✅ Token rotation برای refresh tokens
- ✅ Rate limiting: 5 login attempts per minute per IP
- ✅ HTTPS-only (توسط nginx)
- ✅ Secure cookies برای refresh token (HttpOnly, Secure, SameSite=Strict)
- ✅ JWT short-lived (15 min access, 30 day refresh)
- ✅ CORS whitelist
- ✅ CSRF token برای فرم‌های Web (در صورت نیاز)
- ✅ Strict transport security (HSTS)
- ✅ No sensitive data در JWT (نه password، نه PII)

### Edge Cases
- کاربر با `status='suspended'` سعی در لاگین → 403 با پیام واضح
- کاربر با `lockedUntil` در آینده → 423 LOCKED
- JWT tampered → 401
- JWT expired → 401 با `code: TOKEN_EXPIRED` (client می‌تواند refresh کند)
- Session revoked اما JWT هنوز معتبر → middleware باید session را در DB چک کند
- Concurrent login از دستگاه‌های مختلف → مجاز (تا max_sessions_per_user)
- Tenant slug در URL (مثلاً `tenant1.bismark.com`) → استخراج tenant از subdomain

### Failure Handling
- Database down در middleware → 503 با Retry-After
- Redis (برای session cache) down → fallback به DB lookup (با performance warning)
- JWT signing key leaked → rotation فوری + revoke تمام session‌ها
- Account takeover suspected → revoke تمام session‌ها + notification

### Tests
- Unit: password hash/verify، token generation/validation، session lifecycle
- Integration: login/logout/refresh flows، rate limiting
- E2E: complete login → use API → logout → access denied
- Security: brute force protection، token tampering، session fixation
- Load: 1000 concurrent logins بدون deadlock

### Acceptance Criteria
- ✅ تمام ۱۱۸ مسیر API بدون token معتبر → 401
- ✅ لاگین با password صحیح → 200 با access_token
- ✅ لاگین با password غلط → 401 با code INVALID_CREDENTIALS
- ✅ ۵ تلاش ناموفق → ۴۲۳ LOCKED
- ✅ Token expired → 401 با code TOKEN_EXPIRED
- ✅ Refresh token → access_token جدید
- ✅ Logout → session revoked → تمام درخواست‌های بعدی 401
- ✅ Rate limiting فعال (5 req/min)
- ✅ Password reset flow کامل کار می‌کند
- ✅ Password hash با Argon2id (نه plaintext)

### Status: **NOT IMPLEMENTED** — 🚨 **بزرگ‌ترین شکاف بحرانی} پروژه

---

### Feature 2: RBAC & Permission System

### Business Goal
ایجاد یک سیستم Role-Based Access Control که نقش‌ها (Role) و مجوزها (Permission) را به کاربران اختصاص دهد و در هر مسیر API بررسی کند که آیا کاربر مجوز لازم را دارد یا نه.

### User
- Admin: مدیریت Role، Permission، تخصیص نقش به کاربران
- همه کاربران: دریافت نقش‌های خود

### Preconditions
- مدل `User`, `Role`, `Permission` موجود است
- ⚠️ نبود `user_roles` و `role_permissions` — باید ایجاد شوند
- Feature 1 (Authentication) پیاده‌سازی شده باشد

### Flow
1. **POST /api/v1/roles**: ایجاد Role (key, name, description)
2. **POST /api/v1/permissions**: (در صورت نیاز) تعریف Permission جدید
3. **POST /api/v1/roles/{id}/permissions**: تخصیص Permission به Role
4. **POST /api/v1/users/{id}/roles**: تخصیص Role به User
5. **Middleware (Authorization)** در همه مسیرهای `/api/v1/*`:
   - پس از Authentication، استخراج role‌های کاربر از JWT یا DB
   - استخراج permission‌های لازم برای مسیر (از mapping table)
   - بررسی: آیا user حداقل یک role دارد که permission لازم را داشته باشد؟
   - اگر نه → 403 FORBIDDEN
6. **Decorator/Helper** در API route: `requirePermission('sales_order.approve')`
7. **GET /api/v1/users/{id}/permissions**: لیست تمام permission‌های موثر (union از role‌ها)

### Business Rules
- یک user می‌تواند چند role داشته باشد (union of permissions)
- یک role می‌تواند چند permission داشته باشد
- Permission‌های `isSystem=true` قابل حذف نیستند
- Role‌های `isSystem=true` قابل حذف نیستند
- Tenant isolation: یک user فقط role‌های tenant خودش را می‌گیرد
- Role hierarchy: پشتیبانی از role والد (در V1 خیر — ساده)
- Permission inheritance: در صورت role والد، permission‌های والد اعمال می‌شود (در V1 خیر)

### Entities
- `User` (موجود)
- `Role` (موجود)
- `Permission` (موجود)
- جدید: `UserRole` (userId, roleId, tenantId, assignedAt, assignedBy)
- جدید: `RolePermission` (roleId, permissionId, tenantId)

### Database Changes
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role_id UUID NOT NULL,
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by UUID,
  UNIQUE(tenant_id, user_id, role_id)
);

CREATE TABLE role_permissions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  role_id UUID NOT NULL,
  permission_id UUID NOT NULL,
  UNIQUE(tenant_id, role_id, permission_id)
);

CREATE INDEX idx_user_roles_user ON user_roles (tenant_id, user_id);
CREATE INDEX idx_role_permissions_role ON role_permissions (tenant_id, role_id);

-- Seed system permissions (40+ از بخش 16.4)
-- Seed system roles: customer, representative, technician, service_center, staff, manager, admin, super_admin
```

### APIs
- `GET/POST /api/v1/roles`
- `GET/PATCH/DELETE /api/v1/roles/{id}`
- `POST /api/v1/roles/{id}/permissions` (افزودن)
- `DELETE /api/v1/roles/{id}/permissions/{permissionId}` (حذف)
- `GET/POST /api/v1/permissions`
- `GET /api/v1/users/{id}/roles`
- `POST /api/v1/users/{id}/roles` (تخصیص)
- `DELETE /api/v1/users/{id}/roles/{roleId}` (حذف)
- `GET /api/v1/users/{id}/permissions` (موثر)
- `GET /api/v1/me/permissions`

### Events
- `role.created` → Audit
- `role.permission_granted` → Audit
- `role.permission_revoked` → Audit
- `user.role_assigned` → Audit + Notification
- `user.role_revoked` → Audit

### Permissions
- `role.read` — مشاهده Role
- `role.manage` — ایجاد/ویرایش/حذف Role
- `permission.manage` — مدیریت Permission (Super Admin)
- `user.role.assign` — تخصیص Role به User

### Security
- ✅ Tenant isolation: user نمی‌تواند role از tenant دیگر بگیرد
- ✅ Audit log تمام تغییرات
- ✅ Super Admin غیرقابل حذف
- ✅ Cannot revoke own last admin role (جلوگیری از lockout)
- ✅ Cache permission‌ها در Redis برای performance (TTL 5 min)

### Edge Cases
- User بدون role → فقط permission‌های public
- Role حذف شود در حالی که user دارد → cascade delete user_roles
- Permission حذف شود → cascade delete role_permissions
- Concurrent role assignment → unique constraint جلوگیری می‌کند

### Failure Handling
- Redis cache miss → fallback به DB
- Circular role hierarchy (در V2) → تشخیص و رد

### Tests
- Unit: permission check، role union، tenant isolation
- Integration: API access با/بدون permission
- E2E: login as admin → assign role → login as user → access

### Acceptance Criteria
- ✅ User بدون `sales_order.approve` نمی‌تواند `POST /api/v1/sales-orders/{id}/approve` را صدا بزند
- ✅ تخصیص role به user فوراً اعمال می‌شود
- ✅ Tenant isolation: user از tenant A نمی‌تواند role از tenant B بگیرد
- ✅ Audit log تمام تغییرات ثبت می‌شود
- ✅ Cache hit rate > 90%

### Status: **NOT IMPLEMENTED** — 🚨 **بحرانی} (وابسته به Feature 1)

---

### Feature 3: Product & Serial Management

### Business Goal
مدیریت کامل محصولات (Product) و سریال‌های منحصر به فرد (ProductInstance) با ردابی کامل از تولید/واردات تا اسقاط.

### User
- Product Manager: ایجاد/ویرایش Product, Brand, Model, Category
- Warehouse Manager: ثبت ProductInstance (سریال) هنگام ورود
- Sales/Service: مشاهده (read-only)

### Preconditions
- مدل‌های `ProductCategory`, `ProductBrand`, `ProductModel`, `Product`, `ProductInstance` موجودند
- مسیرهای `/api/v1/products`, `/product-categories`, `/product-brands`, `/product-models` موجودند
- BusinessCodeGenerator با تعاریف: `product_category`, `product_brand`, `product_model`, `product`, `product_instance`

### Flow
1. **POST /api/v1/product-categories**: ایجاد دسته (با tree parent)
2. **POST /api/v1/product-brands**: ایجاد برند
3. **POST /api/v1/product-models**: ایجاد مدل (با warrantyMonths پیش‌فرض)
4. **POST /api/v1/products**: ایجاد محصول (با sku یکتا)
5. **POST /api/v1/product-instances**: (نبود — باید اضافه شود) ثبت سریال
   - ورودی: `{ productId, serialNumber, qrCode?, attributes: {imei, mac, ...}, importBatch? }`
   - تولید businessCode: `SN-1403-0000001`
   - status = 'in_stock'، condition = 'new'
6. **GET /api/v1/device-timeline/{instanceId}**: مشاهده خط زمانی

### Business Rules
- SKU یکتا در tenant: `@@unique([tenantId, sku])`
- Serial number یکتا در tenant: `@@unique([tenantId, serialNumber])`
- یک ProductInstance فقط یک StockItem (1:1) در صورت serialized
- Product با `productType='serialized'` نیازمند ProductInstance برای هر واحد
- Product با `productType='batch'` یا `'bulk'` نیاز به ProductInstance ندارد
- Product `discontinued` قابل سفارش نیست (در V1 اعمال نمی‌شود — **نقص} )
- Category tree با level و path (مثلاً 'Electronics/Phones/Smart')

### Entities
- `ProductCategory` (موجود)
- `ProductBrand` (موجود)
- `ProductModel` (موجود)
- `Product` (موجود)
- `ProductInstance` (موجود)

### Database Changes
- ⚠️ مسیر `/api/v1/product-instances` باید اضافه شود (CRUD کامل)
- ⚠️ مسیر `/api/v1/product-categories/{id}` (PATCH, DELETE) باید کامل شود
- ⚠️ مسیر `/api/v1/product-brands/{id}` (POST, PATCH, DELETE) باید کامل شود
- ⚠️ مسیر `/api/v1/product-models/{id}` باید اضافه شود
- ⚠️ مسیر `/api/v1/products/{id}` (GET, PATCH, DELETE) باید اضافه شود
- Generate QR code هنگام ایجاد ProductInstance (با کتابخانه `qrcode`)

### APIs
- موجود: `/products`, `/product-categories`, `/product-brands`, `/product-models`
- جدید: `/products/{id}` (GET, PATCH, DELETE)
- جدید: `/product-instances` (GET, POST)
- جدید: `/product-instances/{id}` (GET, PATCH)
- جدید: `/product-instances/{id}/qr-code` (GET — image)
- جدید: `/products/{id}/instances` (GET — list of instances)

### Events
- `product.created` → Audit
- `product.updated` → Audit
- `product.discontinued` → Audit + Notification (به Sales)
- `product_instance.created` → Audit + DeviceTimeline
- `product_instance.status_changed` → Audit + DeviceTimeline

### Permissions
- `product.read` — همه
- `product.create` — Product Manager
- `product.update` — Product Manager
- `product.delete` — Admin
- `product_instance.create` — Warehouse Manager
- `product_instance.update` — Warehouse Manager

### Security
- Tenant isolation در تمام query‌ها
- Audit تمام تغییرات
- اعتبارسنجی input با schema (zod یا مشابه)

### Edge Cases
- حذف Product با ProductInstance موجود → block (409 CONFLICT)
- تغییر SKU پس از SalesOrder → block
- duplicate serialNumber → 409 با code SERIAL_EXISTS
- import batch بدون productId → 422

### Failure Handling
- خطای DB → 500 با correlation_id
- خطای QR generation → fallback به serialNumber-only

### Tests
- Unit: BusinessCodeGenerator برای همه ۵ تعریف محصول
- Integration: CRUD کامل برای Product و ProductInstance
- E2E: ایجاد محصول → ثبت سریال → مشاهده timeline

### Acceptance Criteria
- ✅ ایجاد Product با sku یکتا
- ✅ ایجاد ProductInstance با serial یکتا و QR code
- ✅ Device Timeline باز می‌گردد
- ✅ Tenant isolation فعال
- ✅ تمام status transitions معتبر

### Status: **IMPLEMENTED** (با نواقص minor — مسیرهای CRUD ناقص‌اند)

---

### Feature 4: Inventory & Warehouse

### Business Goal
مدیریت کامل انبارها، اقلام موجودی، تراکنش‌های انبار (Ledger Pattern)، رزروها، انتقال‌ها و شمارش‌های چرخه‌ای.

### User
- Warehouse Manager: ایجاد انبار، ثبت تراکنش، رزرو، انتقال
- Inventory Clerk: شمارش چرخه‌ای
- Sales: مشاهده موجودی (read-only)

### Preconditions
- ۱۲ مدل Inventory موجودند
- مسیرهای `/api/v1/warehouses`, `/stock-items`, `/inventory-transactions`, `/stock-reservations`, `/stock-transfers`, `/cycle-counts`, `/movements` موجودند
- LAW-05 (Ledger Pattern), LAW-16, LAW-17 پیاده‌سازی شده‌اند

### Flow
1. **POST /api/v1/warehouses**: ایجاد انبار (main|branch|service_center|transit|return)
2. **POST /api/v1/warehouses/{id}/zones**: ایجاد زون
3. **POST /api/v1/locations** (در صورت وجود): ایجاد Location سلسله‌مراتبی
4. **POST /api/v1/inventory-transactions**: ثبت تراکنش IN/OUT/ADJUSTMENT
5. **POST /api/v1/stock-reservations**: ایجاد رزرو
6. **POST /api/v1/stock-reservations/{id}/release**: آزادسازی
7. **POST /api/v1/stock-transfers**: انتقال بین انبار
8. **POST /api/v1/stock-transfers/{id}/ship**: شروع انتقال
9. **POST /api/v1/stock-transfers/{id}/receive**: دریافت
10. **POST /api/v1/cycle-counts**: شمارش
11. **POST /api/v1/cycle-counts/{id}/start**
12. **POST /api/v1/cycle-counts/{id}/complete**
13. **POST /api/v1/cycle-counts/{id}/approve**
14. **GET /api/v1/stock-items/{id}/balance**: موجودی فعلی (از ledger)

### Business Rules
- LAW-05: `StockItem` فیلد `on_hand_quantity` ندارد — از ledger مشتق می‌شود
- LAW-16: هیچ حرکت فیزیکی بدون InventoryTransaction مجاز نیست
- LAW-17: رزرو قبل از Shipment الزامی است
- موجودی منفی مجاز نیست (با رزرو تضمین می‌شود)
- هر InventoryTransaction یکتا با transactionNumber (LAW-02)
- CycleCount نیازمند approval قبل از adjustment
- StockReservation با expiresAt (default 24h) — منقضی توسط Scheduler (NOT IMPLEMENTED)

### Entities
- `Warehouse`, `WarehouseZone`, `Location`, `Bin`
- `StockItem`, `InventoryTransaction`, `StockBalance`
- `StockReservation`
- `StockTransfer`, `StockTransferLine`
- `CycleCount`, `CycleCountLine`
- `StockBalanceSnapshot`

### Database Changes
- موجود کامل — تنها بهترسازی‌ها:
- ✅ GIN index روی `attributes` JSONB (در PostgreSQL)
- ✅ Partial index روی `deletedAt IS NULL`
- ⚠️ مسیر `/api/v1/locations` باید اضافه شود (CRUD کامل)
- ⚠️ مسیر `/api/v1/cycle-counts/{id}/adjust` باید اضافه شود

### APIs
- موجود: ۲۴+ مسیر (لیست در بخش ۱۲.۴)
- جدید: `/locations` (CRUD)
- جدید: `/cycle-counts/{id}/adjust`
- جدید: `/cycle-counts/{id}/lines/{lineId}` (PATCH برای ثبت countedQuantity)

### Events
- `stock_adjustment.posted` (موجود)
- جدید: `inventory.reserved` (نقص در EVENT_CATALOG — باید اضافه شود)
- جدید: `inventory.reservation.released`
- جدید: `stock_transfer.shipped`
- جدید: `stock_transfer.received`
- جدید: `cycle_count.completed`
- جدید: `cycle_count.adjusted`

### Permissions
- `warehouse.read` — همه
- `warehouse.manage` — Warehouse Manager
- `inventory.transaction.create` — Warehouse Manager
- `inventory.reservation.manage` — Sales, Warehouse
- `inventory.transfer.manage` — Warehouse Manager
- `inventory.cycle_count.manage` — Warehouse Manager, Inventory Clerk

### Security
- Tenant isolation
- Audit تمام تراکنش‌ها (performedBy)
- اعتبارسنجی quantity (نه منفی برای IN، نه مثبت برای OUT)
- Optimistic Lock با version

### Edge Cases
- رزرو موجودی بیشتر از available → 422 INSUFFICIENT_STOCK
- Cycle count روی انبار با تراکنش در حال انجام → warning
- Transfer با quantityReceived > quantity → 422
- Serial number قبلاً sold → block در انتقال

### Failure Handling
- خطای DB در transaction → rollback کامل (UnitOfWork)
- Optimistic lock conflict → 409 با retry-after
- Snapshot stale → recompute از ledger

### Tests
- Unit: Ledger calculation، reservation lifecycle
- Integration: تراکنش IN/OUT، transfer، cycle count کامل
- E2E: دریافت کالا → فروش → مرجوعی → انبار return

### Acceptance Criteria
- ✅ Ledger Pattern: موجودی همیشه از SUM(transaction) مشتق می‌شود
- ✅ LAW-16: هر Shipment.ship یک OUT ایجاد می‌کند
- ✅ LAW-17: رزرو قبل از ship الزامی است
- ✅ StockTransfer با status transitions کار می‌کند
- ✅ CycleCount با approval flow کار می‌کند

### Status: **IMPLEMENTED** (با نواقص minor — Scheduler برای انقضای رزرو لازم است)

---

### Feature 5: Sales Order Management

### Business Goal
مدیریت چرخه کامل سفارش فروش از ثبت تا تکمیل، با اتوماسیون از طریق Saga.

### User
- Customer (Flutter): ثبت سفارش
- Sales Rep: ثبت سفارش برای مشتری
- Sales Manager: تأیید سفارش
- Admin: لغو

### Preconditions
- مدل `SalesOrder`, `SalesOrderLine`, `PriceList`, `Quote` موجودند
- مسیرهای `/api/v1/sales-orders` موجودند
- `SagaManager` با تعریف `sales_order_fulfillment` موجود است
- Feature 4 (Inventory) پیاده‌سازی شده باشد

### Flow
1. **POST /api/v1/sales-orders**: ثبت با خطوط
2. **POST /api/v1/sales-orders/{id}/approve**: تأیید → شروع Saga
3. **POST /api/v1/sales-orders/{id}/cancel**: لغو با compensation
4. Saga steps (خودکار):
   - Step 1: Reserve Inventory (`sales_order.approved` → `inventory.reserved`)
   - Step 2: Create Shipment (`inventory.reserved` → `shipment.created`)
   - Step 3: Ship (`shipment.created` → `shipment.shipped`)
   - Step 4: Create Invoice (`shipment.shipped` → `invoice.issued`)
   - Step 5: Complete (`payment.received` → `sales_order.completed`)

### Business Rules
- orderNumber یکتا: `SO-1403-00001` (LAW-02)
- Total calculation: subtotal - discount + tax + shipping = total
- Status transitions: draft → pending_approval → approved → shipped → completed
- Cancel فقط قبل از shipped مجازی است
- پس از shipped، نیاز به ReturnOrder است
- Discount approval بر اساس Rule Engine (در صورت وجود ruleset)
- Currency default IRR

### Entities
- `SalesOrder`, `SalesOrderLine`
- `PriceList`, `PriceListLine`
- `Quote`, `QuoteLine`

### Database Changes
- موجود کامل
- ⚠️ مسیر `/api/v1/sales-orders/{id}/submit` (draft → pending_approval) باید اضافه شود
- ⚠️ مسیر `/api/v1/price-lists` و `/api/v1/quotes` باید اضافه شوند (CRUD کامل)

### APIs
- موجود: `/sales-orders` (GET, POST), `/sales-orders/{id}` (GET), `/sales-orders/{id}/approve`, `/sales-orders/{id}/cancel`
- جدید: `/sales-orders/{id}/submit`
- جدید: `/price-lists` (CRUD)
- جدید: `/quotes` (CRUD)
- جدید: `/quotes/{id}/convert` (تبدیل به SalesOrder)

### Events
- `sales_order.created` (موجود)
- `sales_order.approved` (موجود)
- `sales_order.cancelled` (موجود)
- جدید: `sales_order.submitted`
- جدید: `sales_order.completed` (به‌عنوان completion event Saga)

### Permissions
- `sales_order.read` — همه (با محدودیت tenant + own)
- `sales_order.create` — Customer, Rep, Staff
- `sales_order.submit` — Customer, Rep
- `sales_order.approve` — Sales Manager
- `sales_order.cancel` — Admin, Sales Manager

### Security
- Tenant isolation
- Customer فقط سفارش‌های خودش را ببیند
- Rep فقط سفارش‌های خودش یا شعبه‌اش را ببیند
- Discount > threshold نیاز به approval (Rule Engine)

### Edge Cases
- محصول discontinued → 422
- مشتری blacklisted → 422
- موجودی ناکافی → Saga fail → compensation
- Concurrent approve → Optimistic Lock
- Saga fail در step 3 (ship) → release reservation

### Failure Handling
- Saga fail → `SagaManager.failSaga()` → compensation
- Compensation در reverse order
- اگر compensation هم fail → manual intervention (alert)

### Tests
- Unit: total calculation، status transitions
- Integration: complete Saga success path
- E2E: ثبت سفارش → تأیید → ship → invoice → payment → complete

### Acceptance Criteria
- ✅ ثبت سفارش با چند خط
- ✅ تأیید → شروع Saga
- ✅ Saga ۵ step کامل می‌شود
- ✅ Cancel → compensation اجرا می‌شود
- ✅ Total calculations صحیح

### Status: **IMPLEMENTED** (با نواقص minor — مسیرهای Quote/PriceList ناقص)

---

### Feature 6: Fulfillment & Shipment

### Business Goal
مدیریت کامل fulfillment: Pick → Pack → Ship → Deliver، با LAW-16 (ledger)، LAW-17 (reservation)، LAW-18 (immutability).

### User
- Warehouse Picker: pick
- Warehouse Packer: pack
- Warehouse Manager: ship, deliver
- Customer: ردابی (tracking)

### Preconditions
- مدل `Shipment`, `ShipmentLine`, `PickList`, `PickListLine` موجودند
- مسیرهای `/api/v1/shipments/*` موجودند (شامل pick, pack, ship, deliver, tracking)
- Feature 4 (Inventory) و Feature 5 (Sales) پیاده‌سازی شده باشند

### Flow
1. **POST /api/v1/shipments**: ایجاد (از SalesOrder)
2. **POST /api/v1/shipments/{id}/pick**: شروع pick → status='picking'
3. **POST /api/v1/shipments/{id}/pack**: شروع pack → status='packing'
4. **POST /api/v1/shipments/{id}/ship**: **نقش بحرانی} (LAW-16/17/18)
   - برای هر خط: ایجاد InventoryTransaction OUT (quantity منفی)
   - Consume StockReservation (status='consumed')
   - Update SalesOrderLine.quantityShipped
   - Update SalesOrder.status = 'shipped' یا 'partially_shipped'
   - Update Shipment.status = 'shipped' (immutable پس از این)
   - Outbox: shipment.shipped
5. **POST /api/v1/shipments/{id}/deliver**: تحویل
   - status='delivered', deliveredAt=now
   - Outbox: shipment.delivered → Warranty Activation (LAW-28)
6. **GET /api/v1/shipments/{id}/tracking**: وضعیت ردابی

### Business Rules
- LAW-16: هر ship یک OUT InventoryTransaction برای هر خط ایجاد می‌کند
- LAW-17: StockReservation فعال باید قبل از ship وجود داشته باشد و consume شود
- LAW-18: پس از ship، Shipment غیرقابل تغییر است (status='shipped')
- تمام خطوط باید quantityPacked >= quantity باشند قبل از ship
- trackingNumber اختیاری اما در صورت وارد کردن ذخیره می‌شود
- shippingMethod: in_house|courier|post

### Entities
- `Shipment`, `ShipmentLine`
- `PickList`, `PickListLine`

### Database Changes
- موجود کامل
- ⚠️ مسیر `/api/v1/shipments/{id}/return` برای return‌های فیزیکی (در صورت نیاز)

### APIs
- موجود: `/shipments` (GET, POST), `/shipments/{id}` (GET), `/shipments/{id}/{pick,pack,ship,deliver,tracking}`

### Events
- `shipment.created` (موجود)
- `shipment.shipped` (موجود)
- `shipment.delivered` (موجود)
- جدید: `shipment.picked`
- جدید: `shipment.packed`

### Permissions
- `shipment.read` — Staff, Customer (own)
- `shipment.create` — Warehouse Manager
- `shipment.pick` — Picker
- `shipment.pack` — Packer
- `shipment.ship` — Warehouse Manager
- `shipment.deliver` — Warehouse Manager, Driver

### Security
- Tenant isolation
- Customer فقط محموله‌های خودش را ببیند
- Audit تمام actions
- Optimistic Lock با version

### Edge Cases
- Ship با quantityPacked < quantity → 422 NOT_PACKED
- Ship با موجودی ناکافی → 422 NO_STOCK
- Re-ship پس از ship → 422 (immutable)
- Deliver قبل از ship → 422

### Failure Handling
- خطای DB در ship → rollback کامل (UnitOfWork)
- اگر یکی از خطوط fail → کل ship rollback

### Tests
- Unit: status transitions
- Integration: pick → pack → ship → deliver کامل
- E2E: SalesOrder.approve → Shipment ایجاد خودکار → ship → deliver → warranty activate

### Acceptance Criteria
- ✅ LAW-16: OUT transaction در ship ایجاد می‌شود
- ✅ LAW-17: reservation consume می‌شود
- ✅ LAW-18: پس از ship غیرقابل تغییر
- ✅ SalesOrder.status بروزرسانی می‌شود
- ✅ warranty activation trigger می‌شود

### Status: **IMPLEMENTED**

---

### Feature 7: Invoice & Billing

### Business Goal
صدور فاکتور، مدیریت پرداخت‌ها و تخصیص آن‌ها به فاکتورها، صدور CreditNote برای مرجوعی.

### User
- Billing Clerk: ایجاد فاکتور، ثبت پرداخت، تخصیص
- Customer: مشاهده فاکتور (own)
- Finance: گزارش‌گیری

### Preconditions
- مدل `Invoice`, `InvoiceLine`, `Payment`, `PaymentAllocation`, `CreditNote`, `CreditNoteLine` موجودند
- مسیرهای `/api/v1/invoices/*`, `/payments/*` موجودند
- Feature 6 (Fulfillment) پیاده‌سازی شده باشد

### Flow
1. **POST /api/v1/invoices**: ایجاد (از SalesOrder یا مستقل) → status='draft'
2. **POST /api/v1/invoices/{id}/issue**: صدور → status='issued' (LAW-21: immutable)
   - Outbox: invoice.issued → Financial (AR JE)
3. **POST /api/v1/invoices/{id}/cancel**: لغو (با دلیل)
4. **POST /api/v1/invoices/{id}/credit-note**: ایجاد CreditNote
5. **POST /api/v1/payments**: ثبت پرداخت → status='pending'
6. **POST /api/v1/payments/{id}/allocate**: تخصیص (LAW-20)
   - ایجاد PaymentAllocation (paymentId × invoiceId)
   - Update Invoice.paidAmount, status='partially_paid' یا 'paid'
   - Outbox: payment.allocated + payment.received
   - Financial: AR Allocation

### Business Rules
- LAW-19: Billing فاکتور را issue می‌کند اما JE ایجاد نمی‌کند — Financial از event می‌سازد
- LAW-20: هر پرداخت باید تخصیص یابد (هیچ پرداخت "free-floating" نباشد)
- LAW-21: فاکتور پس از issue غیرقابل تغییر است
- invoiceNumber یکتا: `INV-1403-00001`
- paymentNumber یکتا: `PAY-1403-00001`
- creditNoteNumber یکتا: `CN-1403-00001`
- Sum(allocation) ≤ payment.amount
- Sum(allocation) ≤ invoice.balanceDue

### Entities
- `Invoice`, `InvoiceLine`
- `Payment`, `PaymentAllocation`
- `CreditNote`, `CreditNoteLine`

### Database Changes
- موجود کامل
- ⚠️ مسیر `/api/v1/payments/{id}` (GET, PATCH, DELETE)
- ⚠️ مسیر `/api/v1/payments/{id}/unallocate` (LAW-41 — reversal)
- ⚠️ مسیر `/api/v1/credit-notes` (CRUD کامل)

### APIs
- موجود: `/invoices` (GET, POST), `/invoices/{id}` (GET), `/invoices/{id}/{issue,cancel,credit-note}`, `/payments` (GET, POST), `/payments/{id}/allocate`
- جدید: `/payments/{id}` (GET, PATCH)
- جدید: `/payments/{id}/unallocate`
- جدید: `/credit-notes` (CRUD)
- جدید: `/credit-notes/{id}/issue`

### Events
- `invoice.created` (موجود)
- `invoice.issued` (موجود)
- `invoice.cancelled` (موجود)
- `payment.allocated` (موجود)
- `payment.received` (موجود)
- `credit_note.issued` (موجود)
- جدید: `payment.unallocated`

### Permissions
- `invoice.read` — Staff, Customer (own)
- `invoice.create` — Billing Clerk
- `invoice.issue` — Billing Clerk
- `invoice.cancel` — Admin, Billing Manager
- `payment.read` — Staff, Customer (own)
- `payment.create` — Billing Clerk
- `payment.allocate` — Billing Clerk
- `credit_note.manage` — Billing Manager

### Security
- Tenant isolation
- Customer فقط فاکتور/پرداخت خودش را ببیند
- Audit تمام تغییرات
- اعتبارسنجی مبلغ (نه منفی)

### Edge Cases
- Allocate بیشتر از payment.amount → 422
- Allocate به فاکتور لغو‌شده → 422
- Issue فاکتور بدون خطوط → 422
- Cancel فاکتور paid → 422 (نخست CreditNote صادر کن)

### Failure Handling
- خطای DB → rollback
- Payment gate failure (در V2 با online payment) → status='failed'

### Tests
- Unit: total calculation، allocation logic
- Integration: invoice → issue → payment → allocate → paid
- E2E: SalesOrder → Shipment.ship → Invoice ایجاد خودکار → issue → payment → complete

### Acceptance Criteria
- ✅ LAW-19: invoice.issued فاقد JE است (Financial از event می‌سازد)
- ✅ LAW-20: تخصیص اجباری است
- ✅ LAW-21: پس از issue غیرقابل تغییر
- ✅ CreditNote برای مرجوعی کار می‌کند

### Status: **IMPLEMENTED**

---

### Feature 8: Payment & Allocation

### Business Goal
ثبت پرداخت‌ها (cash, bank, check, POS, online, wallet) و تخصیص دقیق به فاکتورها با قابلیت معکوس‌سازی.

### User
- Billing Clerk: ثبت و تخصیص
- Finance: گزارش‌گیری
- Customer: مشاهده (own)

### Preconditions
- مدل `Payment`, `PaymentAllocation` موجودند
- مسیر `/api/v1/payments`, `/payments/{id}/allocate` موجودند
- Feature 7 (Invoice) پیاده‌سازی شده باشد

### Flow
1. **POST /api/v1/payments**: ثبت پرداخت با paymentMethod
2. **POST /api/v1/payments/{id}/allocate**: تخصیص به فاکتور
3. **POST /api/v1/payments/{id}/unallocate**: لغو تخصیص (LAW-41)
4. **POST /api/v1/payments/{id}/verify** (در صورت نیاز): تأیید واریز (مثلاً برای check)

### Business Rules
- paymentMethod: cash|bank_transfer|check|credit_card|pos|online|wallet
- Sum(allocations) ≤ payment.amount
- Status: pending → partially_allocated → completed
- در صورت cancellation: reversal allocation با negative amount
- ARTransaction ایجاد: invoice → debit, payment → credit
- ARAllocation پیوند debit × credit

### Entities
- `Payment`
- `PaymentAllocation`
- (در Financial) `ARTransaction`, `ARAllocation`

### Database Changes
- موجود کامل
- ⚠️ مسیر `/api/v1/payments/{id}` (GET, PATCH)
- ⚠️ مسیر `/api/v1/payments/{id}/unallocate`

### APIs
- موجود: `/payments` (GET, POST), `/payments/{id}/allocate`
- جدید: `/payments/{id}` (GET, PATCH)
- جدید: `/payments/{id}/unallocate`
- جدید: `/payments/{id}/verify` (برای check)

### Events
- `payment.allocated` (موجود)
- `payment.received` (موجود)
- جدید: `payment.unallocated`
- جدید: `payment.verified`

### Permissions
- `payment.read` — Staff, Customer (own)
- `payment.create` — Billing Clerk
- `payment.allocate` — Billing Clerk
- `payment.unallocate` — Billing Manager
- `payment.verify` — Billing Clerk

### Security
- Tenant isolation
- Customer فقط پرداخت‌های خودش
- Audit تمام changes
- اعتبارسنجی amount (نه منفی)

### Edge Cases
- Allocate به فاکتور قبلاً fully_paid → 422
- Unallocate allocation قبلاً reversed → 422
- Check برگشتی → status='failed', reversal allocations

### Failure Handling
- Online payment gate failure → status='failed', retry manual

### Tests
- Unit: allocation math
- Integration: payment → allocate → unallocate → re-allocate
- E2E: payment → allocate → AR Transaction + AR Allocation ایجاد

### Acceptance Criteria
- ✅ LAW-20: تخصیص اجباری
- ✅ LAW-41: reversal کار می‌کند
- ✅ AR Transaction و Allocation ایجاد می‌شود

### Status: **IMPLEMENTED** (با نواقص minor — unallocate endpoint نیست)

---

### Feature 9: Returns & Refunds

### Business Goal
مدیریت کامل مرجوعی کالا، بازرسی فیزیکی، صدور CreditNote، و بازپرداخت با Saga.

### User
- Customer: ثبت درخواست مرجوعی
- Warehouse (Return): دریافت و بازرسی
- Billing: صدور CreditNote و Refund
- Finance: گزارش‌گیری

### Preconditions
- مدل `ReturnOrder`, `ReturnOrderLine`, `Refund` موجودند
- مسیرهای `/api/v1/return-orders/*`, `/refunds/*` موجودند
- `SagaManager` با تعریف `return_processing` موجود است
- Feature 6 (Shipment) و Feature 7 (Invoice) پیاده‌سازی شده باشند

### Flow
1. **POST /api/v1/return-orders**: ثبت درخواست → status='draft'
2. **POST /api/v1/return-orders/{id}/approve**: تأیید → شروع Saga
3. **POST /api/v1/return-orders/{id}/receive**: دریافت فیزیکی (LAW-22: inspection)
   - InventoryTransaction IN در انبار return
   - Outbox: return_order.received
4. Saga Step 2: Create CreditNote (خودکار)
   - POST /api/v1/invoices/{id}/credit-note (یا خودکار از Saga)
   - Outbox: credit_note.issued → Financial (reversal JE)
5. **POST /api/v1/refunds**: ثبت بازپرداخت
6. **POST /api/v1/refunds/{id}/approve**: تأیید
   - Outbox: refund.completed → Financial (refund JE)
7. **POST /api/v1/return-orders/{id}/close**: بستن
8. (در صورت replacement) **POST /api/v1/return-orders/{id}/create-replacement**: ایجاد SalesOrder جدید (LAW-24)

### Business Rules
- LAW-22: هر مرجوعی نیاز به بازرسی فیزیکی دارد (inspectedCondition, inspectionNotes)
- LAW-23: Refund نیازمند return_order.approved است
- LAW-24: Replacement = Return + new SalesOrder
- returnType: refund|replacement|return_only
- refundAmount ≤ invoice.paidAmount
- refundMethod: cash|bank_transfer|check|credit_card|pos|online|wallet

### Entities
- `ReturnOrder`, `ReturnOrderLine`
- `Refund`

### Database Changes
- موجود کامل
- ⚠️ مسیر `/api/v1/return-orders/{id}/reject` (در صورت نیاز)

### APIs
- موجود: `/return-orders` (GET, POST), `/return-orders/{id}` (GET), `/return-orders/{id}/{approve,receive,create-replacement,close}`, `/refunds` (GET, POST), `/refunds/{id}/approve`

### Events
- `return_order.created` (موجود)
- `return_order.approved` (موجود)
- `return_order.received` (موجود)
- `return_order.closed` (موجود)
- `refund.completed` (موجود)
- جدید: `return_order.rejected`

### Permissions
- `return_order.read` — Staff, Customer (own)
- `return_order.create` — Customer, Rep
- `return_order.approve` — Sales Manager, Returns Manager
- `return_order.receive` — Warehouse (Return)
- `return_order.close` — Returns Manager
- `refund.read` — Staff, Customer (own)
- `refund.create` — Billing Clerk
- `refund.approve` — Finance Manager

### Security
- Tenant isolation
- Customer فقط مرجوعی‌های خودش
- Audit تمام changes

### Edge Cases
- Refund بیشتر از paidAmount → 422
- Receive بدون approve → 422
- Close با refund pending → 422

### Failure Handling
- Saga fail → compensation
- Inventory receive fail → rollback

### Tests
- Unit: status transitions
- Integration: return → receive → credit_note → refund → close
- E2E: SalesOrder → ship → return → refund → AR reconciliation

### Acceptance Criteria
- ✅ LAW-22: inspection قبل از close
- ✅ LAW-23: refund پس از approve
- ✅ LAW-24: replacement کار می‌کند
- ✅ Saga return_processing کامل

### Status: **IMPLEMENTED**

---

### Feature 10: Warranty Management

### Business Goal
مدیریت کارت‌های گارانتی، فعال‌سازی خودکار از تحویل محموله، مدیریت شکایت‌ها با بازرسی، تمدید و انتقال.

### User
- Customer: ثبت شکایت، مشاهده کارت
- Service Center: بازرسی، تأیید
- Admin: فعال‌سازی دستی، ابطال

### Preconditions
- ۵ مدل Warranty موجودند
- مسیرهای `/api/v1/warranty-cards/*`, `/warranty-claims/*` موجودند
- LAW-28, LAW-29, LAW-30 پیاده‌سازی شده‌اند
- Feature 6 (Shipment.delivered) پیاده‌سازی شده باشد

### Flow
1. **POST /api/v1/warranty-cards**: ایجاد (status='pending')
2. **POST /api/v1/warranty-cards/{id}/activate**: فعال‌سازی دستی (admin override)
   - محاسبه startDate=now, endDate=now+warrantyMonths, graceEndDate=endDate+graceDays
   - Outbox: warranty.activated → DeviceTimeline
3. **خودکار از shipment.delivered** (LAW-28):
   - InboxHandler → جستجوی WarrantyCard با shipmentId
   - فعال‌سازی خودکار
4. **POST /api/v1/warranty-claims**: ثبت شکایت
5. **POST /api/v1/warranty-claims/{id}/inspect**: بازرسی (LAW-29)
6. **POST /api/v1/warranty-claims/{id}/approve**: تأیید
   - Outbox: warranty.claim.approved → Service (LAW-33: create ServiceRequest)
7. **POST /api/v1/warranty-cards/{id}/extend**: تمدید (در صورت وجود مسیر)
8. **POST /api/v1/warranty-cards/{id}/transfer**: انتقال (در صورت وجود مسیر)

### Business Rules
- LAW-28: فعال‌سازی از shipment.delivered (نه از sales_order.approved)
- LAW-29: هر شکایت قبل از تأیید باید بازرسی شود (isInspected=true)
- LAW-30: Device Timeline از immutable events بازسازی می‌شود
- یک کارت برای هر instance: `@@unique([tenantId, productInstanceId])`
- warrantyNumber یکتا: `WAR-1403-00001`
- claimNumber یکتا: `WCL-1403-00001`

### Entities
- `WarrantyPolicy`, `WarrantyCard`, `WarrantyClaim`, `WarrantyExtension`, `WarrantyTransfer`

### Database Changes
- موجود کامل
- ⚠️ مسیر `/api/v1/warranty-cards/{id}/extend` (POST)
- ⚠️ مسیر `/api/v1/warranty-cards/{id}/transfer` (POST)
- ⚠️ مسیر `/api/v1/warranty-claims/{id}/reject` (POST)
- ⚠️ مسیر `/api/v1/warranty-policies` (CRUD کامل)
- ⚠️ InboxHandler برای `shipment.delivered` باید فعال‌سازی واقعی انجام دهد (نه فقط console.log)

### APIs
- موجود: `/warranty-cards` (GET, POST), `/warranty-cards/{id}` (GET), `/warranty-cards/{id}/activate`, `/warranty-claims` (GET, POST), `/warranty-claims/{id}/inspect`, `/warranty-claims/{id}/approve`
- جدید: `/warranty-policies` (CRUD)
- جدید: `/warranty-cards/{id}/extend`
- جدید: `/warranty-cards/{id}/transfer`
- جدید: `/warranty-claims/{id}/reject`

### Events
- `warranty_card.created` (موجود)
- `warranty.activated` (موجود)
- `warranty.claim.submitted` (موجود)
- `warranty.claim.inspected` (موجود)
- `warranty.claim.approved` (موجود)
- `warranty.claim.rejected` (موجود)
- `warranty.extended` (موجود)
- `warranty.transfer.approved` (موجود)

### Permissions
- `warranty.read` — Staff, Customer (own)
- `warranty.activate` — Admin
- `warranty.claim.create` — Customer, Rep
- `warranty.claim.inspect` — Service Center
- `warranty.claim.approve` — Service Manager
- `warranty.extend` — Staff
- `warranty.transfer` — Staff

### Security
- Tenant isolation
- Customer فقط کارت‌های خودش
- Audit تمام changes

### Edge Cases
- Activate کارت قبلاً active → 422
- Approve claim بدون inspection → 422
- Extend کارت expired → 422
- Transfer به همان مشتری → 422

### Failure Handling
- Saga در ServiceRequest creation fail → retry

### Tests
- Unit: date calculations (startDate, endDate, graceEndDate)
- Integration: create → activate → claim → inspect → approve → ServiceRequest
- E2E: SalesOrder → ship → deliver → warranty auto-activate → claim → repair

### Acceptance Criteria
- ✅ LAW-28: فعال‌سازی از shipment.delivered
- ✅ LAW-29: inspection قبل از approve
- ✅ LAW-30: Device Timeline
- ✅ Extend و Transfer کار می‌کنند

### Status: **IMPLEMENTED** (با نواقص — InboxHandler فعلاً فقط لاگ می‌کند)

---

### Feature 11: Service & Repair

### Business Goal
مدیریت کامل سرویس و تعمیر: درخواست، تشخیص، مصرف قطعه، کنترل کیفیت، تحویل.

### User
- Customer: ثبت درخواست
- Service Center: ایجاد سفارش، تخصیص تکنسین
- Technician: تشخیص، مصرف قطعه
- QC Inspector: کنترل کیفیت
- Customer: تحویل

### Preconditions
- ۸ مدل Service موجودند
- مسیرهای `/api/v1/service-requests/*`, `/service-orders/*` موجودند
- LAW-31, LAW-32, LAW-33 پیاده‌سازی شده‌اند
- Feature 4 (Inventory) و Feature 10 (Warranty) پیاده‌سازی شده باشند

### Flow
1. **POST /api/v1/service-requests**: ثبت درخواست
2. **POST /api/v1/service-requests/{id}/create-order**: ایجاد ServiceOrder
3. **POST /api/v1/service-orders/{id}/diagnose**: تشخیص → status='diagnosis'
4. **POST /api/v1/service-orders/{id}/consume-part**: مصرف قطعه (LAW-31)
   - ایجاد InventoryTransaction OUT
   - Outbox: service_order.part_consumed → Financial (COGS JE)
5. **POST /api/v1/service-orders/{id}/add-labor** (در صورت وجود): ثبت دستمزد
6. **POST /api/v1/service-orders/{id}/qc**: کنترل کیفیت (LAW-32)
   - result: pass|fail|conditional
   - اگر fail → rework (status بازگشت به repair)
7. **POST /api/v1/service-orders/{id}/ready**: آماده تحویل (پس از QC pass)
   - Outbox: service_order.ready → Notification
8. **POST /api/v1/service-orders/{id}/deliver**: تحویل
   - Outbox: service_order.delivered → DeviceTimeline
9. **POST /api/v1/service-orders/{id}/close** (در صورت وجود): بستن

### Business Rules
- LAW-31: هر مصرف قطعه یک InventoryTransaction OUT ایجاد می‌کند
- LAW-32: هر تعمیر قبل از تحویل باید QC pass شود
- LAW-33: Warranty Approval از طریق event (نه direct call) یک ServiceRequest ایجاد می‌کند
- orderNumber یکتا: `RO-1403-00001`
- serviceKind: warranty|out_of_warranty|paid|recall
- اگر serviceKind='warranty': isWarrantyCovered=true در parts/labor، no charge to customer
- اگر QC fail: reworkRequired=true، بازگشت به repair

### Entities
- `ServiceRequest`, `ServiceOrder`, `ServiceOrderLine`, `ServiceDiagnosis`, `ServiceOrderPart`, `ServiceOrderLabor`, `ServiceQualityCheck`, `TechnicianAssignment`

### Database Changes
- موجود کامل
- ⚠️ مسیر `/api/v1/service-orders/{id}/add-labor` (POST)
- ⚠️ مسیر `/api/v1/service-orders/{id}/deliver` (POST)
- ⚠️ مسیر `/api/v1/service-orders/{id}/close` (POST)
- ⚠️ مسیر `/api/v1/service-orders/{id}/assign-technician` (POST)
- ⚠️ InboxHandler برای `warranty.claim.approved` باید ServiceRequest واقعی ایجاد کند

### APIs
- موجود: `/service-requests` (GET, POST), `/service-requests/{id}/create-order`, `/service-orders` (GET, POST), `/service-orders/{id}/{diagnose,consume-part,ready,qc}`
- جدید: `/service-orders/{id}/add-labor`
- جدید: `/service-orders/{id}/deliver`
- جدید: `/service-orders/{id}/close`
- جدید: `/service-orders/{id}/assign-technician`

### Events
- `service_request.created` (موجود)
- `service_order.created` (موجود)
- `service_order.diagnosed` (موجود)
- `service_order.part_consumed` (موجود)
- `service_order.qc_completed` (موجود)
- `service_order.ready` (موجود)
- `service_order.delivered` (موجود)
- جدید: `service_order.labor_added`
- جدید: `service_order.assigned_technician`

### Permissions
- `service_request.read` — Staff, Customer (own)
- `service_request.create` — Customer, Rep, Service Center
- `service_order.read` — Staff
- `service_order.create` — Service Center
- `service_order.diagnose` — Technician (assigned)
- `service_order.consume_part` — Technician
- `service_order.qc` — QC Inspector
- `service_order.deliver` — Service Center

### Security
- Tenant isolation
- Customer فقط درخواست‌های خودش
- Technician فقط سفارش‌های خودش
- Audit تمام changes

### Edge Cases
- Diagnose سفارش قبلاً diagnosed → 422
- Consume part با موجودی ناکافی → 422
- Ready بدون QC pass → 422
- Deliver قبل از ready → 422

### Failure Handling
- Inventory OUT fail → rollback
- Notification fail → retry (LAW-57)

### Tests
- Unit: status transitions، cost calculations
- Integration: complete service order lifecycle
- E2E: warranty claim → service request → service order → repair → QC → deliver

### Acceptance Criteria
- ✅ LAW-31: part consumption یک OUT ایجاد می‌کند
- ✅ LAW-32: QC pass قبل از ready الزامی است
- ✅ LAW-33: warranty.claim.approved یک ServiceRequest ایجاد می‌کند
- ✅ Notification به مشتری ارسال می‌شود

### Status: **IMPLEMENTED** (با نواقص — برخی مسیرهای deliver/close/labor ناقص)

---

### Feature 12: Financial Accounting

### Business Goal
حسابداری دوطرفه کامل با JournalEntry، AR/AP Subledger، Tax Engine، و گزارش‌های مالی.

### User
- Finance Clerk: ثبت سند، تخصیص AR/AP
- Finance Manager: بستن دوره، تأیید
- CEO: مشاهده گزارش‌ها

### Preconditions
- ۱۴ مدل Financial موجودند
- مسیرهای `/api/v1/{chart-of-accounts,journal-entries,trial-balance,general-ledger,reconciliation,closing-validation,tax/*,fiscal-years,fiscal-periods,ar/*,reports/*}` موجودند
- LAW-34, LAW-35, LAW-36, LAW-40, LAW-41, LAW-42, LAW-43, LAW-44, LAW-45 پیاده‌سازی شده‌اند
- `financial-handlers.ts` برای تبدیل رویداد → JE موجود است

### Flow
1. **POST /api/v1/chart-of-accounts**: ایجاد حساب
2. **POST /api/v1/fiscal-years**: ایجاد سال مالی
3. **POST /api/v1/fiscal-periods**: ایجاد دوره‌ها
4. **POST /api/v1/journal-entries**: ثبت سند دستی (LAW-35: balance)
5. **POST /api/v1/journal-entries/{id}/reverse**: معکوس‌سازی (LAW-41)
6. **POST /api/v1/tax/calculate**: محاسبه مالیات (LAW-43)
7. **POST /api/v1/tax/post**: ثبت مالیات (LAW-44)
8. **POST /api/v1/ar/allocate**: تخصیص AR
9. **POST /api/v1/ar/unallocate**: لغو تخصیص (LAW-41)
10. **POST /api/v1/fiscal-periods/{id}/soft-close**: بستن نرم
11. **POST /api/v1/fiscal-periods/{id}/hard-close**: بستن سخت (LAW-36)
12. **POST /api/v1/fiscal-years/{id}/close**: بستن سال
13. **GET /api/v1/reports/{dashboard,balance-sheet,profit-loss,cash-flow,equity,final-trial-balance}**

### Business Rules
- LAW-34: فقط Financial می‌تواند JE ایجاد کند (سایر Context‌ها از طریق event)
- LAW-35: هر JE باید balance باشد (totalDebit === totalCredit)
- LAW-36: دوره بسته‌شده غیرقابل تغییر است
- LAW-40: Subledger باید با GL reconcile شود
- LAW-41: هر تخصیص باید قابل معکوس‌سازی باشد
- LAW-42: موجودی مشتری/تأمین‌کننده مشتق می‌شود (نه ذخیره)
- LAW-43: مالیات از TaxRule مشتق می‌شود (نه hard-code)
- LAW-44: هر ثبت مالیات یک JE مستقل ایجاد می‌کند
- LAW-45: TaxRule نسخه‌بندی و effective-dated است

### Entities
- `ChartOfAccount`, `FiscalYear`, `FiscalPeriod`, `CostCenter`, `TaxCode`
- `JournalEntry`, `JournalEntryLine`
- `ARTransaction`, `ARAllocation`, `APTransaction`, `APAllocation`
- `TaxRule`, `TaxCalculation`, `TaxPosting`

### Database Changes
- موجود کامل
- ⚠️ مسیر `/api/v1/cost-centers` (CRUD)
- ⚠️ مسیر `/api/v1/ap` (مشابه AR)

### APIs
- موجود: ۳۰+ مسیر (لیست در بخش ۱۲.۱۱)
- جدید: `/cost-centers` (CRUD)
- جدید: `/ap/vendors` (لیست)
- جدید: `/ap/vendors/{id}/statement`
- جدید: `/ap/allocate`, `/ap/unallocate`

### Events
- `journal_entry.posted` (در کد استفاده اما در EVENT_CATALOG نیست — باید اضافه شود)
- `tax.posted` (در کد استفاده اما نیست)
- جدید: `fiscal_period.closed`
- جدید: `fiscal_year.closed`
- جدید: `tax_calculation.created`

### Permissions
- `chart_of_accounts.read` — Finance Staff
- `chart_of_accounts.manage` — Finance Manager
- `journal_entry.read` — Finance Staff
- `journal_entry.create` — Finance Clerk
- `journal_entry.post` — Finance Clerk
- `journal_entry.reverse` — Finance Manager
- `fiscal_period.close` — Finance Manager
- `fiscal_year.close` — Admin, CEO
- `ar.manage` — Finance Clerk
- `ap.manage` — Finance Clerk
- `tax.manage` — Finance Manager
- `reports.read` — Finance Staff, CEO

### Security
- Tenant isolation
- Audit تمام JE‌ها (postedBy)
- Double-entry validation
- Period validation (LAW-36)

### Edge Cases
- JE با debit ≠ credit → 422 (LAW-35)
- JE در دوره بسته‌شده → 422 (LAW-36)
- Reverse یک JE قبلاً reversed → 422
- Close سال با period باز → 422

### Failure Handling
- JE post fail → rollback
- Reconciliation fail → report + manual review

### Tests
- Unit: balance validation، AR/AP allocation math
- Integration: full accounting cycle
- E2E: SalesOrder → invoice → JE → payment → JE → reconciliation → close period

### Acceptance Criteria
- ✅ LAW-34: فقط Financial می‌تواند JE بسازد
- ✅ LAW-35: balance validation
- ✅ LAW-36: period immutability
- ✅ LAW-43: tax from rules
- ✅ ۶ گزارش مالی کار می‌کنند

### Status: **IMPLEMENTED**

---

### Feature 13: Workflow Engine

### Business Goal
یک موتور گردش کار عمومی (Generic State Machine) که هر موجودیت را با states و transitions دلخواه پشتیبانی کند.

### User
- System Admin: تعریف Workflow
- Manager: انتقال وضعیت (transition)
- همه: مشاهده وضعیت فعلی

### Preconditions
- ۳ مدل Workflow موجودند
- مسیرهای `/api/v1/workflow/{definitions,instances}` و `/workflow/instances/{id}/transition` موجودند
- LAW-49 پیاده‌سازی شده است

### Flow
1. **POST /api/v1/workflow/definitions**: ایجاد (states + transitions JSON)
2. **POST /api/v1/workflow/definitions/{id}/publish**: انتشار
3. **POST /api/v1/workflow/instances**: ایجاد (از تعریف + entityId)
4. **POST /api/v1/workflow/instances/{id}/transition**: انتقال وضعیت
   - یافتن transition در تعریف
   - در صورت guardRuleSetId: فراخوانی Rule Engine
   - در صورت requiredPermission: بررسی مجوز
   - Optimistic Lock
   - ثبت WorkflowHistory
   - Outbox: workflow.transitioned
   - اگر final: workflow.completed

### Business Rules
- LAW-49: فقط Workflow Engine می‌تواند وضعیت را تغییر دهد
- states: [{ key, name, isInitial, isFinal }]
- transitions: [{ key, fromState, toState, triggerType, guardRuleSetId, requiredPermission }]
- یک instance فقط یک currentStateKey دارد
- transitions فقط از currentStateKey مجاز هستند
- isFinal: وقتی instance به این state برسد، status='completed'

### Entities
- `WorkflowDefinition`, `WorkflowInstance`, `WorkflowHistory`

### Database Changes
- موجود کامل
- ⚠️ مسیر `/api/v1/workflow/instances/{id}/history` (GET)
- ⚠️ Seed برای workflow‌های پیش‌فرض (sales_order_approval, warranty_claim, service_order_lifecycle)

### APIs
- موجود: `/workflow/definitions` (GET, POST), `/workflow/definitions/{id}/publish`, `/workflow/instances` (GET, POST), `/workflow/instances/{id}` (GET), `/workflow/instances/{id}/transition`
- جدید: `/workflow/definitions/{id}` (GET, PATCH)
- جدید: `/workflow/instances/{id}/history` (GET)
- جدید: `/workflow/instances/{id}/cancel` (POST)

### Events
- `workflow.transitioned` (در کد اما در catalog نیست — اضافه شود)
- `workflow.completed` (در کد اما در catalog نیست — اضافه شود)
- جدید: `workflow.cancelled`
- جدید: `workflow.definition.published`

### Permissions
- `workflow.read` — Staff
- `workflow.definition.manage` — System Admin
- `workflow.instance.transition` — بسته به transition.requiredPermission

### Security
- Tenant isolation
- Audit (WorkflowHistory)
- Guard ruleset اجرا می‌شود
- Permission بررسی می‌شود (پس از Feature 2)

### Edge Cases
- Transition نامعتبر از currentState → 422 INVALID_TRANSITION
- Target state ناموجود → 422 INVALID_STATE
- Guard ruleset deny → 403 FORBIDDEN
- Permission missing → 403
- Optimistic lock → 409

### Failure Handling
- Rule Engine fail → 422 (یا 503 با retry)
- DB fail → rollback

### Tests
- Unit: state machine logic
- Integration: complete transition flow with guard + permission
- E2E: define → publish → start → transition → complete

### Acceptance Criteria
- ✅ LAW-49: فقط engine تغییر وضعیت
- ✅ Guard ruleset اجرا می‌شود
- ✅ Permission بررسی می‌شود
- ✅ WorkflowHistory ثبت می‌شود

### Status: **IMPLEMENTED**

---

### Feature 14: Rule Engine

### Business Goal
یک موتور قواعد عمومی (Business Rules Engine) که با DSL JSON، قوانین کسب‌وکار را بدون کدنویسی اجرا کند.

### User
- System Admin: تعریف RuleSet و Rule
- Application: ارزیابی (با فراخوانی API)

### Preconditions
- ۴ مدل Rule موجودند
- مسیرهای `/api/v1/rule-sets/*`, `/rules/*`, `/rules/evaluate` موجودند
- LAW-52, LAW-53, LAW-54 پیاده‌سازی شده‌اند

### Flow
1. **POST /api/v1/rule-sets**: ایجاد RuleSet (context, priority)
2. **POST /api/v1/rule-sets/{id}/publish**: انتشار (نسخه‌بندی)
3. **POST /api/v1/rules**: ایجاد Rule (conditionDsl + actionDsl)
4. **POST /api/v1/rules/evaluate**: ارزیابی
   - ورودی: { context, event, payload, workflowInstanceId? }
   - یافتن RuleSet‌های published برای context
   - برای هر Rule: ارزیابی conditionDsl در برابر payload
   - جمع‌آوری matched rules + actions
   - تصمیم نهایی (priority: deny > requireApproval > escalate > notify > allow)
   - ثبت RuleExecution + RuleAuditStep
   - Outbox: rule.evaluated

### Business Rules
- LAW-52: فقط Rule Engine ارزیابی می‌کند
- LAW-53: deterministic (snapshot از ruleSetCode + ruleSetVersion)
- LAW-54: تمام ارزیابی‌ها audit می‌شوند (RuleExecution + RuleAuditStep)
- conditionDsl: { all: [...] } | { any: [...] } | { field, operator, value }
- operators: >, <, >=, <=, ==, !=, in, notIn, contains, startsWith, endsWith, exists, notExists
- actionDsl: { type: 'allow' | 'deny' | 'requireApproval' | 'notify' | 'escalate', ... }
- priority: بالاتر = ارزیابی زودتر

### Entities
- `RuleSet`, `RuleDefinition`, `RuleExecution`, `RuleAuditStep`

### Database Changes
- موجود کامل
- ⚠️ Seed برای ruleSet‌های پیش‌فرض (sales_order_rules, warranty_validation, invoice_approval)

### APIs
- موجود: `/rule-sets` (GET, POST), `/rule-sets/{id}/publish`, `/rules` (GET, POST), `/rules/evaluate`
- جدید: `/rule-sets/{id}` (GET, PATCH)
- جدید: `/rules/{id}` (GET, PATCH, DELETE)
- جدید: `/rule-sets/{id}/versions` (GET)

### Events
- `rule.evaluated` (در کد اما در catalog نیست — اضافه شود)
- جدید: `ruleset.published`
- جدید: `rule.created`

### Permissions
- `rule.read` — Staff
- `rule.manage` — System Admin
- `rule.evaluate` — Application (internal)

### Security
- Tenant isolation
- Audit (RuleExecution)
- Deterministic (LAW-53)

### Edge Cases
- RuleSet بدون Rule → default allow
- Condition با field ناموجود → false (نه exception)
- Operator ناشناخته → error در audit step
- Concurrent publish → version increment

### Failure Handling
- Evaluation error → ثبت در audit step با result='error'
- DB fail → rollback

### Tests
- Unit: evaluateCondition با همه operators
- Integration: complete RuleSet + Rule + evaluate
- E2E: create ruleset → create rule → publish → evaluate → audit

### Acceptance Criteria
- ✅ LAW-52: فقط Rule Engine
- ✅ LAW-53: deterministic
- ✅ LAW-54: audit کامل
- ✅ همه operators کار می‌کنند

### Status: **IMPLEMENTED**

---

### Feature 15: Notification System

### Business Goal
سیستم اعلان چندکاناله (email, SMS, WhatsApp, push, in-app) با template engine، retry، DLQ و idempotency.

### User
- System (InboxHandler): ارسال خودکار از رویدادها
- Admin: مدیریت templates
- User: تنظیم preferences

### Preconditions
- ۵ مدل Notification موجودند
- ۱۰ Provider در `providers.ts` موجودند
- TemplateEngine در `template-engine.ts` موجود است
- مسیرهای `/api/v1/notifications/*`, `/notification/templates/*`, `/notification-preferences/*`, `/notification-queue/*` موجودند
- LAW-55, LAW-56, LAW-57 پیاده‌سازی شده‌اند

### Flow
1. **POST /api/v1/notification/templates**: ایجاد قالب
2. **POST /api/v1/notification/templates/{id}/publish**: انتشار
3. **POST /api/v1/notification/templates/seed-defaults**: seed قالب‌های پیش‌فرض
4. **POST /api/v1/notifications/send**: ارسال
   - یافتن template (code, version, language, channel)
   - LAW-55: رندر با TemplateEngine (deterministic)
   - LAW-57: محاسبه idempotencyKey = SHA-256(...)
   - اگر Notification با همین key وجود دارد → بازگشت همان
   - ایجاد Notification (status='pending') + NotificationQueue
   - Outbox: notification.created + notification.queued
5. **POST /api/v1/notification-queue/process** (هر ۵ ثانیه توسط worker):
   - یافتن queue items با nextRetryAt <= now
   - قفل‌گذاری (lockedBy, lockedAt)
   - یافتن Provider برای channel
   - فراخوانی Provider.send()
   - در صورت موفقیت: status='sent', NotificationDelivery
   - در صورت شکست: retry exponential (تا ۵ تلاش) یا DLQ

### Business Rules
- LAW-55: notifications باید template-based باشند (versioned, language-aware)
- LAW-56: delivery channel-agnostic (interface یکسان، ۱۰ Provider)
- LAW-57: retry + idempotent (idempotencyKey, max 5 attempts, DLQ)
- یک template برای هر (code, version, language, channel)
- at-most-once: اگر Notification با همان idempotencyKey، همان بازگردانده می‌شود
- Quiet hours: در صورت quietHoursStart/End، تأخیر تا پایان

### Entities
- `NotificationTemplate`, `Notification`, `NotificationDelivery`, `NotificationPreference`, `NotificationQueue`

### Database Changes
- موجود کامل
- ⚠️ InAppWsProvider باید اضافه شود (WebSocket برای real-time)
- ⚠️ مسیر `/api/v1/notification/inapp` (GET — list in-app notifications for current user)

### APIs
- موجود: ۱۹+ مسیر (لیست در بخش ۱۲.۱۵)
- جدید: `/notification/inapp` (GET)
- جدید: `/notification/inapp/{id}/mark-read` (POST)

### Events
- ۷ رویداد موجود: notification.{created,queued,sent,failed,retrying,cancelled,preference.updated}

### Permissions
- `notification_template.read` — Staff
- `notification_template.manage` — System Admin
- `notification.send` — Application (internal) + Staff
- `notification.read` — User (own)
- `notification_preference.manage` — User (own)

### Security
- Tenant isolation
- API keys در env vars (نه در code)
- Encryption در transit (TLS)
- Rate limiting per provider
- Audit تمام deliveries

### Edge Cases
- Template منتشر نشده → 404
- Recipient address نامعتبر → 422
- Provider down → retry exponential
- Max attempts exceeded → DLQ
- IdempotencyKey duplicate → بازگشت همان Notification

### Failure Handling
- Provider timeout → retry
- Provider 5xx → retry
- Provider 4xx (invalid request) → no retry, move to DLQ
- Worker crash → lock expired بعد از ۵ دقیقه، آیتم قابل پردازش مجدد

### Tests
- Unit: TemplateEngine با همه syntax، idempotencyKey computation
- Integration: send → queue → process → sent
- E2E: trigger event → notification sent

### Acceptance Criteria
- ✅ LAW-55: template-based
- ✅ LAW-56: 10 providers کار می‌کنند (با mock)
- ✅ LAW-57: retry + DLQ + idempotent
- ✅ Quiet hours فعال

### Status: **IMPLEMENTED**

---

### Feature 16: Device Timeline

### Business Goal
ردابی کامل چرخه حیات یک دستگاه (ProductInstance) از تولید تا اسقاط، با بازسازی از رویدادهای تغییرناپذیر.

### User
- Customer: مشاهده خط زمانی دستگاه خودش
- Service Center: مشاهده تاریخچه تعمیرات
- CEO: تحلیل lifecycle

### Preconditions
- مسیر `/api/v1/device-timeline/{instanceId}` موجود است
- LAW-30 پیاده‌سازی شده است
- ۴۶ رویداد در EVENT_CATALOG با DeviceTimeline consumer

### Flow
1. **GET /api/v1/device-timeline/{instanceId}**:
   - Query از OutboxMessage WHERE payload->>'productInstanceId' = ?
   - OR از چند جدول: ProductInstance, InventoryTransaction, SalesOrder, Shipment, WarrantyCard, WarrantyClaim, ServiceOrder
   - مرتب‌سازی بر اساس occurredAt
   - بازگشت: [{ eventType, date, payload }]

### Business Rules
- LAW-30: Device Timeline از رویدادهای تغییرناپذیر بازسازی می‌شود
- فقط رویدادهای مرتبط با این instance شامل می‌شوند
- ترتیب chronological
- شامل: production/import, in_stock, sold, warranty activated, claims, service orders, delivery, expired

### Entities
- (بدون مدل جدید — از OutboxMessage + جداول موجود)

### Database Changes
- ⚠️ GIN index روی `payload` JSONB در OutboxMessage برای query سریع
- ⚠️ مسیر `/api/v1/device-timeline/{instanceId}/export` (PDF/Excel)

### APIs
- موجود: `/device-timeline/{instanceId}` (GET)
- جدید: `/device-timeline/{instanceId}/export` (GET — PDF/Excel)

### Events
- مصرف‌کننده: همه رویدادهای با `productInstanceId` در payload

### Permissions
- `device_timeline.read` — Staff, Customer (own devices)

### Security
- Tenant isolation
- Customer فقط دستگاه‌های خودش

### Edge Cases
- Instance نبود → 404
- بدون رویداد → 200 با array خالی
- Instance از tenant دیگر → 404 (نه 403 — security)

### Failure Handling
- Query timeout → 504 با Retry-After

### Tests
- Unit: query و sort
- Integration: ایجاد چند رویداد → timeline کامل
- E2E: SalesOrder → ship → deliver → warranty → claim → service → timeline

### Acceptance Criteria
- ✅ LAW-30: timeline از events
- ✅ تمام مراحل lifecycle شامل می‌شود
- ✅ Tenant isolation

### Status: **IMPLEMENTED** (با نواقص — نیاز به enrichment از جداول مختلف)

---

### Feature 17: Event-Driven Architecture (Outbox/Inbox/Saga)

### Business Goal
زیرساخت انتشار مطمئن رویدادها (Outbox)، پردازش exactly-once (Inbox)، و هماهنگی فرایندهای طولانی (Saga).

### User
- Application (internal): انتشار و پردازش رویدادها
- Admin: مانیتورینگ

### Preconditions
- مدل‌های `OutboxMessage`, `ProcessedMessage`, `SagaDefinition`, `SagaInstance` موجودند
- `OutboxDispatcher`, `OutboxPublisher`, `OutboxRetryPolicy`, `DeadLetterHandler` موجودند
- `InboxWorker` موجود است
- `SagaManager` با ۲ تعریف موجود است
- ۴۶ رویداد در EVENT_CATALOG
- LAW-08, LAW-09, LAW-15, LAW-25, LAW-26, LAW-27 پیاده‌سازی شده‌اند

### Flow
1. **Publish** (در API route):
   - در UnitOfWork: `uow.outbox.append({ ... })`
   - OutboxMessage با status='pending' در همان transaction
2. **Dispatch** (هر ۵ ثانیه توسط OutboxDispatcher):
   - یافتن messages با status='pending' و (nextRetryAt null یا <= now)
   - انتشار به InboxWorker (via PrismaEventBus)
   - در صورت موفقیت: status='published', publishedAt=now
   - در صورت شکست: attempts++, nextRetryAt = now + exponential backoff
   - در صورت attempts > max: status='dead_letter'
3. **Consume** (در InboxWorker):
   - ثبت در ProcessedMessage (unique constraint — exactly-once)
   - اگر قبلاً پردازش شده → skip
   - فراخوانی handler ثبت‌شده با consumerId
4. **Saga** (در SagaManager):
   - startSaga: ایجاد SagaInstance با status='running'
   - advanceStep: وقتی completionEvent دریافت می‌شود
   - failSaga: اجرای compensation در reverse order

### Business Rules
- LAW-08: Outbox Pattern — reliable event publishing
- LAW-09: Inbox Pattern — exactly-once processing
- LAW-15: همه رویدادها نسخه (version 1.0)
- LAW-25: هیچ cross-context synchronous call مجاز نیست
- LAW-26: هر رویداد دقیقاً یک‌بار پردازش می‌شود
- LAW-27: هر فرایند طولانی باید Saga باشد
- Retry: exponential backoff (2^attempts * base)
- DLQ: پس از max attempts (مثلاً ۵)

### Entities
- `OutboxMessage`, `ProcessedMessage`, `StockBalanceSnapshot`
- `SagaDefinition`, `SagaInstance`

### Database Changes
- موجود کامل
- ⚠️ مسیر `/api/v1/admin/outbox` (GET — monitor)
- ⚠️ مسیر `/api/v1/admin/dead-letters` (GET, POST retry)
- ⚠️ مسیر `/api/v1/admin/sagas` (GET — monitor active sagas)
- ⚠️ جابجایی به Redis Pub/Sub برای multi-instance (در production)

### APIs
- جدید: `/admin/outbox` (GET with filters)
- جدید: `/admin/outbox/{id}/replay` (POST)
- جدید: `/admin/dead-letters` (GET)
- جدید: `/admin/dead-letters/{id}/retry` (POST)
- جدید: `/admin/sagas` (GET)
- جدید: `/admin/sagas/{id}` (GET)

### Events
- `saga.started`, `saga.step_completed`, `saga.completed`, `saga.compensated` (موجود)
- ۴۶ رویداد در catalog

### Permissions
- `admin.outbox.read` — Admin
- `admin.outbox.replay` — Super Admin
- `admin.dead_letters.manage` — Super Admin
- `admin.sagas.read` — Admin

### Security
- Tenant isolation در تمام queries
- Super Admin فقط برای replay/retry

### Edge Cases
- Outbox message بدون consumer → 200 (audit wildcard)
- DLQ message retry → ایجاد OutboxMessage جدید
- Saga compensation fail → manual intervention
- Concurrent advanceStep → Optimistic Lock

### Failure Handling
- Dispatcher crash → messages با lockedAt قدیمی release می‌شوند
- Consumer timeout → retry
- DB fail → rollback

### Tests
- Unit: retry policy، exactly-once
- Integration: publish → dispatch → consume
- E2E: complete Saga success + failure + compensation

### Acceptance Criteria
- ✅ LAW-08: Outbox
- ✅ LAW-09: Inbox (exactly-once)
- ✅ LAW-26: no duplicate processing
- ✅ LAW-27: Saga with compensation

### Status: **IMPLEMENTED** (با نواقص — compensation فقط console.log، نیاز به Redis برای multi-instance)

---

### Feature 18: Scheduler & Automation

### Business Goal
یک زمان‌بند (Scheduler) برای اجرای کارهای دوره‌ای (cron): انقضای رزرو، انقضای گارانتی، snapshot شبانه، reminder، گزارش‌های دوره‌ای.

### User
- System (internal): اجرای خودکار
- Admin: مدیریت jobs

### Preconditions
- ❌ هیچ ماژول Scheduler پیاده‌سازی نشده است
- سند چشم‌انداز Laravel Queue + Redis را پیشنهاد می‌کند
- نیاز: انقضای StockReservation، snapshot شبانه، cleanup داده‌های قدیمی

### Flow
1. **POST /api/v1/scheduler/jobs**: ایجاد job (cron expression + handler)
2. **Scheduler Worker** (هر دقیقه):
   - یافتن jobs با nextRunAt <= now
   - قفل‌گذاری (lockedBy, lockedAt)
   - فراخوانی handler
   - محاسبه nextRunAt از cron expression
3. **Jobs پیش‌فرض**:
   - `expire-reservations` (هر ساعت): StockReservation با expiresAt < now → status='expired'
   - `expire-warranties` (روزانه): WarrantyCard با endDate < now → status='expired'
   - `nightly-snapshot` (روزانه ساعت ۲): ایجاد StockBalanceSnapshot
   - `cleanup-idempotency` (روزانه): حذف IdempotencyKey با expiresAt < now
   - `cleanup-outbox` (هفتگی): archive OutboxMessage با occurredAt < 30 days
   - `notification-queue-process` (هر ۵ ثانیه): پردازش صف اعلان
   - `monthly-reports` (ماهانه اول ماه): تولید گزارش‌های خودکار

### Business Rules
- Cron expression استاندارد (مثلاً `0 2 * * *` = روزانه ساعت ۲)
- Only one instance of each job runs at a time (distributed lock)
- Job failure → retry ۳ بار، سپس alert
- Job timeout (مثلاً ۱ ساعت) → kill + alert
- Audit log تمام اجراها

### Entities
- جدید: `ScheduledJob` (id, tenantId, name, cronExpression, handlerName, isEnabled, lastRunAt, nextRunAt, lastStatus, lastError)
- جدید: `JobExecution` (id, jobId, startedAt, finishedAt, status, error, durationMs)

### Database Changes
```sql
CREATE TABLE scheduled_jobs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  cron_expression TEXT NOT NULL,
  handler_name TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP,
  last_status TEXT,
  last_error TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

CREATE TABLE job_executions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  job_id UUID NOT NULL,
  started_at TIMESTAMP NOT NULL,
  finished_at TIMESTAMP,
  status TEXT NOT NULL,
  error TEXT,
  duration_ms INT,
  metadata JSONB,
  FOREIGN KEY (job_id) REFERENCES scheduled_jobs(id)
);

CREATE INDEX idx_jobs_next_run ON scheduled_jobs (is_enabled, next_run_at);
```

### APIs
- `GET /api/v1/scheduler/jobs`
- `POST /api/v1/scheduler/jobs`
- `GET /api/v1/scheduler/jobs/{id}`
- `PATCH /api/v1/scheduler/jobs/{id}` (enable/disable, update cron)
- `POST /api/v1/scheduler/jobs/{id}/run` (manual trigger)
- `GET /api/v1/scheduler/jobs/{id}/executions`

### Events
- `job.started` → Audit
- `job.completed` → Audit
- `job.failed` → Audit + Notification (admin)
- `stock_reservation.expired` → Audit (نقص در catalog)
- `warranty.expired` → Audit + Notification (customer)

### Permissions
- `scheduler.read` — Admin
- `scheduler.manage` — Super Admin
- `scheduler.run` — Super Admin

### Security
- Tenant isolation
- Only Super Admin can create/modify jobs
- Job handler code must be whitelisted (نه arbitrary code execution)

### Edge Cases
- Job running longer than next interval → skip next run
- Worker crash mid-job → job lock expires after 1 hour, can be re-run
- Cron expression invalid → 422

### Failure Handling
- Handler exception → status='failed', error logged
- Retry 3 times with exponential backoff
- Final failure → alert admin

### Tests
- Unit: cron parsing, nextRunAt calculation
- Integration: job creation → manual run → execution recorded
- E2E: enable expire-reservations → create expired reservation → wait → verify expired

### Acceptance Criteria
- ✅ Cron jobs اجرا می‌شوند
- ✅ Distributed lock جلوگیری از concurrent execution
- ✅ Audit log تمام اجراها
- ✅ Manual trigger کار می‌کند

### Status: **NOT IMPLEMENTED**

---

### Feature 19: Monitoring & Observability

### Business Goal
مانیتورینگ کامل سیستم: metrics، logs، traces، health checks، alerting.

### User
- DevOps: مشاهده dashboards
- Admin: دریافت alerts

### Preconditions
- ❌ هیچ ماژول Monitoring پیاده‌سازی نشده است
- فقط مسیر `/api/v1/system/health` موجود است (basic)

### Flow
1. **Metrics Collection** (در middleware):
   - HTTP requests: count, latency (p50, p95, p99)
   - DB queries: count, latency
   - Outbox lag: pending count
   - Notification queue: depth, processing rate
   - Saga: active count, failed count
2. **Log Aggregation**:
   - Structured logging (JSON)
   - Levels: DEBUG, INFO, WARN, ERROR, FATAL
   - Correlation ID در همه logs
3. **Distributed Tracing**:
   - Trace ID در هر درخواست
   - Span برای هر API call, DB query, external call
4. **Health Checks**:
   - `/api/v1/system/health`: overall
   - `/api/v1/system/health/db`: PostgreSQL
   - `/api/v1/system/health/redis`: Redis
   - `/api/v1/system/health/queue`: Outbox + Notification queue
5. **Alerting**:
   - API error rate > 5% → alert
   - DB connection pool full → alert
   - Outbox lag > 1000 → alert
   - DLQ has items → alert
6. **Dashboards** (Grafana):
   - API Overview
   - Database
   - Outbox/Inbox
   - Notification
   - Saga
   - Business KPIs

### Business Rules
- Metrics هر ۱۵ ثانیه scrape می‌شوند (Prometheus)
- Logs به ELK/Loki ارسال می‌شوند
- Traces به Jaeger/Tempo ارسال می‌شوند
- Alerts به Slack/Telegram ارسال می‌شوند

### Entities
- (بدون مدل جدید — زیرساخت خارجی)

### Database Changes
- بدون تغییر (metrics در Prometheus، logs در Loki، traces در Tempo)

### APIs
- موجود: `/system/health`
- جدید: `/system/health/db`
- جدید: `/system/health/redis`
- جدید: `/system/health/queue`
- جدید: `/system/metrics` (Prometheus format)
- جدید: `/system/info` (version, build, env)

### Events
- `system.alert.triggered` → Notification (admin)
- `system.health.degraded` → Notification

### Permissions
- `system.health` — عمومی (بدون auth)
- `system.metrics` — Prometheus (IP whitelist)
- `system.info` — Staff

### Security
- Metrics endpoint فقط از شبکه داخلی قابل دسترسی
- Logs نباید شامل PII باشند (redact)
- Trace sampling (۱۰٪ در production)

### Edge Cases
- Prometheus down → no metrics (ولی application کار می‌کند)
- Alert storm → throttling
- Log volume too high → sampling

### Failure Handling
- Monitoring self-failure → fallback to file-based logging

### Tests
- Unit: metrics collection
- Integration: /health endpoints
- E2E: trigger alert → verify notification

### Acceptance Criteria
- ✅ /health کار می‌کند
- ✅ Metrics در Prometheus
- ✅ Logs در Loki
- ✅ Traces در Tempo
- ✅ Alerts به Slack

### Status: **NOT IMPLEMENTED**

---

### Feature 20: BI & Analytics

### Business Goal
پلتفرم BI برای تحلیل کسب‌وکار: داشبورد اجرایی، تحلیل فروش، تحلیل موجودی، تحلیل گارانتی.

### User
- CEO: داشبورد اجرایی
- Sales Manager: تحلیل فروش
- Warehouse Manager: تحلیل موجودی
- Service Manager: تحلیل گارانتی

### Preconditions
- ❌ هیچ ماژول BI پیاده‌سازی نشده است
- ۶ گزارش مالی موجودند (در `/api/v1/reports/*`)

### Flow
1. **GET /api/v1/bi/dashboard** (Executive):
   - KPIs: revenue, profit, orders count, customers count
   - Trends: monthly revenue/expense
   - Top products, top customers
2. **GET /api/v1/bi/sales**:
   - Sales by product, customer, rep, branch
   - Sales trend, forecast
3. **GET /api/v1/bi/inventory**:
   - Inventory valuation (FIFO/AVG)
   - Slow-moving items
   - Stockout alerts
4. **GET /api/v1/bi/warranty**:
   - Active warranties count
   - Claim rate
   - Most common defect types
5. **GET /api/v1/bi/service**:
   - Average repair time
   - QC pass rate
   - Technician performance
6. **GET /api/v1/bi/forecasts**:
   - Sales forecast (next 30 days)
   - Inventory demand forecast

### Business Rules
- همه BI queries read-only
- Aggregated (نه raw data)
- Cached (Redis با TTL 5 min)
- Tenant-aware

### Entities
- (بدون مدل جدید — از جداول موجود)

### Database Changes
- ✅ Materialized Views برای aggregation‌های سنگین
- ✅ Index‌های GIN برای query روی JSONB

### APIs
- `/bi/dashboard` (executive)
- `/bi/sales` (sales analytics)
- `/bi/inventory` (inventory analytics)
- `/bi/warranty` (warranty analytics)
- `/bi/service` (service analytics)
- `/bi/forecasts` (predictions)

### Events
- بدون رویداد جدید (read-only)

### Permissions
- `bi.dashboard` — CEO, Manager
- `bi.sales` — Sales Manager
- `bi.inventory` — Warehouse Manager
- `bi.warranty` — Service Manager
- `bi.forecasts` — CEO

### Security
- Tenant isolation
- Aggregation (نه raw data) برای privacy
- Audit تمام BI queries

### Edge Cases
- No data → empty results (نه error)
- Date range too large → timeout warning

### Failure Handling
- Query timeout → 504 با suggestion smaller range
- Cache miss → recompute

### Tests
- Unit: aggregation functions
- Integration: each BI endpoint
- E2E: login as CEO → view dashboard → drill down

### Acceptance Criteria
- ✅ Executive dashboard با KPIs
- ✅ Sales/Inventory/Warranty/Service analytics
- ✅ Forecasting (نمودار)
- ✅ Cached (Redis)

### Status: **NOT IMPLEMENTED**

---

### Feature 21: AI Assistant

### Business Goal
یک دستیار هوش مصنوعی (chat) که به کاربران در پرسش‌وپاسخ درباره محصولات، گارانتی، سفارش‌ها و خدمت کمک می‌کند.

### User
- Customer: سوال درباره محصول/گارانتی/سفارش خودش
- Staff: سوال درباره داده‌ها (مثلاً «فروش این ماه چقدر بوده؟»)

### Preconditions
- ❌ هیچ ماژول AI پیاده‌سازی نشده است
- سند چشم‌انداز AI را ذکر می‌کند
- نیاز: LLM (GPT-4 یا Claude یا Gemini)
- نیاز: Vector DB برای RAG

### Flow
1. **POST /api/v1/ai/chat**:
   - ورودی: `{ message, conversationId? }`
   - اگر conversationId نبود: ایجاد Conversation جدید
   - افزودن message به Conversation
   - RAG: جستجوی vector DB برای اسناد مرتبط
   - ساخت prompt با system + context + history + new message
   - فراخوانی LLM API
   - ذخیره response در Conversation
   - بازگشت: { response, conversationId }
2. **GET /api/v1/ai/conversations**: لیست مکالمات کاربر
3. **GET /api/v1/ai/conversations/{id}`: جزئیات مکالمه
4. **POST /api/v1/ai/embed**: (admin) index اسناد در vector DB

### Business Rules
- Tenant isolation (هر tenant Context جداگانه)
- Conversation history محدود به ۵۰ message
- Rate limit: 20 message/min per user
- PII redaction قبل از ارسال به LLM
- Context window management (summarize old messages)
- Token budget per request

### Entities
- جدید: `AIConversation` (id, tenantId, userId, title, createdAt)
- جدید: `AIMessage` (id, conversationId, role: user|assistant|system, content, tokens, createdAt)
- جدید: `AIDocument` (id, tenantId, source, content, embedding (vector), metadata)

### Database Changes
```sql
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  title TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE ai_messages (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  tokens INT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ai_documents (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  source TEXT,
  content TEXT,
  embedding vector(1536),  -- pgvector
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_docs_embedding ON ai_documents USING ivfflat (embedding vector_cosine_ops);
```

### APIs
- `POST /api/v1/ai/chat`
- `GET /api/v1/ai/conversations`
- `GET /api/v1/ai/conversations/{id}`
- `DELETE /api/v1/ai/conversations/{id}`
- `POST /api/v1/ai/embed` (admin)
- `GET /api/v1/ai/usage` (admin)

### Events
- `ai.conversation.started` → Audit
- `ai.message.sent` → Audit
- `ai.tokens.consumed` → Audit (برای billing)

### Permissions
- `ai.chat` — همه (با rate limit)
- `ai.embed` — Admin

### Security
- PII redaction (نام، تلفن، ایمیل) قبل از LLM
- Tenant isolation در vector search
- API key در env vars (نه در code)
- Rate limiting
- Audit تمام queries

### Edge Cases
- LLM API timeout → 504 با retry suggestion
- LLM rate limit → 429 با Retry-After
- Token budget exceeded → summarization
- Empty response → fallback message

### Failure Handling
- LLM fail → fallback to search results only
- Vector DB fail → fallback to no RAG
- API key invalid → 500 با alert admin

### Tests
- Unit: PII redaction، token counting
- Integration: chat flow
- E2E: ask question → get answer with citation

### Acceptance Criteria
- ✅ Chat کار می‌کند
- ✅ RAG با اسناد محصول
- ✅ Tenant isolation
- ✅ Rate limit
- ✅ PII redaction

### Status: **NOT IMPLEMENTED**

---

### Feature 22: Report Builder

### Business Goal
یک گزارش‌ساز پویا که کاربر بتواند بدون کدنویسی گزارش سفارشی بسازد: انتخاب entity، فیلدها، فیلترها، گروه‌بندی، aggregation.

### User
- Manager: ساخت گزارش
- Staff: اجرای گزارش ذخیره‌شده

### Preconditions
- ❌ هیچ ماژول Report Builder پیاده‌سازی نشده است
- ۶ گزارش مالی ثابت موجودند

### Flow
1. **POST /api/v1/reports/definitions**: ایجاد تعریف گزارش
   - ورودی: { name, entityType, fields[], filters[], groupBy[], aggregations[], sortBy[] }
2. **POST /api/v1/reports/definitions/{id}/run**: اجرای گزارش
   - ساخت SQL query از definition
   - اجرای query
   - بازگشت: { columns, rows, totalRows }
3. **POST /api/v1/reports/definitions/{id}/export**: export به Excel/PDF
4. **POST /api/v1/reports/definitions/{id}/schedule**: زمان‌بندی اجرای دوره‌ای + ارسال ایمیل

### Business Rules
- فقط entity‌های whitelist شده (مثلاً SalesOrder, Invoice, ProductInstance, JournalEntry)
- فقط fields whitelist شده برای هر entity
- محدودیت row count (مثلاً max 100000 rows)
- Timeout (مثلاً 30 ثانیه)
- Tenant isolation
- Audit تمام گزارش‌های اجرا شده

### Entities
- جدید: `ReportDefinition` (id, tenantId, name, entityType, config JSON, createdBy, createdAt)
- جدید: `ReportExecution` (id, reportDefinitionId, executedBy, executedAt, rowCount, durationMs, status)

### Database Changes
```sql
CREATE TABLE report_definitions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  config JSONB NOT NULL,  -- { fields, filters, groupBy, aggregations, sortBy }
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE report_executions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  report_definition_id UUID NOT NULL,
  executed_by UUID,
  executed_at TIMESTAMP DEFAULT NOW(),
  row_count INT,
  duration_ms INT,
  status TEXT,
  error TEXT,
  FOREIGN KEY (report_definition_id) REFERENCES report_definitions(id)
);
```

### APIs
- `GET /api/v1/reports/definitions`
- `POST /api/v1/reports/definitions`
- `GET /api/v1/reports/definitions/{id}`
- `PATCH /api/v1/reports/definitions/{id}`
- `DELETE /api/v1/reports/definitions/{id}`
- `POST /api/v1/reports/definitions/{id}/run`
- `POST /api/v1/reports/definitions/{id}/export` (xlsx, pdf, csv)
- `POST /api/v1/reports/definitions/{id}/schedule`
- `GET /api/v1/reports/definitions/{id}/executions`

### Events
- `report.created` → Audit
- `report.executed` → Audit
- `report.scheduled` → Audit + Scheduler

### Permissions
- `report.create` — Manager
- `report.read` — Staff
- `report.run` — Staff
- `report.export` — Manager
- `report.schedule` — Manager
- `report.delete` — Admin (own)

### Security
- SQL injection prevention (parameterized + whitelist)
- Tenant isolation
- Row limit
- Timeout
- Audit

### Edge Cases
- Query too slow → timeout
- Too many rows → pagination یا error
- Invalid field → 422
- Circular relationship → error

### Failure Handling
- Query timeout → 504
- DB error → 500

### Tests
- Unit: query builder
- Integration: create definition → run → verify rows
- E2E: build sales-by-customer report → export to Excel

### Acceptance Criteria
- ✅ Dynamic report builder
- ✅ Export to Excel/PDF/CSV
- ✅ Schedule + email
- ✅ Audit

### Status: **NOT IMPLEMENTED**

---

### Feature 23: Performance & Caching

### Business Goal
بهینه‌سازی performance با Redis cache، query optimization، connection pooling، و CDN.

### User
- همه کاربران (transparent)

### Preconditions
- ❌ هیچ ماژول Performance پیاده‌سازی نشده است
- `db.ts` با `log: ['query']` همیشه فعال (overhead)
- بدون Redis cache
- بدون connection pool tuning

### Flow
1. **Redis Cache Layer**:
   - Cache GET endpoints (با TTL مناسب)
   - Invalidated روی POST/PATCH/DELETE
   - Cache key: `{tenantId}:{endpoint}:{hash(params)}`
2. **Query Optimization**:
   - Disable `log: ['query']` در production
   - Index analysis با `EXPLAIN ANALYZE`
   - N+1 query detection
3. **Connection Pool**:
   - PostgreSQL: max 20 connections
   - Redis: max 10 connections
4. **CDN** (Cloudflare):
   - Static assets
   - API responses با long TTL (e.g., /products)
5. **Compression**:
   - gzip / brotli برای HTTP responses
6. **Pagination**:
   - Cursor-based برای جداول بزرگ
   - Default per_page=20، max=100

### Business Rules
- Cache TTL بسته به entity:
  - Product: 5 min
  - Inventory: 1 min (real-time critical)
  - Report: 1 hour
  - User preferences: 1 hour
- Cache invalidation روی mutation
- ETag برای conditional requests
- 304 Not Modified وقتی داده تغییر نکرده

### Entities
- (بدون مدل جدید)

### Database Changes
- ⚠️ Disable `log: ['query']` در production
- ✅ Index analysis و optimization
- ✅ Materialized Views برای aggregation‌های سنگین

### APIs
- بدون تغییر (transparent)

### Events
- بدون رویداد جدید

### Permissions
- بدون تغییر

### Security
- Cache poisoned prevention (signing cache keys)
- PII نباید cache شود (یا با short TTL)

### Edge Cases
- Cache miss → query DB + cache
- Redis down → fallback به DB (با warning)
- Stale cache → eventual consistency (acceptable برای اکثر داده‌ها)

### Failure Handling
- Redis fail → degrade gracefully
- DB connection pool full → 503

### Tests
- Load: 1000 concurrent users
- Benchmark: p95 < 1s
- Cache hit rate > 80%

### Acceptance Criteria
- ✅ p95 latency < 1s
- ✅ Cache hit rate > 80%
- ✅ DB connection pool stable
- ✅ Static assets via CDN

### Status: **NOT IMPLEMENTED**

---

### Feature 24: Security Hardening

### Business Goal
افزایش امنیت کل سیستم: security headers، CSRF، XSS prevention، rate limiting، penetration test، dependency scanning.

### User
- همه (transparent)
- Security Admin: مانیتورینگ

### Preconditions
- ⚠️ برخی کنترل‌ها موجود (Idempotency، Optimistic Lock، Tenant isolation)
- ❌ اکثر کنترل‌ها NOT IMPLEMENTED

### Flow
1. **Security Headers** (در nginx):
   - Strict-Transport-Security
   - X-Frame-Options: SAMEORIGIN
   - X-Content-Type-Options: nosniff
   - Content-Security-Policy
   - Referrer-Policy
2. **CSRF Protection** (برای Web forms):
   - CSRF token در cookie + header
   - Verify در POST/PATCH/DELETE
3. **XSS Prevention**:
   - React خودکار escape (موجود)
   - Notification body: sanitize HTML
   - CSP strict
4. **Rate Limiting** (Redis-based):
   - Global: 1000 req/min per IP
   - Login: 5 req/min per IP
   - API: 100 req/min per user
5. **Dependency Scanning**:
   - `bun audit` در CI (بدون `|| true`)
   - Snyk / Dependabot
6. **Container Scanning**:
   - Trivy در CI
7. **Penetration Testing**:
   - OWASP ZAP در CI
   - Annual pentest توسط third-party

### Business Rules
- HSTS max-age 1 year
- CSP default-src 'self'
- Rate limit: 429 با Retry-After
- Password policy enforcement
- 2FA برای Admin (در V2)

### Entities
- (بدون مدل جدید)

### Database Changes
- بدون تغییر

### APIs
- بدون تغییر

### Events
- `security.rate_limited` → Audit
- `security.csf_blocked` → Audit
- `security.suspicious_activity` → Audit + Alert

### Permissions
- `security.read` — Security Admin
- `security.manage` — Super Admin

### Security
- این خود security است!

### Edge Cases
- Rate limit false positive → whitelist IPs
- CSP too strict → break UI → gradually tighten

### Failure Handling
- WAF block → 403 با reason
- Pen test finding → fix + retest

### Tests
- Security: OWASP Top 10
- Pentest: annual
- Vulnerability scan: weekly

### Acceptance Criteria
- ✅ All security headers set
- ✅ Rate limiting فعال
- ✅ No critical vulnerabilities
- ✅ Pass OWASP ZAP baseline

### Status: **NOT IMPLEMENTED**

---

### Feature 25: Docker & CI/CD

### Business Goal
زیرساخت Docker و CI/CD کامل: build، test، scan، deploy خودکار.

### User
- DevOps: مدیریت pipeline
- Developer: trigger deploy

### Preconditions
- ⚠️ Dockerfile پایه موجود (۳۲ خط)
- ⚠️ docker-compose.production.yml موجود اما به فایل‌های مفقود ارجاع می‌دهد
- ⚠️ ci-cd.yml موجود اما `bun audit || true` و integration tests fail

### Flow
1. **Dockerfile** (multi-stage):
   - Stage 1: install deps
   - Stage 2: build
   - Stage 3: production (minimal)
2. **docker-compose.production.yml**:
   - app, postgres, redis, outbox-worker, inbox-worker, snapshot-worker, notification-worker, scheduler-worker, nginx
3. **CI/CD Pipeline** (GitHub Actions):
   - lint → test → build → security scan → docker build → deploy
4. **Deployment**:
   - Staging → Production (با manual approval)
   - Blue-green یا rolling
5. **Rollback**:
   - Automated rollback در صورت health check fail

### Business Rules
- Image immutability (هر build یک tag یکتا)
- Semantic versioning
- Force push ممنوع
- Branch protection روی main
- Signed commits (GPG)

### Entities
- (بدون مدل جدید)

### Database Changes
- بدون تغییر

### APIs
- بدون تغییر

### Events
- `deployment.started` → Notification (DevOps)
- `deployment.completed` → Notification
- `deployment.failed` → Notification + Alert

### Permissions
- `ci_cd.trigger` — DevOps
- `ci_cd.rollback` — Super Admin

### Security
- Secrets در GitHub Actions secrets
- Image signing (cosign)
- Read-only filesystem برای container
- Non-root user در container

### Edge Cases
- Build fail → block deploy
- Test fail → block deploy
- Security scan fail → block deploy
- Health check fail post-deploy → rollback

### Failure Handling
- Deploy fail → rollback to previous
- Rollback fail → manual intervention + alert

### Tests
- CI: lint, unit, integration, e2e
- Security: audit, scan, pentest
- Performance: load test
- Smoke: post-deploy

### Acceptance Criteria
- ✅ Dockerfile multi-stage کار می‌کند
- ✅ docker-compose.production.yml بدون ارجاع به فایل مفقود
- ✅ CI pipeline complete
- ✅ CD با manual approval
- ✅ Automated rollback

### Status: **PARTIALLY IMPLEMENTED** (Dockerfile و docker-compose موجود ولی ناقص؛ CI/CD موجود ولی با خطا)

---

### Feature 26: Testing

### Business Goal
استراتژی تست کامل: unit, integration, e2e, load, security — با coverage > 80%.

### User
- Developer: نوشتن تست
- QA: اجرای تست
- DevOps: automation

### Preconditions
- ⚠️ ۳ فایل تست موجود (shared-kernel, business-logic, architecture-laws)
- ⚠️ ۶۸ تست موجود
- ❌ نبود integration, e2e, load, security tests

### Flow
1. **Unit Tests** (Vitest):
   - Value objects, helpers, services
   - Coverage > 90% برای `src/lib/**`
2. **Integration Tests** (Vitest + Testcontainers):
   - API route tests با PostgreSQL واقعی
   - Coverage > 80% برای `src/app/api/**`
3. **E2E Tests** (Playwright):
   - Critical user journeys (15+ scenarios)
4. **Load Tests** (k6):
   - 1000 concurrent users
   - p95 < 1s
5. **Security Tests** (OWASP ZAP):
   - Weekly automated scan
6. **Coverage**:
   - Vitest c8
   - Report در CI

### Business Rules
- All PRs must pass tests
- Coverage ≥ 80% برای merge
- E2E must pass قبل deploy
- Load test monthly

### Entities
- (بدون مدل جدید)

### Database Changes
- بدون تغییر

### APIs
- بدون تغییر

### Events
- بدون رویداد جدید

### Permissions
- بدون تغییر

### Security
- Test data نباید production باشد
- Test database ایزوله

### Edge Cases
- Flaky tests → retry 3 times, then investigate
- Test data cleanup پس از هر test

### Failure Handling
- Test fail → block merge
- Coverage drop → block merge

### Tests
- 😄 متافور: تست برای تست‌ها

### Acceptance Criteria
- ✅ Unit tests: 500+
- ✅ Integration tests: 200+
- ✅ E2E tests: 15+
- ✅ Coverage > 80%
- ✅ All CI green

### Status: **PARTIALLY IMPLEMENTED** (3 فایل، 68 تست)

---

### Feature 27: PostgreSQL Migration

### Business Goal
مهاجرت از SQLite sandbox به PostgreSQL production با حفظ تمام قابلیت‌ها.

### User
- DevOps: اجرای migration
- Developer: تطبیق code

### Preconditions
- SQLite در `db/custom.db` (۱.۵MB)
- Prisma schema با `provider = "sqlite"`
- سند چشم‌انداز PostgreSQL را الزامی می‌کند

### Flow
1. **Setup PostgreSQL 16**
2. **Convert Prisma schema**:
   - `provider = "postgresql"`
   - استفاده از UUID v7 (با `uuid_v7()` function یا extension)
   - JSONB به‌جای Json
   - ENUM types
   - CHECK constraints
   - Partial indexes
   - GIN indexes روی JSONB
3. **Generate migration**:
   - `prisma migrate dev --name init_postgresql --create-only`
   - ویرایش migration برای PG-specific features
4. **Apply migration**:
   - `prisma migrate deploy`
5. **Migrate data** (در صورت لزوم):
   - Export از SQLite
   - Convert syntax
   - Import به PostgreSQL
6. **Update application code**:
   - هیچ تغییری لازم نیست (Prisma abstraction)
7. **Test**:
   - تمام tests روی PostgreSQL
8. **Deploy**:
   - Update DATABASE_URL
   - Restart application

### Business Rules
- بدون از دست رفتن داده
- Schema ۱۰۰% معادل
- Performance بهتر (نه بدتر)
- Rollback plan آماده

### Entities
- (بدون تغییر در مدل‌ها)

### Database Changes
- تغییر provider در schema.prisma
- اضافه کردن PG-specific features:
  - `default uuid_v7()` (با extension)
  - `JsonB` به‌جای `Json`
  - `@db.Text` برای متن طولانی
  - Partial indexes: `@@index([deletedAt], where: [deletedAt IS NOT NULL])`

### APIs
- بدون تغییر

### Events
- بدون تغییر

### Permissions
- بدون تغییر

### Security
- SSL برای DB connection
- Connection string در env vars
- Row-Level Security برای tenant isolation

### Edge Cases
- نوع داده ناسازگار (مثلاً SQLite dynamic typing)
- Concurrent writes در حین migration
- Lock contention

### Failure Handling
- Migration fail → rollback به SQLite
- Data loss → restore from backup
- Performance regression → query tuning

### Tests
- Schema validation
- Data integrity (row counts, checksums)
- Performance benchmarks
- All existing tests

### Acceptance Criteria
- ✅ PostgreSQL 16 running
- ✅ All 89 models migrated
- ✅ All 118 API routes work
- ✅ Performance ≥ SQLite (در عمل بهتر)
- ✅ Backup/restore works

### Status: **NOT IMPLEMENTED** (فعلاً SQLite)

---

### Feature 28: Flutter Mobile App

### Business Goal
اپ موبایل Flutter (آفلاین‌اول) برای نقش‌های Customer, Representative, Technician, Service Center.

### User
- Customer: خرید، مشاهده گارانتی، ثبت شکایت
- Representative: ثبت سفارش، مشاهده قیمت‌ها
- Technician: مشاهده تعمیرات، ثبت diagnosis
- Service Center: مدیریت سرویس

### Preconditions
- ❌ هیچ کد Flutter موجود نیست
- سند چشم‌انداز Flutter را الزامی می‌کند
- نیاز: API contracts (موجود در `api-client.ts`)

### Flow
1. **Authentication**:
   - Login با username + password
   - ذخیره token در secure storage
   - Auto-refresh
2. **Offline-first**:
   - SQLite محلی برای داده‌های مهم
   - Sync Engine با conflict resolution
   - Queue برای actions آفلاین
3. **Customer Features**:
   - Browse products
   - Place order
   - View warranty cards
   - Submit warranty claim
   - Track service order
4. **Representative Features**:
   - View price lists (dealer)
   - Create sales order for customer
   - View own sales
5. **Technician Features**:
   - View assigned service orders
   - Submit diagnosis
   - Consume parts (با barcode scan)
   - Submit QC
6. **Service Center Features**:
   - Manage service requests
   - Assign technicians
   - Approve claims
7. **Sync Engine**:
   - Push local changes به server
   - Pull server changes به local
   - Conflict resolution: server timestamp wins
   - Background sync (WorkManager)

### Business Rules
- آفلاین‌اول: اپ باید بدون اینترنت کار کند
- Conflict resolution: server timestamp wins (از سند چشم‌انداز)
- Local SQLite برای داده‌های مهم
- Image caching
- Push notifications
- Biometric authentication (FaceID/Fingerprint)

### Entities
- (در mobile — جدا از backend)

### Database Changes
- بدون تغییر در backend
- ✅ API endpoints لازم برای mobile (موجود بیشترشان)

### APIs
- تمام `/api/v1/*` موجود
- جدید: `/api/v1/mobile/sync` (GET — delta since last sync)
- جدید: `/api/v1/mobile/register-device` (POST — FCM token)

### Events
- `mobile.device.registered` → Notification (push)
- `mobile.sync.completed` → Audit

### Permissions
- Same as web (با context mobile)

### Security
- Token در secure storage (Flutter Secure Storage)
- Certificate pinning
- Code obfuscation
- Biometric auth

### Edge Cases
- Conflict: local newer vs server newer → server wins (با notification به user)
- Network flaky → retry with backoff
- Local DB full → cleanup old data

### Failure Handling
- Sync fail → retry (WorkManager)
- API down → offline mode

### Tests
- Widget tests
- Integration tests
- E2E on real device
- Offline mode tests

### Acceptance Criteria
- ✅ Login works
- ✅ Offline mode works
- ✅ Sync with conflict resolution
- ✅ All 4 personas have features

### Status: **NOT IMPLEMENTED**

---

### Feature 29: Offline Sync Engine

### Business Goal
موتور همگام‌سازی بین SQLite محلی (Flutter) و PostgreSQL سرور، با رفع تعارض.

### User
- Mobile App (internal)
- Server (sync endpoint)

### Preconditions
- ❌ پیاده‌سازی نشده
- وابسته به Feature 28 (Flutter)
- سند چشم‌انداز: "server timestamp wins"

### Flow
1. **Local Change Tracking**:
   - هر تغییر در local SQLite یک `sync_outbox` entry ایجاد می‌کند
   - شامل: entity, action (create/update/delete), payload, createdAt, syncedAt
2. **Pull Sync** (هر ۵ دقیقه یا روی دستی):
   - `GET /api/v1/mobile/sync?since={lastSyncAt}`
   - Server تمام تغییرات از lastSyncAt را برمی‌گرداند
   - اعمال در local SQLite
   - در صورت conflict (same id با updatedAt متفاوت):
     - اگر server.updatedAt > local.updatedAt → server wins
     - اگر local.updatedAt > server.updatedAt → local win (push به server)
3. **Push Sync**:
   - ارسال `sync_outbox` entries به server
   - Server اعمال می‌کند + returns updated records
   - Update local با server response
4. **Conflict Resolution**:
   - Strategy: server timestamp wins
   - Local change با timestamp قدیمی‌تر از server → discarded (با notification به user)

### Business Rules
- Idempotent: sync دو بار نباید داده تکراری ایجاد کند
- Resumable: اگر sync وسط قطع شود، ادامه از همانجا
- Bandwidth-efficient: فقط delta (از lastSyncAt)
- Secure: authentication + encryption
- Tenant isolation

### Entities
- (در mobile):
  - `sync_outbox` (id, entity, action, payload, createdAt, syncedAt, error)
  - `sync_state` (entity, lastSyncAt)
- (در server):
  - موجود: `updated_at` روی تمام مدل‌ها (برای delta query)
  - جدید: `deleted_at` (موجود) برای soft delete tracking

### Database Changes
- بدون تغییر در server schema (تمام مدل‌ها updated_at دارند)
- ✅ Index روی `(tenant_id, updated_at)` برای delta query سریع

### APIs
- `GET /api/v1/mobile/sync?since=ISO_DATE&entities=SalesOrder,WarrantyCard,...`
- `POST /api/v1/mobile/sync/push` (batch of changes)
- `POST /api/v1/mobile/register-device` (FCM token)

### Events
- `mobile.sync.started` → Audit
- `mobile.sync.completed` → Audit
- `mobile.sync.conflict` → Audit + Notification (user)

### Permissions
- `mobile.sync` — authenticated users

### Security
- Authentication required
- Tenant isolation
- Rate limiting (sync هر ۵ دقیقه)

### Edge Cases
- Clock skew بین client و server → use server time as truth
- Large delta → pagination
- Network timeout → retry
- Server changed schema → version check

### Failure Handling
- Sync fail → retry 3 times with backoff
- Conflict → log + notify user
- Schema mismatch → block sync + alert upgrade

### Tests
- Unit: conflict resolution
- Integration: sync full cycle
- E2E: offline → action → online → sync → verify

### Acceptance Criteria
- ✅ Offline mode works
- ✅ Sync with conflict resolution
- ✅ Server timestamp wins
- ✅ Idempotent
- ✅ Resumable

### Status: **NOT IMPLEMENTED**

---

### Feature 30: Dynamic Forms

### Business Goal
فرم‌های پویا (Dynamic Forms) با schema JSONB، اعتبارسنجی، نسخه‌برداری — برای فرم‌های متغیر مانند بازرسی گارانتی، QC checklist، فرم‌های سفارشی مشتری.

### User
- System Admin: تعریف فرم
- Service Center: پر کردن فرم (بازرسی، QC)
- Customer: پر کردن فرم (claim description)

### Preconditions
- ❌ هیچ ماژول Dynamic Forms پیاده‌سازی نشده است
- سند چشم‌انداز JSONB-based را پیشنهاد می‌کند

### Flow
1. **POST /api/v1/forms/definitions**: ایجاد تعریف فرم
   - ورودی: { code, name, version, fields[], validationRules[] }
   - fields: [{ name, type: text|number|date|select|multiselect|boolean|file|signature, label, required, options, conditional, ... }]
2. **POST /api/v1/forms/definitions/{id}/publish**: انتشار
3. **POST /api/v1/forms/definitions/{code}/submit**: ثبت submission
   - اعتبارسنجی با schema
   - ذخیره در `form_submissions`
4. **GET /api/v1/forms/submissions**: لیست
5. **GET /api/v1/forms/submissions/{id}**: جزئیات

### Business Rules
- Versioned: هر تغییر = version جدید
- Schema validation با JSON Schema
- Conditional fields (مثلاً اگر field_a === 'yes'، field_b را نشان بده)
- Multi-language (fa, en)
- File upload با file storage
- Signature capture (در mobile)

### Entities
- جدید: `FormDefinition` (id, tenantId, code, name, version, schema JSON, status, publishedAt)
- جدید: `FormSubmission` (id, tenantId, formDefinitionId, version, submittedBy, data JSON, entityType?, entityId?, createdAt)

### Database Changes
```sql
CREATE TABLE form_definitions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  version INT NOT NULL,
  schema JSONB NOT NULL,
  status TEXT DEFAULT 'draft',
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, code, version)
);

CREATE TABLE form_submissions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  form_definition_id UUID NOT NULL,
  form_code TEXT NOT NULL,
  form_version INT NOT NULL,
  submitted_by UUID,
  data JSONB NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (form_definition_id) REFERENCES form_definitions(id)
);

CREATE INDEX idx_form_subs_entity ON form_submissions (tenant_id, entity_type, entity_id);
```

### APIs
- `GET /api/v1/forms/definitions`
- `POST /api/v1/forms/definitions`
- `POST /api/v1/forms/definitions/{id}/publish`
- `GET /api/v1/forms/definitions/{code}` (latest published)
- `POST /api/v1/forms/definitions/{code}/submit`
- `GET /api/v1/forms/submissions`
- `GET /api/v1/forms/submissions/{id}`

### Events
- `form.submitted` → Audit + Workflow (در صورت تعریف)
- `form.definition.published` → Audit

### Permissions
- `form.read` — Staff
- `form.definition.manage` — System Admin
- `form.submit` — بسته به context

### Security
- Schema validation (جلوگیری از arbitrary JSON)
- File upload: type/size validation
- Tenant isolation
- Audit

### Edge Cases
- Schema version mismatch → 422
- Conditional field not satisfied → 422
- File too large → 413
- Invalid file type → 422

### Failure Handling
- Validation fail → 422 با errors[]
- DB fail → 500

### Tests
- Unit: schema validation
- Integration: create definition → submit → verify
- E2E: define inspection form → submit during warranty claim

### Acceptance Criteria
- ✅ Dynamic form schema
- ✅ Validation works
- ✅ Versioning
- ✅ File upload
- ✅ Conditional fields

### Status: **NOT IMPLEMENTED**

---

### Feature 31: Feature Flags

### Business Goal
سیستم Feature Flags برای فعال/غیرفعال کردن قابلیت‌ها بدون redeploy (QR Warranty, SMS, WhatsApp, AI, Inventory, CRM).

### User
- System Admin: toggle flags
- Application: read flag value

### Preconditions
- ❌ پیاده‌سازی نشده
- سند چشم‌انداز: QR Warranty, SMS, WhatsApp, AI, Inventory, CRM flags

### Flow
1. **POST /api/v1/feature-flags**: ایجاد flag (key, description, default value)
2. **POST /api/v1/feature-flags/{key}/toggle**: تغییر مقدار
3. **GET /api/v1/feature-flags/{key}**: دریافت مقدار (با user/tenant context)
4. **In Application**:
   - `if (await FeatureFlag.isEnabled('ai_assistant', userId)) { ... }`
5. **Cache** در Redis با TTL 1 min

### Business Rules
- Flags tenant-scoped + user-scoped (override)
- Default value اگر flag تعریف نشده → false
- تغییر flag فوراً اعمال می‌شود (با cache invalidation)
- Audit تمام تغییرات
- Percentage rollout (مثلاً ۱۰٪ کاربران)

### Entities
- جدید: `FeatureFlag` (id, tenantId, key, description, defaultValue, type: boolean|percentage|json)
- جدید: `FeatureFlagOverride` (id, flagId, userId, value)
- جدید: `FeatureFlagAudit` (id, flagId, changedBy, oldValue, newValue, changedAt)

### Database Changes
```sql
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  key TEXT NOT NULL,
  description TEXT,
  default_value JSONB NOT NULL,
  flag_type TEXT DEFAULT 'boolean',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  UNIQUE(tenant_id, key)
);

CREATE TABLE feature_flag_overrides (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  flag_id UUID NOT NULL,
  user_id UUID,
  value JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(flag_id, user_id)
);

CREATE TABLE feature_flag_audit (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  flag_id UUID NOT NULL,
  changed_by UUID,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  changed_at TIMESTAMP DEFAULT NOW()
);
```

### APIs
- `GET /api/v1/feature-flags`
- `POST /api/v1/feature-flags`
- `GET /api/v1/feature-flags/{key}`
- `POST /api/v1/feature-flags/{key}/toggle`
- `POST /api/v1/feature-flags/{key}/override` (برای user خاص)
- `GET /api/v1/feature-flags/{key}/audit`

### Events
- `feature_flag.toggled` → Audit + Notification (admin)
- `feature_flag.overridden` → Audit

### Permissions
- `feature_flag.read` — Staff
- `feature_flag.manage` — Super Admin

### Security
- Tenant isolation
- Audit
- Cache invalidation امن

### Edge Cases
- Flag تعریف نشده → default (false)
- Override for non-existent user → ignore
- Concurrent toggle → Optimistic Lock

### Failure Handling
- Cache miss → DB lookup
- DB fail → use cached value (stale ok)

### Tests
- Unit: flag resolution
- Integration: toggle → verify
- E2E: enable AI flag → AI available

### Acceptance Criteria
- ✅ Toggle flags without redeploy
- ✅ User-specific overrides
- ✅ Percentage rollout
- ✅ Audit log
- ✅ Cache + invalidation

### Status: **NOT IMPLEMENTED**

---

### Feature 32: Multi-company Support

### Business Goal
پشتیبانی از چند شرکت مستقل در یک tenant (مثلاً هلدینگ با چند شرکت subsidiary).

### User
- Group CEO: مشاهده همه شرکت‌ها
- Company Manager: مشاهده شرکت خودش
- Staff: محدود به شرکت خودش

### Preconditions
- ⚠️ tenantId روی تمام مدل‌ها موجود (Single-Tenant Ready)
- ❌ companyId موجود نیست
- سند چشم‌انداز single-tenant در V1 را می‌گوید، اما multi-company می‌تواند در V1.1 اضافه شود

### Flow
1. **POST /api/v1/companies**: ایجاد شرکت در tenant
2. **POST /api/v1/users/{id}/assign-company**: تخصیص کاربر به شرکت
3. **In API routes**:
   - `const companyId = await getCompanyId()` (از JWT)
   - تمام queries با `where: { tenantId, companyId, ... }`
4. **Reports**: با filter company
5. **Consolidated Reports**: (Group CEO) aggregation از همه شرکت‌ها

### Business Rules
- tenant > company > user
- User می‌تواند در چند شرکت باشد (با default)
- هر company独立的: chart of accounts, products, customers
- Inter-company transactions نیاز به elimination در consolidated reports

### Entities
- جدید: `Company` (id, tenantId, name, code, parentId?, address, ...)
- تغییر در تمام مدل‌های business: افزودن `companyId`

### Database Changes
```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  parent_id UUID,
  address JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

-- ALTER TABLE برای تمام جداول business:
ALTER TABLE sales_orders ADD COLUMN company_id UUID REFERENCES companies(id);
ALTER TABLE invoices ADD COLUMN company_id UUID REFERENCES companies(id);
-- ... (برای ۵۰+ جدول)

CREATE INDEX idx_sales_orders_company ON sales_orders (tenant_id, company_id);
-- ... (برای ۵۰+ جدول)

-- جدول user_companies
CREATE TABLE user_companies (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  company_id UUID NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, company_id)
);
```

### APIs
- `GET/POST /api/v1/companies`
- `GET/PATCH /api/v1/companies/{id}`
- `POST /api/v1/users/{id}/assign-company`
- `GET /api/v1/me/companies`
- `POST /api/v1/me/switch-company` (تغییر company فعلی)

### Events
- `company.created` → Audit
- `user.company_assigned` → Audit
- `user.company_switched` → Audit

### Permissions
- `company.read` — Staff
- `company.manage` — Admin
- `company.switch` — User (own)

### Security
- Tenant isolation
- Company isolation (در صورت دارد)
- Audit

### Edge Cases
- User بدون company → use default
- Inter-company transaction → نیاز به elimination
- Consolidated report → aggregation

### Failure Handling
- بدون company → 403

### Tests
- Unit: company resolution
- Integration: create company → assign user → access
- E2E: switch company → verify isolation

### Acceptance Criteria
- ✅ Multiple companies in one tenant
- ✅ User can switch
- ✅ Data isolation
- ✅ Consolidated reports

### Status: **PARTIALLY IMPLEMENTED** (tenantId موجود اما companyId نیست)

---

### Feature 33: File Upload & Storage

### Business Goal
سیستم مدیریت فایل (آپلود، ذخیره، دانلود) با پشتیبانی از Local, MinIO, S3, Azure Blob.

### User
- Staff: آپلود فایل (مثلاً عکس محصول، فاکتور PDF)
- Customer: آپلود (مثلاً عکس شکایت)
- Application: ذخیره فایل (مثلاً QR code, report PDF)

### Preconditions
- ❌ پیاده‌سازی نشده
- ProductBrand.logoFileId, ProductModel.imageFileId در schema موجود اما بدون storage واقعی
- سند چشم‌انداز: Interface-based (Local/MinIO/S3/Azure)

### Flow
1. **POST /api/v1/files/upload** (multipart):
   - اعتبارسنجی: type, size (max 10MB)
   - تولید fileId (UUID v7)
   - محاسبه SHA-256 (dedup)
   - ذخیره در FileStorage (interface)
   - ایجاد رکورد `File`
   - بازگشت: { fileId, url, mimeType, size }
2. **GET /api/v1/files/{id}**: دانلود
3. **GET /api/v1/files/{id}/meta**: metadata
4. **DELETE /api/v1/files/{id}**: حذف (soft delete)

### Business Rules
- File types whitelist: jpg, png, pdf, xlsx, csv, txt
- Max size: 10MB (configurable)
- Dedup: اگر SHA-256 تکراری بود → reference count
- Virus scan (در V2)
- Tenant isolation
- Audit

### Entities
- جدید: `File` (id, tenantId, originalName, mimeType, size, sha256, storageBackend, storagePath, uploadedBy, createdAt, deletedAt)
- جدید: `FileReference` (id, fileId, entityType, entityId, fieldName, createdAt) — برای پیوند فایل به هر entity

### Database Changes
```sql
CREATE TABLE files (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size BIGINT NOT NULL,
  sha256 TEXT NOT NULL,
  storage_backend TEXT NOT NULL,  -- local|minio|s3|azure
  storage_path TEXT NOT NULL,
  uploaded_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_files_sha256 ON files (sha256);
CREATE INDEX idx_files_tenant ON files (tenant_id, created_at);

CREATE TABLE file_references (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  file_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  field_name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (file_id) REFERENCES files(id)
);

CREATE INDEX idx_file_refs_entity ON file_references (tenant_id, entity_type, entity_id);
```

### APIs
- `POST /api/v1/files/upload`
- `GET /api/v1/files/{id}`
- `GET /api/v1/files/{id}/meta`
- `DELETE /api/v1/files/{id}`
- `GET /api/v1/files` (لیست با filter)

### Events
- `file.uploaded` → Audit
- `file.deleted` → Audit

### Permissions
- `file.upload` — Staff, Customer
- `file.read` — Staff, Customer (own + shared)
- `file.delete` — Owner, Admin

### Security
- Tenant isolation
- Access control (owner or shared)
- Virus scan (در V2)
- Signed URLs (پس از ۱ ساعت expire)

### Edge Cases
- File too large → 413
- Invalid type → 422
- Disk full → 507
- Storage backend down → 503

### Failure Handling
- Upload fail → retry
- Storage fail → fallback to alternate backend
- Download fail → 404 یا 410 (deleted)

### Tests
- Unit: SHA-256, dedup
- Integration: upload → download → delete
- E2E: upload product image → view in product detail

### Acceptance Criteria
- ✅ Upload works (Local + MinIO)
- ✅ Download works
- ✅ Dedup
- ✅ Tenant isolation
- ✅ Access control

### Status: **NOT IMPLEMENTED**

---

### Feature 34: Search Engine

### Business Goal
جستجوی全文 (Full-Text Search) روی محصولات، مشتریان، سفارش‌ها، فاکتورها با PostgreSQL GIN + JSONB (نه Elasticsearch در V1).

### User
- همه: جستجو

### Preconditions
- ❌ پیاده‌سازی نشده
- فقط Prisma `where` با LIKE موجود
- سند چشم‌انداز: PostgreSQL GIN + JSONB

### Flow
1. **Index Creation**:
   - GIN index روی `name`, `description` (tsvector)
   - GIN index روی `attributes` JSONB
   - GIN index روی `metadata` JSONB
2. **GET /api/v1/search**:
   - ورودی: { q, type, filters, page, perPage }
   - ساخت query با `tsvector @@ plainto_tsquery(:q)`
   - OR `attributes @> :filter` برای JSONB
   - بازگشت: { results[], total, page, perPage }
3. **Autocomplete**:
   - `GET /api/v1/search/autocomplete?q=...`
   - بازگشت ۱۰ پیشنهاد

### Business Rules
- Support Persian full-text search (با `pg_bidi` یا `unaccent`)
- Multi-language (fa, en)
- Ranking: ts_rank
- Filters: tenantId, entityType, date range, custom
- Pagination

### Entities
- (بدون مدل جدید — از جداول موجود با index)

### Database Changes
```sql
-- Generate tsvector column
ALTER TABLE products ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, ''))
  ) STORED;

CREATE INDEX idx_products_search ON products USING GIN (search_vector);

ALTER TABLE parties ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(display_name, '') || ' ' || coalesce(tax_id, ''))
  ) STORED;

CREATE INDEX idx_parties_search ON parties USING GIN (search_vector);

-- Similar for: sales_orders, invoices, product_instances, warranty_cards

-- JSONB GIN indexes
CREATE INDEX idx_products_attributes ON products USING GIN (attributes);
CREATE INDEX idx_product_instances_attributes ON product_instances USING GIN (attributes);
```

### APIs
- `GET /api/v1/search?q=...&type=product|party|order|invoice`
- `GET /api/v1/search/autocomplete?q=...`

### Events
- بدون رویداد جدید (read-only)

### Permissions
- `search.read` — Staff, Customer (own)

### Security
- Tenant isolation در query
- Access control (customer فقط داده‌های خودش)

### Edge Cases
- Empty query → return popular
- No results → return suggestions
- Too many results → pagination

### Failure Handling
- Query timeout → 504
- Invalid query syntax → 422

### Tests
- Unit: query construction
- Integration: search product by name
- E2E: type in search box → see results

### Acceptance Criteria
- ✅ Full-text search works
- ✅ Persian support
- ✅ JSONB filter
- ✅ Pagination
- ✅ Autocomplete

### Status: **NOT IMPLEMENTED** (فعلاً فقط LIKE)

---

### Feature 35: Data Import Pipeline

### Business Goal
پایپلاین Import داده‌ها از Excel/CSV با اعتبارسنجی، batch processing، progress tracking، و error reporting.

### User
- Admin: آپلود فایل
- Staff: مشاهده progress

### Preconditions
- ❌ پیاده‌سازی نشده
- نیاز: file upload (Feature 33)
- نیاز: queue processing

### Flow
1. **POST /api/v1/imports** (multipart):
   - ورودی: file + { entityType, mode: insert|update|upsert, mapping? }
   - ذخیره فایل (Feature 33)
   - ایجاد `ImportJob` با status='pending'
   - بازگشت: { jobId }
2. **Worker** (async):
   - parse file (xlsx/csv)
   - validate header
   - برای هر row:
     - validate با schema
     - transform (با mapping)
     - در صورت valid: add to batch
     - در صورت invalid: add to errors
   - batch insert/update (مثلاً ۱۰۰ رکورد در هر transaction)
   - بروزرسانی ImportJob: progress, successCount, errorCount
   - در صورت خطای بحرانی: status='failed'
   - در صورت موفقیت: status='completed'
3. **GET /api/v1/imports/{jobId}**: status + progress
4. **GET /api/v1/imports/{jobId}/errors**: لیست خطاها (CSV download)
5. **GET /api/v1/imports/{jobId}/undo**: rollback (در صورت امکان)

### Business Rules
- File formats: xlsx, csv
- Max size: 10MB
- Max rows: 100,000
- Batch size: 100 records per transaction
- Idempotent: re-import همان فایل → skip duplicates (با SHA-256 row hash)
- Tenant isolation
- Audit

### Entities
- جدید: `ImportJob` (id, tenantId, entityType, fileName, fileSize, totalRows, successCount, errorCount, status, startedAt, completedAt, errorMessage, uploadedBy)
- جدید: `ImportRow` (id, jobId, rowNumber, data JSON, status, error)

### Database Changes
```sql
CREATE TABLE import_jobs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  total_rows INT DEFAULT 0,
  success_count INT DEFAULT 0,
  error_count INT DEFAULT 0,
  status TEXT DEFAULT 'pending',  -- pending|processing|completed|failed
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE import_rows (
  id UUID PRIMARY KEY,
  job_id UUID NOT NULL,
  row_number INT NOT NULL,
  data JSONB,
  status TEXT,  -- pending|success|error
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (job_id) REFERENCES import_jobs(id)
);

CREATE INDEX idx_import_rows_job ON import_rows (job_id, status);
```

### APIs
- `POST /api/v1/imports`
- `GET /api/v1/imports` (لیست)
- `GET /api/v1/imports/{jobId}`
- `GET /api/v1/imports/{jobId}/errors` (CSV)
- `POST /api/v1/imports/{jobId}/undo` (در صورت امکان)
- `GET /api/v1/imports/templates/{entityType}` (download template)

### Events
- `import.started` → Audit
- `import.row_processed` → (batched)
- `import.completed` → Audit + Notification (uploader)
- `import.failed` → Audit + Notification

### Permissions
- `import.create` — Admin, Manager
- `import.read` — Staff
- `import.undo` — Admin

### Security
- File validation (type, size)
- Schema validation (sanitize input)
- Tenant isolation
- Rate limit (max 1 import per user per 5 min)

### Edge Cases
- File too large → 413
- Invalid format → 422
- Missing required columns → 422
- Row with invalid data → skip + log
- Concurrent imports of same entity → lock

### Failure Handling
- Worker crash → resume from last successful row
- DB fail → retry batch
- All rows fail → status='failed' with summary

### Tests
- Unit: parsing, validation, transformation
- Integration: upload → process → verify rows
- E2E: import 100 products → verify all created

### Acceptance Criteria
- ✅ Upload Excel/CSV
- ✅ Validate + transform
- ✅ Progress tracking
- ✅ Error reporting
- ✅ Idempotent

### Status: **NOT IMPLEMENTED**

---

## خلاصه نهایی قراردادها

### جدول خلاصه وضعیت ۳۵ قابلیت

| # | Feature | Status | اولویت |
|---|---------|--------|--------|
| 1 | Authentication & Session Management | ❌ NOT IMPLEMENTED | 🚨 Critical |
| 2 | RBAC & Permission System | ❌ NOT IMPLEMENTED | 🚨 Critical |
| 3 | Product & Serial Management | ✅ IMPLEMENTED (minor gaps) | Medium |
| 4 | Inventory & Warehouse | ✅ IMPLEMENTED | Maintain |
| 5 | Sales Order Management | ✅ IMPLEMENTED | Maintain |
| 6 | Fulfillment & Shipment | ✅ IMPLEMENTED | Maintain |
| 7 | Invoice & Billing | ✅ IMPLEMENTED | Maintain |
| 8 | Payment & Allocation | ✅ IMPLEMENTED | Maintain |
| 9 | Returns & Refunds | ✅ IMPLEMENTED | Maintain |
| 10 | Warranty Management | ✅ IMPLEMENTED | Maintain |
| 11 | Service & Repair | ✅ IMPLEMENTED | Maintain |
| 12 | Financial Accounting | ✅ IMPLEMENTED | Maintain |
| 13 | Workflow Engine | ✅ IMPLEMENTED | Maintain |
| 14 | Rule Engine | ✅ IMPLEMENTED | Maintain |
| 15 | Notification System | ✅ IMPLEMENTED | Maintain |
| 16 | Device Timeline | ✅ IMPLEMENTED | Extend |
| 17 | Event-Driven Architecture | ✅ IMPLEMENTED | Extend |
| 18 | Scheduler & Automation | ❌ NOT IMPLEMENTED | High |
| 19 | Monitoring & Observability | ❌ NOT IMPLEMENTED | High |
| 20 | BI & Analytics | ❌ NOT IMPLEMENTED | Medium |
| 21 | AI Assistant | ❌ NOT IMPLEMENTED | Low |
| 22 | Report Builder | ❌ NOT IMPLEMENTED | Medium |
| 23 | Performance & Caching | ❌ NOT IMPLEMENTED | High |
| 24 | Security Hardening | ❌ NOT IMPLEMENTED | 🚨 Critical |
| 25 | Docker & CI/CD | ⚠️ PARTIALLY IMPLEMENTED | High |
| 26 | Testing | ⚠️ PARTIALLY IMPLEMENTED | High |
| 27 | PostgreSQL Migration | ❌ NOT IMPLEMENTED | 🚨 Critical |
| 28 | Flutter Mobile App | ❌ NOT IMPLEMENTED | Medium |
| 29 | Offline Sync Engine | ❌ NOT IMPLEMENTED | Medium |
| 30 | Dynamic Forms | ❌ NOT IMPLEMENTED | Low |
| 31 | Feature Flags | ❌ NOT IMPLEMENTED | Medium |
| 32 | Multi-company Support | ⚠️ PARTIALLY IMPLEMENTED | Low |
| 33 | File Upload & Storage | ❌ NOT IMPLEMENTED | High |
| 34 | Search Engine | ❌ NOT IMPLEMENTED | Medium |
| 35 | Data Import Pipeline | ❌ NOT IMPLEMENTED | Medium |

### آمار نهایی

- **IMPLEMENTED**: ۱۵ (۴۳٪)
- **PARTIALLY IMPLEMENTED**: ۳ (۹٪)
- **NOT IMPLEMENTED**: ۱۷ (۴۸٪)

### ۵ قابلیت بحرانی برای پیاده‌سازی اول

بر اساس ریسک امنیتی، وابستگی‌ها، و ارزش کسب‌وکار:

1. **🚨 Feature 1: Authentication & Session Management**
   - **چرا}: تمام ۱۱۸ مسیر API بدون احراز هویت قابل دسترسی‌اند — این بزرگ‌ترین ریسک امنیتی است.
   - **زمان تخمینی}: ۲ هفته
   - **وابستگی}: هیچ (مستقل)

2. **🚨 Feature 2: RBAC & Permission System**
   - **چرا}: حتی با auth، بدون RBAC هر کاربر به همه چیز دسترسی دارد.
   - **زمان تخمینی}: ۱.۵ هفته
   - **وابستگی}: Feature 1

3. **🚨 Feature 27: PostgreSQL Migration**
   - **چرا}: SQLite single-writer برای production blocking است.
   - **زمان تخمینی}: ۲ هفته
   - **وابستگی**: هیچ (مستقل از features 1, 2)

4. **🚨 Feature 24: Security Hardening**
   - **چرا}: Security headers, rate limiting, CSRF, XSS prevention لازم برای production.
   - **زمان تخمینی}: ۱.۵ هفته
   - **وابستگی}: Feature 1

5. **Feature 18: Scheduler & Automation**
   - **چرا}: انقضای رزرو، انقضای گارانتی، snapshot شبانه — هیچ‌کدام فعلاً کار نمی‌کنند.
   - **زمان تخمینی}: ۱ هفته
   - **وابستگی**: Feature 27 (برای cron job persistence)

**زمان کل برای ۵ قابلیت بحرانی}: ~۸ هفته (۲ ماه).

---

## پایان سند

این سند (BLUEPRINT-2025-01) مرجع رسمی برای:
- **کشف محصول}: بخش‌های ۱–۴
- **مهندسی معکوس}: بخش‌های ۵–۲۲
- **معماری و استراتژی}: بخش‌های ۲۳–۳۰
- **قرارداد پیاده‌سازی}: بخش ۳۱ (۳۵ قابلیت)

تمام ارجاعات در این سند به **کد واقعی موجود در فایل‌سیستم} است، نه به ادعاهای worklog. هر گونه تضاد با کد، باید با اولویت بر کد حل شود.

برای اجرای هر قابلیت NOT IMPLEMENTED، ایجنت یا تیم آینده باید:
1. قرارداد مربوطه را در بخش ۳۱ بخواند.
2. وابستگی‌ها را بررسی کند.
3. Source file‌های مرتبط را بخواند.
4. تست‌ها را بنویسد.
5. پیاده‌سازی کند.
6. PR با coverage ≥ ۸۰٪.

---

*پایان سند BLUEPRINT-2025-01*
