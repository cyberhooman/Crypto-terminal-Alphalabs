# How to Clear Old Alerts (50 Historical Alerts Issue)

## The Problem

The "Clear All" button in the UI only clears **local state**, but:
- Backend has 50 alerts stored in PostgreSQL database
- Frontend polls backend every 30 seconds (line 108 in useAlerts.ts)
- Backend returns those 50 alerts again → they reappear

**You MUST clear the database** to permanently remove them.

---

## Solution: Clear PostgreSQL Database

### Step 1: Access Railway Dashboard

Go to: https://railway.app/dashboard

### Step 2: Find Your PostgreSQL Service

Click on your **PostgreSQL database** (not the backend or frontend service)

### Step 3: Open Query Tab

Click the **"Query"** tab at the top

### Step 4: Run This SQL

**Option A: Delete ALL alerts (recommended for clean start)**
```sql
DELETE FROM confluence_alerts;
```

**Option B: Delete only old alerts (keep last 1 hour)**
```sql
DELETE FROM confluence_alerts
WHERE timestamp < (EXTRACT(EPOCH FROM NOW()) * 1000 - 1 * 60 * 60 * 1000);
```

**Option C: Delete only LOW/MEDIUM severity (keep CRITICAL/HIGH)**
```sql
DELETE FROM confluence_alerts
WHERE severity NOT IN ('CRITICAL', 'HIGH');
```

### Step 5: Verify Deletion

Run this to check how many remain:
```sql
SELECT COUNT(*) as remaining_alerts FROM confluence_alerts;
```

Should show `0` if you used Option A.

### Step 6: Hard Refresh Browser

Press **Ctrl+Shift+R** (Windows/Linux) or **Cmd+Shift+R** (Mac)

---

## Why the "Clear All" Button Doesn't Work

Here's the exact code flow:

1. **User clicks "Clear All"**
   - Calls `clearAlerts()` from useAlerts hook
   - Clears `confluenceAlerts` in Zustand store
   - Alerts disappear from UI ✅

2. **30 seconds later (or on refresh)**
   - `fetchBackendAlerts()` runs (line 105 in useAlerts.ts)
   - Backend API returns 50 alerts from database
   - `setConfluenceAlerts(freshAlerts)` overwrites local state (line 58)
   - All 50 alerts reappear ❌

**Root cause**: Database still has the 50 alerts.

---

## Alternative: Disable Auto-Fetch (Not Recommended)

If you want to keep the database but stop auto-fetching:

**Edit `hooks/useAlerts.ts`:**

```typescript
// Line 103-108: Comment out the auto-fetch
useEffect(() => {
  // Initial fetch
  // fetchBackendAlerts();  // ❌ DISABLED

  // Fetch every 30 seconds
  // const fetchInterval = setInterval(fetchBackendAlerts, 30000);  // ❌ DISABLED

  // Cleanup old alerts every hour
  const cleanupInterval = setInterval(cleanupOldAlerts, 60 * 60 * 1000);

  return () => {
    // clearInterval(fetchInterval);
    clearInterval(cleanupInterval);
  };
}, [fetchBackendAlerts, cleanupOldAlerts]);
```

**But this breaks real-time alerts!** You won't get new alerts from the V2 system.

---

## After Clearing Database

### What Happens Next:

**Days 1-7**: V2 system collects percentile data
- Backend detector builds 30-day rolling window
- You may see **0-2 alerts** during this period
- System is learning what's "extreme" for each pair

**Day 7+**: Full V2 detection active
- **3-7 high-quality alerts per week**
- Score 75-100 only
- Top 20 liquid pairs
- 65-75% expected win rate

### Expected Alert Volume:

| Timeframe | Old System | New V2 System |
|-----------|-----------|---------------|
| Per hour | ~6 alerts | 0-1 alerts |
| Per day | 144+ alerts | 0-2 alerts |
| Per week | 1000+ alerts | **3-7 alerts** |
| Quality | ~50% win rate | **65-75% win rate** |

---

## Troubleshooting

### "I cleared the database but alerts still show"

**Cause**: Browser cache

**Fix**:
1. Hard refresh: **Ctrl+Shift+R**
2. Or clear browser cache completely
3. Or open in Incognito/Private window

### "I cleared database and clicked Clear All, but alerts came back"

**Cause**: You're looking at the backend logs, not the database

**Fix**:
1. Make sure you ran SQL on **PostgreSQL** (not backend service)
2. Verify with: `SELECT COUNT(*) FROM confluence_alerts;`
3. Should return `0`

### "Backend logs still show 'Loaded 50 historical alerts'"

**Cause**: Old logs in console

**Fix**:
1. Clear console (trash icon in DevTools)
2. Hard refresh
3. Should now show: `Loaded 0 historical alerts from backend`

### "I don't have Railway access"

**Cause**: Not logged in or wrong account

**Fix**:
1. Check you're logged into correct Railway account
2. Ask team member with database access
3. Or use Railway CLI: `railway run psql -c "DELETE FROM confluence_alerts;"`

---

## Summary

**Quick Steps:**
1. ✅ Go to Railway → PostgreSQL → Query tab
2. ✅ Run: `DELETE FROM confluence_alerts;`
3. ✅ Verify: `SELECT COUNT(*) FROM confluence_alerts;` → should be 0
4. ✅ Hard refresh browser (Ctrl+Shift+R)
5. ✅ Check console: "Loaded 0 historical alerts from backend"

**Expected Result:**
- Alerts panel shows "No Active Alerts"
- Console shows "Loaded 0 historical alerts"
- V2 system starts collecting data for percentile calculations
- After 7 days: 3-7 high-quality alerts per week

---

**Need help?** Check the console logs for errors or ask for support.
