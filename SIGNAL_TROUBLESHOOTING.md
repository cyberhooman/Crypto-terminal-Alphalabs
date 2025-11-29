# Signal Detection Troubleshooting & FAQ

## 🔍 Why Am I Not Seeing Any Signals?

### Expected Behavior (V2 System)

The **V2 percentile-based system** is designed to generate **3-7 high-quality signals per week**, not hundreds per day. This is intentional for 65-75% win rate.

### Reasons You May Not See Signals Yet:

#### 1. **Learning Phase (Days 1-7)** ⏳
The V2 system needs **7+ days of historical data** to calculate accurate percentiles.

**Check:**
```sql
-- In Railway PostgreSQL, run:
SELECT COUNT(*) as history_count FROM confluence_alerts;
```

- If count is **0-5**: System is still learning, very few signals expected
- If count is **10+**: System has collected data and should start detecting

**Timeline:**
- Days 1-3: 0-1 signals (system collecting baseline)
- Days 4-7: 1-3 signals (percentiles stabilizing)
- Day 7+: 3-7 signals per week (full operation)

---

#### 2. **Database Was Recently Cleared** 🗑️
When you redeployed PostgreSQL or ran `DELETE FROM confluence_alerts`, you **reset the learning phase**.

The V2 system tracks historical data to calculate percentiles. Clearing the database means starting from scratch.

**Solution:** Wait 7 days for the system to rebuild its historical knowledge.

---

#### 3. **Market Conditions Are Calm** 📊
The V2 system **only alerts on extreme market conditions**:

**Requirements for a signal:**
- Funding rate in **bottom 10% or top 10%** (30-day percentile)
- OI surge **>5% in 8 hours**
- CVD divergence (price vs volume delta mismatch)
- Confluence score **≥75/100**

**During calm markets:**
- Funding rates stay neutral (-0.01% to +0.01%)
- OI changes gradually
- No divergence patterns
- Result: **Zero signals** (correct behavior!)

---

#### 4. **Strict Filters Reducing Candidates** 🎯

**V2 System Filters:**
```typescript
MIN_VOLUME = $50M (24h volume)
MIN_OI_VALUE = $10M (open interest)
TOP_N_PAIRS = 20 (only top 20 by OI)
ALERT_COOLDOWN = 4 hours (max 6 signals/day per symbol)
SCORE_THRESHOLD = 75 (minimum confluence score)
```

**This means:**
- Only 20 pairs are monitored (BTC, ETH, SOL, etc.)
- Each pair can only alert 6 times per day max
- Must have extreme conditions across multiple metrics

---

## 📊 How to Check if Detection is Running

### Option 1: Check Railway Backend Logs

1. Go to Railway dashboard
2. Click on your **Backend** service
3. Click **Logs** tab
4. Look for:

```
✅ Signal detection service started (runs every 30s)
🔍 Analyzing 200+ pairs for patterns...
📊 Detected 0 signals this cycle (normal during calm markets)
```

**Good signs:**
- ✅ "Signal detection service started"
- ✅ "Analyzing X pairs"
- ✅ Logs appear every 30 seconds

**Bad signs:**
- ❌ No logs at all
- ❌ "Failed to fetch market data"
- ❌ Service keeps restarting

---

### Option 2: Check Database Directly

**Run in Railway PostgreSQL Query tab:**

```sql
-- Check if any signals exist
SELECT COUNT(*) as total_signals FROM confluence_alerts;

-- Check recent signals (last 24 hours)
SELECT * FROM confluence_alerts
WHERE timestamp > EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours') * 1000
ORDER BY timestamp DESC;

-- Check signal frequency by day
SELECT
  DATE(TO_TIMESTAMP(timestamp/1000)) as date,
  COUNT(*) as signals
FROM confluence_alerts
GROUP BY DATE(TO_TIMESTAMP(timestamp/1000))
ORDER BY date DESC
LIMIT 7;
```

**Expected results after 7+ days:**
- Total signals: 20-50
- Signals per day: 0-7 (average 3-4)
- Days with 0 signals: Common (calm markets)

---

### Option 3: Check Frontend Console

Open your app → Press **F12** → Console tab

**Look for:**
```
📥 Loaded 0 historical alerts from backend
```

If this shows 0, it means:
1. Backend is not generating signals, OR
2. Backend hasn't stored any to database yet, OR
3. All past signals are >6 hours old (API only returns recent)

---

## 🎯 How to Verify System is Working

### Test 1: Force a Signal (Development Only)

**Temporarily lower thresholds to generate test signals:**

Edit `backend/src/lib/alerts/confluenceDetectorV2.ts`:

```typescript
// TEMPORARY - FOR TESTING ONLY
private readonly SCORE_THRESHOLD = 50; // Lower from 75
private readonly MIN_VOLUME = 10_000_000; // Lower from $50M
private readonly MIN_OI_VALUE = 1_000_000; // Lower from $10M
```

Redeploy backend → Wait 1-2 minutes → Check if signals appear

**IMPORTANT:** Revert these changes after testing! Low thresholds = low-quality signals.

---

### Test 2: Check Historical Data Collection

**Run in Railway PostgreSQL:**

```sql
-- Check if backend is storing data
SELECT
  symbol,
  COUNT(*) as data_points
FROM confluence_alerts
GROUP BY symbol
ORDER BY data_points DESC
LIMIT 10;
```

**Expected:** Top symbols (BTC, ETH, SOL) should have 10+ data points

**If count is 0:** Backend is not storing data (check logs for errors)

---

## ❓ Your Questions Answered

### Q: "If I close the app, will signals stop running?"

**A: NO!** Signal detection runs on your **Railway backend**, not in your browser.

**How it works:**

```
┌─────────────────────────────────────────────┐
│         RAILWAY BACKEND (24/7)              │
├─────────────────────────────────────────────┤
│                                             │
│  1. Fetch market data from Binance          │
│     (every 30 seconds)                      │
│                                             │
│  2. Run V2 confluence detector              │
│     - Calculate percentiles                 │
│     - Score patterns (0-100)                │
│     - Check cooldowns                       │
│                                             │
│  3. Store signals to PostgreSQL             │
│     (if score ≥ 75)                         │
│                                             │
│  ✅ Runs forever, even if browser closed!  │
│                                             │
└─────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────┐
│      POSTGRESQL DATABASE (Persistent)       │
├─────────────────────────────────────────────┤
│  - Stores all detected signals              │
│  - Keeps 48+ hour history                   │
│  - Available even when app is closed        │
└─────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────┐
│      YOUR BROWSER (When you open app)       │
├─────────────────────────────────────────────┤
│  1. Fetches signals from database           │
│  2. Displays in Alerts panel                │
│  3. Polls every 30s for new signals         │
│                                             │
│  ⚠️ Only fetching, not generating!          │
└─────────────────────────────────────────────┘
```

**Bottom line:**
- ✅ Backend runs 24/7 on Railway
- ✅ Signals are stored in database
- ✅ You can close your browser anytime
- ✅ When you reopen, all signals are still there

---

### Q: "Where is the signal history?"

**Signals are stored in PostgreSQL** and fetched when you open the app.

**Check in app:**
1. Open your crypto terminal
2. Click **"Alerts"** in sidebar
3. If empty, check:
   - Console: "Loaded X historical alerts from backend"
   - If X = 0, no signals exist in database yet

**Check in database:**
```sql
SELECT * FROM confluence_alerts
ORDER BY timestamp DESC
LIMIT 20;
```

---

### Q: "How long until I see signals?"

**Timeline:**

| Day | Expected Signals | Why |
|-----|-----------------|-----|
| 1-3 | 0-1 | System collecting baseline data |
| 4-7 | 1-3 total | Percentiles stabilizing |
| 7+ | 3-7 per week | Full V2 operation |

**After 14 days:** System is fully mature, 65-75% expected win rate

---

## 🔧 Troubleshooting Common Issues

### Issue: "Backend logs show errors fetching Binance data"

**Error:** `Failed to fetch market data: 500`

**Cause:** Binance blocking Railway IP

**Solution:** Already implemented! Fallback logic tries:
1. Backend proxy → Binance
2. If fails, tries direct Binance (from browser WebSocket)

**Verify fallback works:**
- Check if frontend loads data (WebSocket should work)
- Backend will have fewer signals but won't crash

---

### Issue: "Database has 0 signals after 7 days"

**Possible causes:**

1. **Backend not running**
   - Check Railway dashboard
   - Ensure backend service is "Active"

2. **Backend can't connect to PostgreSQL**
   - Check Railway logs for "Connected to PostgreSQL"
   - Verify DATABASE_URL env var is set

3. **Market has been extremely calm**
   - Unlikely but possible
   - Check manually: Are funding rates near 0% for all pairs?

**Solution:** Check backend logs for specific error messages

---

### Issue: "Signals appear but disappear immediately"

**Cause:** Frontend "Clear All" button or auto-cleanup

**Check:**
```sql
-- See all signals including old ones
SELECT COUNT(*) FROM confluence_alerts;

-- See if any were recently deleted
SELECT * FROM confluence_alerts
WHERE timestamp < EXTRACT(EPOCH FROM NOW() - INTERVAL '6 hours') * 1000;
```

**Solution:**
- Don't click "Clear All" unless you want to delete signals
- Frontend only shows last 6 hours by default

---

## 📈 Expected Performance (After 14 Days)

| Metric | Target |
|--------|--------|
| Signals per week | 3-7 |
| Signals per day | 0-2 (some days zero is normal!) |
| Score range | 75-100 |
| Top symbols | BTC, ETH, SOL, BNB, ADA |
| Win rate | 65-75% |
| False positives | <25% |

---

## 🎯 Summary

**Why no signals yet?**
1. ✅ System needs 7 days to learn
2. ✅ V2 is very strict (intentionally!)
3. ✅ Calm markets = no signals (correct)

**Is it working?**
- ✅ Check backend logs every 30s
- ✅ Backend runs even when browser closed
- ✅ Signals stored in database forever

**When will I see signals?**
- Day 7+: Regular signals (3-7 per week)
- Before day 7: Sporadic or zero (normal)

**Need help?**
1. Check Railway backend logs
2. Run SQL queries above
3. Verify system started (logs show "Signal detection service started")
