# Confluence Alert System

## 🎯 **Overview**

The crypto terminal includes an intelligent **Confluence Alert System** that automatically detects high-probability trading setups by analyzing the confluence of multiple market signals:
- **Funding Rates** (position overcrowding)
- **Open Interest Changes** (leverage building/unwinding)
- **CVD Trends** (buy/sell pressure)
- **Price Action** (divergences and patterns)

---

## 🚨 **Alert Types**

### 1. **Short Squeeze Setup** 🟢
**When it triggers:**
- Funding Rate: Deeply negative (shorts overcrowded)
- Open Interest: Rising (new short positions building)
- CVD: Trending up OR diverging bullish (price down, CVD up)
- Confluence Score: 60-100

**What it means:**
Too many shorts, low liquidity for them to exit. A price pump could trigger cascading liquidations upward.

**Example:**
```
Symbol: BTCUSDT
Funding APR: -45% (extremely negative)
OI Change: +8% (rising)
CVD Trend: UP (buyers stepping in)
Price Change: -2% (but CVD rising = accumulation)
→ High probability short squeeze coming
```

---

### 2. **Long Flush Setup** 🔴
**When it triggers:**
- Funding Rate: Extremely positive (longs overcrowded)
- Open Interest: At local highs (maximum exposure)
- CVD: Diverging bearish (price up, CVD flat/down)
- Confluence Score: 60-100

**What it means:**
Too many longs, weak buying pressure despite price rise. A dump could trigger cascading liquidations downward.

**Example:**
```
Symbol: ETHUSDT
Funding APR: +55% (extremely positive)
OI Change: Peak (no new longs)
CVD Trend: DOWN (sellers dominating)
Price Change: +3% (but CVD falling = distribution)
→ High probability long flush coming
```

---

### 3. **Capitulation Bottom** 🟢
**When it triggers:**
- Open Interest: Dropping sharply (-10% or more)
- Funding Rate: Resetting toward neutral (from positive)
- CVD: Rising despite falling price (absorption)
- Price: Falling
- Confluence Score: 70-100

**What it means:**
Mass liquidations happening, weak hands flushed out, strong hands accumulating. Potential reversal bottom.

**Example:**
```
Symbol: SOLUSDT
OI Change: -15% (liquidations)
Funding APR: +10% → +2% (normalizing)
CVD Trend: UP (accumulation in panic)
Price Change: -8% (but CVD up = smart money buying)
→ Potential bottom forming
```

---

### 4. **Capitulation Top** 🔴
**When it triggers:**
- Open Interest: Dropping sharply
- Funding Rate: Resetting toward neutral (from negative)
- CVD: Falling despite rising price (distribution)
- Price: Rising
- Confluence Score: 70-100

**What it means:**
Mass short liquidations, euphoria peak, smart money distributing. Potential reversal top.

---

### 5. **Bullish Divergence** 🟢
**When it triggers:**
- Price: Falling or making lower lows
- CVD: Rising or making higher lows
- Funding: Negative (shorts adding)
- Confluence Score: 50-80

**What it means:**
Price falling but buyers accumulating = potential reversal up.

---

### 6. **Bearish Divergence** 🔴
**When it triggers:**
- Price: Rising or making higher highs
- CVD: Falling or making lower highs
- Funding: Positive (longs adding)
- Confluence Score: 50-80

**What it means:**
Price rising but sellers distributing = potential reversal down.

---

## 📊 **Confluence Scoring System**

Alerts are scored from **0 to 100** based on signal strength:

| Score | Severity | Description |
|-------|----------|-------------|
| 80-100 | CRITICAL 🔴 | Extremely strong confluence, immediate action |
| 65-79 | HIGH 🟠 | Strong confluence, high probability |
| 50-64 | MEDIUM 🟡 | Moderate confluence, watch closely |
| 0-49 | LOW 🔵 | Weak confluence, informational only |

**Scoring Factors:**
- Funding rate magnitude (higher = more points)
- OI change magnitude (bigger moves = more points)
- CVD trend strength (clearer direction = more points)
- Divergence clarity (stronger divergence = more points)
- Time alignment (multiple signals aligning = bonus points)

---

## 🎮 **How to Use**

### **1. View Alerts**
1. Click **"Alerts"** in the sidebar
2. You'll see all active confluence alerts sorted by severity
3. Badge on sidebar shows total alert count

### **2. Alert Card Information**
Each alert shows:
- **Symbol**: Click to open chart (TODO: needs integration)
- **Setup Type**: Icon + name (Short Squeeze, Long Flush, etc.)
- **Severity Badge**: Color-coded (CRITICAL/HIGH/MEDIUM/LOW)
- **Confluence Score**: 0-100 rating
- **Title & Description**: What's happening
- **Signals**: Bullet list of all factors contributing to alert
- **Data Summary**:
  - Funding APR
  - OI Change %
  - CVD Trend
  - Price Change %
- **Timestamp**: When alert was triggered

### **3. Filter Alerts**
Use the filter buttons at the top:
- **ALL**: Show all alerts
- **CRITICAL**: Show only critical alerts
- **HIGH**: Show only high-priority alerts
- **MEDIUM**: Show only medium-priority alerts

### **4. Dismiss Alerts**
Click the **X** button on any alert to dismiss it.

### **5. Sound Notifications**
- Click the speaker icon to toggle sound
- CRITICAL alerts play sound (if enabled)

---

## 🔔 **Browser Notifications**

The system will request notification permission on first load.

**Notifications trigger for:**
- **CRITICAL alerts only** (score 80+)
- Shows symbol, setup type, and description
- Click notification to open terminal (if supported)

**To enable:**
1. Allow notification permission when prompted
2. Or go to browser settings → Site Settings → Notifications → Allow

---

## ⚙️ **Configuration**

### **Enable/Disable Alerts**
Alerts are enabled by default. To disable:
```typescript
// In useMarketStore
confluenceAlertsEnabled: true/false
```

### **Detection Frequency**
Alerts are checked every **30 seconds** automatically.

You can adjust this in [hooks/useAlerts.ts](hooks/useAlerts.ts):
```typescript
const interval = setInterval(detectPatterns, 30000); // 30 seconds
```

### **Alert Thresholds**
Thresholds are defined in [lib/alerts/confluenceDetector.ts](lib/alerts/confluenceDetector.ts):

```typescript
// Example: Short Squeeze
const fundingAPR = (fundingRate * 365 * 3) * 100;
if (fundingAPR < -30) { // Extremely negative
  // Alert logic
}
```

You can customize these thresholds based on market conditions.

---

## 🧠 **Technical Implementation**

### **Architecture**
```
Market Data Stream (Mock/Binance)
    ↓
useMarketStore (Zustand)
    ↓
useAlerts Hook
    ↓
ConfluenceDetector.detectPatterns()
    ↓
addConfluenceAlert() → Store
    ↓
AlertsView → AlertPanel (UI)
```

### **Key Files**
1. **lib/alerts/confluenceDetector.ts**
   - Core detection logic
   - Pattern recognition algorithms
   - Scoring system

2. **components/alerts/AlertPanel.tsx**
   - UI for displaying alerts
   - Filtering and dismissal

3. **components/alerts/AlertsView.tsx**
   - Wrapper view for alerts
   - Integrates hook and panel

4. **hooks/useAlerts.ts**
   - Connects detector to market data
   - Manages browser notifications
   - Periodic detection loop

5. **stores/useMarketStore.ts**
   - Global state for confluence alerts
   - Actions: add, remove, clear, toggle

### **Data Flow**
1. Market data updates every 2 seconds (mock) or real-time (Binance WebSocket)
2. `useAlerts` hook runs `detectPatterns()` every 30 seconds
3. Detector analyzes all symbols and returns matching patterns
4. New alerts are added to Zustand store (duplicates filtered by ID)
5. CRITICAL alerts trigger browser notifications
6. AlertPanel re-renders with new alerts
7. User can dismiss alerts individually

---

## 📈 **Real vs Mock Data**

### **With Mock Data (Current)**
- Uses [lib/services/mockData.ts](lib/services/mockData.ts)
- 200+ pairs with simulated funding/OI/CVD
- Good for testing and development
- Alerts will trigger based on mock patterns

### **With Real Data (Production)**
- Uses [lib/services/hybridMarketData.ts](lib/services/hybridMarketData.ts)
- CoinGlass for funding/OI (aggregated)
- Binance for CVD/price (real-time)
- Alerts based on actual market conditions

**To switch to real data:**
Update [components/screener/ScreenerView.tsx](components/screener/ScreenerView.tsx):
```typescript
import { hybridMarketDataService } from '@/lib/services/hybridMarketData';

useEffect(() => {
  hybridMarketDataService.initialize();
  // ... rest of setup
}, []);
```

---

## 🎯 **Best Practices**

### **For Traders:**
1. **Don't trade on alerts alone** - Use them as additional confluence
2. **Check multiple timeframes** - Click symbol to see chart
3. **Wait for confirmation** - Price action + alert = stronger signal
4. **Risk management** - Always use stop losses
5. **CRITICAL alerts** - These are the strongest, pay attention

### **For Developers:**
1. **Tune thresholds** - Adjust based on market volatility
2. **Add more patterns** - Extend `ConfluenceDetector` with new setups
3. **Historical testing** - Backtest alert accuracy with historical data
4. **Rate limiting** - Avoid spam, max 1 alert per symbol per timeframe
5. **Alert expiry** - Consider auto-dismissing old alerts

---

## 🔧 **Customization**

### **Add New Alert Pattern**
1. Open [lib/alerts/confluenceDetector.ts](lib/alerts/confluenceDetector.ts)
2. Add new method (e.g., `detectTripleTop()`)
3. Add new `SetupType` to enum
4. Call method in `detectPatterns()`

**Example:**
```typescript
private detectTripleTop(data: MarketData): ConfluenceAlert | null {
  // Your logic here
  const signals: string[] = [];
  let score = 0;

  if (/* condition 1 */) {
    signals.push('Triple top pattern forming');
    score += 30;
  }

  if (score >= 50) {
    return {
      id: `triple-top-${data.symbol}-${Date.now()}`,
      symbol: data.symbol,
      setupType: SetupType.TRIPLE_TOP,
      severity: this.calculateSeverity(score),
      // ... rest of alert
    };
  }

  return null;
}
```

---

## 🐛 **Troubleshooting**

### **No Alerts Showing**
- Check if `confluenceAlertsEnabled` is true in store
- Verify market data is loading (check console)
- Thresholds might be too strict, adjust in detector
- Wait 30 seconds for first detection cycle

### **Too Many Alerts**
- Increase threshold values in detector
- Add rate limiting per symbol
- Filter by severity (show only CRITICAL/HIGH)

### **Notifications Not Working**
- Check browser notification permission
- Only CRITICAL alerts send notifications
- Check if `soundEnabled` is true in settings

### **Alert Data Incorrect**
- Verify market data source (mock vs real)
- Check data freshness (`lastUpdate` timestamp)
- Ensure CoinGlass API key is valid (if using hybrid)

---

## 📊 **Performance**

- **Detection**: ~10-50ms per run (200+ symbols)
- **Memory**: ~5MB for alert storage
- **CPU**: Negligible (runs every 30s)
- **Network**: None (uses existing market data)

---

## 🚀 **Future Enhancements**

1. **Alert History** - Track past alerts and their outcomes
2. **Win Rate Tracking** - Measure alert accuracy over time
3. **Custom Thresholds** - User-configurable sensitivity
4. **Telegram/Discord Integration** - Send alerts to external platforms
5. **Machine Learning** - AI-powered pattern recognition
6. **Backtesting** - Historical alert performance analysis
7. **Alert Templates** - Save and share custom alert configurations
8. **Symbol Watchlist** - Get alerts only for specific symbols

---

## 📝 **Summary**

The Confluence Alert System provides **automated, intelligent trade setup detection** by analyzing the confluence of funding rates, open interest, CVD, and price action. It helps traders identify:

✅ Short squeeze setups (shorts overcrowded)
✅ Long flush setups (longs overcrowded)
✅ Capitulation bottoms/tops (liquidation cascades)
✅ Bullish/Bearish divergences (smart money moves)

**Key Benefits:**
- Real-time detection (30s intervals)
- Severity scoring (0-100)
- Browser notifications (CRITICAL only)
- Clean, filterable UI
- Extensible architecture

---

**Questions? Check the main README or open an issue!**
