#!/usr/bin/env bash
# F-02 Runtime Test — Audit v4
# Tests each of the 18 broken routes with valid input data.
# Captures HTTP status code for each route.

set -uo pipefail

cd /home/z/my-project

# Re-login to get fresh token (avoid expiry)
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"demo1234"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])")

if [ -z "$TOKEN" ]; then
  echo "FAIL: could not login"
  exit 1
fi

# Fetch existing test data IDs
PARTY_ID=$(curl -s "http://localhost:3000/api/v1/customer/profile" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('id',''))" 2>/dev/null)

# Use a known Party ID from seed
PARTY_ID="cms0uwebx000oom4o8a5hds0s"
WAREHOUSE_ID="cmsa8s14p0000sdag6as7vht4"
PRODUCT_INSTANCE_ID="cmsa8st160001sdevfckbfuoo"

echo "=== F-02 Runtime Test (Audit v4) ==="
echo "Token length: ${#TOKEN}"
echo "Party ID: $PARTY_ID"
echo "Warehouse ID: $WAREHOUSE_ID"
echo "Product Instance ID: $PRODUCT_INSTANCE_ID"
echo ""

# Table header
printf "%-30s | %-8s | %-8s | %s\n" "Endpoint" "Before" "After" "Notes"
printf "%-30s-+-%-8s-+-%-8s-+-%s\n" "------------------------------" "--------" "--------" "-------------------"

declare -A RESULTS

test_route() {
  local route="$1"
  local payload="$2"
  local expected_status="${3:-201}"
  local idem_key="audit-v4-$route-$(date +%s%N | tail -c 8)"

  local status body
  body=$(curl -s -w "\n__HTTP_STATUS__:%{http_code}" \
    -X POST "http://localhost:3000/api/v1/$route" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: $idem_key" \
    -d "$payload")

  status=$(echo "$body" | grep -o '__HTTP_STATUS__:[0-9]*' | cut -d: -f2)
  local response_body
  response_body=$(echo "$body" | sed 's/__HTTP_STATUS__:[0-9]*$//')

  local note=""
  if [ "$status" = "$expected_status" ]; then
    note="PASS"
  elif [ "$status" = "422" ]; then
    note="VALIDATION_FAILED"
  elif [ "$status" = "409" ]; then
    note="CONFLICT (dup)"
  elif [ "$status" = "500" ]; then
    note="FAIL: 500"
  else
    note="UNEXPECTED"
  fi

  printf "%-30s | %-8s | %-8s | %s\n" "/api/v1/$route" "500" "$status" "$note"

  # Save response for debugging
  echo "$response_body" > "/tmp/audit-v4-$route-resp.txt"

  RESULTS["$route"]="$status"
}

# 1. appointments — required: technicianId, customerId, scheduledStartTime, scheduledEndTime
test_route "appointments" "{
  \"technicianId\": \"$PARTY_ID\",
  \"customerId\": \"$PARTY_ID\",
  \"scheduledStartTime\": \"2026-09-01T09:00:00Z\",
  \"scheduledEndTime\": \"2026-09-01T11:00:00Z\",
  \"window\": \"morning\",
  \"notes\": \"Test appointment\"
}"

# 2. complaints — required: customerId, complaintType, subject, description
test_route "complaints" "{
  \"customerId\": \"$PARTY_ID\",
  \"complaintType\": \"service\",
  \"subject\": \"تست شکایت\",
  \"description\": \"شرح شکایت тестی برای Audit v4\",
  \"severity\": \"medium\"
}"

# 3. installations — required: productInstanceId, customerId
test_route "installations" "{
  \"productInstanceId\": \"$PRODUCT_INSTANCE_ID\",
  \"customerId\": \"$PARTY_ID\",
  \"installationType\": \"free\",
  \"notes\": \"Test installation\"
}"

# 4. leads — required: customerName
test_route "leads" "{
  \"customerName\": \"مشتری ره‌گیری تستی\",
  \"phone\": \"09123456789\",
  \"source\": \"walk_in\",
  \"notes\": \"Test lead\"
}"

# 5. purchase-orders — required: supplierPartyId
test_route "purchase-orders" "{
  \"supplierPartyId\": \"$PARTY_ID\",
  \"currencyCode\": \"IRR\",
  \"notes\": \"Test PO\"
}"

# 6. goods-receipts — required: purchaseOrderId, warehouseId
# Get the PO id we just created
PO_ID=$(curl -s "http://localhost:3000/api/v1/purchase-orders?per_page=1" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',[{}])[0].get('id',''))" 2>/dev/null)
test_route "goods-receipts" "{
  \"purchaseOrderId\": \"$PO_ID\",
  \"warehouseId\": \"$WAREHOUSE_ID\",
  \"notes\": \"Test GR\"
}"

# 7. promotions — required: name, value, startDate, endDate
test_route "promotions" "{
  \"name\": \"تخفیف تابستانه\",
  \"type\": \"percentage\",
  \"value\": 15,
  \"startDate\": \"2026-09-01T00:00:00Z\",
  \"endDate\": \"2026-09-30T23:59:59Z\"
}"

# 8. loyalty-accounts — required: partyId
# Use a different party to avoid duplicate
LOYALTY_PARTY_ID="cms0uwec3000som4obbxp5um8"
test_route "loyalty-accounts" "{
  \"partyId\": \"$LOYALTY_PARTY_ID\",
  \"tier\": \"bronze\"
}"

# 9. technician-skills — required: technicianId
test_route "technician-skills" "{
  \"technicianId\": \"$PARTY_ID\",
  \"skillLevel\": \"senior\"
}"

# 10. surveys — required: surveyType, customerId, answers
test_route "surveys" "{
  \"surveyType\": \"post_service\",
  \"customerId\": \"$PARTY_ID\",
  \"answers\": [
    {\"question\": \"How was the service?\", \"answer\": \"Good\"},
    {\"question\": \"Rate 1-5\", \"answer\": 4}
  ],
  \"overallRating\": 4
}"

# 11. survey-templates — required: name, type, questions
test_route "survey-templates" "{
  \"name\": \"قالب نظرسنجی پس از خدمت\",
  \"type\": \"post_service\",
  \"questions\": [
    {\"question\": \"How satisfied are you?\", \"type\": \"rating\"},
    {\"question\": \"Comments?\", \"type\": \"text\"}
  ]
}"

# 12. sla-policies — required: name, responseTimeMinutes, resolutionTimeHours
test_route "sla-policies" "{
  \"name\": \"SLA تستی\",
  \"priority\": \"medium\",
  \"responseTimeMinutes\": 60,
  \"resolutionTimeHours\": 24,
  \"entityType\": \"service_request\"
}"

# 13. coupons — required: promotionId
PROMO_ID=$(curl -s "http://localhost:3000/api/v1/promotions?per_page=1" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',[{}])[0].get('id',''))" 2>/dev/null)
test_route "coupons" "{
  \"promotionId\": \"$PROMO_ID\"
}"

# 14. customer-interactions — required: partyId, subject, notes
test_route "customer-interactions" "{
  \"partyId\": \"$PARTY_ID\",
  \"channel\": \"phone\",
  \"direction\": \"inbound\",
  \"subject\": \"تماس تستی\",
  \"notes\": \"مشتری درباره گارانشی سوال داشت\"
}"

# 15. technician-availability — required: technicianId, date, startTime, endTime
test_route "technician-availability" "{
  \"technicianId\": \"$PARTY_ID\",
  \"date\": \"2026-09-15\",
  \"startTime\": \"08:00\",
  \"endTime\": \"17:00\",
  \"status\": \"available\"
}"

# 16. technician-performance — required: technicianId, period
test_route "technician-performance" "{
  \"technicianId\": \"$PARTY_ID\",
  \"period\": \"1405-06\",
  \"completedJobs\": 15,
  \"avgCompletionTimeHours\": 2.5,
  \"firstTimeFixRate\": 0.85,
  \"customerRating\": 4.2,
  \"slaComplianceRate\": 0.92,
  \"totalRevenue\": 12500000
}"

# 17. sla-trackers — required: entityType, entityId, slaPolicyId, responseDeadline, resolutionDeadline
SLA_POLICY_ID=$(curl -s "http://localhost:3000/api/v1/sla-policies?per_page=1" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',[{}])[0].get('id',''))" 2>/dev/null)
COMPLAINT_ID=$(curl -s "http://localhost:3000/api/v1/complaints?per_page=1" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',[{}])[0].get('id',''))" 2>/dev/null)
test_route "sla-trackers" "{
  \"entityType\": \"complaint\",
  \"entityId\": \"$COMPLAINT_ID\",
  \"slaPolicyId\": \"$SLA_POLICY_ID\",
  \"responseDeadline\": \"2026-09-02T12:00:00Z\",
  \"resolutionDeadline\": \"2026-09-03T18:00:00Z\"
}"

# 18. loyalty-transactions — required: loyaltyAccountId, type, points
LOYALTY_ACCT_ID=$(curl -s "http://localhost:3000/api/v1/loyalty-accounts?per_page=1" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',[{}])[0].get('id',''))" 2>/dev/null)
test_route "loyalty-transactions" "{
  \"loyaltyAccountId\": \"$LOYALTY_ACCT_ID\",
  \"type\": \"earn\",
  \"points\": 100,
  \"description\": \"Test earn\"
}"

echo ""
echo "=== Summary ==="
PASS=0
FAIL=0
for route in "${!RESULTS[@]}"; do
  if [ "${RESULTS[$route]}" = "201" ]; then
    PASS=$((PASS+1))
  else
    FAIL=$((FAIL+1))
  fi
done
echo "PASS: $PASS / 18"
echo "FAIL: $FAIL / 18"
