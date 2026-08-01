# BISMARK ERP — Disaster Recovery Plan (T-2-07)

## Overview

This document defines the Disaster Recovery (DR) plan for BISMARK ERP production deployment.

## Objectives

| Metric | Target | Description |
|--------|--------|-------------|
| **RPO** (Recovery Point Objective) | ≤ 15 minutes | Maximum acceptable data loss |
| **RTO** (Recovery Time Objective) | ≤ 1 hour | Maximum acceptable downtime |
| **Backup Frequency** | Daily full + continuous WAL | PostgreSQL WAL archive |
| **Backup Retention** | 7 daily + 4 weekly + 12 monthly | |
| **Restore Test** | Weekly (automated) | Every Sunday 04:00 |

## Architecture

```text
Primary PostgreSQL (production)
    │
    ├── WAL Archive → MinIO (S3 bucket: bismark-backups/wal/)
    │
    ├── Daily Full Backup → MinIO (bismark-backups/daily/)
    │
    └── Hot Standby (streaming replication)
            │
            └── Promotable on failover
```

## Disaster Scenarios

### Scenario 1: Primary Database Failure

**Trigger:** Primary PostgreSQL unresponsive or crashed.

**Response:**
1. Detect failure (Prometheus alert: `pg_up == 0` for 2 min)
2. Verify standby is healthy and up-to-date (`pg_stat_replication`)
3. Promote standby to primary:
   ```bash
   pg_ctl promote -D /var/lib/postgresql/data
   ```
4. Update application DATABASE_URL to point to new primary
5. Restart application
6. Verify health check
7. Post-incident: provision new standby

**RTO:** ≤ 15 minutes (automatic failover) to 1 hour (manual)

### Scenario 2: Data Corruption

**Trigger:** Data integrity check fails (unbalanced JE, negative stock, etc.)

**Response:**
1. Identify corruption scope
2. Determine restore point (before corruption)
3. Provision new PostgreSQL instance
4. Restore latest full backup:
   ```bash
   pg_restore --dbname=bismark_new --format=custom latest.dump
   ```
5. Replay WAL to pre-corruption timestamp:
   ```bash
   recovery_target_time = '2025-01-15 10:00:00'
   ```
6. Verify data integrity
7. Switch application to restored database
8. Investigate root cause

**RTO:** ≤ 1 hour

### Scenario 3: Region Failure

**Trigger:** Entire region/datacenter unavailable.

**Response:**
1. Activate DR region (pre-provisioned)
2. Restore from offsite backup (MinIO in different region)
3. Update DNS to point to DR region
4. Restart all services
5. Verify health
6. Monitor for 24 hours

**RTO:** ≤ 4 hours

### Scenario 4: Ransomware / Malicious Encryption

**Trigger:** Database files encrypted by ransomware.

**Response:**
1. Isolate affected systems (network segmentation)
2. Do NOT pay ransom
3. Restore from offline backup (MinIO with versioning + immutable bucket)
4. Verify backup integrity (restore test)
5. Provision new infrastructure (new VMs, new DB)
6. Restore data
7. Apply security patches
8. Investigate breach (audit logs)
9. Reset all credentials (passwords, API keys, tokens)

**RTO:** ≤ 4 hours

### Scenario 5: Accidental Data Deletion

**Trigger:** User accidentally deletes records (e.g., `DELETE FROM sales_orders`)

**Response:**
1. Identify deletion timestamp (from AuditLog)
2. PITR to pre-deletion timestamp
3. Extract deleted records
4. Insert deleted records back into production DB
5. Verify data consistency

**RTO:** ≤ 15 minutes (PITR + selective restore)

## Backup Strategy

### Full Backups (Daily)

- **Schedule:** 02:00 AM daily
- **Tool:** `pg_dump --format=custom --compress=9`
- **Destination:** MinIO `bismark-backups/daily/YYYY-MM-DD/`
- **Retention:** 7 days

### WAL Archive (Continuous)

- **Configuration:** `wal_level=replica`, `archive_mode=on`
- **Archive Command:** `archive_command = 'aws s3 cp %p s3://bismark-backups/wal/%f'`
- **Retention:** 7 days (or until next full backup)

### Weekly Backups

- **Schedule:** Sunday 02:00 AM (after daily)
- **Retention:** 4 weeks

### Monthly Backups

- **Schedule:** 1st of month 02:00 AM
- **Retention:** 12 months

## Restore Test (Weekly)

- **Schedule:** Sunday 04:00 AM
- **Script:** `scripts/restore-test.sh`
- **Checks:**
  - All expected tables exist
  - Foreign key constraints valid
  - Journal entries balanced (debit == credit)
  - No negative stock
  - Row counts match production (±5%)
- **Alert:** If any check fails → Alertmanager → Slack

## Failover Procedure

```bash
#!/bin/bash
# scripts/failover.sh

# 1. Verify standby is ready
psql -h standby-host -U bismark -c "SELECT pg_is_in_recovery();"
# Should return: f (false = not in recovery = already promoted)
# If t (true): promote it

# 2. Promote standby
ssh standby-host "sudo -u postgres pg_ctl promote -D /var/lib/postgresql/data"

# 3. Wait for promotion
sleep 10

# 4. Verify
psql -h standby-host -U bismark -c "SELECT pg_is_in_recovery();"
# Should return: f

# 5. Update application config
# Update DATABASE_URL in .env or secrets manager
# DATABASE_URL=postgresql://bismark:pass@standby-host:5432/bismark

# 6. Restart application
docker-compose restart app worker

# 7. Health check
curl -f http://localhost:3000/api/v1/system/health
```

## Communication Plan

### During Incident

1. **Declare Incident:** Create #incident channel in Slack
2. **Assign Incident Commander:** One person coordinates
3. **Updates:** Every 15 minutes to stakeholders
4. **Status Page:** Update status.bismark.example.com

### Post-Incident

1. **Post-Mortem:** Within 48 hours
2. **Root Cause Analysis:** 5 Whys
3. **Action Items:** Tracked in GitHub Issues
4. **Update DR Plan:** Incorporate lessons learned

## Contact List

| Role | Name | Contact |
|------|------|---------|
| Incident Commander | TBD | TBD |
| DevOps Lead | TBD | TBD |
| DBA | TBD | TBD |
| CTO | TBD | TBD |

## Testing Schedule

| Test | Frequency | Owner |
|------|-----------|-------|
| Backup verification | Daily (automated) | DevOps |
| Restore test | Weekly (automated) | DevOps |
| Failover drill | Monthly | DevOps |
| Full DR drill | Quarterly | DevOps + Engineering |
| Tabletop exercise | Annually | All hands |

## Runtime Tests Required (Phase 2 Exit Gate)

- [ ] Backup completes successfully (daily)
- [ ] Restore to test DB PASS (weekly)
- [ ] PITR to specific timestamp PASS
- [ ] RPO measured ≤ 15 min (WAL archive lag)
- [ ] RTO measured ≤ 1 hour (failover drill)
- [ ] DR drill PASS (quarterly)
