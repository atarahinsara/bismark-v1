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
