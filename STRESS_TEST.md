# Stress Test & 24/7 Verification Guide

## 🎯 What We're Testing

1. **Backend runs 24/7** - Even when no one visits the site
2. **Signals are detected** - Continuously monitoring market
3. **Signals are stored** - PostgreSQL database persistence
4. **Frontend retrieves signals** - Historical data accessible

---

## 🧪 Test Scenarios

### Test 1: Backend Runs Without Frontend

**Purpose:** Verify backend continues calculating even when no one is using the site

**Steps:**
```bash
# 1. Deploy backend to Railway
# 2. Don't open frontend for 24 hours
# 3. Check if data is still updating

# After 24 hours, check backend:
curl https://your-backend.railway.app/api/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-12-05T...",  # Recent timestamp
  "marketData": {
    "totalSymbols": 200,
    "lastUpdate": 1733450000,      # Recent timestamp
    "isRunning": true
  }
}

# Check market data is fresh:
curl https://your-backend.railway.app/api/market/data | jq '.stats.lastUpdate'

# Should be within last 10 seconds!
```

**Expected Result:** ✅ Backend is running and updating data continuously

---

### Test 2: Signals Are Being Detected

**Purpose:** Verify signal detection runs 24/7 and stores in database

**Steps:**
```bash
# 1. Close all browser windows (don't use the site)
# 2. Wait 6-12 hours
# 3. Check database for new signals

# Query database directly:
curl https://your-backend.railway.app/api/alerts

# Expected response:
{
  "alerts": [
    {
      "id": "uuid...",
      "symbol": "BTCUSDT",
      "type": "SHORT_SQUEEZE",
      "severity": "HIGH",
      "score": 75,
      "timestamp": 1733450000,
      "signals": ["funding_extreme", "oi_rising", "cvd_bullish"],
      ...
    },
    ...more alerts
  ],
  "count": 15  # Should have multiple alerts from past 6 hours
}
```

**Expected Result:** ✅ Signals detected and stored even when site is closed

---

### Test 3: Frontend Retrieves Historical Signals

**Purpose:** Verify frontend can access signals detected while it was closed

**Steps:**
1. Don't open the site for 12 hours
2. Backend detects and stores signals during this time
3. Open the site for the first time
4. Check if historical signals appear

**Console logs should show:**
```javascript
// Frontend loads
🚀 Connecting to backend (data pre-calculated 24/7)...
⚡ Instant load: 200+ symbols (pre-calculated)

// Historical signals loaded
📡 Fetching alerts from backend...
✅ Loaded 15 historical alerts from past 6 hours

// Signals that occurred while site was closed are displayed!
🚨 CRITICAL: BTCUSDT - SHORT_SQUEEZE (detected 4 hours ago)
🚨 HIGH: ETHUSDT - BULLISH_DIVERGENCE (detected 2 hours ago)
```

**Expected Result:** ✅ All signals detected during downtime are retrieved

---

### Test 4: Database Persistence

**Purpose:** Verify signals persist across backend restarts

**Steps:**
```bash
# 1. Check current signals
curl https://your-backend.railway.app/api/alerts > before.json

# 2. Restart backend on Railway
# (Go to Railway → Service → Settings → Restart)

# 3. Wait for backend to restart (~30 seconds)

# 4. Check signals again
curl https://your-backend.railway.app/api/alerts > after.json

# 5. Compare
diff before.json after.json

# Expected: Same signals (no data loss)
```

**Expected Result:** ✅ Signals persist across restarts (stored in PostgreSQL)

---

### Test 5: Signal Detection Frequency

**Purpose:** Measure how often signals are detected

**Steps:**
```bash
# Query alerts from past 24 hours
curl "https://your-backend.railway.app/api/alerts?limit=100" | jq '.count'

# Expected based on V2 system:
# - Day 1-3: 0-1 signals total
# - Day 4-7: 1-3 signals total
# - Day 7+: 3-7 signals per week
```

**Formula:**
```
Signal Rate = Total Alerts / Hours
Expected: 0.5 - 1.5 signals per day (after 7 days)
```

**Expected Result:** ✅ Signal detection matches expected frequency

---

### Test 6: Load Test (Multiple Users)

**Purpose:** Verify backend handles multiple concurrent frontend requests

**Script:**
```bash
# Create load_test.sh
#!/bin/bash

# Simulate 10 concurrent users loading the site
for i in {1..10}; do
  (
    echo "User $i: Fetching market data..."
    time curl -s https://your-backend.railway.app/api/market/data > /dev/null
  ) &
done

wait
echo "All requests completed"
```

**Run:**
```bash
chmod +x load_test.sh
./load_test.sh
```

**Expected Result:**
- All 10 requests complete successfully
- Response time: <1 second per request
- No 429 (rate limit) or 500 (server error) responses

---

### Test 7: Memory Leak Check

**Purpose:** Verify backend doesn't leak memory over time

**Steps:**
```bash
# Check Railway metrics
# Go to: Railway → Service → Metrics

# Monitor over 24 hours:
# - Memory usage should be stable (~200-300 MB)
# - CPU usage should be stable (~5-10%)
# - No continuous growth

# If memory grows continuously = memory leak ❌
# If memory stays stable = no leak ✅
```

**Expected Result:** ✅ Memory usage stable over 24+ hours

---

## 📊 Automated Stress Test Script

Create this script to run comprehensive tests:

```bash
#!/bin/bash
# stress_test.sh

BACKEND_URL="https://your-backend.railway.app"
API_URL="$BACKEND_URL/api"

echo "🧪 Starting Stress Test..."
echo "Backend: $BACKEND_URL"
echo "================================"

# Test 1: Health Check
echo ""
echo "Test 1: Health Check"
HEALTH=$(curl -s "$API_URL/health")
STATUS=$(echo $HEALTH | jq -r '.status')
RUNNING=$(echo $HEALTH | jq -r '.marketData.isRunning')

if [ "$STATUS" = "ok" ] && [ "$RUNNING" = "true" ]; then
  echo "✅ Backend is healthy and running"
else
  echo "❌ Backend health check failed"
  echo $HEALTH
  exit 1
fi

# Test 2: Market Data Freshness
echo ""
echo "Test 2: Market Data Freshness"
LAST_UPDATE=$(curl -s "$API_URL/market/stats" | jq -r '.lastUpdate')
NOW=$(date +%s)000  # Convert to milliseconds
AGE=$((($NOW - $LAST_UPDATE) / 1000))  # Age in seconds

if [ $AGE -lt 60 ]; then
  echo "✅ Data is fresh (updated ${AGE}s ago)"
else
  echo "⚠️  Data is stale (updated ${AGE}s ago)"
fi

# Test 3: Signal Detection
echo ""
echo "Test 3: Signal Detection"
ALERT_COUNT=$(curl -s "$API_URL/alerts?limit=100" | jq '.count')
echo "Found $ALERT_COUNT alerts in database"

if [ $ALERT_COUNT -gt 0 ]; then
  echo "✅ Signals are being detected and stored"

  # Show most recent alert
  RECENT=$(curl -s "$API_URL/alerts?limit=1" | jq -r '.alerts[0]')
  SYMBOL=$(echo $RECENT | jq -r '.symbol')
  TYPE=$(echo $RECENT | jq -r '.type')
  SEVERITY=$(echo $RECENT | jq -r '.severity')
  TIMESTAMP=$(echo $RECENT | jq -r '.timestamp')

  echo "Most recent: $SEVERITY - $SYMBOL ($TYPE) at $TIMESTAMP"
else
  echo "⚠️  No signals detected yet (normal in first 7 days)"
fi

# Test 4: Load Test
echo ""
echo "Test 4: Load Test (10 concurrent requests)"
START=$(date +%s)

for i in {1..10}; do
  curl -s "$API_URL/market/data" > /dev/null &
done

wait
END=$(date +%s)
DURATION=$((END - START))

if [ $DURATION -lt 5 ]; then
  echo "✅ Handled 10 concurrent requests in ${DURATION}s"
else
  echo "⚠️  Slow response: ${DURATION}s for 10 requests"
fi

# Test 5: Data Completeness
echo ""
echo "Test 5: Data Completeness"
RESPONSE=$(curl -s "$API_URL/market/data")
TOTAL_SYMBOLS=$(echo $RESPONSE | jq '.data | length')
WITH_CVD=$(echo $RESPONSE | jq '[.data[] | select(.cvd != 0)] | length')
WITH_OI=$(echo $RESPONSE | jq '[.data[] | select(.openInterest != 0)] | length')

echo "Total symbols: $TOTAL_SYMBOLS"
echo "With CVD: $WITH_CVD"
echo "With OI: $WITH_OI"

CVD_PERCENT=$((WITH_CVD * 100 / TOTAL_SYMBOLS))
OI_PERCENT=$((WITH_OI * 100 / TOTAL_SYMBOLS))

if [ $CVD_PERCENT -gt 90 ] && [ $OI_PERCENT -gt 90 ]; then
  echo "✅ Data completeness: CVD ${CVD_PERCENT}%, OI ${OI_PERCENT}%"
else
  echo "⚠️  Incomplete data: CVD ${CVD_PERCENT}%, OI ${OI_PERCENT}%"
fi

echo ""
echo "================================"
echo "✅ Stress Test Complete!"
```

**Usage:**
```bash
chmod +x stress_test.sh
./stress_test.sh
```

---

## 📈 Long-Term Monitoring

### Daily Check (Automated):

Create a cron job to monitor backend:

```bash
# Add to crontab (runs every hour)
0 * * * * /path/to/stress_test.sh >> /path/to/stress_test.log 2>&1
```

### Weekly Report:

```bash
# weekly_report.sh

#!/bin/bash

BACKEND_URL="https://your-backend.railway.app/api"

echo "📊 Weekly Backend Report"
echo "========================"

# Total signals detected this week
WEEK_AGO=$(($(date +%s) - 604800))000  # 7 days in ms
WEEKLY_ALERTS=$(curl -s "$BACKEND_URL/alerts?limit=1000" | jq "[.alerts[] | select(.timestamp > $WEEK_AGO)] | length")

echo "Signals detected this week: $WEEKLY_ALERTS"

# Expected: 3-7 signals per week (after initial 7 days)
if [ $WEEKLY_ALERTS -ge 3 ]; then
  echo "✅ Signal detection working normally"
else
  echo "⚠️  Low signal count (may be normal if first week)"
fi

# Uptime
UPTIME=$(curl -s "$BACKEND_URL/health" | jq -r '.marketData.isRunning')
if [ "$UPTIME" = "true" ]; then
  echo "✅ Backend has been running continuously"
else
  echo "❌ Backend downtime detected"
fi
```

---

## 🚨 Alert Triggers

Set up monitoring alerts for:

### Critical Issues:
- ❌ Backend health check fails
- ❌ Data not updated for >5 minutes
- ❌ Memory usage >500 MB
- ❌ No signals detected for >7 days (after initial learning)

### Warning Issues:
- ⚠️  Response time >2 seconds
- ⚠️  Data freshness >60 seconds
- ⚠️  Signal detection <1 per week (after day 7)

---

## 📊 Expected Results Summary

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| Backend Uptime | 100% | >99% | <95% |
| Data Freshness | <10s | <60s | >300s |
| Response Time | <1s | <2s | >5s |
| Memory Usage | ~200MB | <400MB | >500MB |
| CPU Usage | ~5% | <20% | >50% |
| Signals/Week | 3-7 | 1-10 | 0 or >20 |
| Data Complete | 100% | >95% | <90% |

---

## 🔍 Debugging Failed Tests

### If Backend Stops Running:

```bash
# Check Railway logs
railway logs --service=backend

# Look for:
# - "❌ Failed to..." errors
# - Memory exhaustion
# - API rate limits
# - Database connection errors
```

### If Signals Not Detected:

```bash
# Check signal detection logs
curl https://your-backend.railway.app/api/health

# Check if percentile data is ready (needs 7 days)
# V2 system requires historical data

# Manually trigger detection (if endpoint exists):
curl -X POST https://your-backend.railway.app/api/signals/detect
```

### If Data Incomplete:

```bash
# Check which symbols are missing data
curl https://your-backend.railway.app/api/market/data | \
  jq '[.data[] | select(.cvd == 0 or .openInterest == 0) | .symbol]'

# Common causes:
# - Binance API rate limits
# - Some symbols delisted
# - Backend just started (still loading)
```

---

## ✅ Success Criteria

Your system is working correctly if:

1. ✅ Backend health check returns "ok" 24/7
2. ✅ Data updates every 10 seconds
3. ✅ Signals detected and stored (3-7 per week after day 7)
4. ✅ Frontend loads data in <2 seconds
5. ✅ All 200+ symbols have complete data
6. ✅ Memory usage stable (<400 MB)
7. ✅ No errors in Railway logs

---

## 🎓 Understanding the Results

### Normal Behavior:

**First 7 Days:**
- Low signal count (0-3 total) = NORMAL
- System is building percentile history
- Wait for day 7+ for regular signals

**After 7 Days:**
- 3-7 signals per week = NORMAL
- Backend runs continuously = WORKING
- Data always fresh = WORKING

### Abnormal Behavior:

- No signals after 14 days = PROBLEM
- Backend stops updating = PROBLEM
- Memory keeps growing = MEMORY LEAK
- Data stale (>5 min) = PROBLEM

---

## 🚀 Final Verification

**Run this one-liner to verify everything:**

```bash
curl -s https://your-backend.railway.app/api/health && \
echo "✅ Backend is running 24/7!" || \
echo "❌ Backend is down!"
```

**Your backend should ALWAYS respond, even if:**
- Frontend is closed
- No one is using the site
- Browser windows are all closed
- Computer is off

**That's the power of backend-first architecture!** 🎉
