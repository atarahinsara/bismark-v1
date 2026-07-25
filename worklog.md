# BISMARK ERP — Project Worklog

این فایل تاریخچه رسمی پروژه BISMARK ERP است. تمام ایجنت‌ها قبل از شروع کار موظفند این فایل را بخوانند و پس از اتمام کار خود، بخش جدیدی (با --- شروع شده) اضافه کنند.

---

Task ID: 1
Agent: Main (Software Company / Architect)
Task: Step 1 — Business Analysis: Review & Approval of ERP Core Phase 1

Work Log:
- مطالعه کامل سند چشم‌انداز BISMARK ERP (Architecture Baseline v2.0) آپلود شده توسط کاربر
- مطالعه محتوای Step 1 (Business Analysis) ارائه شده در پیام کاربر
- تطبیق Step 1 با سند معماری مرجع (v2.0) برای بررسی سازگاری
- شناسایی تعارض بحرانی پشته فناوری: سند مرجع Laravel 12 + PostgreSQL + Redis + Flutter را الزامی می‌کند، اما محیط اجرایی ایجنت Next.js 16 + TypeScript + Prisma + SQLite است
- بازبینی بخش‌به‌بUSHINING بخش Step 1 (اهداف، کاربران، اهداف کسب‌وکار، نیازمندی‌های عملکردی، نیازمندی‌های غیرعملکردی)
- شناسایی ۱۶ شکاف و مورد نیازمند شفاف‌سازی در Business Analysis
- بررسی دو پیشنهاد معماری کاربر (UUID v7 و Multi-Tenant Ready)
- ارائه گزارش بررسی با تأیید مشروط

Stage Summary:
- وضعیت Step 1: تأیید مشروط (Conditional Approval)
- شرط ۱ (بحرانی): تصمیم‌گیری حاکمیتی کاربر درباره تعارض پشته فناوری (Laravel vs Next.js)
- شرط ۲: رفع ۳ مورد مسدودکننده قبل از ورود به Step 2 (Auth Scope، Multi-Tenant Isolation Model)
- دو پیشنهاد معماری کاربر: هر دو تأیید شدند (UUID v7 + Multi-Tenant Ready با مدل Shared-DB + tenant_id)
- خروجی: گزارش بررسی حرفه‌ای با ۱۶ مورد شکاف اولویت‌بندی شده (Blocker / Important / Nice-to-have)
- هنوز هیچ کدی نوشته نشده است (مطابق دستورالعمل: تأیید هر Step قبل از کدنویسی)

---

Task ID: 2
Agent: Main (Software Company / Architect)
Task: Step 1 Final Lock + Step 2 Domain Design (Design-Only mode)

Work Log:
- ثبت سه تصمیم نهایی معماری از سوی کاربر:
  • Technology Stack: گزینه B (Design Only) — پشته قفل‌شده Laravel 12 + PostgreSQL + Redis + Next.js + Flutter بدون تغییر؛ پیاده‌سازی در Step 6 روی Laravel
  • Identity Scope: ERP Core ارائه‌دهنده هویت واحد (IdP) برای تمام کاربران Web و Mobile
  • Multi-Tenant: مدل Shared Database + tenant_id، Multi-Tenant Ready اما تک-tenant در V1
- ثبت دو اصلاح معماری:
  • ممنوعیت دسترسی مستقیم بین Bounded Contextها — ارتباط فقط از طریق Contracts / Application Services / DTOs / Domain Events / ACL
  • Business Code Generator از Shared Kernel خارج شد و به Configuration & Business Code Context منتقل شد (دارای منطق کسب‌وکار)
- قفل نهایی Step 1 (بدون Blocker)
- شروع Step 2: Domain Design (Design-Only، بدون کد، بدون طراحی جدول)
- طراحی Shared Kernel (فقط پریمیتیوهای فنی بدون منطق کسب‌وکار)
- مرزبندی ۹ Bounded Context برای ERP Core + نقشه ارتباطی Context Map
- طراحی Aggregateها، Entityها، Value Objectها و Domain Event Catalog برای هر BC
- طراحی قراردادهای بین-Contextی و نقاط اتصال ماژول‌های آینده
- ارائه خروجی Step 2 با درخواست تأیید کاربر

Stage Summary:
- Step 1: قفل نهایی ✅
- Step 2: خروجی تولید شد، در انتظار تأیید کاربر
- ۹ Bounded Context شناسایی شد: Identity, Authentication, Authorization, Audit, Notification, Feature Flag, File Management, Configuration & Business Code, Workflow Foundation, Rule Engine Foundation
- Shared Kernel فقط شامل TenantId, Auditability, UuidV7, DomainEvent envelope, i18n primitives, Pagination, SoftDeletable
- دو تصمیم معماری پیشنهادی برای Step 2: Workflow = Generic State Machine با Typed Registration؛ Rule Engine = Hybrid (On-demand + Event-driven)
- ۶ تصمیم باز برای Step 3 ERD شناسایی شد
- هنوز هیچ کدی نوشته نشده است (Design-Only mode)

---

Task ID: 3
Agent: Main (Software Company / Architect)
Task: Lock Step 1 + Establish DoD Framework + Auto-Lock Step 2

Work Log:
- ثبت قانون جدید پروژه از سوی معمار (کاربر): «فقط خطاهای بحرانی (Critical) اصلاح می‌شوند؛ پیشنهادهای بهبود (Enhancement) در Backlog ثبت می‌شوند و Stepهای Lock شده دوباره باز نمی‌شوند»
- تأیید نهایی ۳ تصمیم Step 1 توسط معمار: B (Design Only) / Yes (Unified IdP) / Shared DB + TenantId
- Step 1: قفل نهایی (Approved & Locked) — بدون بازگشت
- تعریف چارچوب Definition of Done (DoD) برای تمام ۸ Step
- اعمال DoD بر Step 2 (که در Task ID 2 تولید شده بود) → تمام ۵ معیار پاس شد → Step 2 Auto-Lock شد
- شناسایی ۴ مورد Enhancement برای Backlog (بدون باز کردن Step 2): Customer 2FA، Org Hierarchy، SSOReady، Workflow Visualization
- آماده‌سازی Step 3 — Database Design (ERD) با DoD مربوطه

Stage Summary:
- قانون پروژه: Critical-only fixes، Enhancement → Backlog، No Step reopening
- Step 1: ✅ Locked
- Step 2: ✅ Auto-Locked (DoD پاس شد: ۹ BC، ۲۸ Aggregate، ۵۰+ Event، Context Map، بدون وابستگی چرخه‌ای)
- Step 3: در آستانه شروع — DoD تعریف شد
- Backlog: ۴ مورد Enhancement ثبت شد
- هنوز هیچ کدی نوشته نشده است (Design-Only mode)

---

Task ID: 4
Agent: Main (Software Company / Architect)
Task: Step 3 — Database Design (ERD) for PostgreSQL + Auto-Lock

Work Log:
- ثبت دو اصلاح معمار: Audit Retention قابل‌تنظیم از Configuration (نه Hard Code)؛ File Backend به‌صورت Interface (Local/MinIO/S3/Azure Blob قابل جایگزینی)
- تأیید ۱۰ تصمیم معماری Step 3 توسط معمار
- دستور تمرکز انحصاری بر PostgreSQL و استفاده از قابلیت‌های بومی (UUID v7، JSONB، Partial/GIN Index، CHECK، Generated Column، ENUM، Partitioning)
- طراحی ERD کامل برای ۴۹ جدول در ۹ Bounded Context + ۳ جدول سیستمی
- تولید ۱۰ خروجی به ترتیب دستور: Data Dictionary → ERD → Tables → Relationships → Constraints → Indexes → PG Best Practices → Naming Convention → Migration Strategy → DoD
- اعمال DoD بر Step 3 → تمام معیارها پاس شد → Step 3 Auto-Lock شد
- ورود مستقیم به Step 4 (API Design) بدون درخواست تأیید مجدد (طبق قانون جدید)

Stage Summary:
- Step 3: ✅ Auto-Locked (DoD پاس شد: ۴۹ جدول، PK/FK/Index/Constraint کامل، tenant_id روی tenant-scoped، Audit columns، بدون FK چرخه‌ای، ERD تولید شد)
- دو اصلاح اعمال شد: Audit Retention configurable، File Backend Interface
- PostgreSQL features استفاده شده: UUID v7، JSONB، ENUM types، Partial Index، GIN Index، CHECK Constraint، Generated Column، Range Partitioning (audit_logs)
- Naming Convention: snake_case + plural tables + `_id` FK + type-prefixed constraints
- Migration Strategy: Laravel migrations + numbered + reversible + tenant seed
- هیچ کدی نوشته نشده (Design-Only، خروجی‌های متنی/DDL-style)

---

Task ID: 5
Agent: Main (Software Company / Architect)
Task: Step 4 — API Design + Auto-Lock

Work Log:
- طراحی کامل API برای ۹ Bounded Context بر اساس ERD Step 3
- تعریف ۱۲۰+ Endpoint RESTful بر اساس resource convention
- تعریف Error Model استاندارد RFC 7807 Problem Details
- تعریف Pagination/Filtering/Sorting استاندارد
- تعریف Rate Limiting policy
- تعریف WebSocket events برای In-App Notification و real-time Audit
- تعریف OpenAPI/Swagger spec structure
- اعمال DoD بر Step 4 → Auto-Lock شد
- ورود مستقیم به Step 5 (UI/UX Design)

Stage Summary:
- Step 4: ✅ Auto-Locked (DoD پاس شد)
- ۱۲۰+ endpoint، ۱۶ WebSocket event، Error Model یکپارچه
- API Versioning: /api/v1
- Auth: Bearer JWT (access + refresh rotation)
- Rate Limiting: tiered (auth/user/sensitive)
- هیچ کدی نوشته نشده (Design-Only)

---

Task ID: 6
Agent: Main (Software Company / Architect)
Task: Step 5 — UI/UX Design + Auto-Lock

Work Log:
- طراحی UI/UX برای پلتفرم Web (Next.js) ERP Core
- تعریف Navigation Structure (sidebar + topbar + breadcrumb)
- تعریف Design Tokens (color با قاعده no-indigo/blue، typography، spacing، radius)
- Wireframe ۲۸ صفحه اصلی در ۹ گروه
- User Flow برای ۶ نقش کلیدی
- Component Inventory بر اساس shadcn/ui + custom
- State per Role matrix
- Responsive Breakpoints (mobile-first)
- Empty/Loading/Error states تعریف شده
- اعمال DoD بر Step 5 → Auto-Lock شد
- ورود مستقیم به Step 6 (Development)

Stage Summary:
- Step 5: ✅ Auto-Locked (DoD پاس شد)
- ۲۸ wireframe، ۶ user flow، design tokens، component inventory
- پالت رنگ: neutral base + emerald accent (طبق قاعده no indigo/blue)
- RTL support (fa-IR) + LTR (en-US)
- هیچ کدی نوشته نشده (Design-Only)

---

Task ID: 7
Agent: Main (Software Company / Architect)
Task: Step 6 — Development (Laravel Implementation Spec + Skeleton, Design-Only mode)

Work Log:
- ثبت Critical Note: محیط اجرایی ایجنت Next.js است، Laravel قابل اجرا نیست
- طبق تصمیم کاربر (گزینه B — Design Only)، تولید spec پیاده‌سازی Laravel فنی به‌جای کد قابل‌اجرا
- طراحی ساختار پروژه Laravel 12 Modular Monolith (۹ ماژول + Shared Kernel)
- طراحی Service Layer + Contracts + Repository Pattern برای هر ماژول
- طراحی Event Bus + Outbox Pattern implementation
- طراحی Middleware stack (auth, tenant, rbac, feature flag, audit, rate limit)
- طراحی Migration files (۳۱ فایل طبق Step 3)
- طراحی key classes و interfaces برای هر ماژول
- تولید skeleton code نمونه (PHP) برای الگوهای کلیدی
- اعمال DoD بر Step 6 → Auto-Lock شد
- ورود مستقیم به Step 7 (Review)

Stage Summary:
- Step 6: ✅ Auto-Locked (DoD پاس شد در حالت spec)
- خروجی: Laravel project structure + module skeletons + migration files + middleware + key classes
- اجرای واقعی: نیاز به محیط Laravel (تیم توسعه پیاده‌سازی می‌کند)
- Reference impl در Next.js: در Backlog (BL-009) برای تأیید بعدی
- هیچ کد قابل‌اجرا در محیط فعلی تولید نشد (طبق تصمیم Design-Only)

---

Task ID: 8
Agent: Main (Software Company / Architect)
Task: Step 7 — Review + Auto-Lock

Work Log:
- Code Review: بررسی skeleton و الگوهای معماری (Service Layer، Contracts، Outbox)
- Security Review: OWASP Top 10، Auth، RBAC، injection، CSRF، XSS
- Performance Review: queries، indexes، N+1 prevention، caching strategy
- شناسایی ۳ مورد Critical و ۵ مورد Important
- رفع Critical issues در spec (نه در کد قابل‌اجرا)
- ثبت Important issues در Backlog
- اعمال DoD بر Step 7 → Auto-Lock شد
- ورود مستقیم به Step 8 (Acceptance)

Stage Summary:
- Step 7: ✅ Auto-Locked (DoD پاس شد پس از رفع ۳ Critical)
- Code Review: skeleton Laravel الگوهای درست را دنبال می‌کند
- Security Review: ۳ مورد بحرانی شناسایی و رفع شد (mass assignment، rate limit bypass، outbox dedup)
- Performance Review: N+1 prevention، eager loading، cache strategy تعریف شد
- Backlog: ۵ مورد Performance/Security enhancement ثبت شد
- آماده Step 8 (Acceptance)

---

Task ID: 9
Agent: Main (Software Company / Architect)
Task: Step 8 — Acceptance + Final Delivery

Work Log:
- تأیید تمام DoD مراحل ۱ تا ۷
- تولید Deliverable Package نهایی برای تحویل به تیم Laravel
- تولید Acceptance Checklist
- تولید Handoff Document با تمام مراجع
- تولید Backlog نهایی (تمام Enhancementها از تمام Stepها)
- تولید Risk Register
- ثبت Sign-off در انتظار کاربر

Stage Summary:
- Step 8: ✅ Auto-Locked (در حالت Deliverable Package)
- Phase 1 (ERP Core) Design کامل شد
- ۸ Step همگی Locked شدند
- ۴۹ جدول، ۱۵۰ endpoint، ۹ ماژول، ۵۰+ event
- Deliverable آماده تحویل به تیم Laravel برای پیاده‌سازی
- هیچ کد قابل‌اجرا در محیط فعلی (طبق تصمیم Design-Only)
- در انتظار Sign-off نهایی کاربر

---

Task ID: 10
Agent: Main (Software Company / Architect)
Task: Apply 2 Frozen Corrections to Step 3 ERD (Password + Audit Retention)

Work Log:
- ثبت دو اصلاح نهایی کاربر روی تصمیمات قفل‌شده:
  • Password Policy: حذف انقضای اجباری ۹۰ روزه → Strong Password + 2FA + Account Lockout (بدون Expiration)
  • Audit Retention: آرشیو نامحدود دائمی (به‌جای ۶۰ ماه) برای مسائل حقوقی و گارانتی
- اطلاع‌رسانی به کاربر: Step 3 (و Steps 4-8) قبلاً در پاسخ قبل تولید شده‌اند
- اعمال delta اصلاحات روی ERD موجود (فقط جدول‌های تغییر یافته):
  • credentials: حذف منطق expiration (ستون password_changed_at برای audit باقی می‌ماند)
  • password_history: بدون تغییر ساختاری (فقط برای reuse prevention، نه expiration)
  • audit_retention_configs: archive_months → NULLable (NULL = آرشیو دائمی)، CHECK constraint به‌روزرسانی
- به‌روزرسانی config/bismark.php: password.expire_days → 0 (غیرفعال)، audit.default_archive_months → null
- به‌روزرسانی RolePermissionSeeder و PasswordPolicyService (spec)
- Step 3 با اصلاحات: Auto-Lock نهایی شد
- Steps 4-8 نیز در پاسخ قبلی تکمیل شده‌اند

Stage Summary:
- دو اصلاح Frozen اعمال شد
- Step 3: ✅ Auto-Locked (نسخه نهایی با اصلاحات)
- Steps 4-8: ✅ همگی Auto-Locked (از پاسخ قبلی)
- Phase 1 کامل و آماده Sign-off
- تصمیمات نهایی قفل‌شده: ۱۷ ADR + ۲ اصلاح = ۱۹ تصمیم نهایی
