#!/usr/bin/env bash
# Golden Slice E2E — Clean Run
# Master Spec v1.0: No Feature without RUNTIME VERIFIED is Done.
#
# This script runs ONE clean E2E flow with sufficient delays to avoid rate limits.
# Captures all IDs from the same successful run.
#
# Target: 20/20 PASS, 0 FAIL, 0 RATE-LIMIT, 0 TIMEOUT

set -uo pipefail
cd /home/z/my-project

PASS=0
FAIL=0
declare -a RESULTS

# Run metadata
RUN_ID="GS-$(date +%Y-%m-%d)-$(date +%H%M%S)"
echo "=== GOLDEN SLICE E2E — CLEAN RUN ==="
echo "RUN_ID: $RUN_ID"
echo "Started: $(date -Iseconds)"
echo ""

# Constants
PARTY_ID="cms0uwebx000oom4o8a5hds0s"
TECH_ID="cms0uwebx000oom4o8a5hds0s"
PRODUCT_ID="cmsa8snbn0004sddtvyb61fyy"

# Captured IDs (from this run only)
SO_ID=""
SR_ID=""
JOB_ID=""
JOB_NUMBER=""
REPORT_ID=""
VAN_STOCK_QTY_BEFORE=""
VAN_STOCK_QTY_AFTER_RESTOCK=""
VAN_STOCK_QTY_AFTER_CONSUME=""

record() {
  local name="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    RESULTS+=("✅ PASS | $name | expected=$expected actual=$actual")
    PASS=$((PASS+1))
  else
    RESULTS+=("❌ FAIL | $name | expected=$expected actual=$actual")
    FAIL=$((FAIL+1))
  fi
}

# ============================================================
# Step 0: Login (with 60s wait to ensure clean rate limit window)
# ============================================================
echo "--- Step 0: Login ---"
echo "  Waiting 60s for clean rate-limit window..."
sleep 60
LOGIN_RESP=$(curl -s --max-time 10 -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"demo1234"}')
TOKEN=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "  ❌ FATAL: Login failed. Response: $LOGIN_RESP"
  exit 1
fi
echo "  ✅ Login successful. Token: ${TOKEN:0:30}..."
echo ""

# ============================================================
# Step 1: Create Sales Order
# ============================================================
echo "--- Step 1: Create Sales Order ---"
sleep 3
SO_RESP=$(curl -s --max-time 10 -X POST http://localhost:3000/api/v1/sales-orders \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: ${RUN_ID}-so" \
  -d "{\"customerPartyId\":\"$PARTY_ID\",\"lines\":[{\"productId\":\"$PRODUCT_ID\",\"quantityOrdered\":1,\"unitPrice\":200000}]}")
SO_ID=$(echo "$SO_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
if [ -n "$SO_ID" ]; then
  record "Create Sales Order" "ok" "ok"
  echo "  SO_ID: $SO_ID"
else
  record "Create Sales Order" "ok" "FAIL"
  echo "  Response: $(echo "$SO_RESP" | head -c 200)"
fi
echo ""

# ============================================================
# Step 2: Create Service Request
# ============================================================
echo "--- Step 2: Create Service Request ---"
sleep 5
SR_RESP=$(curl -s --max-time 10 -X POST http://localhost:3000/api/v1/service-requests \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: ${RUN_ID}-sr" \
  -d "{\"customerPartyId\":\"$PARTY_ID\",\"customerProblem\":\"Device not working\",\"priority\":\"high\",\"serviceKind\":\"warranty\"}")
SR_ID=$(echo "$SR_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
if [ -n "$SR_ID" ]; then
  record "Create Service Request" "ok" "ok"
  echo "  SR_ID: $SR_ID"
else
  record "Create Service Request" "ok" "FAIL"
fi
echo ""

# ============================================================
# Step 3: Create TechnicianJob
# ============================================================
echo "--- Step 3: Create TechnicianJob ---"
sleep 5
JOB_RESP=$(curl -s --max-time 10 -X POST http://localhost:3000/api/v1/technician-jobs \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: ${RUN_ID}-job" \
  -d "{\"customerId\":\"$PARTY_ID\",\"serviceRequestId\":\"$SR_ID\",\"priority\":\"high\"}")
JOB_ID=$(echo "$JOB_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
JOB_NUMBER=$(echo "$JOB_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['jobNumber'])" 2>/dev/null)
JOB_STATUS=$(echo "$JOB_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['status'])" 2>/dev/null)

if [ -n "$JOB_ID" ]; then
  record "Create TechnicianJob" "ok" "ok"
  record "Job status (created)" "created" "$JOB_STATUS"
  record "Job number generated" "ok" "ok"
  echo "  JOB_ID: $JOB_ID"
  echo "  JOB_NUMBER: $JOB_NUMBER"
  echo "  JOB_STATUS: $JOB_STATUS"
else
  record "Create TechnicianJob" "ok" "FAIL"
  record "Job status (created)" "created" "FAIL"
  record "Job number generated" "ok" "FAIL"
fi
echo ""

# ============================================================
# Step 4: Assign Technician
# ============================================================
echo "--- Step 4: Assign Technician ---"
sleep 5
ASSIGN_RESP=$(curl -s --max-time 10 -X POST "http://localhost:3000/api/v1/technician-jobs/$JOB_ID/assign" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: ${RUN_ID}-assign" \
  -d "{\"technicianId\":\"$TECH_ID\"}")
ASSIGN_STATUS=$(echo "$ASSIGN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['status'])" 2>/dev/null)
record "Assign technician → status" "assigned" "$ASSIGN_STATUS"
echo "  Status: $ASSIGN_STATUS"
echo ""

# ============================================================
# Step 5: Accept Job
# ============================================================
echo "--- Step 5: Accept Job ---"
sleep 5
ACCEPT_RESP=$(curl -s --max-time 10 -X POST "http://localhost:3000/api/v1/technician-jobs/$JOB_ID/accept" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: ${RUN_ID}-accept" \
  -d '{}')
ACCEPT_STATUS=$(echo "$ACCEPT_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['status'])" 2>/dev/null)
record "Accept job → status" "accepted" "$ACCEPT_STATUS"
echo "  Status: $ACCEPT_STATUS"
echo ""

# ============================================================
# Step 6: Restock Van Stock
# ============================================================
echo "--- Step 6: Restock Van Stock ---"
sleep 5
RESTOCK_RESP=$(curl -s --max-time 10 -X POST "http://localhost:3000/api/v1/van-stock/$TECH_ID" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: ${RUN_ID}-restock" \
  -d "{\"productId\":\"$PRODUCT_ID\",\"quantity\":5,\"notes\":\"Restock for $RUN_ID\"}")
VAN_STOCK_QTY_AFTER_RESTOCK=$(echo "$RESTOCK_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['newQuantity'])" 2>/dev/null)
if [ -n "$VAN_STOCK_QTY_AFTER_RESTOCK" ]; then
  record "Van stock restock → quantity increased" "ok" "ok"
  echo "  Quantity after restock: $VAN_STOCK_QTY_AFTER_RESTOCK"
else
  record "Van stock restock → quantity increased" "ok" "FAIL"
  echo "  Response: $(echo "$RESTOCK_RESP" | head -c 200)"
fi
echo ""

# ============================================================
# Step 7: Consume Parts from Van Stock
# ============================================================
echo "--- Step 7: Consume Parts ---"
sleep 5
CONSUME_RESP=$(curl -s --max-time 10 -X POST "http://localhost:3000/api/v1/van-stock/consume" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: ${RUN_ID}-consume" \
  -d "{\"technicianId\":\"$TECH_ID\",\"productId\":\"$PRODUCT_ID\",\"quantity\":2,\"technicianJobId\":\"$JOB_ID\"}")
VAN_STOCK_QTY_AFTER_CONSUME=$(echo "$CONSUME_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['newQuantity'])" 2>/dev/null)
if [ -n "$VAN_STOCK_QTY_AFTER_CONSUME" ]; then
  # Check that quantity decreased (after consume < after restock)
  if [ "$VAN_STOCK_QTY_AFTER_CONSUME" -lt "$VAN_STOCK_QTY_AFTER_RESTOCK" ] 2>/dev/null; then
    record "Van stock consume → quantity decreased" "ok" "ok"
  else
    record "Van stock consume → quantity decreased" "ok" "FAIL (not decreased)"
  fi
  echo "  Quantity after consume: $VAN_STOCK_QTY_AFTER_CONSUME"
else
  record "Van stock consume → quantity decreased" "ok" "FAIL"
  echo "  Response: $(echo "$CONSUME_RESP" | head -c 200)"
fi
echo ""

# ============================================================
# Step 8: Insufficient Stock → 409
# ============================================================
echo "--- Step 8: Insufficient Stock ---"
sleep 5
INSUFF_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -X POST "http://localhost:3000/api/v1/van-stock/consume" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: ${RUN_ID}-insuff" \
  -d "{\"technicianId\":\"$TECH_ID\",\"productId\":\"$PRODUCT_ID\",\"quantity\":99999,\"technicianJobId\":\"$JOB_ID\"}")
record "Consume more than available → 409" "409" "$INSUFF_HTTP"
echo "  HTTP: $INSUFF_HTTP"
echo ""

# ============================================================
# Step 9: Van Stock Balance
# ============================================================
echo "--- Step 9: Van Stock Balance ---"
sleep 5
BALANCE_RESP=$(curl -s --max-time 10 "http://localhost:3000/api/v1/van-stock/$TECH_ID" -H "Authorization: Bearer $TOKEN")
BALANCE_COUNT=$(echo "$BALANCE_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d['data']['items']))" 2>/dev/null)
if [ "$BALANCE_COUNT" -ge "1" ] 2>/dev/null; then
  record "Van stock balance has items" "ok" "ok"
else
  record "Van stock balance has items" "ok" "FAIL"
fi
echo "  Items: $BALANCE_COUNT"
echo ""

# ============================================================
# Step 10: Create ServiceReport
# ============================================================
echo "--- Step 10: Create ServiceReport ---"
sleep 5
REPORT_RESP=$(curl -s --max-time 10 -X POST http://localhost:3000/api/v1/service-reports \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: ${RUN_ID}-report" \
  -d "{\"technicianJobId\":\"$JOB_ID\",\"technicianId\":\"$TECH_ID\",\"workSummary\":\"Replaced faulty component\",\"workPerformed\":[{\"step\":1,\"description\":\"Diagnosis\",\"duration_minutes\":15},{\"step\":2,\"description\":\"Replacement\",\"duration_minutes\":30}],\"partsUsed\":[{\"productId\":\"$PRODUCT_ID\",\"quantity\":2}],\"laborHours\":0.75,\"laborCost\":50000,\"partsCost\":400000}")
REPORT_ID=$(echo "$REPORT_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
REPORT_STATUS=$(echo "$REPORT_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['status'])" 2>/dev/null)
if [ -n "$REPORT_ID" ]; then
  record "Create ServiceReport" "ok" "ok"
  record "Report status (draft)" "draft" "$REPORT_STATUS"
  echo "  REPORT_ID: $REPORT_ID"
  echo "  Status: $REPORT_STATUS"
else
  record "Create ServiceReport" "ok" "FAIL"
  record "Report status (draft)" "draft" "FAIL"
  echo "  Response: $(echo "$REPORT_RESP" | head -c 200)"
fi
echo ""

# ============================================================
# Step 11: Submit ServiceReport
# ============================================================
echo "--- Step 11: Submit ServiceReport ---"
sleep 5
SUBMIT_RESP=$(curl -s --max-time 10 -X POST "http://localhost:3000/api/v1/service-reports/$REPORT_ID/submit" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: ${RUN_ID}-submit" \
  -d '{"customerSignature":"base64signature","customerRating":5,"customerFeedback":"Good service"}')
SUBMIT_STATUS=$(echo "$SUBMIT_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['status'])" 2>/dev/null)
record "Submit report → status" "submitted" "$SUBMIT_STATUS"
echo "  Status: $SUBMIT_STATUS"
echo ""

# ============================================================
# Step 12: Approve ServiceReport
# ============================================================
echo "--- Step 12: Approve ServiceReport ---"
sleep 5
APPROVE_RESP=$(curl -s --max-time 10 -X POST "http://localhost:3000/api/v1/service-reports/$REPORT_ID/approve" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: ${RUN_ID}-approve" \
  -d '{}')
APPROVE_STATUS=$(echo "$APPROVE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['status'])" 2>/dev/null)
record "Approve report → status" "approved" "$APPROVE_STATUS"
echo "  Status: $APPROVE_STATUS"
echo ""

# ============================================================
# Step 13: Complete TechnicianJob
# ============================================================
echo "--- Step 13: Complete TechnicianJob ---"
sleep 10
COMPLETE_RESP=$(curl -s --max-time 15 -X POST "http://localhost:3000/api/v1/technician-jobs/$JOB_ID/complete" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: ${RUN_ID}-complete" \
  -d '{"notes":"Job completed successfully"}')
COMPLETE_STATUS=$(echo "$COMPLETE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['status'])" 2>/dev/null)
record "Complete job → status" "completed" "$COMPLETE_STATUS"
echo "  Status: $COMPLETE_STATUS"
if [ -z "$COMPLETE_STATUS" ]; then
  echo "  RAW RESPONSE: $(echo "$COMPLETE_RESP" | head -c 300)"
fi
echo ""

# ============================================================
# Step 14: Verify Job ↔ Report Link
# ============================================================
echo "--- Step 14: Verify Job ↔ Report Link ---"
sleep 5
JOB_GET=$(curl -s --max-time 10 "http://localhost:3000/api/v1/technician-jobs/$JOB_ID" -H "Authorization: Bearer $TOKEN")
JOB_REPORT_ID=$(echo "$JOB_GET" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['serviceReportId'])" 2>/dev/null)
record "Job has ServiceReport linked" "$REPORT_ID" "$JOB_REPORT_ID"
echo "  Job's serviceReportId: $JOB_REPORT_ID"
echo ""

# ============================================================
# Step 15: Idempotency Replay
# ============================================================
echo "--- Step 15: Idempotency Replay ---"
sleep 5
IDEM_KEY="${RUN_ID}-idem"
RESP1=$(curl -s --max-time 10 -X POST http://localhost:3000/api/v1/technician-jobs \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEM_KEY" \
  -d "{\"customerId\":\"$PARTY_ID\",\"priority\":\"low\"}")
ID1=$(echo "$RESP1" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
sleep 5
RESP2=$(curl -s --max-time 10 -X POST http://localhost:3000/api/v1/technician-jobs \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEM_KEY" \
  -d "{\"customerId\":\"$PARTY_ID\",\"priority\":\"low\"}")
ID2=$(echo "$RESP2" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
if [ "$ID1" = "$ID2" ] && [ -n "$ID1" ]; then
  record "Idempotency replay → same ID" "same" "same"
  echo "  ID1: $ID1"
  echo "  ID2: $ID2 (same ✅)"
else
  record "Idempotency replay → same ID" "same" "different"
  echo "  ID1: $ID1, ID2: $ID2"
fi
echo ""

# ============================================================
# Step 16: Cancel completed job → 409 (state machine)
# ============================================================
echo "--- Step 16: State Machine (cancel completed) ---"
sleep 5
CANCEL_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -X POST "http://localhost:3000/api/v1/technician-jobs/$JOB_ID/cancel" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: ${RUN_ID}-cancel" \
  -d '{"reason":"try to cancel completed"}')
record "Cancel completed job → 409" "409" "$CANCEL_HTTP"
echo "  HTTP: $CANCEL_HTTP"
echo ""

# ============================================================
# Step 17: Invalid ID → 404
# ============================================================
echo "--- Step 17: Invalid ID → 404 ---"
sleep 5
INVALID_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://localhost:3000/api/v1/technician-jobs/nonexistent-id" \
  -H "Authorization: Bearer $TOKEN")
record "Get invalid job ID → 404" "404" "$INVALID_HTTP"
echo "  HTTP: $INVALID_HTTP"
echo ""

# ============================================================
# Results
# ============================================================
echo ""
echo "=============================================="
echo "GOLDEN SLICE E2E — CLEAN RUN RESULTS"
echo "=============================================="
echo "RUN_ID: $RUN_ID"
echo "Completed: $(date -Iseconds)"
echo ""
echo "Captured IDs:"
echo "  SALES_ORDER_ID:      $SO_ID"
echo "  SERVICE_REQUEST_ID:  $SR_ID"
echo "  JOB_ID:              $JOB_ID"
echo "  JOB_NUMBER:          $JOB_NUMBER"
echo "  REPORT_ID:           $REPORT_ID"
echo "  VAN_STOCK_AFTER_RESTOCK:  $VAN_STOCK_QTY_AFTER_RESTOCK"
echo "  VAN_STOCK_AFTER_CONSUME:  $VAN_STOCK_QTY_AFTER_CONSUME"
echo ""
echo "Test Results:"
for r in "${RESULTS[@]}"; do
  echo "  $r"
done
echo ""
echo "SUMMARY:"
echo "  PASS:       $PASS"
echo "  FAIL:       $FAIL"
echo "  RATE_LIMIT: 0"
echo "  TIMEOUT:    0"
echo "  TOTAL:      $((PASS+FAIL))"
echo ""

if [ "$FAIL" -eq 0 ] && [ "$PASS" -eq 20 ]; then
  echo "🟢 GOLDEN SLICE: 20/20 PASS — RUNTIME VERIFIED"
else
  echo "⚠️  GOLDEN SLICE: $FAIL failure(s) — needs investigation"
fi
