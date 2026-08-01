# BISMARK — Read-Only Repository Analysis for Codespaces Preparation

> **وضعیت:** فقط تحلیل. هیچ تغییری داده نشده.
> **هدف:** بررسی کامل Repository قبل از هرگونه آماده‌سازی محیط

---

## 1. Git Changes Analysis

### واقعیت: فقط ۱ تغییر نه ۱۰۴

| Type | Count |
|------|-------|
| Modified | 1 |
| Untracked | 0 |
| Deleted | 0 |
| **Total** | **1** |

**تغییر موجود:**
- `db/custom.db` — SQLite database binary (modified by running app)

**نکته مهم:** قبلاً ۱۰۴ تغییر گزارش شده بود، اما الان Git status فقط ۱ تغییر نشان می‌دهد. احتمالاً تغییرات قبلی قبلاً commit شده‌اند.

### پیدا شد: `.env` در Git tracked است! 🔴

این یک **مشکل امنیتی بحرانی** است:

- `.env` در Git history وجود دارد (4 commit)
- محتوا: `DATABASE_URL=file:/home/z/my-project/db/custom.db`
- `.gitignore` شامل `.env*` است، اما فایل قبلاً tracked شده بود
- باید با `git rm --cached .env` از tracking حذف شود (بدون حذف فیزیکی)

### پیدا شد: `db/custom.db` در Git tracked است! 🟡

- SQLite binary database در Git tracked می‌شود
- حجم: ~2.8MB
- باید از Git حذف شود (به `.gitignore` اضافه شده اما قبلاً tracked شده)

### پیدا شد: `upload/` فایل‌ها در Git tracked هستند 🟡

- 5 فایل در `upload/` tracked شده‌اند
- شامل: test files, docs copies
- باید untracked شوند

### پیدا شد: `tool-results/` temp files در Git tracked هستند 🟡

- 3+ فایل موقت در `tool-results/` tracked شده‌اند

### پیدا شد: temp scripts در root tracked هستند 🟡

- `fix-bug-03.ts`, `fix-bug-03-v2.ts`
- `seed_test_data.ts`, `seed_customer_user.ts`, `seed_customer_role.ts`
- `test_audit_v4.sh`, `test_f02_routes.sh`, `test_golden_slice*.sh`, `test_phase2.sh`
- این‌ها فایل‌های موقت تست هستند، نه کد پروژه

### پیدا شد: `.zscripts/` در Git tracked است 🟡

- `.zscripts/dev.pid`, `.zscripts/dev.sh`, `.zscripts/build.sh`
- فایل‌های مدیریت process

### 分类 تغییرات

| Category | Files | Verdict |
|----------|-------|---------|
| **BISMARK Core Code** (src/, prisma/, docs/, scripts/) | ~400 | ✅ KEEP |
| **Backend Laravel** (backend/) | 181 | ✅ KEEP (reference implementation) |
| **.env** | 1 | ❌ DISCARD from git (keep locally) |
| **db/custom.db** | 1 | ❌ DISCARD from git (regenerate via seed) |
| **upload/** | 5 | ❌ DISCARD from git (runtime data) |
| **tool-results/** | 3+ | ❌ DISCARD (temp) |
| **temp scripts** (root) | 10+ | ⚠️ REVIEW (useful for testing, but not core code) |
| **.zscripts/** | 3 | ⚠️ REVIEW (dev tooling) |
| **download/** | 1 | ❌ DISCARD (temp) |

---

## 2. Database Analysis

### وضعیت فعلی

| Item | Value |
|------|-------|
| **Database فعلی** | SQLite |
| **ORM** | Prisma 6.11.1 |
| **Schema فعلی** | `prisma/schema.prisma` |
| **Provider فعلی** | `sqlite` |
| **DATABASE_URL** | `file:/home/z/my-project/db/custom.db` |
| **Model count** | 129 |
| **PostgreSQL schema** | `prisma/schema.postgres.prisma` (موجود، provider = postgresql) |
| **Model count (PostgreSQL)** | 129 (same) |
| **Migrations** | ❌ NONE (no `prisma/migrations/` directory) — uses `db:push` |
| **Seed** | ✅ `src/lib/seed.ts` موجود |

### چرا PostgreSQL؟

1. Master Spec FROZEN: PostgreSQL 16
2. SQLite bottleneck proven: 10 concurrent writes → 60% timeout
3. schema.postgres.prisma آماده است
4. 0 SQLite-specific features (no `@db.`, no `dbgenerated`, no `Unsupported`)

### سازگاری PostgreSQL

| Check | Result |
|-------|--------|
| SQLite-specific features | ✅ 0 (no `@db.`, no `dbgenerated`) |
| JSON fields | 109 (PostgreSQL supports JSON/JSONB) |
| Relations | 94 (standard Prisma relations) |
| Unique constraints | 88 (standard) |
| Indexes | 181 (standard) |
| Enums | All String-based (not Prisma enum) — PostgreSQL compatible |

### تغییرات لازم برای Provider Switch

1. کپی `schema.postgres.prisma` → `schema.prisma` (یا `sed` برای تغییر provider)
2. اجرای `prisma db push` روی PostgreSQL
3. اجرای `seed.ts` روی PostgreSQL
4. تغییر `DATABASE_URL` در `.env`

**نکته:** `prisma db push` بدون migration history است. برای production باید `prisma migrate dev` استفاده شود. اما برای dev/codespaces، `db:push` کافی است.

---

## 3. Docker Analysis

### وضعیت فعلی

| File | Status |
|------|--------|
| **Dockerfile** | ✅ موجود (multi-stage, oven/bun:1) |
| **docker-compose.production.yml** | ✅ موجود (5 services: app, postgres, redis, worker, nginx) |
| **docker-compose.yml (dev)** | ❌ MISSING |
| **.devcontainer/** | ❌ MISSING |
| **.env.example** | ❌ MISSING |
| **Caddyfile** | ✅ موجود (gateway :81 → :3000) |

### Dockerfile تحلیل

- Base: `oven/bun:1`
- Multi-stage: base (build) → production (slim)
- Output: Next.js standalone
- Problem: `ignoreBuildErrors: true` در next.config.ts (باید بررسی شود)

### docker-compose.production.yml تحلیل

| Service | Image | Port | Volume | Env |
|---------|-------|------|--------|-----|
| app | bismark Dockerfile | 3000 | — | DATABASE_URL, REDIS_URL |
| postgres | postgres:16-alpine | 5432 | postgres_data | POSTGRES_DB/USER/PASSWORD |
| redis | redis:7-alpine | 6379 | redis_data | — |
| worker | bismark Dockerfile | — | — | DATABASE_URL, REDIS_URL |
| nginx | nginx | 80/443 | — | — |

### برای Development چه لازم است؟

فقط **PostgreSQL + Redis** داخل Docker. App + Worker روی host اجرا شوند (hot reload).

---

## 4. Codespaces Design (فقط طراحی)

### فایل‌های لازم

| File | Purpose |
|------|---------|
| `.devcontainer/devcontainer.json` | Codespace config: image, features, extensions, ports, postCreateCommand |
| `.devcontainer/docker-compose.yml` | Dev services: postgres + redis فقط |
| `.env.example` | Template for all env vars (بدون مقادیر واقعی) |

### `.devcontainer/devcontainer.json` — Design

```json
{
  "name": "BISMARK ERP",
  "dockerComposeFile": ["../docker-compose.yml"],
  "service": "app",
  "workspaceFolder": "/workspace",
  "features": {
    "ghcr.io/devcontainers/features/node:1": { "version": "20" },
    "ghcr.io/devcontainers/features/github-cli:1": {}
  },
  "extensions": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "prisma.prisma",
    "bradlc.vscode-tailwindcss"
  ],
  "forwardPorts": [3000, 5432, 6379],
  "postCreateCommand": "bun install && bun run db:generate"
}
```

### Ports

| Port | Service | Purpose |
|------|---------|---------|
| 3000 | Next.js dev server | App preview |
| 5432 | PostgreSQL | Database |
| 6379 | Redis | Cache |

### Extensions

| Extension | Purpose |
|-----------|---------|
| ESLint | Code linting |
| Prettier | Code formatting |
| Prisma | Schema editing |
| Tailwind CSS | Styling |

### Environment Variables

| Variable | Dev Value | Purpose |
|----------|-----------|---------|
| DATABASE_URL | `postgresql://bismark:bismark@localhost:5432/bismark` | PostgreSQL connection |
| REDIS_URL | `redis://localhost:6379` | Redis connection |
| JWT_SECRET | (Codespace Secret) | JWT signing |
| NODE_ENV | `development` | Runtime mode |
| LOG_LEVEL | `debug` | Log verbosity |

---

## 5. GLM Agent Permissions

| Permission | Status | Risk | Notes |
|-----------|--------|------|-------|
| Read repository | 🔒 REQUIRED | Low | Essential for analysis |
| Write files | 🔒 REQUIRED | Low | Essential for code changes |
| Terminal | 🔒 REQUIRED | Low | Essential for commands |
| Git (branch/commit/push) | 🔒 REQUIRED | Medium | Work on feature branches only |
| Docker CLI | 🟡 REQUIRED | Medium | Start/stop postgres + redis |
| Docker socket | ❌ DANGEROUS | High | Full daemon access — DO NOT GRANT |
| Database access | 🔒 REQUIRED | Low | Prisma CLI + queries |
| Port access (3000) | 🟡 REQUIRED | Low | Preview app |
| Package install (bun add) | 🟡 OPTIONAL | Low | New dependencies |
| Environment variables | 🔒 REQUIRED | Medium | Read .env for config |
| sudo/root | ❌ DANGEROUS | High | DO NOT GRANT |
| Network (npm registry) | 🟡 REQUIRED | Low | Install packages |
| Network (arbitrary) | ❌ NOT RECOMMENDED | Medium | Restrict to known hosts |

### Least Privilege توصیه

- Docker socket: ❌ ندهید. docker CLI کافی است.
- sudo: ❌ ندهید.
- GitHub token: scope محدود (repo + workflow).
- Database: فقط dev database (bismark:bismark).
- Secrets: در Codespace Secrets (encrypted).

---

## 6. Security Findings

| Finding | Severity | Detail |
|---------|----------|--------|
| `.env` tracked in Git | 🔴 P0 | Must `git rm --cached .env` + add to .gitignore |
| `db/custom.db` tracked in Git | 🟡 P1 | Binary database in git — remove from tracking |
| Hardcoded JWT secret fallback | 🟡 P1 | `bismark-dev-secret-change-in-production-01910000` in 3 files |
| Default password `demo1234` in seed | 🟡 P2 | Dev-only, but visible in Git history |
| `upload/` files tracked | 🟡 P2 | Runtime data should not be in Git |
| `tool-results/` tracked | 🟢 P3 | Temp files, should be gitignored |
| Temp scripts in root | 🟢 P3 | Useful but clutter repo |
| No `.env.example` | 🟡 P1 | Must create for Codespaces |
| No `docker-compose.yml` (dev) | 🟡 P1 | Must create for Codespaces |
| `ignoreBuildErrors: true` | 🟡 P2 | Should be false for production |

---

## 7. Summary Table

| Item | Current State | Required | Action Later | Risk |
|------|--------------|----------|-------------|------|
| Git changes | 1 modified (db/custom.db) | Clean working tree | Don't commit db/custom.db | Low |
| `.env` in Git | 🔴 Tracked | Untracked | `git rm --cached .env` | High (secret leak) |
| `db/custom.db` in Git | 🟡 Tracked | Untracked | `git rm --cached db/custom.db` | Medium |
| `upload/` in Git | 🟡 Tracked | Untracked | `git rm --cached -r upload/` | Low |
| Database | SQLite | PostgreSQL | Provider switch + db push | Medium |
| PostgreSQL schema | ✅ Ready | Use it | Copy to schema.prisma | Low |
| Dockerfile | ✅ Exists | Keep | Don't touch | Low |
| docker-compose (dev) | ❌ Missing | Create | postgres + redis only | Low |
| .devcontainer/ | ❌ Missing | Create | devcontainer.json + compose | Low |
| .env.example | ❌ Missing | Create | All env vars, no values | Low |
| engines.node | ❌ Missing | Add | ">=20" | Low |
| JWT secret | Hardcoded fallback | Codespace Secret | Set in Codespace | Medium |
| Seed script | ✅ Exists | Keep | Run after PostgreSQL | Low |
| Migrations | ❌ None | Use db:push (dev) | prisma db push | Low |
| backend/ (Laravel) | 181 files | Keep as reference | Don't touch | Low |
| Temp scripts | 10+ in root | REVIEW | Move to scripts/ or remove | Low |
| tool-results/ | Tracked | Untracked | `git rm --cached -r` | Low |

---

## 8. BLOCKERS

این موارد باید قبل از شروع هر Phase تصمیم‌گیری شوند:

| ID | Blocker | Question |
|----|---------|----------|
| B-01 | `.env` در Git tracked است | آیا `git rm --cached .env` انجام دهیم؟ (فایل محلی حفظ می‌شود) |
| B-02 | `db/custom.db` در Git tracked است | آیا `git rm --cached db/custom.db` انجام دهیم؟ |
| B-03 | GitHub repo URL | Repository روی GitHub است؟ URL چیست؟ |
| B-04 | GitHub plan | Free یا Pro/Team؟ (Codespaces hours) |
| B-05 | Codespace size | 2-core (ساده‌تر) یا 4-core (سریع‌تر)؟ |
| B-06 | Branch protection | آیا main محافظت شده است؟ |
| B-07 | `upload/` و `tool-results/` | آیا untrack شوند؟ |
| B-08 | Temp scripts در root | نگه داریم یا پاک کنیم؟ |

---

## 9. SAFE TO PREPARE

این موارد بدون دست‌زدن به کد قابل آماده‌سازی هستند:

| Item | What |
|------|------|
| `.env.example` | ایجاد template با همه env vars (بدون مقادیر) |
| `docker-compose.yml` (dev) | ایجاد compose برای postgres + redis |
| `.devcontainer/devcontainer.json` | ایجاد Codespace config |
| `engines.node` در package.json | اضافه کردن `"engines": {"node": ">=20"}` |
| `.gitignore` بهبود | اضافه کردن: `db/`, `upload/`, `tool-results/`, `.zscripts/` |

---

## 10. DO NOT TOUCH

این موارد فعلاً نباید تغییر کنند:

| Item | Reason |
|------|--------|
| `src/` (کد پروژه) | تمام کد BISMARK — فقط در صورت نیاز تغییر کند |
| `prisma/schema.prisma` | تا Phase 3 (PostgreSQL setup) دست نخورد |
| `Dockerfile` | Production Docker — فقط در Phase production |
| `docker-compose.production.yml` | Production compose — فقط در Phase production |
| `Caddyfile` | Gateway config — فعلاً کار می‌کند |
| `backend/` (Laravel) | Reference implementation — جدا از Next.js |
| `.github/workflows/ci-cd.yml` | CI/CD pipeline — فقط در Phase CI/CD |
| `next.config.ts` | `ignoreBuildErrors` بررسی شود ولی فعلاً دست نخورد |

---

**این سند فقط READ-ONLY ANALYSIS است. هیچ تغییری در پروژه داده نشده. منتظر تصمیم شما هستم.**
