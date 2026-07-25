# BISMARK ERP — Backend (Laravel 12)

Production backend for BISMARK ERP. Built with Laravel 12 + PostgreSQL 16 + Redis.

## ⚠️ Environment Note

This code is **production-ready Laravel 12** but cannot be run in the Next.js sandbox (which only runs Node.js). To run it:

```bash
cd backend/bismark-laravel
composer install
cp .env.example .env
php artisan key:generate
# Configure PostgreSQL + Redis in .env
php artisan migrate --seed
php artisan serve
```

## Architecture

### Modular Monolith (17 Modules)

```
app/Modules/
├── Identity/          — User, Role, Permission, Session
├── Authentication/    — Login, JWT, 2FA, Sessions
├── Authorization/     — RBAC, Policies
├── Organization/      — Branch, Department
├── Party/             — Person, Organization (Customer/Supplier/Rep)
├── MasterData/        — Country, Province, City, Currency, Language
├── Audit/             — Audit Logs (partitioned)
├── Notification/      — Templates, Channels
├── FeatureFlag/       — Feature toggles
├── FileManagement/    — File storage (S3/MinIO/Local/Azure)
├── Configuration/     — Settings, Business Codes
├── Workflow/          — State machine engine
├── RuleEngine/        — Rule evaluation
├── Product/           — (Sprint 2)
├── Inventory/         — (Sprint 2)
├── Sales/             — (Sprint 3)
├── Warranty/          — (Sprint 4)
├── Service/           — (Sprint 5)
└── Financial/         — (Sprint 6)
```

### Architecture Laws (Locked)

| Law | Description |
|-----|-------------|
| **LAW-01** | No cross-context JOIN in SQL queries |
| **LAW-02** | All aggregate roots have business codes |
| **LAW-03** | No cross-context Repository access (use Contracts) |

### Key Patterns

- **DDD**: Aggregate Root, Domain Event, Value Object
- **CQRS**: Query Service + Command Service separation
- **Outbox Pattern**: Transactional event publishing
- **Contract-based**: Cross-context access via interfaces only
- **Multi-Tenant**: Shared DB + `tenant_id` (ADR-003)

## Sprint 1 Status

✅ Shared Kernel (AggregateRoot, DomainEvent, UuidV7Generator)
✅ Identity Module (User, Role, Permission models)
✅ User Repository + Query Service + Controller
✅ Auth Controller (login, logout, refresh, me)
✅ Migrations (tenants, users with UUID v7 + ENUM + partial indexes)
✅ LAW-03 Enforcement (runtime + static analysis)
✅ Outbox Event Bus
✅ Config (bismark.php with all ADR settings)

## Generated Code Pattern

Each entity follows this structure (User as reference):

```
Models/User.php                          ← Eloquent model (aggregate root)
Repositories/UserRepository.php          ← Data access (same context only)
Contracts/UserQueryServiceInterface.php  ← Cross-context read contract
Contracts/DTOs/UserDTO.php              ← Immutable DTO for cross-context
Services/UserQueryService.php            ← Read application service
Services/UserCommandService.php          ← Write application service
Controllers/UserController.php           ← Thin HTTP layer
Requests/CreateUserRequest.php          ← Validation
Resources/UserResource.php              ← API serialization
Policies/UserPolicy.php                 ← Authorization
Events/UserCreated.php                  ← Domain event
```

## API Endpoints (Sprint 1)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/logout` | Logout |
| POST | `/api/v1/auth/refresh` | Refresh token |
| GET | `/api/v1/auth/me` | Current user |
| GET | `/api/v1/users` | List users |
| POST | `/api/v1/users` | Create user |
| GET | `/api/v1/users/{id}` | Show user |
| PATCH | `/api/v1/users/{id}` | Update user |
| DELETE | `/api/v1/users/{id}` | Delete user |
| POST | `/api/v1/users/{id}/suspend` | Suspend |
| POST | `/api/v1/users/{id}/lock` | Lock |
| GET | `/api/v1/roles` | List roles |
| GET | `/api/v1/parties` | List parties |
| ... | ... | ... |

Full OpenAPI spec at `/api/v1/openapi.json` (when running).
