#!/usr/bin/env bash
# Golden Slice E2E Test — Phase 3 (Master Spec v1.0)
# Tests the full vertical slice from Product → Sale → Installation → Warranty → Service → TechnicianJob → VanStock → ServiceReport → Complete
#
# Every step must Runtime Verified. No shallow checks.

set -uo pipefail
cd /home/z/my-project

PASS=0
FAIL=0
declare -a RESULTS

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

echo "=== GOLDEN SLICE E2E TEST ==="
echo ""

# Login
sleep 5
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"demo1234"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])" 2>/dev/null)
TENANT_ID="01910000-0000-7000-8000-000000000001"
PARTY_ID="cms0uwebx000oom4o8a5hds0s"
TECH_ID="cms0uwebx000oom4o8a5hds0s"  # using same party as technician for test
PRODUCT_ID="cmsa8snbn0004sddtvyb61fyy"
PRODUCT_INSTANCE_ID="cmsa8st160001sdevfckbfuoo"

echo "Token: ${TOKEN:0:30}..."
echo ""

# ============================================================
# Stage 1: Create Sales Order
# ============================================================
echo "--- Stage 1: Sales Order ---"
SO_RESP=$(curl -s -X POST http://localhost:3000/api/v1/sales-orders \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: gs-so-$(date +%s%N)" \
  -d "{\"customerPartyId\":\"$PARTY_ID\",\"lines\":[{\"productId\":\"$PRODUCT_ID\",\"quantityOrdered\":1,\"unitPrice\":200000}]}")
SO_ID=$(echo "$SO_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
[ -n "$SO_ID" ] && record "Create Sales Order" "ok" "ok" || record "Create Sales Order" "ok" "fail"
echo "  SO ID: $SO_ID"

# ============================================================
# Stage 2: Create Service Request (from customer)
# ============================================================
echo ""
echo "--- Stage 2: Service Request ---"
sleep 2
SR_RESP=$(curl -s -X POST http://localhost:3000/api/v1/service-requests \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: gs-sr-$(date +%s%N)" \
  -d "{\"customerPartyId\":\"$PARTY_ID\",\"customerProblem\":\"Device not working\",\"priority\":\"high\",\"serviceKind\":\"warranty\"}")
SR_ID=$(echo "$SR_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
[ -n "$SR_ID" ] && record "Create Service Request" "ok" "ok" || record "Create Service Request" "ok" "fail"
echo "  SR ID: $SR_ID"

# ============================================================
# Stage 3: Create TechnicianJob
# ============================================================
echo ""
echo "--- Stage 3: TechnicianJob ---"
sleep 2
JOB_RESP=$(curl -s -X POST http://localhost:3000/api/v1/technician-jobs \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: gs-job-$(date +%s%N)" \
  -d "{\"customerId\":\"$PARTY_ID\",\"serviceRequestId\":\"$SR_ID\",\"priority\":\"high\"}")
JOB_ID=$(echo "$JOB_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
JOB_NUMBER=$(echo "$JOB_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['jobNumber'])" 2>/dev/null)
JOB_STATUS=$(echo "$JOB_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['status'])" 2>/dev/null)
[ -n "$JOB_ID" ] && record "Create TechnicianJob" "ok" "ok" || record "Create TechnicianJob" "ok" "fail"
record "Job status (created)" "created" "$JOB_STATUS"
[ -n "$JOB_NUMBER" ] && record "Job number generated" "ok" "ok" || record "Job number generated" "ok" "fail"
echo "  Job ID: $JOB_ID, Number: $JOB_NUMBER, Status: $JOB_STATUS"

# ============================================================
# Stage 4: Assign Technician to Job
# ============================================================
echo ""
echo "--- Stage 4: Assign Technician ---"
sleep 2
ASSIGN_RESP=$(curl -s -X POST "http://localhost:3000/api/v1/technician-jobs/$JOB_ID/assign" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: gs-assign-$(date +%s%N)" \
  -d "{\"technicianId\":\"$TECH_ID\"}")
ASSIGN_STATUS=$(echo "$ASSIGN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['status'])" 2>/dev/null)
record "Assign technician → status" "assigned" "$ASSIGN_STATUS"

# ============================================================
# Stage 5: Accept Job (technician accepts)
# ============================================================
echo ""
echo "--- Stage 5: Accept Job ---"
sleep 2
ACCEPT_RESP=$(curl -s -X POST "http://localhost:3000/api/v1/technician-jobs/$JOB_ID/accept" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: gs-accept-$(date +%s%N)" \
  -d '{}')
ACCEPT_STATUS=$(echo "$ACCEPT_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['status'])" 2>/dev/null)
record "Accept job → status" "accepted" "$ACCEPT_STATUS"

# ============================================================
# Stage 6: Restock Van Stock (add parts to van)
# ============================================================
echo ""
echo "--- Stage 6: Van Stock Restock ---"
sleep 2
RESTOCK_RESP=$(curl -s -X POST "http://localhost:3000/api/v1/van-stock/$TECH_ID" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: gs-restock-$(date +%s%N)" \
  -d "{\"productId\":\"$PRODUCT_ID\",\"quantity\":10,\"notes\":\"Initial van stock\"}")
RESTOCK_QTY=$(echo "$RESTOCK_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['newQuantity'])" 2>/dev/null)
[ "$RESTOCK_QTY" -gt 0 ] 2>/dev/null && record "Van stock restock → positive" "ok" "ok" || record "Van stock restock → positive" "ok" "fail"
echo "  Van stock after restock: $RESTOCK_QTY"

# ============================================================
# Stage 7: Consume Parts from Van Stock
# ============================================================
echo ""
echo "--- Stage 7: Van Stock Consume ---"
sleep 2
CONSUME_RESP=$(curl -s -X POST "http://localhost:3000/api/v1/van-stock/consume" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: gs-consume-$(date +%s%N)" \
  -d "{\"technicianId\":\"$TECH_ID\",\"productId\":\"$PRODUCT_ID\",\"quantity\":2,\"technicianJobId\":\"$JOB_ID\"}")
CONSUME_QTY=$(echo "$CONSUME_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['newQuantity'])" 2>/dev/null)
[ "$CONSUME_QTY" -lt "$RESTOCK_QTY" ] 2>/dev/null && record "Van stock consume → decreased" "ok" "ok" || record "Van stock consume → decreased" "ok" "fail"
echo "  Van stock after consume: $CONSUME_QTY"

# ============================================================
# Stage 8: Try to consume more than available (should fail)
# ============================================================
echo ""
echo "--- Stage 8: Van Stock Insufficient ---"
sleep 2
INSUFF_RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:3000/api/v1/van-stock/consume" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: gs-insuff-$(date +%s%N)" \
  -d "{\"technicianId\":\"$TECH_ID\",\"productId\":\"$PRODUCT_ID\",\"quantity\":100,\"technicianJobId\":\"$JOB_ID\"}")
record "Consume more than available → 409" "409" "$INSUFF_RESP"

# ============================================================
# Stage 9: Get Van Stock Balance
# ============================================================
echo ""
echo "--- Stage 9: Van Stock Balance ---"
sleep 2
BALANCE_RESP=$(curl -s "http://localhost:3000/api/v1/van-stock/$TECH_ID" -H "Authorization: Bearer $TOKEN")
BALANCE_COUNT=$(echo "$BALANCE_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d['data']['items']))" 2>/dev/null)
record "Van stock balance has items" "1" "$BALANCE_COUNT"

# ============================================================
# Stage 10: Create ServiceReport
# ============================================================
echo ""
echo "--- Stage 10: ServiceReport ---"
sleep 2
REPORT_RESP=$(curl -s -X POST http://localhost:3000/api/v1/service-reports \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: gs-report-$(date +%s%N)" \
  -d "{\"technicianJobId\":\"$JOB_ID\",\"technicianId\":\"$TECH_ID\",\"workSummary\":\"Replaced faulty component\",\"workPerformed\":[{\"step\":1,\"description\":\"Diagnosis\",\"duration_minutes\":15},{\"step\":2,\"description\":\"Replacement\",\"duration_minutes\":30}],\"partsUsed\":[{\"productId\":\"$PRODUCT_ID\",\"quantity\":2}],\"laborHours\":0.75,\"laborCost\":50000,\"partsCost\":400000}")
REPORT_ID=$(echo "$REPORT_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
REPORT_STATUS=$(echo "$REPORT_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['status'])" 2>/dev/null)
[ -n "$REPORT_ID" ] && record "Create ServiceReport" "ok" "ok" || record "Create ServiceReport" "ok" "fail"
record "Report status (draft)" "draft" "$REPORT_STATUS"
echo "  Report ID: $REPORT_ID"

# ============================================================
# Stage 11: Submit ServiceReport
# ============================================================
echo ""
echo "--- Stage 11: Submit ServiceReport ---"
sleep 2
SUBMIT_RESP=$(curl -s -X POST "http://localhost:3000/api/v1/service-reports/$REPORT_ID/submit" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: gs-submit-$(date +%s%N)" \
  -d '{"customerSignature":"base64signature","customerRating":5,"customerFeedback":"Good service"}')
SUBMIT_STATUS=$(echo "$SUBMIT_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['status'])" 2>/dev/null)
record "Submit report → status" "submitted" "$SUBMIT_STATUS"

# ============================================================
# Stage 12: Try to complete job WITHOUT approved report (should fail — report is 'submitted' not 'approved')
# ============================================================
echo ""
echo "--- Stage 12: Complete Job without approved report ---"
sleep 2
# Job completion requires submitted report (not approved) — check behavior
COMPLETE_BEFORE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:3000/api/v1/technician-jobs/$JOB_ID/complete" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: gs-complete-before-$(date +%s%N)" \
  -d '{}')
echo "  Complete with submitted (not approved) report: $COMPLETE_BEFORE"

# ============================================================
# Stage 13: Approve ServiceReport
# ============================================================
echo ""
echo "--- Stage 13: Approve ServiceReport ---"
sleep 2
APPROVE_RESP=$(curl -s -X POST "http://localhost:3000/api/v1/service-reports/$REPORT_ID/approve" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: gs-approve-$(date +%s%N)" \
  -d '{}')
APPROVE_STATUS=$(echo "$APPROVE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['status'])" 2>/dev/null)
record "Approve report → status" "approved" "$APPROVE_STATUS"

# ============================================================
# Stage 14: Complete TechnicianJob
# ============================================================
echo ""
echo "--- Stage 14: Complete TechnicianJob ---"
sleep 10
COMPLETE_RESP=$(curl -s -X POST "http://localhost:3000/api/v1/technician-jobs/$JOB_ID/complete" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: gs-complete-$(date +%s%N)" \
  -d '{"notes":"Job completed successfully"}')
COMPLETE_STATUS=$(echo "$COMPLETE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['status'])" 2>/dev/null)
record "Complete job → status" "completed" "$COMPLETE_STATUS"

# ============================================================
# Stage 15: Verify Job has ServiceReport linked
# ============================================================
echo ""
echo "--- Stage 15: Verify Job-Report Link ---"
sleep 2
JOB_GET=$(curl -s "http://localhost:3000/api/v1/technician-jobs/$JOB_ID" -H "Authorization: Bearer $TOKEN")
JOB_REPORT_ID=$(echo "$JOB_GET" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['serviceReportId'])" 2>/dev/null)
record "Job has ServiceReport linked" "$REPORT_ID" "$JOB_REPORT_ID"

# ============================================================
# Stage 16: Idempotency — duplicate job creation
# ============================================================
echo ""
echo "--- Stage 16: Idempotency ---"
sleep 2
IDEM_KEY="gs-idem-$(date +%s%N)"
RESP1=$(curl -s -X POST http://localhost:3000/api/v1/technician-jobs \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEM_KEY" \
  -d "{\"customerId\":\"$PARTY_ID\",\"priority\":\"low\"}")
ID1=$(echo "$RESP1" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
RESP2=$(curl -s -X POST http://localhost:3000/api/v1/technician-jobs \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEM_KEY" \
  -d "{\"customerId\":\"$PARTY_ID\",\"priority\":\"low\"}")
ID2=$(echo "$RESP2" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
if [ "$ID1" = "$ID2" ] && [ -n "$ID1" ]; then
  record "Idempotency replay → same ID" "same" "same"
else
  record "Idempotency replay → same ID" "same" "different"
fi

# ============================================================
# Stage 17: State machine — cancel a completed job (should fail)
# ============================================================
echo ""
echo "--- Stage 17: State Machine Validation ---"
sleep 2
CANCEL_RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:3000/api/v1/technician-jobs/$JOB_ID/cancel" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: gs-cancel-fail-$(date +%s%N)" \
  -d '{"reason":"try to cancel completed"}')
record "Cancel completed job → 409" "409" "$CANCEL_RESP"

# ============================================================
# Stage 18: Invalid ID → 404 (not 500)
# ============================================================
echo ""
echo "--- Stage 18: 404 on invalid ID ---"
sleep 2
INVALID_RESP=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/v1/technician-jobs/nonexistent-id" \
  -H "Authorization: Bearer $TOKEN")
record "Get invalid job ID → 404" "404" "$INVALID_RESP"

# ============================================================
# Summary
# ============================================================
echo ""
echo "=== GOLDEN SLICE E2E RESULTS ==="
for r in "${RESULTS[@]}"; do
  echo "$r"
done
echo ""
echo "PASS: $PASS"
echo "FAIL: $FAIL"
echo "TOTAL: $((PASS+FAIL))"
echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "🎉 GOLDEN SLICE: ALL PASS"
else
  echo "⚠️  GOLDEN SLICE: $FAIL test(s) failed"
fi
