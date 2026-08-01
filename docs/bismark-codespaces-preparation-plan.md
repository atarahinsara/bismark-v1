# BISMARK — GitHub Codespaces Environment Preparation Plan

> **نقش این سند:** مشاور/معمار — هیچ تغییری در پروژه داده نمی‌شود
> **هدف:** آماده‌سازی محیط GitHub Codespaces برای اتصال GLM 5.2 Agent
> **قانون:** فقط تحلیل، معماری، نیازمندی‌ها و دستورالعمل مرحله‌ای

---

## 1. Repository Analysis (Verified)

### اطلاعات واقعی پروژه

| Item | Value | Source |
|------|-------|--------|
| **Framework** | Next.js 16.1.1 (App Router) | package.json |
| **Language** | TypeScript 5 (strict) | package.json |
| **Runtime** | Bun 1.x (oven/bun:1) | Dockerfile, bun.lock |
| **Package Manager** | Bun (bun.lock موجود) | bun.lock |
| **Frontend** | React 19 + Tailwind CSS 4 + shadcn/ui | package.json |
| **Backend** | Next.js API Routes (App Router) | src/app/api/ |
| **ORM** | Prisma 6.11.1 | package.json |
| **Database (current)** | SQLite (file:./db/custom.db) | .env |
| **Database (target)** | PostgreSQL 16 | prisma/schema.postgres.prisma |
| **API Architecture** | REST (175 routes) | src/app/api/ |
| **Authentication** | Custom JWT (HMAC-SHA256) + MFA (TOTP) | src/lib/auth/ |
| **Testing** | Vitest 4.1.10 (5 test files) | package.json |
| **Build** | Next.js standalone output | next.config.ts |
| **Worker** | Bun (src/workers/run-workers.ts) | exists |
| **Dockerfile** | Multi-stage (oven/bun:1) | exists |
| **docker-compose.production.yml** | 5 services (app, postgres, redis, worker, nginx) | exists |
| **docker-compose.yml (dev)** | ❌ MISSING | — |
| **.devcontainer/** | ❌ MISSING | — |
| **.env.example** | ❌ MISSING | — |
| **CI/CD** | .github/workflows/ci-cd.yml (8 stages) | exists |
| **Caddyfile** | Gateway (port 81 → 3000) | exists |

### آنچه نیاز به توجه دارد

1. **Node.js version** در `package.json` مشخص نشده — باید `engines.node` اضافه شود
2. **docker-compose.yml برای dev** وجود ندارد — فقط production compose موجود است
3. **.env.example** وجود ندارد — باید ساخته شود
4. **.devcontainer/** وجود ندارد — باید ساخته شود
5. **ignoreBuildErrors: true** در next.config.ts — باید در Production بررسی شود
6. **104 uncommitted changes** در Git — باید commit/push شوند قبل از Codespaces

---

## 2. Database Requirements

### Database مورد نیاز

| Database | ضرورت | دلیل |
|----------|-------|------|
| **PostgreSQL 16** | 🔒 ضروری | Master Spec FROZEN. SQLite bottleneck اثبات شده. schema.postgres.prisma آماده. |
| **Redis 7** | 🟡 ضروری (Production) | Rate Limiting + Session Cache + Outbox Queue. فعلاً in-memory است. |
| **MinIO (S3-compatible)** | 🟡 ضروری (Production) | File Storage + Backup target. فعلاً local filesystem. |
| MongoDB | ❌ لازم نیست | پروژه relational است |
| MySQL | ❌ لازم نیست | PostgreSQL انتخاب شده |
| Elasticsearch | ❌ REJECTED (V1) | PostgreSQL FTS کافی است |
| Vector DB | ⏳ DEFERRED | برای AI در V2 |

### PostgreSQL — توضیحات

| Topic | Answer |
|-------|--------|
| **چرا PostgreSQL؟** | Master Spec FROZEN. ACID + MVCC + JSON support + FTS + Prisma fully supported. SQLite bottleneck اثبات شده (10 concurrent writes → 60% timeout). |
| **Docker برای Dev؟** | بله. `postgres:16-alpine` در docker-compose.yml |
| **Production جدا؟** | بله. Dev = Docker container. Production = managed PostgreSQL (AWS RDS یا مشابه). |
| **Volume؟** | بله. Docker volume `postgres_data` برای data persistence. |
| **Migration؟** | بله. `prisma/schema.postgres.prisma` آماده است. `prisma db push` یا `prisma migrate dev`. |
| **ORM؟** | Prisma 6.11.1 (موجود). فقط `provider` از `"sqlite"` به `"postgresql"` تغییر می‌کند. |
| **Backup؟** | `scripts/backup.sh` موجود. pg_dump + WAL archive → MinIO. |
| **Seed Data؟** | بله. `src/lib/seed.ts` موجود. Users, Roles, Permissions, Branches, Parties, Products. |

### Redis — توضیحات

| Topic | Answer |
|-------|--------|
| **چرا Redis؟** | Rate Limiter فعلاً in-memory است (single-instance). برای multi-instance نیاز به Redis. Session cache هم می‌تواند روی Redis باشد. |
| **Docker برای Dev؟** | بله. `redis:7-alpine` |
| **Volume؟** | بله. `redis_data` برای AOF persistence. |
| **Production جدا؟** | بله. Dev = Docker. Production = managed Redis (ElastiCache یا مشابه). |

---

## 3. Docker Architecture (Design Only)

### docker-compose.yml (Dev) — سرویس‌های مورد نیاز

```text
┌─────────────────────────────────────────────┐
│              Docker Network                  │
│  ┌───────────┐  ┌───────────┐  ┌─────────┐ │
│  │  app      │  │  worker   │  │ redis   │ │
│  │  (Next.js)│  │  (Bun)    │  │  (7)    │ │
│  │  :3000    │  │           │  │  :6379  │ │
│  └─────┬─────┘  └─────┬─────┘  └────┬────┘ │
│        │               │              │      │
│        └───────┬───────┘              │      │
│                │                      │      │
│         ┌──────▼──────┐               │      │
│         │ postgres    │◄──────────────┘      │
│         │  (16)       │                      │
│         │  :5432      │                      │
│         └─────────────┘                      │
└─────────────────────────────────────────────┘
```

### Service Details

| Service | نام | Image | Port | Volume | Dependencies | Env Vars |
|---------|-----|-------|------|--------|-------------|----------|
| **app** | bismark-app | oven/bun:1 (dev) یا build محلی | 3000 | — (source mount) | postgres, redis | DATABASE_URL, REDIS_URL, JWT_SECRET |
| **postgres** | bismark-db | postgres:16-alpine | 5432 | postgres_data | — | POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD |
| **redis** | bismark-redis | redis:7-alpine | 6379 | redis_data | — | — |
| **worker** | bismark-worker | oven/bun:1 (same as app) | — | — | postgres, redis | DATABASE_URL, REDIS_URL |

### چه چیزهایی داخل Docker و چه چیزهایی خارج

| Inside Docker | Outside Docker (on Codespace host) |
|---------------|-----------------------------------|
| PostgreSQL | Bun runtime (for dev server) |
| Redis | Next.js dev server (hot reload) |
| Worker process | Prisma CLI |
| (Production: app + nginx) | Git, GitHub CLI |
| | Node.js (for tooling) |
| | VS Code / Editor |

**پیشنهاد برای Dev:** فقط PostgreSQL و Redis داخل Docker. App و Worker روی host اجرا شوند (fast hot reload). این کار با `docker-compose.yml` که فقط postgres + redis دارد، انجام می‌شود.

---

## 4. GitHub Codespaces Requirements

### فایل‌های لازم

| File | Purpose | Status |
|------|---------|--------|
| `.devcontainer/devcontainer.json` | Codespace configuration (image, features, extensions, ports) | ❌ باید ساخته شود |
| `.devcontainer/docker-compose.yml` | Dev Docker services (postgres + redis) | ❌ باید ساخته شود |
| `.devcontainer/Dockerfile` | Custom dev image (optional — can use base image) | ❌ باید ساخته شود |
| `.env.example` | Template for environment variables | ❌ باید ساخته شود |
| `docker-compose.yml` (root) | Dev compose for postgres + redis | ❌ باید ساخته شود |

### `.devcontainer/devcontainer.json` — محتوای پیشنهادی

```json
{
  "name": "BISMARK ERP",
  "dockerComposeFile": "docker-compose.yml",
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
  "postCreateCommand": "bun install && bun run db:generate",
  "remoteEnv": {
    "DATABASE_URL": "postgresql://bismark:bismark@localhost:5432/bismark",
    "REDIS_URL": "redis://localhost:6379"
  }
}
```

**توجه:** این فقط پیشنهاد است. ساختار نهایی بسته به تصمیم نهایی تغییر می‌کند.

### `.env.example` — متغیرهای مورد نیاز

```env
# Database
DATABASE_URL=postgresql://bismark:bismark@localhost:5432/bismark

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=change-me-in-production

# PII Encryption
PII_ENCRYPTION_KEY= # 64 hex chars (32 bytes)

# File Storage
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=

# ClamAV
CLAMAV_ENABLED=false
CLAMAV_HOST=localhost
CLAMAV_PORT=3310

# Metrics
METRICS_ALLOWED_IPS=

# App
NODE_ENV=development
LOG_LEVEL=debug
```

---

## 5. GLM 5.2 Agent Access Requirements

| Access Type | ضرورت | توضیح | Risk |
|-------------|-------|-------|------|
| **Workspace (read/write)** | 🔒 ضروری | خواندن و تغییر فایل‌های پروژه | Low |
| **Terminal** | 🔒 ضروری | اجرای bun, prisma, lint, tests | Low |
| **Git (commit/push/branch)** | 🔒 ضروری | مدیریت تغییرات روی branch | Medium |
| **Docker CLI** | 🟡 ضروری | اجرای docker-compose (postgres + redis) | Medium |
| **Docker socket** | ⚠️ خطرناک | دسترسی کامل به Docker daemon | High — پیشنهاد: docker CLI کافی است، socket لازم نیست |
| **Database connection** | 🔒 ضروری | Prisma CLI + queries | Low (با password محدود) |
| **Environment variables** | 🔒 ضروری | .env خوانده شود | Medium (secrets) |
| **Network access** | 🟡 ضروری | npm registry, GitHub API | Low |
| **Port forwarding** | 🟡 ضروری | Port 3000 برای preview | Low |
| **Package install (bun add)** | 🟡 اختیاری | نصب dependency‌های جدید | Low |

### Least Privilege توصیه

- Docker socket: ❌ ندهید. docker CLI کافی است.
- sudo/root: ❌ ندهید.
- GitHub token: scope محدود (repo + workflow).
- Database password: فقط dev database (نه production).

---

## 6. Security Checklist

| Item | Rule |
|------|------|
| **Secrets** | در GitHub Codespace Secrets ذخیره شوند (نه در فایل) |
| **.env** | در `.gitignore` (موجود ✅). هرگز commit نشود. |
| **.env.example** | بدون مقدار واقعی. فقط کلیدها. |
| **Database password** | برای dev: `bismark:bismark` (ضعیف اما dev-only). برای production: managed secrets. |
| **API keys** | در Codespace Secrets (encrypted). GLM از `process.env` می‌خواند. |
| **GLM Agent secrets** | فقط dev secrets. Production secrets هرگز در Codespace نباشند. |
| **Docker socket** | ❌ ندهید. docker CLI کافی است. |
| **JWT_SECRET** | در Codespace Secret. هرگز hardcoded. |
| **PII_ENCRYPTION_KEY** | در Codespace Secret. 64 hex chars. |
| **.gitignore** | باید شامل: `.env*`, `db/`, `node_modules/`, `.next/`, `upload/`, `dev.log` (موجود ✅) |
| **Git history** | بررسی شود که secret ای در history نباشد (`git log -p -- .env`) |

---

## 7. Roadmap — ترتیب دقیق کار

### Phase 1: Repository Preparation

| Step | What | How to verify | Output |
|------|------|---------------|--------|
| 1.1 | Commit all 104 uncommitted changes | `git status` clean | Clean working tree |
| 1.2 | Push to GitHub | `git push` succeeds | All code on GitHub |
| 1.3 | Create `.env.example` | File exists with all env vars | Template ready |
| 1.4 | Create `docker-compose.yml` (dev: postgres + redis only) | `docker-compose config` valid | Dev compose ready |
| 1.5 | Add `engines.node` to package.json | `"engines": {"node": ">=20"}` | Node version specified |

**Phase 1 done when:** Repository clean, pushed, .env.example + docker-compose.yml exist.

---

### Phase 2: GitHub Codespaces Setup

| Step | What | How to verify | Output |
|------|------|---------------|--------|
| 2.1 | Create `.devcontainer/devcontainer.json` | File exists, valid JSON | Codespace config |
| 2.2 | Create `.devcontainer/docker-compose.yml` | References postgres + redis | Dev services |
| 2.3 | Commit + push .devcontainer/ | On GitHub | Ready to launch |
| 2.4 | Launch Codespace | Codespace starts without error | Running environment |
| 2.5 | Verify bun install | `bun install` succeeds | Dependencies installed |
| 2.6 | Verify Prisma generate | `bun run db:generate` succeeds | Prisma client ready |

**Phase 2 done when:** Codespace launches, bun install + prisma generate work.

---

### Phase 3: Database Setup

| Step | What | How to verify | Output |
|------|------|---------------|--------|
| 3.1 | Start PostgreSQL (docker-compose up -d postgres) | `docker ps` shows postgres | DB running |
| 3.2 | Switch schema to PostgreSQL | `prisma/schema.prisma` provider = "postgresql" | Schema ready |
| 3.3 | Run `bun run db:push` | Tables created in PostgreSQL | DB schema deployed |
| 3.4 | Run `bun run src/lib/seed.ts` | Users, roles, parties created | Seed data loaded |
| 3.5 | Verify data | `SELECT COUNT(*) FROM users;` returns > 0 | Data confirmed |

**Phase 3 done when:** PostgreSQL running, schema deployed, seed data loaded.

---

### Phase 4: Application Setup

| Step | What | How to verify | Output |
|------|------|---------------|--------|
| 4.1 | Set DATABASE_URL in .env | Points to PostgreSQL | Env configured |
| 4.2 | Start Redis (docker-compose up -d redis) | `docker ps` shows redis | Redis running |
| 4.3 | Start dev server (`bun run dev`) | `curl localhost:3000/api/v1/system/health` → 200 | App running |
| 4.4 | Login test | `POST /api/v1/auth/login` → 200 + token | Auth works |
| 4.5 | Run Golden Slice E2E | `./test_golden_slice_clean.sh` → 20/20 | Full flow works |

**Phase 4 done when:** App + DB + Redis all running, login works, E2E passes.

---

### Phase 5: Worker + Observability

| Step | What | How to verify | Output |
|------|------|---------------|--------|
| 5.1 | Start worker (`bun run src/workers/run-workers.ts`) | Worker logs show polling | Worker running |
| 5.2 | Verify Outbox processing | Outbox messages → published | Events flowing |
| 5.3 | Check metrics endpoint | `GET /api/metrics` → 200 | Metrics available |
| 5.4 | Check health endpoint | `GET /api/v1/system/health` → 200 + DB healthy | Health check works |

**Phase 5 done when:** Worker running, events processing, metrics + health available.

---

### Phase 6: GLM Agent Connection

| Step | What | How to verify | Output |
|------|------|---------------|--------|
| 6.1 | Configure GLM Agent access to Codespace | Agent can read files | Workspace access |
| 6.2 | Configure terminal access | Agent can run commands | Terminal access |
| 6.3 | Configure Git access | Agent can branch + commit | Git access |
| 6.4 | Test: Agent reads repository | Agent can describe project structure | Read verified |
| 6.5 | Test: Agent runs lint | `bun run lint` → 0 errors | Execute verified |
| 6.6 | Test: Agent runs tests | E2E test → 20/20 | Test verified |

**Phase 6 done when:** GLM Agent can read, write, execute commands, and run tests.

---

### Phase 7: Full Integration Test

| Step | What | How to verify | Output |
|------|------|---------------|--------|
| 7.1 | GLM Agent creates a branch | `git checkout -b feature/test` | Branch created |
| 7.2 | Agent makes a code change | File modified | Change applied |
| 7.3 | Agent runs lint + tests | All pass | Quality verified |
| 7.4 | Agent commits + pushes | `git push` succeeds | Change on GitHub |
| 7.5 | Agent runs migration | `prisma db push` succeeds | DB updated |
| 7.6 | Agent restarts server | App starts clean | Server verified |

**Phase 7 done when:** Full GLM Agent workflow (branch → change → test → commit → push) works.

---

## 8. Missing Information from Repository

این موارد باید تأیید شوند:

| Item | Question |
|------|----------|
| **GitHub repo URL** | آیا repository روی GitHub است؟ URL چیست؟ |
| **Codespaces enabled?** | آیا Codespaces برای این repo فعال است؟ |
| **GitHub plan** | آیا plan از Codespaces پشتیبانی می‌کند؟ (Free: 120 core-hours/month) |
| **Secrets** | آیا GitHub Secrets تنظیم شده‌اند؟ (JWT_SECRET, etc.) |
| **Branch protection** | آیا branch protection روی main فعال است؟ |
| **Codespace size** | چه machine size‌ای لازم است؟ (پیشنهاد: 4-core, 16GB RAM) |

---

## 9. Summary

| Phase | What we do | Dependencies | Estimated time |
|-------|-----------|-------------|---------------|
| 1 | Repository preparation | None | 30 min |
| 2 | Codespaces setup | Phase 1 | 1 hour |
| 3 | Database setup | Phase 2 | 30 min |
| 4 | Application setup | Phase 3 | 30 min |
| 5 | Worker + observability | Phase 4 | 15 min |
| 6 | GLM Agent connection | Phase 5 | 1 hour |
| 7 | Full integration test | Phase 6 | 30 min |
| **Total** | | | **~4 hours** |

### فایل‌هایی که باید ساخته شوند (در Phase‌های مربوطه)

| File | Phase | Purpose |
|------|-------|---------|
| `.env.example` | 1 | Environment template |
| `docker-compose.yml` | 1 | Dev services (postgres + redis) |
| `.devcontainer/devcontainer.json` | 2 | Codespace config |
| `.devcontainer/docker-compose.yml` | 2 | Codespace Docker services |

### فایل‌هایی که نباید ساخته شوند

- ❌ هیچ فایل production‌ای تغییر نکند
- ❌ Dockerfile موجود دست نخورد
- ❌ docker-compose.production.yml دست نخورد
- ❌ prisma/schema.prisma فقط در Phase 3 (provider switch) تغییر کند
- ❌ هیچ migration اجرا نشود تا Phase 3

---

**این سند فقط نقشه است. هیچ تغییری داده نشده. منتظر تأیید شما هستم.**
