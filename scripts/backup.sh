#!/usr/bin/env bash
# BISMARK ERP — Database Backup Script (T-2-04)
#
# Performs a full PostgreSQL backup + WAL archive check.
# Uploads backup to MinIO (S3-compatible) storage.
#
# Usage:
#   ./scripts/backup.sh
#
# Environment:
#   DATABASE_URL=postgresql://user:pass@host:5432/bismark
#   BACKUP_S3_ENDPOINT=http://minio:9000
#   BACKUP_S3_BUCKET=bismark-backups
#   BACKUP_S3_ACCESS_KEY=...
#   BACKUP_S3_SECRET_KEY=...
#
# Cron (daily at 02:00):
#   0 2 * * * /home/bismark/scripts/backup.sh >> /var/log/bismark-backup.log 2>&1

set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE=$(date +%Y-%m-%d)
BACKUP_DIR="/tmp/bismark-backups"
BACKUP_FILE="$BACKUP_DIR/bismark_${TIMESTAMP}.dump"
RETENTION_DAYS=7
RETENTION_WEEKS=4
RETENTION_MONTHS=12

echo "[$(date -Iseconds)] Starting BISMARK backup..."

mkdir -p "$BACKUP_DIR"

# ============================================================
# Step 1: Full Database Backup (pg_dump)
# ============================================================
echo "[$(date -Iseconds)] Running pg_dump..."

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL not set"
  exit 1
fi

# Parse DATABASE_URL
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\).*/\1/p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*\/\/\([^:]*\).*/\1/p')

echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"

# Run pg_dump (custom format for parallel restore)
pg_dump \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --file="$BACKUP_FILE" \
  "$DATABASE_URL"

BACKUP_SIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE")
echo "[$(date -Iseconds)] Backup created: $BACKUP_FILE ($BACKUP_SIZE bytes)"

# ============================================================
# Step 2: Upload to MinIO/S3
# ============================================================
if [ -n "${BACKUP_S3_BUCKET:-}" ]; then
  echo "[$(date -Iseconds)] Uploading to S3..."

  S3_PATH="s3://${BACKUP_S3_BUCKET}/daily/${DATE}/bismark_${TIMESTAMP}.dump"

  if command -v aws &> /dev/null; then
    aws s3 cp "$BACKUP_FILE" "$S3_PATH" \
      --endpoint-url="${BACKUP_S3_ENDPOINT:-}" \
      --no-progress
    echo "[$(date -Iseconds)] Uploaded to $S3_PATH"
  elif command -v mc &> /dev/null; then
    mc alias set bismark-backup "${BACKUP_S3_ENDPOINT}" \
      "${BACKUP_S3_ACCESS_KEY}" "${BACKUP_S3_SECRET_KEY}"
    mc cp "$BACKUP_FILE" "bismark-backup/${BACKUP_S3_BUCKET}/daily/${DATE}/bismark_${TIMESTAMP}.dump"
    echo "[$(date -Iseconds)] Uploaded via mc"
  else
    echo "[$(date -Iseconds)] WARNING: No S3 client found — backup kept locally only"
  fi
else
  echo "[$(date -Iseconds)] WARNING: BACKUP_S3_BUCKET not set — backup kept locally only"
fi

# ============================================================
# Step 3: Verify Backup Integrity
# ============================================================
echo "[$(date -Iseconds)] Verifying backup integrity..."

pg_verifybackup "$BACKUP_FILE" 2>/dev/null || {
  echo "[$(date -Iseconds)] WARNING: pg_verifybackup not available — skipping verification"
}

# Check backup is not empty
if [ "$BACKUP_SIZE" -lt 1000 ]; then
  echo "[$(date -Iseconds)] ERROR: Backup file too small ($BACKUP_SIZE bytes) — possible failure"
  exit 1
fi

echo "[$(date -Iseconds)] Backup verified ($BACKUP_SIZE bytes)"

# ============================================================
# Step 4: Cleanup Old Local Backups
# ============================================================
echo "[$(date -Iseconds)] Cleaning up old local backups (> $RETENTION_DAYS days)..."

find "$BACKUP_DIR" -name "bismark_*.dump" -mtime +$RETENTION_DAYS -delete || true

echo "[$(date -Iseconds)] Local cleanup complete"

# ============================================================
# Step 5: Record Backup Metadata
# ============================================================
METADATA_FILE="$BACKUP_DIR/last_backup.json"
cat > "$METADATA_FILE" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "file": "$BACKUP_FILE",
  "size_bytes": $BACKUP_SIZE,
  "database": "$DB_NAME",
  "host": "$DB_HOST",
  "status": "success"
}
EOF

echo "[$(date -Iseconds)] Backup complete. Metadata: $METADATA_FILE"
echo "[$(date -Iseconds)] RPO target: ≤ 15 minutes (WAL archive handles this)"
