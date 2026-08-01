#!/usr/bin/env bash
# F-04 fix (Audit v4): Migrate SQLite sandbox → PostgreSQL production.
#
# This script preserves SQLite sandbox integrity — it does NOT delete or modify
# the existing SQLite database. It only:
#   1. Switches the active Prisma schema to schema.postgres.prisma
#   2. Creates a fresh PostgreSQL database
#   3. Pushes the schema
#   4. Runs the seed against PostgreSQL
#
# Pre-requisites:
#   - PostgreSQL 14+ running and accessible
#   - DATABASE_URL env var pointing to PostgreSQL (e.g., postgresql://user:pass@host:5432/bismark)
#
# Usage:
#   DATABASE_URL=postgresql://user:pass@localhost:5432/bismark ./scripts/migrate-to-postgres.sh
#
# Rollback (return to SQLite):
#   - Set DATABASE_URL back to file:./db/custom.db
#   - The SQLite database is untouched; just restart the dev server.

set -euo pipefail

echo "=== F-04: SQLite → PostgreSQL Migration ==="

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL environment variable is required"
  echo "Example: DATABASE_URL=postgresql://user:pass@localhost:5432/bismark $0"
  exit 1
fi

if [[ "$DATABASE_URL" != postgresql://* ]]; then
  echo "ERROR: DATABASE_URL must start with 'postgresql://' (got: $DATABASE_URL)"
  exit 1
fi

echo "Target database: $DATABASE_URL"
echo ""

# Step 1: Backup SQLite database (just in case)
if [ -f db/custom.db ]; then
  BACKUP="db/custom.db.backup.$(date +%Y%m%d_%H%M%S)"
  cp db/custom.db "$BACKUP"
  echo "✓ Backed up SQLite database to: $BACKUP"
fi

# Step 2: Swap active schema file
echo "✓ Switching active schema to PostgreSQL variant..."
cp prisma/schema.prisma prisma/schema.sqlite.prisma.bak
cp prisma/schema.postgres.prisma prisma/schema.prisma

# Step 3: Generate Prisma client for PostgreSQL
echo "✓ Generating Prisma client..."
bun run db:generate

# Step 4: Push schema to PostgreSQL (creates tables if missing)
echo "✓ Pushing schema to PostgreSQL..."
bun run db:push --accept-data-loss

# Step 5: Run seed
echo "✓ Seeding PostgreSQL database..."
bun run src/lib/seed.ts

# Step 6: Verify
echo ""
echo "=== Migration complete ==="
echo "Active schema: prisma/schema.prisma (PostgreSQL)"
echo "Backup schema: prisma/schema.sqlite.prisma.bak (SQLite)"
echo ""
echo "To rollback to SQLite:"
echo "  1. cp prisma/schema.sqlite.prisma.bak prisma/schema.prisma"
echo "  2. Set DATABASE_URL=file:/home/z/my-project/db/custom.db"
echo "  3. bun run db:generate"
echo "  4. Restart dev server"
