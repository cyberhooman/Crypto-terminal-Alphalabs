# Deployment Verification Checklist

## ✅ After PostgreSQL Redeployment

You redeployed PostgreSQL which is the **correct solution** to clear all old alerts. The database is now fresh and clean.

---

## 🔍 Verification Steps

### 1. Check Backend Logs (Railway)

Go to Railway → Backend Service → Logs

**Expected output:**
```
🚀 Starting Crypto Terminal Backend...
✅ Server running on port 3001
🔌 Attempting database connection (1/5)...
✅ Connected to PostgreSQL
Database connection test successful
Initializing database schema...
✅ Database schema initialized successfully
🤖 Starting confluence signal detection (V2 percentile-based system)...
```

**If you see errors:**
- "Connection failed" → Check DATABASE_URL environment variable
- "Schema initialization failed" → PostgreSQL service may not be ready yet

---

### 2. Check Frontend Console (Browser)

Open your app → Press **F12** → Console tab

**Expected output:**
```
📥 Loaded 0 historical alerts from backend
ℹ️  WebSocket disabled. Using HTTP polling for real-time updates.
```

**Good signs:**
- ✅ "Loaded 0 historical alerts" (not 50)
- ✅ No WebSocket connection errors
- ✅ No "Failed to fetch alerts" errors

**Bad signs:**
- ❌ "Loaded 50 historical alerts" → Database wasn't cleared
- ❌ "Failed to fetch alerts" → Backend not connected
- ❌ WebSocket errors → Should be disabled

---

### 3. Check Alerts Panel (UI)

Click **"Alerts"** in sidebar

**Expected:**
- ✅ Panel opens instantly (no lag)
- ✅ Shows "No Active Alerts" message
- ✅ "Clear All" button is visible but grayed out (no alerts to clear)
- ✅ Can scroll smoothly

**If you see old alerts:**
- Refresh with **Ctrl+Shift+R** (hard refresh)
- Clear browser cache
- Open in incognito window

---

### 4. Test V2 Signal Detection (24-48 Hours)

Wait 24-48 hours and check:

**Expected:**
- ✅ **0-2 new alerts** (system is learning percentiles)
- ✅ If any alerts appear, they should be **HIGH or CRITICAL** severity
- ✅ Score should be **75+**
- ✅ Only appears for **top 20 liquid pairs** (BTC, ETH, SOL, etc.)

**Good alert example:**
```
🚀 SHORT SQUEEZE SETUP - BTCUSDT
Score: 85/100
Severity: HIGH

🔥 Funding at 8th percentile: -0.0124%
📈 OI +7.3% in 8hr (shorts piling in)
💪 BULLISH DIVERGENCE: Price -2.1% but VDelta +8.4%
```

**Bad alert example (shouldn't appear):**
```
Alert with score: 65
Low volume pair (< $50M)
Every 2 hours for same symbol
```

---

## 📊 V2 System Timeline

### **Days 1-7: Learning Phase**
- Backend collects 30-day rolling percentile data
- Very few alerts (0-2 per day max)
- System learns what's "extreme" for each pair
- **This is normal!** Don't worry if you see almost no alerts

### **Days 7-14: Ramp Up**
- Percentile calculations become more accurate
- 1-3 alerts per day
- Still building confidence in thresholds

### **Day 14+: Full Production**
- **3-7 high-quality alerts per week**
- Score 75-100 only
- Expected 65-75% win rate
- Only top 20 liquid pairs

---

## 🐛 Troubleshooting

### Issue: "Loaded 50 historical alerts" still appears

**Cause:** Browser cache or database wasn't fully cleared

**Fix:**
1. Hard refresh: **Ctrl+Shift+R**
2. Clear browser cache completely
3. Open in incognito mode
4. Check Railway → PostgreSQL → Query tab:
   ```sql
   SELECT COUNT(*) FROM confluence_alerts;
   ```
   Should return `0`. If not, run:
   ```sql
   DELETE FROM confluence_alerts;
   ```

---

### Issue: No alerts after 48 hours

**Expected behavior!** V2 system is very strict.

**Check:**
- Is market volatile? Quiet markets = no signals
- Check backend logs for "Detected X signals" messages
- Verify percentile history is being collected

**If you want more alerts** (not recommended):
- Lower `SCORE_THRESHOLD` from 75 to 70 in [confluenceDetectorV2.ts](backend/src/lib/alerts/confluenceDetectorV2.ts#L35)
- Increase `TOP_N_PAIRS` from 20 to 30
- Reduce `MIN_VOLUME` from $50M to $30M

---

### Issue: Too many alerts (>10 per day)

**Unexpected behavior!** V2 should be strict.

**Fix:**
1. Verify V2 detector is being used:
   ```typescript
   // In backend/src/services/signalDetector.ts
   import { ConfluenceDetectorV2 } from '../lib/alerts/confluenceDetectorV2';
   ```

2. Increase strictness in [confluenceDetectorV2.ts](backend/src/lib/alerts/confluenceDetectorV2.ts):
   - Change `SCORE_THRESHOLD` from 75 to 80-85
   - Change `MIN_VOLUME` from $50M to $100M
   - Change `TOP_N_PAIRS` from 20 to 10

---

### Issue: Backend not starting

**Check Railway logs for errors:**

**Error:** "Connection timeout"
- PostgreSQL service not ready yet
- Wait 2-3 minutes after redeployment
- Backend has exponential backoff retry logic

**Error:** "DATABASE_URL not found"
- Go to Railway → Backend → Variables
- Verify `DATABASE_URL` is set
- Should be: `postgresql://...`

**Error:** "Port 3001 already in use"
- Railway automatically sets `PORT` env var
- Backend uses `process.env.PORT || 3001`
- This should auto-resolve

---

## ✅ Success Criteria

Your deployment is successful if:

1. ✅ Backend logs show "Database schema initialized successfully"
2. ✅ Frontend console shows "Loaded 0 historical alerts from backend"
3. ✅ Alerts panel opens instantly with no lag
4. ✅ "No Active Alerts" message displayed
5. ✅ No WebSocket connection errors
6. ✅ After 24-48 hours: 0-2 new high-quality alerts only

---

## 📂 Related Documentation

- [CLEAR_ALERTS_GUIDE.md](CLEAR_ALERTS_GUIDE.md) - Why "Clear All" button doesn't work permanently
- [HIGH_WINRATE_SYSTEM.md](HIGH_WINRATE_SYSTEM.md) - V2 system design and configuration
- [DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md) - Complete deployment overview
- [PERFORMANCE_FIXES.md](PERFORMANCE_FIXES.md) - Performance optimizations applied

---

## 🚀 Next Steps

1. ✅ **Verify backend logs** - Check schema initialization
2. ✅ **Verify frontend console** - Check for "0 historical alerts"
3. ✅ **Test alerts panel** - Should open instantly with no lag
4. ⏳ **Wait 7 days** - Let V2 system build percentile history
5. ⏳ **Monitor alert quality** - Track score, severity, win rate

**You're all set!** The V2 system is now running and will start generating high-quality signals after the 7-day learning period. 🎯
