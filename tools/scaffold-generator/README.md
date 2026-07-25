# BISMARK ERP — Scaffold Generator

This tool reads entity definitions from `design/*.yaml` and generates boilerplate code for both Laravel backend and Next.js frontend.

## Usage

```bash
# Generate all code for a sprint
bun run tools/scaffold-generator/generate.ts --sprint 1

# Generate specific context
bun run tools/scaffold-generator/generate.ts --context Identity

# Generate specific entity
bun run tools/scaffold-generator/generate.ts --entity User

# Dry run (show what would be generated)
bun run tools/scaffold-generator/generate.ts --sprint 1 --dry-run
```

## What it generates

### Laravel (backend/bismark-laravel/)
For each entity:
- `app/Modules/{Context}/Models/{Entity}.php` — Eloquent model with casts, relations, scopes
- `app/Modules/{Context}/Repositories/{Entity}RepositoryInterface.php`
- `app/Modules/{Context}/Repositories/{Entity}Repository.php`
- `app/Modules/{Context}/Contracts/{Entity}QueryServiceInterface.php`
- `app/Modules/{Context}/Contracts/{Entity}CommandServiceInterface.php`
- `app/Modules/{Context}/Contracts/DTOs/{Entity}DTO.php`
- `app/Modules/{Context}/Services/{Entity}QueryService.php`
- `app/Modules/{Context}/Services/{Entity}CommandService.php`
- `app/Modules/{Context}/Controllers/{Entity}Controller.php`
- `app/Modules/{Context}/Requests/Create{Entity}Request.php`
- `app/Modules/{Context}/Requests/Update{Entity}Request.php`
- `app/Modules/{Context}/Resources/{Entity}Resource.php`
- `app/Modules/{Context}/Policies/{Entity}Policy.php`
- `app/Modules/{Context}/Events/{Entity}Created.php` (and Updated, Deleted)
- `app/Modules/{Context}/Routes/api.php` (appended)
- `database/migrations/{timestamp}_create_{table}_table.php`
- `database/factories/{Entity}Factory.php`
- `tests/Unit/Modules/{Context}/{Entity}Test.php`
- `tests/Feature/Modules/{Context}/{Entity}ControllerTest.php`

### Next.js (src/)
For each entity:
- `src/lib/api/entities/{entity}.ts` — TypeScript types + API client functions
- `src/components/admin/{entity}/` — list, detail, form components
- (Pages are handled by the single-page admin shell in `src/app/page.tsx`)

## Architecture Laws Enforced

- **LAW-01**: No cross-context JOINs — generator ensures loose FKs only
- **LAW-02**: Business Codes — generator adds `business_code` column + generator calls
- **LAW-03**: No cross-context Repository access — generator only creates Contract interfaces for cross-context use

## Design Source of Truth

All entity definitions live in `design/sprint-*-entities.yaml`. The generator reads these and produces consistent code across both stacks.
