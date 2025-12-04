#!/bin/bash
# Comprehensive Stress Test for Crypto Terminal Backend
# Tests: Health, Data Freshness, Signal Detection, Load Handling, Data Completeness

BACKEND_URL="${BACKEND_URL:-https://crypto-terminal-alphalabs-crypto-data-trading-terminal.up.railway.app}"
API_URL="$BACKEND_URL/api"

echo "🧪 Crypto Terminal Stress Test"
echo "================================"
echo "Backend: $BACKEND_URL"
echo "Time: $(date)"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

PASS=0
FAIL=0
WARN=0

# Test 1: Health Check
echo "Test 1: Backend Health Check"
echo "----------------------------"
HEALTH_RESPONSE=$(curl -s "$API_URL/health" 2>/dev/null)
if [ $? -eq 0 ]; then
  STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.status' 2>/dev/null)
  RUNNING=$(echo "$HEALTH_RESPONSE" | jq -r '.marketData.isRunning' 2>/dev/null)
  TOTAL_SYMBOLS=$(echo "$HEALTH_RESPONSE" | jq -r '.marketData.totalSymbols' 2>/dev/null)

  if [ "$STATUS" = "ok" ] && [ "$RUNNING" = "true" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Backend is healthy and running"
    echo "   Total symbols: $TOTAL_SYMBOLS"
    ((PASS++))
  else
    echo -e "${RED}❌ FAIL${NC} - Backend unhealthy (status: $STATUS, running: $RUNNING)"
    ((FAIL++))
  fi
else
  echo -e "${RED}❌ FAIL${NC} - Cannot connect to backend"
  ((FAIL++))
fi
echo ""

# Test 2: Data Freshness
echo "Test 2: Data Freshness"
echo "----------------------"
STATS_RESPONSE=$(curl -s "$API_URL/market/stats" 2>/dev/null)
if [ $? -eq 0 ]; then
  LAST_UPDATE=$(echo "$STATS_RESPONSE" | jq -r '.lastUpdate' 2>/dev/null)
  NOW=$(date +%s)000
  AGE=$((($NOW - $LAST_UPDATE) / 1000))

  if [ $AGE -lt 60 ]; then
    echo -e "${GREEN}✅ PASS${NC} - Data is fresh (updated ${AGE}s ago)"
    ((PASS++))
  elif [ $AGE -lt 300 ]; then
    echo -e "${YELLOW}⚠️  WARN${NC} - Data is stale (updated ${AGE}s ago)"
    ((WARN++))
  else
    echo -e "${RED}❌ FAIL${NC} - Data is very stale (updated ${AGE}s ago)"
    ((FAIL++))
  fi
else
  echo -e "${RED}❌ FAIL${NC} - Cannot fetch stats"
  ((FAIL++))
fi
echo ""

# Test 3: Signal Detection & Storage
echo "Test 3: Signal Detection & Storage"
echo "-----------------------------------"
ALERTS_RESPONSE=$(curl -s "$API_URL/alerts?limit=100" 2>/dev/null)
if [ $? -eq 0 ]; then
  ALERT_COUNT=$(echo "$ALERTS_RESPONSE" | jq '.alerts | length' 2>/dev/null)

  if [ $ALERT_COUNT -gt 0 ]; then
    echo -e "${GREEN}✅ PASS${NC} - Found $ALERT_COUNT alerts in database"

    # Show most recent alert
    RECENT=$(echo "$ALERTS_RESPONSE" | jq -r '.alerts[0]' 2>/dev/null)
    SYMBOL=$(echo "$RECENT" | jq -r '.symbol' 2>/dev/null)
    TYPE=$(echo "$RECENT" | jq -r '.type' 2>/dev/null)
    SEVERITY=$(echo "$RECENT" | jq -r '.severity' 2>/dev/null)

    echo "   Most recent: $SEVERITY - $SYMBOL ($TYPE)"
    ((PASS++))
  else
    echo -e "${YELLOW}⚠️  WARN${NC} - No signals detected yet (normal in first 7 days)"
    echo "   Note: V2 system needs 7 days to build percentile history"
    ((WARN++))
  fi
else
  echo -e "${RED}❌ FAIL${NC} - Cannot fetch alerts"
  ((FAIL++))
fi
echo ""

# Test 4: Response Time
echo "Test 4: Response Time"
echo "---------------------"
START=$(date +%s%N)
curl -s "$API_URL/market/data" > /dev/null 2>&1
END=$(date +%s%N)
DURATION=$(( ($END - $START) / 1000000 ))  # Convert to milliseconds

if [ $DURATION -lt 1000 ]; then
  echo -e "${GREEN}✅ PASS${NC} - Response time: ${DURATION}ms"
  ((PASS++))
elif [ $DURATION -lt 2000 ]; then
  echo -e "${YELLOW}⚠️  WARN${NC} - Response time: ${DURATION}ms (acceptable but slow)"
  ((WARN++))
else
  echo -e "${RED}❌ FAIL${NC} - Response time: ${DURATION}ms (too slow)"
  ((FAIL++))
fi
echo ""

# Test 5: Load Handling (10 concurrent requests)
echo "Test 5: Load Handling (10 concurrent requests)"
echo "-----------------------------------------------"
START=$(date +%s)
for i in {1..10}; do
  curl -s "$API_URL/market/data" > /dev/null 2>&1 &
done
wait
END=$(date +%s)
LOAD_DURATION=$((END - START))

if [ $LOAD_DURATION -lt 3 ]; then
  echo -e "${GREEN}✅ PASS${NC} - Handled 10 concurrent requests in ${LOAD_DURATION}s"
  ((PASS++))
elif [ $LOAD_DURATION -lt 5 ]; then
  echo -e "${YELLOW}⚠️  WARN${NC} - Handled 10 concurrent requests in ${LOAD_DURATION}s"
  ((WARN++))
else
  echo -e "${RED}❌ FAIL${NC} - Too slow: ${LOAD_DURATION}s for 10 requests"
  ((FAIL++))
fi
echo ""

# Test 6: Data Completeness
echo "Test 6: Data Completeness"
echo "-------------------------"
DATA_RESPONSE=$(curl -s "$API_URL/market/data" 2>/dev/null)
if [ $? -eq 0 ]; then
  TOTAL_SYMBOLS=$(echo "$DATA_RESPONSE" | jq '.data | length' 2>/dev/null)
  WITH_CVD=$(echo "$DATA_RESPONSE" | jq '[.data[] | select(.cvd != 0)] | length' 2>/dev/null)
  WITH_OI=$(echo "$DATA_RESPONSE" | jq '[.data[] | select(.openInterest != 0)] | length' 2>/dev/null)

  if [ $TOTAL_SYMBOLS -gt 0 ]; then
    CVD_PERCENT=$((WITH_CVD * 100 / TOTAL_SYMBOLS))
    OI_PERCENT=$((WITH_OI * 100 / TOTAL_SYMBOLS))

    echo "Total symbols: $TOTAL_SYMBOLS"
    echo "With CVD: $WITH_CVD (${CVD_PERCENT}%)"
    echo "With OI: $WITH_OI (${OI_PERCENT}%)"

    if [ $CVD_PERCENT -gt 95 ] && [ $OI_PERCENT -gt 95 ]; then
      echo -e "${GREEN}✅ PASS${NC} - Data >95% complete"
      ((PASS++))
    elif [ $CVD_PERCENT -gt 80 ] && [ $OI_PERCENT -gt 80 ]; then
      echo -e "${YELLOW}⚠️  WARN${NC} - Data 80-95% complete (may still be loading)"
      ((WARN++))
    else
      echo -e "${RED}❌ FAIL${NC} - Data <80% complete"
      ((FAIL++))
    fi
  else
    echo -e "${RED}❌ FAIL${NC} - No symbols returned"
    ((FAIL++))
  fi
else
  echo -e "${RED}❌ FAIL${NC} - Cannot fetch market data"
  ((FAIL++))
fi
echo ""

# Summary
echo "================================"
echo "Test Summary"
echo "================================"
echo -e "${GREEN}✅ PASSED: $PASS${NC}"
echo -e "${YELLOW}⚠️  WARNINGS: $WARN${NC}"
echo -e "${RED}❌ FAILED: $FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ] && [ $WARN -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed! Backend is running perfectly.${NC}"
  exit 0
elif [ $FAIL -eq 0 ]; then
  echo -e "${YELLOW}⚠️  Some warnings detected but system is functional.${NC}"
  exit 0
else
  echo -e "${RED}❌ Some tests failed. Check backend logs on Railway.${NC}"
  exit 1
fi
