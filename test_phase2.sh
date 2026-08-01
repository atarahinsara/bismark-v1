#!/usr/bin/env bash
# Phase 2 Exit Gate Verification
# Tests all Phase 2 deliverables that can be verified in sandbox.

set -uo pipefail
cd /home/z/my-project

PASS=0
FAIL=0

record() {
  local name="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo "PASS | $name | expected=$expected actual=$actual"
    PASS=$((PASS+1))
  else
    echo "FAIL | $name | expected=$expected actual=$actual"
    FAIL=$((FAIL+1))
  fi
}

echo "=== Phase 2 Exit Gate Verification ==="
echo ""

# Login (with retry to avoid rate limit)
sleep 5
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"demo1234"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])" 2>/dev/null)

# ============================================================
# T-2-08: Structured Logging
# ============================================================
echo "--- T-2-08: Structured Logging ---"
if [ -f src/lib/logger.ts ]; then
  record "logger.ts exists" "yes" "yes"
  # Check logger exports
  EXPORTS=$(grep -c "^export " src/lib/logger.ts)
  if [ "$EXPORTS" -ge 4 ]; then
    record "logger exports (>=4)" "yes" "yes ($EXPORTS)"
  else
    record "logger exports (>=4)" "yes" "no ($EXPORTS)"
  fi
else
  record "logger.ts exists" "yes" "no"
fi
echo ""

# ============================================================
# T-2-10: Prometheus Metrics
# ============================================================
echo "--- T-2-10: Prometheus Metrics ---"
METRICS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/metrics)
record "GET /api/metrics returns 200" "200" "$METRICS_STATUS"

METRICS_CONTENT=$(curl -s http://localhost:3000/api/metrics)
if echo "$METRICS_CONTENT" | grep -q "bismark_"; then
  record "BISMARK custom metrics present" "yes" "yes"
else
  record "BISMARK custom metrics present" "yes" "no"
fi

if echo "$METRICS_CONTENT" | grep -q "process_cpu_user_seconds_total"; then
  record "Default Node.js metrics present" "yes" "yes"
else
  record "Default Node.js metrics present" "yes" "no"
fi
echo ""

# ============================================================
# T-2-17: MFA (TOTP)
# ============================================================
echo "--- T-2-17: MFA (TOTP) ---"
# Setup MFA
SETUP_RESP=$(curl -s -X POST http://localhost:3000/api/v1/auth/mfa/setup -H "Authorization: Bearer $TOKEN")
SECRET=$(echo "$SETUP_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['secret'])" 2>/dev/null)
if [ -n "$SECRET" ]; then
  record "MFA setup returns secret" "yes" "yes"
else
  record "MFA setup returns secret" "yes" "no"
fi

BACKUP_COUNT=$(echo "$SETUP_RESP" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['data']['backupCodes']))" 2>/dev/null)
record "MFA backup codes (10)" "10" "$BACKUP_COUNT"

# Generate TOTP token
CURRENT_TOKEN=$(bun -e "import { generateSync } from 'otplib'; console.log(generateSync({ secret: '$SECRET', period: 30, digits: 6 }))" 2>/dev/null)

# Verify MFA
VERIFY_RESP=$(curl -s -X POST http://localhost:3000/api/v1/auth/mfa/verify -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"token\":\"$CURRENT_TOKEN\"}")
VERIFY_STATUS=$(echo "$VERIFY_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['enabled'])" 2>/dev/null)
record "MFA verify with correct token" "True" "$VERIFY_STATUS"

# Test login without MFA token (should fail)
sleep 3
LOGIN_NO_MFA=$(curl -s -X POST http://localhost:3000/api/v1/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"demo1234"}')
LOGIN_CODE=$(echo "$LOGIN_NO_MFA" | python3 -c "import sys,json; print(json.load(sys.stdin).get('code',''))" 2>/dev/null)
record "Login without MFA returns MFA_REQUIRED" "MFA_REQUIRED" "$LOGIN_CODE"

# Test login with wrong MFA token
sleep 3
LOGIN_WRONG_MFA=$(curl -s -X POST http://localhost:3000/api/v1/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"demo1234","mfaToken":"000000"}')
LOGIN_WRONG_CODE=$(echo "$LOGIN_WRONG_MFA" | python3 -c "import sys,json; print(json.load(sys.stdin).get('code',''))" 2>/dev/null)
record "Login with wrong MFA returns MFA_TOKEN_INVALID" "MFA_TOKEN_INVALID" "$LOGIN_WRONG_CODE"

# Test login with correct MFA token
sleep 3
CURRENT_TOKEN=$(bun -e "import { generateSync } from 'otplib'; console.log(generateSync({ secret: '$SECRET', period: 30, digits: 6 }))" 2>/dev/null)
LOGIN_OK=$(curl -s -X POST http://localhost:3000/api/v1/auth/login -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"demo1234\",\"mfaToken\":\"$CURRENT_TOKEN\"}")
LOGIN_OK_TOKEN=$(echo "$LOGIN_OK" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'][:20])" 2>/dev/null)
if [ -n "$LOGIN_OK_TOKEN" ]; then
  record "Login with correct MFA succeeds" "yes" "yes"
  TOKEN=$(echo "$LOGIN_OK" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])")
else
  record "Login with correct MFA succeeds" "yes" "no"
fi

# Disable MFA to restore state
sleep 3
CURRENT_TOKEN=$(bun -e "import { generateSync } from 'otplib'; console.log(generateSync({ secret: '$SECRET', period: 30, digits: 6 }))" 2>/dev/null)
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"demo1234\",\"mfaToken\":\"$CURRENT_TOKEN\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])")
curl -s -X POST http://localhost:3000/api/v1/auth/mfa/disable -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"password":"demo1234"}' > /dev/null
echo ""

# ============================================================
# T-2-18: PII Encryption
# ============================================================
echo "--- T-2-18: PII Encryption ---"
PII_TEST=$(bun -e "
import { encryptPII, decryptPII, isEncrypted } from './src/lib/pii-encryption'
const orig = '1234567890'
const enc = encryptPII(orig)
const dec = decryptPII(enc)
const match = orig === dec
const isEnc = isEncrypted(enc)
const isPlain = isEncrypted(orig)
console.log(JSON.stringify({ match, isEnc, isPlain }))
" 2>/dev/null)
echo "$PII_TEST" | python3 -c "
import sys, json
d = json.loads(sys.stdin.read())
print(f'  Encrypt→Decrypt match: {d[\"match\"]}')
print(f'  isEncrypted(encrypted): {d[\"isEnc\"]}')
print(f'  isEncrypted(plaintext): {d[\"isPlain\"]}')
"
echo ""

# ============================================================
# T-2-19: File Virus Scan
# ============================================================
echo "--- T-2-19: File Virus Scan ---"
sleep 5
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"demo1234"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])" 2>/dev/null)

# Upload clean file
echo "clean content" > /tmp/clean-test.txt
CLEAN_RESP=$(curl -s -X POST http://localhost:3000/api/v1/files \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/clean-test.txt;type=text/plain" \
  -F "entityType=test" \
  -F "entityId=clean-test")
CLEAN_STATUS=$(echo "$CLEAN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('id','FAIL'))" 2>/dev/null)
if [ "$CLEAN_STATUS" != "FAIL" ]; then
  record "Clean file upload succeeds" "yes" "yes"
else
  record "Clean file upload succeeds" "yes" "no"
fi

# Upload EICAR test file
echo 'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' > /tmp/eicar-test.txt
EICAR_RESP=$(curl -s -X POST http://localhost:3000/api/v1/files \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/eicar-test.txt;type=text/plain" \
  -F "entityType=test" \
  -F "entityId=eicar-test")
EICAR_CODE=$(echo "$EICAR_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('code',''))" 2>/dev/null)
record "EICAR file rejected (VIRUS_DETECTED)" "VIRUS_DETECTED" "$EICAR_CODE"
echo ""

# ============================================================
# T-2-20: Signed URL
# ============================================================
echo "--- T-2-20: Signed URL ---"
FILE_ID="$CLEAN_STATUS"
URL_RESP=$(curl -s "http://localhost:3000/api/v1/files/$FILE_ID/url" -H "Authorization: Bearer $TOKEN")
SIGNED_URL=$(echo "$URL_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['url'])" 2>/dev/null)
EXPIRES_IN=$(echo "$URL_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['expiresIn'])" 2>/dev/null)
record "Signed URL generated (15 min expiry)" "900" "$EXPIRES_IN"

# Download via signed URL (no auth header)
SIGNED_TOKEN=$(echo "$SIGNED_URL" | sed 's/.*token=//')
DOWNLOAD_CONTENT=$(curl -s "http://localhost:3000/api/v1/files/$FILE_ID/download?token=$SIGNED_TOKEN")
if [ "$DOWNLOAD_CONTENT" = "clean content" ]; then
  record "Download via signed URL works" "yes" "yes"
else
  record "Download via signed URL works" "yes" "no"
fi

# Try with invalid token
INVALID_RESP=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/v1/files/$FILE_ID/download?token=invalid")
record "Invalid token rejected (401)" "401" "$INVALID_RESP"
echo ""

# ============================================================
# T-2-04: Backup Scripts
# ============================================================
echo "--- T-2-04: Backup Scripts ---"
if [ -f scripts/backup.sh ]; then
  record "backup.sh exists" "yes" "yes"
  BACKUP_EXEC=$(test -x scripts/backup.sh && echo "yes" || echo "no")
  record "backup.sh executable" "yes" "$BACKUP_EXEC"
else
  record "backup.sh exists" "yes" "no"
fi

if [ -f scripts/restore-test.sh ]; then
  record "restore-test.sh exists" "yes" "yes"
else
  record "restore-test.sh exists" "yes" "no"
fi
echo ""

# ============================================================
# T-2-07: DR Plan
# ============================================================
echo "--- T-2-07: DR Plan ---"
if [ -f docs/dr-plan.md ]; then
  record "dr-plan.md exists" "yes" "yes"
  DR_LINES=$(wc -l < docs/dr-plan.md)
  if [ "$DR_LINES" -gt 100 ]; then
    record "DR Plan has content (>100 lines)" "yes" "yes ($DR_LINES lines)"
  else
    record "DR Plan has content (>100 lines)" "yes" "no ($DR_LINES lines)"
  fi
else
  record "dr-plan.md exists" "yes" "no"
fi
echo ""

# ============================================================
# T-2-15: CI/CD Pipeline
# ============================================================
echo "--- T-2-15: CI/CD Pipeline ---"
if grep -q "deploy-staging" .github/workflows/ci-cd.yml && grep -q "deploy-production" .github/workflows/ci-cd.yml; then
  record "CI/CD has staging + production" "yes" "yes"
else
  record "CI/CD has staging + production" "yes" "no"
fi

if grep -q "security-scan" .github/workflows/ci-cd.yml; then
  record "CI/CD has security scan" "yes" "yes"
else
  record "CI/CD has security scan" "yes" "no"
fi

if grep -q "Rollback on failure" .github/workflows/ci-cd.yml; then
  record "CI/CD has rollback" "yes" "yes"
else
  record "CI/CD has rollback" "yes" "no"
fi

# Check no more "|| true" in audit
if grep -q "bun audit || true" .github/workflows/ci-cd.yml; then
  record "No 'bun audit || true' (was: náquît)" "yes" "no (still present)"
else
  record "No 'bun audit || true'" "yes" "yes"
fi
echo ""

# ============================================================
# Lint Check
# ============================================================
echo "--- Lint Check ---"
LINT_EXIT=$(bun run lint 2>&1; echo $?)
if echo "$LINT_EXIT" | tail -1 | grep -q "^0$"; then
  record "ESLint passes" "yes" "yes"
else
  record "ESLint passes" "yes" "no"
fi
echo ""

# ============================================================
# Summary
# ============================================================
echo "=== Phase 2 Exit Gate Summary ==="
echo "PASS: $PASS"
echo "FAIL: $FAIL"
echo "TOTAL: $((PASS+FAIL))"
echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "🎉 PHASE 2 EXIT GATE: PASSED"
else
  echo "⚠️  PHASE 2 EXIT GATE: $FAIL test(s) failed"
fi
