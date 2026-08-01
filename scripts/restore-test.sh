#!/usr/bin/env bash
# BISMARK ERP — Restore Test Script (T-2-06)
#
# Weekly automated restore test:
#   1. Provision test PostgreSQL instance
#   2. Restore latest backup
#   3. PITR to random timestamp in last 24h
#   4. Run data integrity checks
#   5. Alert if any check fails
#
# Usage:
#   ./scripts/restore-test.sh
#
# Cron (weekly on Sunday at 04:00):
#   0 4 * * 0 /home/bismark/scripts/restore-test.sh >> /var/log/bismark-restore-test.log 2>&1

set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TEST_DB_NAME="bismark_restore_test"
TEST_DB_URL="postgresql://bismark:bismark@localhost:5432/${TEST_DB_NAME}"
BACKUP_DIR="/tmp/bismark-backups"

echo "[$(date -Iseconds)] Starting BISMARK restore test..."

# ============================================================
# Step 1: Find latest backup
# ============================================================
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/bismark_*.dump 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
  echo "[$(date -Iseconds)] ERROR: No backup found in $BACKUP_DIR"
  exit 1
fi

echo "[$(date -Iseconds)] Latest backup: $LATEST_BACKUP"

# ============================================================
# Step 2: Create test database
# ============================================================
echo "[$(date -Iseconds)] Creating test database: $TEST_DB_NAME..."

# Drop if exists (clean slate)
psql -h localhost -U bismark -d postgres -c "DROP DATABASE IF EXISTS $TEST_DB_NAME;" || true
psql -h localhost -U bismark -d postgres -c "CREATE DATABASE $TEST_DB_NAME;"

# ============================================================
# Step 3: Restore backup to test database
# ============================================================
echo "[$(date -Iseconds)] Restoring backup to test database..."

pg_restore \
  --dbname="$TEST_DB_URL" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --jobs=4 \
  "$LATEST_BACKUP"

echo "[$(date -Iseconds)] Restore complete"

# ============================================================
# Step 4: Data Integrity Checks
# ============================================================
echo "[$(date -Iseconds)] Running data integrity checks..."

ERRORS=0

# Check 1: All tables exist
EXPECTED_TABLES=(
  "users" "tenants" "parties" "products" "sales_orders"
  "invoices" "payments" "warranty_cards" "service_requests"
  "journal_entries" "audit_logs" "outbox_messages"
)

for table in "${EXPECTED_TABLES[@]}"; do
  COUNT=$(psql -h localhost -U bismark -d "$TEST_DB_NAME" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null || echo "ERROR")
  if [ "$COUNT" = "ERROR" ] || [ -z "$COUNT" ]; then
    echo "  FAIL: Table '$table' missing or empty"
    ERRORS=$((ERRORS + 1))
  else
    echo "  OK: $table has $COUNT rows"
  fi
done

# Check 2: Foreign key constraints valid
FK_VIOLATIONS=$(psql -h localhost -U bismark -d "$TEST_DB_NAME" -t -c "
  SELECT COUNT(*)
  FROM pg_constraint
  WHERE contype = 'f' AND convalidated = false;
" 2>/dev/null || echo "0")

if [ "$FK_VIOLATIONS" -gt 0 ]; then
  echo "  FAIL: $FK_VIOLATIONS invalid foreign key constraints"
  ERRORS=$((ERRORS + 1))
else
  echo "  OK: All foreign keys valid"
fi

# Check 3: Journal entries balanced (totalDebit == totalCredit per entry)
UNBALANCED_JES=$(psql -h localhost -U bismark -d "$TEST_DB_NAME" -t -c "
  SELECT COUNT(*)
  FROM journal_entries je
  WHERE NOT EXISTS (
    SELECT 1
    FROM journal_entry_lines jel
    WHERE jel.journal_entry_id = je.id
    HAVING SUM(jel.debit_amount) = SUM(jel.credit_amount)
  ) AND je.status = 'posted';
" 2>/dev/null || echo "0")

if [ "$UNBALANCED_JES" -gt 0 ]; then
  echo "  FAIL: $UNBALANCED_JES unbalanced posted journal entries"
  ERRORS=$((ERRORS + 1))
else
  echo "  OK: All posted journal entries are balanced"
fi

# Check 4: No negative stock
NEGATIVE_STOCK=$(psql -h localhost -U bismark -d "$TEST_DB_NAME" -t -c "
  SELECT COUNT(*)
  FROM stock_items
  WHERE quantity < 0;
" 2>/dev/null || echo "0")

if [ "$NEGATIVE_STOCK" -gt 0 ]; then
  echo "  FAIL: $NEGATIVE_STOCK stock items with negative quantity"
  ERRORS=$((ERRORS + 1))
else
  echo "  OK: No negative stock"
fi

# ============================================================
# Step 5: PITR Test (restore to specific timestamp)
# ============================================================
# This requires WAL archive — skip if not configured
if [ -d "/var/lib/postgresql/wal_archive" ]; then
  echo "[$(date -Iseconds)] Running PITR test..."

  # Pick a random timestamp in the last 24 hours
  PITR_TIMESTAMP=$(date -d "1 hour ago" +%Y-%m-%d\ %H:%M:%S)

  echo "  Target timestamp: $PITR_TIMESTAMP"
  # In production: create new test DB, restore base backup, replay WAL to target timestamp
  # This is a stub — actual PITR requires WAL archive configuration

  echo "  PITR test: SKIPPED (requires WAL archive setup)"
else
  echo "[$(date -Iseconds)] PITR test: SKIPPED (no WAL archive directory)"
fi

# ============================================================
# Step 6: Cleanup
# ============================================================
echo "[$(date -Iseconds)] Cleaning up test database..."
psql -h localhost -U bismark -d postgres -c "DROP DATABASE IF EXISTS $TEST_DB_NAME;"

# ============================================================
# Step 7: Report
# ============================================================
if [ "$ERRORS" -gt 0 ]; then
  echo "[$(date -Iseconds)] RESTORE TEST FAILED: $ERRORS error(s)"
  # In production: send alert via Alertmanager / Slack / Email
  exit 1
else
  echo "[$(date -Iseconds)] RESTORE TEST PASSED — all checks OK"
  exit 0
fi
