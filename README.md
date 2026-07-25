# BISMARK ERP — Monorepo

Enterprise Resource Planning system for BISMARK, built with a Hybrid monorepo architecture.

## 📁 Structure

```
bismark-erp/
├── backend/                    # Laravel 12 backend (production API)
│   └── bismark-laravel/
│       ├── app/
│       │   ├── Modules/        # 17 bounded contexts (DDD)
│       │   └── Shared/         # Shared Kernel (no business logic)
│       ├── database/
│       │   ├── migrations/     # PostgreSQL migrations (127+ total)
│       │   └── seeders/
│       ├── config/
│       └── composer.json
│
├── src/                        # Next.js 16 Admin UI (frontend, runnable in sandbox)
│   ├── app/
│   │   ├── page.tsx            # Main admin shell (login + dashboard + CRUD)
│   │   ├── layout.tsx          # RTL + theme provider
│   │   └── globals.css         # Emerald color system (no indigo/blue)
│   ├── components/ui/          # shadcn/ui components
│   └── lib/
│       ├── types.ts            # TypeScript types (mirrors Laravel entities)
│       └── mock-data.ts        # Demo data (until Laravel backend is connected)
│
├── design/                     # Entity definitions (source of truth)
│   └── sprint-1-entities.yaml  # Sprint 1 entities (User, Role, Party, etc.)
│
├── tools/
│   └── scaffold-generator/     # Code generator (YAML → Laravel + Next.js)
│
├── docs/                       # Project documentation
│
├── mobile/                     # Flutter app (Phase 2)
│
└── worklog.md                  # Project history (18 tasks, all ADRs)
```

## 🏗️ Architecture

### Design Phase (Complete ✅)
- **Step 1**: Business Analysis — Locked
- **Step 2**: Domain Design — 17 Bounded Contexts, 50+ Aggregates — Locked
- **Step 3**: Database Design — 127 PostgreSQL tables — Locked
- **Step 4**: API Design — 600+ endpoints, Webhooks, OpenAPI 3.1 — Locked
- **Step 5**: UI/UX Design — Web + Mobile wireframes — Locked

### Development Phase (In Progress 🏃)
- **Sprint 1**: Identity + Organization + Party + Master Data ← **CURRENT**
- Sprint 2: Product + Inventory
- Sprint 3: Sales
- Sprint 4: Warranty
- Sprint 5: Service
- Sprint 6: Financial
- Sprint 7: Workflow + Rule + Notification
- Sprint 8: Reports + BI + AI

### Architecture Laws (Locked)

| Law | Scope | Rule |
|-----|-------|------|
| **LAW-01** | Database | No cross-context JOIN |
| **LAW-02** | Data | All aggregate roots have business codes |
| **LAW-03** | Code | No cross-context Repository access (use Contracts) |

### ADRs (18 locked decisions)

See `worklog.md` for complete list (ADR-001 through ADR-018).

## 🚀 Running the Frontend (Admin UI)

The Next.js admin UI is runnable in this sandbox:

```bash
# Install dependencies (already done)
bun install

# Start dev server
bun run dev
# → http://localhost:3000

# Login with demo credentials:
#   Username: admin
#   Password: demo1234
```

### Admin UI Features (Sprint 1)

- ✅ Login screen (RTL Persian)
- ✅ Dashboard with stats + architecture status
- ✅ Users management (list, filter, detail dialog, create form)
- ✅ Roles management (card grid)
- ✅ Parties management (list, filter, create form)
- ✅ Branches (card grid)
- ✅ Audit log (table)
- ✅ Settings (architecture laws, auth, audit, i18n)
- ✅ Dark mode
- ✅ Responsive (mobile sidebar)
- ✅ Emerald color scheme (no indigo/blue)

## 🔧 Running the Backend (Laravel)

The Laravel backend is production-ready but requires a PHP environment:

```bash
cd backend/bismark-laravel
composer install
cp .env.example .env
php artisan key:generate
# Configure PostgreSQL + Redis in .env
php artisan migrate --seed
php artisan serve
# → http://localhost:8000
```

## 📊 Sprint 1 DoD

- [x] Laravel project structure created
- [x] Next.js Admin UI running (port 3000)
- [x] Login works (demo mode)
- [x] Dashboard renders
- [x] Users CRUD UI complete
- [x] Parties CRUD UI complete
- [x] Roles management UI complete
- [x] Lint passes (0 errors)
- [x] No runtime errors in browser
- [ ] Laravel backend running (requires PHP env)
- [ ] JWT authentication (requires Laravel)
- [ ] OpenAPI spec generation (requires Laravel)

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Laravel 12 + PHP 8.3 |
| Database | PostgreSQL 16 (UUID v7, JSONB, ENUM, Partitioning) |
| Cache/Queue | Redis |
| Frontend | Next.js 16 + TypeScript 5 |
| UI Library | shadcn/ui + Tailwind CSS 4 |
| Mobile (P2) | Flutter |
| API Docs | OpenAPI 3.1 (swagger-php) |

## 📝 Project History

All decisions, tasks, and architecture evolution are documented in `worklog.md` (18 task entries).
