#!/usr/bin/env bash
# Audit v4 — Comprehensive Regression Test for F-01 through F-07 fixes.
# Run AFTER all fixes are applied. Verifies runtime behavior of each fix.

set -uo pipefail

cd /home/z/my-project

PASS=0
FAIL=0
declare -a RESULTS

record() {
  local name="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    RESULTS+=("PASS | $name | expected=$expected actual=$actual")
    PASS=$((PASS+1))
  else
    RESULTS+=("FAIL | $name | expected=$expected actual=$actual")
    FAIL=$((FAIL+1))
  fi
}

echo "=== Audit v4 — Regression Test Suite ==="
echo ""

# ============================================================
# F-01: Session Revocation
# ============================================================
echo "--- F-01: Session Revocation ---"
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"demo1234"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])")

# Before logout — token works
STATUS_BEFORE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/v1/auth/me" -H "Authorization: Bearer $TOKEN")
record "F-01 before logout: GET /auth/me" "200" "$STATUS_BEFORE"

# Logout
STATUS_LOGOUT=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:3000/api/v1/auth/logout" -H "Authorization: Bearer $TOKEN" -H "Idempotency-Key: audit-v4-f01-$(date +%s%N)")
record "F-01 logout: POST /auth/logout" "200" "$STATUS_LOGOUT"

# After logout — token rejected (401)
sleep 1
STATUS_AFTER=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/v1/auth/me" -H "Authorization: Bearer $TOKEN")
record "F-01 after logout: GET /auth/me (should be 401)" "401" "$STATUS_AFTER"

# After logout — customer/profile also rejected
STATUS_AFTER2=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/v1/customer/profile" -H "Authorization: Bearer $TOKEN")
record "F-01 after logout: GET /customer/profile (should be 401)" "401" "$STATUS_AFTER2"

echo ""

# ============================================================
# F-02: 18 Broken Routes — All Should Return 201
# ============================================================
echo "--- F-02: 18 Broken Routes (POST with valid payload) ---"
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"demo1234"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])")
PARTY_ID="cms0uwebx000oom4o8a5hds0s"
WAREHOUSE_ID="cmsa8s14p0000sdag6as7vht4"
PRODUCT_INSTANCE_ID="cmsa8st160001sdevfckbfuoo"
# Get a fresh PO for goods-receipts
PO_ID=$(curl -s "http://localhost:3000/api/v1/purchase-orders?per_page=1" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',[{}])[0].get('id',''))")
PROMO_ID=$(curl -s "http://localhost:3000/api/v1/promotions?per_page=1" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',[{}])[0].get('id',''))")
SLA_POLICY_ID=$(curl -s "http://localhost:3000/api/v1/sla-policies?per_page=1" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',[{}])[0].get('id',''))")
COMPLAINT_ID=$(curl -s "http://localhost:3000/api/v1/complaints?per_page=1" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',[{}])[0].get('id',''))")
LOYALTY_ACCT_ID=$(curl -s "http://localhost:3000/api/v1/loyalty-accounts?per_page=1" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',[{}])[0].get('id',''))")

# Use a fresh party for loyalty (avoid duplicate)
LOYALTY_PARTY_ID="cms0uwec3000som4obbxp5um8"

# 1. appointments
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:3000/api/v1/appointments" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "Idempotency-Key: v4-1-$(date +%s%N)" -d "{\"technicianId\":\"$PARTY_ID\",\"customerId\":\"$PARTY_ID\",\"scheduledStartTime\":\"2026-09-01T09:00:00Z\",\"scheduledEndTime\":\"2026-09-01T11:00:00Z\"}")
record "F-02 appointments" "201" "$STATUS"

# 2. complaints
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:3000/api/v1/complaints" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "Idempotency-Key: v4-2-$(date +%s%N)" -d "{\"customerId\":\"$PARTY_ID\",\"complaintType\":\"service\",\"subject\":\"v4\",\"description\":\"test\"}")
record "F-02 complaints" "201" "$STATUS"

# 3. installations
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:3000/api/v1/installations" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "Idempotency-Key: v4-3-$(date +%s%N)" -d "{\"productInstanceId\":\"$PRODUCT_INSTANCE_ID\",\"customerId\":\"$PARTY_ID\"}")
record "F-02 installations" "201" "$STATUS"

# 4. leads
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:3000/api/v1/leads" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "Idempotency-Key: v4-4-$(date +%s%N)" -d '{"customerName":"v4 lead"}')
record "F-02 leads" "201" "$STATUS"

# 5. purchase-orders
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:3000/api/v1/purchase-orders" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "Idempotency-Key: v4-5-$(date +%s%N)" -d "{\"supplierPartyId\":\"$PARTY_ID\"}")
record "F-02 purchase-orders" "201" "$STATUS"

# 6. goods-receipts
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:3000/api/v1/goods-receipts" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "Idempotency-Key: v4-6-$(date +%s%N)" -d "{\"purchaseOrderId\":\"$PO_ID\",\"warehouseId\":\"$WAREHOUSE_ID\"}")
record "F-02 goods-receipts" "201" "$STATUS"

# 7. promotions
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:3000/api/v1/promotions" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "Idempotency-Key: v4-7-$(date +%s%N)" -d '{"name":"v4 promo","value":10,"startDate":"2026-09-01T00:00:00Z","endDate":"2026-09-30T23:59:59Z"}')
record "F-02 promotions" "201" "$STATUS"

# 8. loyalty-accounts (use a different party)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:3000/api/v1/loyalty-accounts" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "Idempotency-Key: v4-8-$(date +%s%N)" -d "{\"partyId\":\"$LOYALTY_PARTY_ID\"}")
record "F-02 loyalty-accounts" "201" "$STATUS"

# 9. technician-skills
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:3000/api/v1/technician-skills" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "Idempotency-Key: v4-9-$(date +%s%N)" -d "{\"technicianId\":\"$PARTY_ID\",\"skillLevel\":\"senior\"}")
record "F-02 technician-skills" "201" "$STATUS"

# 10. surveys
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:3000/api/v1/surveys" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "Idempotency-Key: v4-10-$(date +%s%N)" -d "{\"surveyType\":\"post_service\",\"customerId\":\"$PARTY_ID\",\"answers\":[{\"question\":\"q1\",\"answer\":\"a1\"}]}")
record "F-02 surveys" "201" "$STATUS"

# 11. survey-templates
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:3000/api/v1/survey-templates" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "Idempotency-Key: v4-11-$(date +%s%N)" -d '{"name":"v4 template","type":"post_service","questions":[{"question":"q1","type":"rating"}]}')
record "F-02 survey-templates" "201" "$STATUS"

# 12. sla-policies
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:3000/api/v1/sla-policies" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "Idempotency-Key: v4-12-$(date +%s%N)" -d '{"name":"v4 sla","responseTimeMinutes":60,"resolutionTimeHours":24}')
record "F-02 sla-policies" "201" "$STATUS"

# 13. coupons
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:3000/api/v1/coupons" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "Idempotency-Key: v4-13-$(date +%s%N)" -d "{\"promotionId\":\"$PROMO_ID\"}")
record "F-02 coupons" "201" "$STATUS"

# 14. customer-interactions
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:3000/api/v1/customer-interactions" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "Idempotency-Key: v4-14-$(date +%s%N)" -d "{\"partyId\":\"$PARTY_ID\",\"subject\":\"v4\",\"notes\":\"test\"}")
record "F-02 customer-interactions" "201" "$STATUS"

# 15. technician-availability
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:3000/api/v1/technician-availability" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "Idempotency-Key: v4-15-$(date +%s%N)" -d "{\"technicianId\":\"$PARTY_ID\",\"date\":\"2026-09-20\",\"startTime\":\"08:00\",\"endTime\":\"17:00\"}")
record "F-02 technician-availability" "201" "$STATUS"

# 16. technician-performance
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:3000/api/v1/technician-performance" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "Idempotency-Key: v4-16-$(date +%s%N)" -d "{\"technicianId\":\"$PARTY_ID\",\"period\":\"1405-07\"}")
record "F-02 technician-performance" "201" "$STATUS"

# 17. sla-trackers
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:3000/api/v1/sla-trackers" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "Idempotency-Key: v4-17-$(date +%s%N)" -d "{\"entityType\":\"complaint\",\"entityId\":\"$COMPLAINT_ID\",\"slaPolicyId\":\"$SLA_POLICY_ID\",\"responseDeadline\":\"2026-09-02T12:00:00Z\",\"resolutionDeadline\":\"2026-09-03T18:00:00Z\"}")
record "F-02 sla-trackers" "201" "$STATUS"

# 18. loyalty-transactions
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:3000/api/v1/loyalty-transactions" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "Idempotency-Key: v4-18-$(date +%s%N)" -d "{\"loyaltyAccountId\":\"$LOYALTY_ACCT_ID\",\"type\":\"earn\",\"points\":50}")
record "F-02 loyalty-transactions" "201" "$STATUS"

echo ""

# ============================================================
# F-02 Validation: Empty body should return 422 (not 500)
# ============================================================
echo "--- F-02 Validation: Empty body → 422 (not 500) ---"
for route in appointments complaints installations leads purchase-orders goods-receipts promotions loyalty-accounts technician-skills surveys survey-templates sla-policies coupons customer-interactions technician-availability technician-performance sla-trackers loyalty-transactions; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:3000/api/v1/$route" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "Idempotency-Key: v4val-$route-$(date +%s%N)" -d '{}')
  record "F-02 validation: $route empty body" "422" "$STATUS"
done

echo ""

# ============================================================
# F-03: Customer Portal Routes
# ============================================================
echo "--- F-03: Customer Portal Routes ---"
# Customer1 user has customer role + linked Party
CTOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login -H "Content-Type: application/json" -d '{"username":"customer1","password":"demo1234"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])")

for route in profile complaints invoices products service-requests surveys warranties; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/v1/customer/$route" -H "Authorization: Bearer $CTOKEN")
  record "F-03 customer/$route" "200" "$STATUS"
done

# Verify customer1 sees their own complaints
COMPLAINT_COUNT=$(curl -s "http://localhost:3000/api/v1/customer/complaints" -H "Authorization: Bearer $CTOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('meta',{}).get('total',0))")
if [ "$COMPLAINT_COUNT" -gt "0" ]; then
  record "F-03 customer1 sees complaints" "yes" "yes"
else
  record "F-03 customer1 sees complaints" "yes" "no ($COMPLAINT_COUNT)"
fi

echo ""

# ============================================================
# F-05: Worker Runtime
# ============================================================
echo "--- F-05: Worker Runtime ---"
WORKER_RUNNING=$(ps aux | grep "run-workers" | grep -v grep | wc -l)
if [ "$WORKER_RUNNING" -gt "0" ]; then
  record "F-05 worker process running" "yes" "yes"
else
  record "F-05 worker process running" "yes" "no"
fi

# Check worker processed messages
WORKER_LOG_TAIL=$(tail -20 /tmp/worker.log 2>/dev/null | grep -E "\[inbox\] Processed" | tail -1)
if [ -n "$WORKER_LOG_TAIL" ]; then
  record "F-05 worker processing messages" "yes" "yes"
else
  record "F-05 worker processing messages" "yes" "no"
fi

# Check docker-compose references correct file
DC_REFS=$(grep "run-workers\|outbox-worker.ts\|inbox-worker.ts\|snapshot-worker.ts" docker-compose.production.yml | head -1)
if echo "$DC_REFS" | grep -q "run-workers.ts"; then
  record "F-05 docker-compose uses run-workers.ts" "yes" "yes"
else
  record "F-05 docker-compose uses run-workers.ts" "yes" "no ($DC_REFS)"
fi

echo ""

# ============================================================
# F-07: Dashboard Real Stats
# ============================================================
echo "--- F-07: Dashboard Real Stats ---"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/v1/system/stats" -H "Authorization: Bearer $TOKEN")
record "F-07 GET /system/stats" "200" "$STATUS"

# Verify stats are real (not mock values)
TOTAL_USERS=$(curl -s "http://localhost:3000/api/v1/system/stats" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['totalUsers'])")
if [ "$TOTAL_USERS" -gt "0" ] && [ "$TOTAL_USERS" != "10" ]; then
  record "F-07 stats are real (not mock 10)" "real" "real ($TOTAL_USERS)"
else
  record "F-07 stats are real (not mock 10)" "real" "mock ($TOTAL_USERS)"
fi

echo ""

# ============================================================
# Summary
# ============================================================
echo "=== Results ==="
for r in "${RESULTS[@]}"; do
  echo "$r"
done
echo ""
echo "PASS: $PASS"
echo "FAIL: $FAIL"
echo "TOTAL: $((PASS+FAIL))"
echo ""
if [ "$FAIL" -eq "0" ]; then
  echo "🎉 ALL TESTS PASS — Audit v4 fixes verified"
else
  echo "⚠️  $FAIL test(s) failed — see above"
fi
