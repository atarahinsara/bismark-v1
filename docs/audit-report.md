# BISMARK ERP — INDEPENDENT CODE AUDIT REPORT

> **ممیز:** مستقل (نه توسعه‌دهنده پروژه)
> **تاریخ:** ۱۴۰۴/۰۵/۱۲
> **روش:** بررسی کد واقعی فایل‌سیستم + تست زنده با curl
> **قانون:** بدون تعارف — نمره واقعی

---

## جدول نهایی نمرات

| Category | Score | Critical Issues | Status |
|----------|------:|----------------|--------|
| Architecture | 11/15 | SQLite bottleneck, workers اجرا نمی‌شوند | 🟡 |
| Code Quality | 9/15 | Mass assignment در ۲۲ route، کد تکراری | 🔴 |
| Database | 8/15 | SQLite، ۴ مدل بدون index، بدون cascade | 🔴 |
| Security | 10/15 | Mass assignment، localStorage token، no CSRF | 🟡 |
| Backend/API | 7/10 | ۲۲ route بدون validation، customer portal با فیلد اشتباه | 🟡 |
| Frontend | 5/10 | mock data در dashboard، ۱۷ view با fetch مستقیم | 🔴 |
| Testing | 4/10 | ۵ فایل/۱۳۳ تست برای ۲۷۴ فایل سورس — ۱.۸٪ coverage | 🔴 |
| Performance | 3/5 | SQLite single-writer، no cache، no N+1 detection | 🟡 |
| Scalability | 2/5 | SQLite در ۱۰۰ کاربر همزمان fail می‌کند | 🔴 |
| **TOTAL** | **59/100** | | |

---

## سطح واقعی پروژه

### 🟡 Early MVP

پروژه یک **Early MVP** است — نه Production Ready، نه Prototype.

**دلیل:** معماری پایه قوی است (DDD، Event-Driven، RBAC) اما مشکلات بحرانی وجود دارد: SQLite برای production مناسب نیست، ۲۲ route جدید mass assignment دارند، workers اجرا نمی‌شوند، frontend از mock data استفاده می‌کند، و coverage تست ۱.۸٪ است.

---

## ۱. معماری سیستم

### معماری کلی
- **نوع:** Modular Monolith با DDD (Bounded Contexts)
- **Frontend:** Next.js 16 (App Router) + shadcn/ui + Tailwind CSS 4
- **Backend:** Next.js API Routes (Edge + Node.js runtime)
- **Database:** SQLite (sandbox) — **نباید برای production استفاده شود**
- **API:** REST با RFC 7807 error format
- **Auth:** Custom JWT (HMAC-SHA256) — نه next-auth

### نقاط قوت معماری
- ۵۴ قانون معماری (LAW-04 تا LAW-57) که با تست enforce می‌شوند
- الگوی Outbox/Inbox برای reliable event delivery
- Saga Manager برای long-running processes
- Ledger Pattern (موجودی از transactionها مشتق می‌شود)
- UnitOfWork برای transaction management
- BusinessCodeGenerator با ۳۶ تعریف

### نقاط ضعف معماری
- **Single Point of Failure:** SQLite — single-writer، اگر ۲ کاربر همزمان بنویسند، یکی block می‌شود
- **Workers اجرا نمی‌شوند:** `src/workers/run-workers.ts` وجود دارد ولی هیچ process آن را اجرا نمی‌کند — Outbox messages هیچ‌وقت publish نمی‌شوند
- **db-guarded.ts ساخته شده ولی هیچ route‌ای از آن استفاده نمی‌کند** — tenant guard عملاً غیرفعال است

### دیاگرام معماری واقعی

```
Browser (Next.js PWA)
    ↓ fetch with Bearer token
Middleware (Edge Runtime)
    ↓ JWT verify + security headers + CORS + rate limit
API Routes (Node.js)
    ↓ getTenantId() → getAuthContext()
    ↓ Business Logic (inline — no service layer separation)
    ↓ Prisma Client (raw db, not guardedDb)
SQLite (single file, single writer)
    ↓
Outbox Messages (never dispatched — workers not running)
```

---

## ۲. ساختار پروژه

### خوب طراحی شده
- `src/lib/shared/` — shared kernel با value objects، exceptions، events، laws
- `src/lib/auth/` — ماژول احراز هویت جداگانه
- `src/lib/rbac.ts` — RBAC guard متمرکز
- `src/middleware.ts` — middleware Edge-compatible

### مشکلات
- `src/app/page.tsx` — **۱۴۸۷ خط** در یک فایل (باید شکسته شود)
- ۲۲ route جدید از template یکسان تولید شده‌اند — کد تکراری شدید
- frontend views (۱۷ فایل) مستقیماً `fetch()` می‌زنند به جای استفاده از `api-client.ts` — توکن auth_ATTACH نمی‌شود
- `src/lib/mock-data.ts` هنوز در dashboard استفاده می‌شود

---

## ۳. دیتابیس

### مشکلات بحرانی

**۳-۱. SQLite به‌جای PostgreSQL**
```
provider = "sqlite"
```
SQLite single-writer است. در ۱۰۰ کاربر همزمان، writeها serialize می‌شوند و latency به چند ثانیه می‌رسد. برای production **غیرقابل استفاده** است.

**۳-۲. ۴ مدل بدون @@index یا @unique**
- `Invoice` — جستجو بر اساس `customerPartyId` بدون index = full table scan
- `WarrantyClaim` — جستجو بر اساس `warrantyCardId` بدون index
- `ServiceOrder` — جستجو بر اساس `customerPartyId` بدون index
- `Notification` — جستجو بر اساس `recipientId` بدون index

**۳-۳. صفر cascade rule**
هیچ `onDelete` یا `onUpdate` در schema وجود ندارد. همه FKها از default `RESTRICT` استفاده می‌کنند. اگر یک Party حذف شود (حتی soft-delete)، تمام مراجع به آن orphan می‌شوند.

**۳-۴. nullable fields که نباید nullable باشند**
`Product.name`, `Product.barcode`, `WarrantyCard` فیلدهای critical هستند ولی nullable هستند.

### مقیاس‌پذیری

| کاربران همزمان | وضعیت | دلیل |
|----------------|--------|------|
| ۱۰ | ✅ Works | SQLite تک‌نویسنده برای ۱۰ کاربر کافی است |
| ۱۰۰ | ⚠️ Warning | Write contention شروع می‌شود |
| ۱,۰۰۰ | ❌ Fails | SQLite lock timeout، API timeout |
| ۱۰,۰۰۰ | ❌ Fails | سیستم کاملاً غیرقابل استفاده |

---

## ۴. امنیت

### جدول امنیت

| مورد | وضعیت | توضیح |
|------|--------|-------|
| SQL Injection | ✅ Safe | Prisma parameterized queries (یک raw query: `SELECT 1`) |
| XSS | ⚠️ Warning | CSP header set است اما token در localStorage ذخیره می‌شود (XSS→token theft) |
| CSRF | 🔴 Vulnerable | هیچ CSRF protectionی وجود ندارد — ۰ reference |
| IDOR | ⚠️ Warning | customer portal routes از فیلدهای اشتباه استفاده می‌کنند (BUG-2) |
| Mass Assignment | 🔴 **CRITICAL** | ۲۲ route از `data: { tenantId, ...body }` استفاده می‌کنند — کلاینت می‌تواند `id`, `version`, `createdAt` را override کند |
| Authentication | ✅ Safe | JWT با HMAC-SHA256، scrypt password hashing، account lockout |
| Authorization | ✅ Safe | RBAC ۱۰۰٪ coverage (147/152 routes) |
| Rate Limiting | ✅ Safe | 5/min login، 10/min refresh |
| Security Headers | ✅ Safe | 12 header روی همه پاسخ‌ها |
| JWT Secret | ⚠️ Warning | Dev fallback hardcoded: `bismark-dev-secret-change-in-production-01910000` |
| Session Revocation | ⚠️ Warning | Middleware session را در DB چک نمی‌کند — revoked token تا expiry معتبر است |
| Password in Source | ⚠️ Warning | `demo1234` در seed.ts و page.tsx hardcoded |
| Input Validation | 🔴 **CRITICAL** | ۲۲ route جدید هیچ validationی ندارند — `...body` مستقیم به DB می‌رود |

---

## ۵. باگ‌های پیدا شده

### BUG-001: Mass Assignment در ۲۲ route
- **Severity:** CRITICAL
- **File:** ۲۲ فایل (installations, appointments, complaints, surveys, etc.)
- **Problem:** `data: { tenantId, ...body }` — کلاینت می‌تواند هر فیلدی را set کند
- **Reproduce:** `POST /api/v1/complaints` با body `{ "id": "fake-id", "version": 999, "createdAt": "2020-01-01" }`
- **Fix:** whitelist فیلدهای مجاز: `const { customerId, complaintType, subject, description } = body`

### BUG-002: Customer Portal — فیلدهای ناموجود
- **Severity:** HIGH
- **File:** `src/app/api/v1/customer/invoices/route.ts`, `customer/warranties/route.ts`, `customer/products/route.ts`
- **Problem:** این routes از `recipientId` و `currentOwnerId` استفاده می‌کنند که در مدل‌های Invoice، WarrantyCard و ProductInstance وجود ندارند
- **Fix:** فیلدهای صحیح: `customerPartyId` (Invoice, WarrantyCard)

### BUG-003: Rate Limiter Memory Leak
- **Severity:** MEDIUM
- **File:** `src/lib/rate-limiter.ts` line 30
- **Problem:** `const store = new Map()` — entries هرگز پاک نمی‌شوند. در طول زمان، Map به بی‌نهایت رشد می‌کند
- **Fix:** `setInterval(() => { cleanup expired entries }, 60000)`

### BUG-004: db-guarded.ts استفاده نمی‌شود
- **Severity:** HIGH
- **File:** `src/lib/db-guarded.ts`
- **Problem:** Prisma Extension tenant guard ساخته شده ولی ۰ route از آن استفاده می‌کند. همه routes از raw `db` استفاده می‌کنند
- **Fix:** تمام routes را از `db` به `guardedDb` تغییر بده

### BUG-005: Workers اجرا نمی‌شوند
- **Severity:** HIGH
- **File:** `src/workers/run-workers.ts`
- **Problem:** اسکریپت worker وجود دارد ولی هیچ process آن را اجرا نمی‌کند. Outbox messages هیچ‌وقت publish نمی‌شوند. Event-driven architecture عملاً غیرفعال است.
- **Fix:** Worker را به‌عنوان background process (pm2, systemd, یا Docker container) اجرا کن

### BUG-006: Session revocation چک نمی‌شود
- **Severity:** MEDIUM
- **File:** `src/middleware.ts`
- **Problem:** Middleware فقط JWT signature و expiry را چک می‌کند. اگر session در DB revoked شود، token تا expiry (۱۵ دقیقه) همچنان معتبر است
- **Fix:** Middleware باید session status را در DB چک کند (یا از blacklist استفاده کند)

### BUG-007: Frontend از mock data استفاده می‌کند
- **Severity:** MEDIUM
- **File:** `src/app/page.tsx` line 34, 461-464
- **Problem:** Dashboard از `mockUsers`, `dashboardStats` استفاده می‌کند نه از API واقعی
- **Fix:** dashboard را به API واقعی متصل کن

### BUG-008: Views توکن auth ارسال نمی‌کنند
- **Severity:** HIGH
- **File:** ۱۷ view در `src/components/views/`
- **Problem:** ۵ view از `fetch()` مستقیم استفاده می‌کنند به جای `api-client.ts` که توکن Bearer را attach می‌کند. این views با RBAC 401 دریافت می‌کنند
- **Fix:** همه views را به `api-client.ts` متصل کن

### BUG-009: No password reset flow
- **Severity:** MEDIUM
- **Problem:** هیچ مسیر reset password وجود ندارد
- **Fix:** POST /api/v1/auth/password-reset-request + POST /api/v1/auth/password-reset

### BUG-010: No CSRF protection
- **Severity:** MEDIUM
- **Problem:** هیچ CSRF token یا SameSite cookie enforcementی وجود ندارد
- **Fix:** برای browser-based requests، CSRF token یا SameSite=Strict cookie استفاده کن

---

## ۶. تست‌ها

### Coverage واقعی

| شاخص | مقدار |
|------|-------|
| فایل‌های سورس (src/lib + src/app) | ۲۷۴ |
| فایل‌های تست | ۵ |
| تست‌ها | ۱۳۳ |
| Coverage تقریبی | **~۱.۸٪** |

### تست‌های موجود
1. `shared-kernel.test.ts` — ۲۷ تست (value objects)
2. `business-logic.test.ts` — ۲۱ تست (business rules)
3. `architecture-laws.test.ts` — ۲۰ تست (law exports)
4. `auth-rbac.test.ts` — ۲۲ تست (password, JWT, RBAC errors)
5. `input-sanitizer.test.ts` — ۳۸ تست (SQLi, XSS, path traversal)

### تست‌های مفقود
- ❌ Integration test (هیچ)
- ❌ API test (هیچ)
- ❌ E2E test (هیچ)
- ❌ Concurrency test (هیچ)
- ❌ Tenant isolation test (هیچ)
- ❌ Workflow transition test (هیچ)
- ❌ Financial integrity test (هیچ)
- ❌ Saga compensation test (هیچ)

---

## ۷. Dependency Audit

### پکیج‌های بدون استفاده (۸ پکیج)
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` — drag & drop (استفاده نمی‌شود)
- `@mdxeditor/editor` — MDX editor (استفاده نمی‌شود)
- `react-syntax-highlighter` — code highlighting (استفاده نمی‌شود)
- `react-markdown` — markdown rendering (استفاده نمی‌شود)
- `next-intl` — i18n (استفاده نمی‌شود)
- `sharp` — image processing (استفاده نمی‌شود)

### پکیج اضافی
- `next-auth` — نصب شده ولی ۰ استفاده (custom JWT جایگزین شده)

### توصیه
حذف ۹ پکیج بدون استفاده → کاهش bundle size و attack surface

---

## ۸. Top 20 Problems

| # | Severity | Problem | Location |
|---|----------|---------|----------|
| 1 | CRITICAL | Mass assignment در ۲۲ route | `installations`, `appointments`, ... |
| 2 | CRITICAL | SQLite — single-writer bottleneck | `prisma/schema.prisma` |
| 3 | HIGH | Workers اجرا نمی‌شوند — Outbox messages تجمع می‌شوند | `src/workers/` |
| 4 | HIGH | db-guarded.ts استفاده نمی‌شود | `src/lib/db-guarded.ts` |
| 5 | HIGH | Customer portal فیلدهای اشتباه | `src/app/api/v1/customer/` |
| 6 | HIGH | Views توکن auth ارسال نمی‌کنند | `src/components/views/` |
| 7 | HIGH | ۴ مدل بدون index | `Invoice`, `WarrantyClaim`, `ServiceOrder`, `Notification` |
| 8 | HIGH | تست coverage ۱.۸٪ | `src/tests/` |
| 9 | MEDIUM | Frontend از mock data استفاده می‌کند | `src/app/page.tsx` |
| 10 | MEDIUM | No CSRF protection | کل سیستم |
| 11 | MEDIUM | Session revocation در middleware چک نمی‌شود | `src/middleware.ts` |
| 12 | MEDIUM | Rate limiter memory leak | `src/lib/rate-limiter.ts` |
| 13 | MEDIUM | No password reset flow | `src/app/api/v1/auth/` |
| 14 | MEDIUM | JWT secret dev fallback hardcoded | `src/lib/auth/jwt.ts:31` |
| 15 | MEDIUM | ۰ cascade rule در schema | `prisma/schema.prisma` |
| 16 | LOW | page.tsx ۱۴۸۷ خط | `src/app/page.tsx` |
| 17 | LOW | ۹ پکیج بدون استفاده | `package.json` |
| 18 | LOW | AuditLog فقط ۳ route | `src/app/api/v1/` |
| 19 | LOW | No file upload implementation | `src/app/api/v1/files/` |
| 20 | LOW | No HTTPS redirect | `src/middleware.ts` |

---

## ۹. نقاط قوت واقعی

| # | نقطه قوت | محل در کد |
|---|---------|-----------|
| 1 | ۵۴ قانون معماری enforce شده با تست | `src/lib/shared/laws/` |
| 2 | RBAC ۱۰۰٪ coverage (147/152 routes) | `src/lib/rbac.ts` + all routes |
| 3 | scrypt password hashing (نه bcrypt ضعیف) | `src/lib/auth/password.ts` |
| 4 | ۱۲ security header روی همه پاسخ‌ها | `src/middleware.ts` |
| 5 | Atomic stock allocation با optimistic lock | `src/app/api/v1/stock-reservations/route.ts` |
| 6 | Outbox/Inbox/Saga pattern پیاده‌شده | `src/lib/shared/outbox/`, `src/lib/saga/` |
| 7 | Idempotency روی تمام POST routes | `src/lib/shared/infra/idempotency-helper.ts` |
| 8 | Double-entry accounting (LAW-35) | `src/lib/shared/laws/law-35.ts` |
| 9 | ۷۵ الگوی حمله در input sanitizer | `src/lib/input-sanitizer.ts` |
| 10 | Device Timeline از events ساخته می‌شود (نه JOIN) | `src/app/api/v1/device-timeline/` |

---

## ۱۰. Technical Debt

### فوری (قبل از هر کاری)
1. Mass assignment در ۲۲ route را fix کن
2. SQLite → PostgreSQL مهاجرت
3. Workers را به‌عنوان background process اجرا کن

### قبل از Production
4. customer portal فیلدهای اشتباه را fix کن
5. Views را به api-client.ts متصل کن
6. Mock data را از dashboard حذف کن
7. Rate limiter memory leak را fix کن
8. Password reset flow اضافه کن
9. CSRF protection اضافه کن
10. تست‌های integration اضافه کن

### بعد از Launch
11. db-guarded را در همه routes اعمال کن
12. AuditLog را به همه mutation routes اضافه کن
13. File upload واقعی پیاده کن
14. پکیج‌های بدون استفاده را حذف کن

---

## ۱۱. گزارش مدیر پروژه

**۱. پروژه الان دقیقاً در چه مرحله‌ای است؟**
Early MVP — معماری قوی اما implementation ناقص. ۱۱۶ مدل و ۱۵۲ route وجود دارد ولی ۲۲ route جدید mass assignment دارند، workers اجرا نمی‌شوند، frontend از mock data استفاده می‌کند، و SQLite برای production مناسب نیست.

**۲. چه مقدار واقعاً تمام شده؟**
~۶۰٪ — معماری و هسته کسب‌وکار (Sprint 1-7.3) کامل است. احراز هویت و RBAC کامل است. اما ۲۲ route جدید ناقص هستند، workers فعال نیستند، و frontend با backend واقعی متصل نیست.

**۳. چه مقدار فقط ظاهراً تمام شده؟**
- ۲۲ route جدید (mass assignment، no validation)
- Customer portal (فیلدهای اشتباه)
- Workers (اسکریپت وجود دارد ولی اجرا نمی‌شود)
- db-guarded (ساخته شده ولی استفاده نمی‌شود)
- File upload (route وجود دارد ولی multipart handler ندارد)

**۴. بزرگ‌ترین ریسک؟**
Mass assignment — هر کاربر احراز هویت‌شده می‌تواند هر فیلدی در دیتابیس override کند.

**۵. بزرگ‌ترین مشکل معماری؟**
SQLite — single-writer bottleneck که در ۱۰۰ کاربر همزمان fail می‌کند.

**۶. بزرگ‌ترین مشکل امنیتی؟**
Mass assignment در ۲۲ route + نبود CSRF protection.

**۷. بزرگ‌ترین مشکل Database؟**
SQLite + ۴ مدل بدون index + صفر cascade rule.

**۸. بزرگ‌ترین مشکل Performance؟**
SQLite write contention + workers غیرفعال (Outbox messages تجمع می‌شوند).

**۹. اگر امروز Production شود چه اتفاقی می‌افتد؟**
- ۱۰۰ کاربر همزمان → SQLite lock timeout → API 500
- هر کاربر می‌تواند `id` و `version` را override کند → data corruption
- Outbox messages هرگز dispatch نمی‌شوند → event-driven architecture غیرفعال
- Frontend dashboard اعداد fake نشان می‌دهد

**۱۰. برای Production چه کارهایی حتماً باید انجام شود؟**
1. Mass assignment را در ۲۲ route fix کن
2. SQLite → PostgreSQL مهاجرت
3. Workers را اجرا کن
4. Customer portal فیلدها را fix کن
5. Views را به api-client.ts متصل کن
6. Mock data را حذف کن
7. CSRF protection اضافه کن
8. Password reset flow اضافه کن
9. Integration tests اضافه کن
10. ۴ index missing را اضافه کن

---

## ۱۲. جمله نهایی

> **«اگر این پروژه مال من بود، قبل از ادامه توسعه دقیقاً این ۱۰ کار را انجام می‌دادم:**
> 1. Mass assignment در ۲۲ route را fix کن (whitelist فیلدها)
> 2. SQLite → PostgreSQL مهاجرت کن
> 3. Workers را به‌عنوان background process اجرا کن
> 4. Customer portal فیلدهای اشتباه را اصلاح کن
> 5. Frontend views را به api-client.ts متصل کن
> 6. Mock data را از dashboard حذف کن
> 7. Rate limiter memory leak را fix کن
> 8. CSRF protection اضافه کن
> 9. ۴ index missing را به schema اضافه کن
> 10. Integration tests برای critical flows بنویس (sales → invoice → payment → accounting)»
