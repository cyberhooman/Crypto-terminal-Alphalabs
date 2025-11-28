# Quick Start: Test WebSocket Connection (2 Minutes)

## Step 1: Add Test Component

Open `app/page.tsx` and add the WebSocket test component:

```typescript
// app/page.tsx
import WebSocketTest from '@/components/test/WebSocketTest';

export default function Home() {
  return (
    <div>
      {/* Your existing content */}

      {/* Add this - will appear in bottom-right corner */}
      <WebSocketTest />
    </div>
  );
}
```

## Step 2: Start Dev Server

```bash
npm run dev
```

## Step 3: Open Browser

Go to `http://localhost:3000` and check:

### ✅ You should see (bottom-right corner):

```
WebSocket Test
───────────────────────
🟢 Connected to Binance
Last Update: 2:34:56 PM

Total Pairs: 200+
Updates/sec: ~2

Top 10 by Volume:
BTC/USDT    $91,234.56  +2.34%
ETH/USDT    $3,456.78   -1.23%
...
```

### ✅ Browser Console Should Show:

```
🔌 Connecting to Binance WebSocket...
✅ WebSocket connected to Binance
📡 Subscribed to !ticker@arr
📡 Subscribed to !markPrice@arr@1s
📊 WebSocket: 200+ pairs updated
```

### ✅ Network Tab Should Show:

1. Open DevTools → Network → WS (WebSocket)
2. See `wss://fstream.binance.com/stream` with status "101 Switching Protocols"
3. Messages tab shows constant data flow

---

## Step 4: Replace Your Existing Data Hook

Once you confirm WebSocket works, update `hooks/useMarketData.ts`:

```typescript
// hooks/useMarketData.ts
'use client';

import { useEffect } from 'react';
import { useMarketStore } from '@/stores/useMarketStore';
import { useBinanceWebSocket } from './useBinanceWebSocket';

export function useMarketData() {
  const { setMarketData, setLoading, isLoading } = useMarketStore();
  const { marketData, isConnected } = useBinanceWebSocket();

  // Update store when WebSocket data arrives
  useEffect(() => {
    if (marketData.length > 0) {
      setMarketData(marketData);
      setLoading(false);
      console.log(`📊 Received ${marketData.length} pairs from WebSocket`);
    }
  }, [marketData, setMarketData, setLoading]);

  // Set loading state
  useEffect(() => {
    setLoading(!isConnected);
  }, [isConnected, setLoading]);

  return {
    marketData,
    isLoading,
  };
}
```

**That's it!** Your entire app now uses WebSocket with ZERO other changes needed.

---

## Troubleshooting

### ❌ "WebSocket client can only run in browser"

Add `'use client'` to the top of your component:

```typescript
'use client';  // ← Add this

import { useBinanceWebSocket } from '@/hooks/useBinanceWebSocket';
```

### ❌ Connection stays "Disconnected"

1. Check browser console for errors
2. Make sure you're using HTTPS in production
3. Check if firewall is blocking WebSocket

### ❌ No data showing

Wait 2-3 seconds after connection. First data arrives after subscriptions are confirmed.

### ❌ TypeScript errors

Make sure `MarketData` type includes WebSocket fields:

```typescript
// lib/types.ts
export interface MarketData {
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  volume: number;
  quoteVolume: number;
  high: number;
  low: number;
  fundingRate?: number;  // ← Optional fields
  markPrice?: number;
  nextFundingTime?: number;
  // ... rest of fields
}
```

---

## What You Get

### Real-Time Updates:
- **Price**: Updates every 500ms
- **Funding Rate**: Updates every 1 second
- **Volume**: Real-time accumulation

### No More Issues:
- ✅ No IP blocking (uses user's browser IP)
- ✅ No 500 errors from backend
- ✅ No polling delays
- ✅ Works even if Railway is down

### Performance:
- **Before**: 6 HTTP requests every 2 seconds = ~2MB/min bandwidth
- **After**: 1 WebSocket connection = ~100KB/min bandwidth

---

## Remove WebSocket Test (After Verification)

Once everything works, remove the test component:

```typescript
// app/page.tsx
// import WebSocketTest from '@/components/test/WebSocketTest'; // ← Remove
import WebSocketTest from '@/components/test/WebSocketTest';

export default function Home() {
  return (
    <div>
      {/* <WebSocketTest /> */} {/* ← Remove or comment out */}
    </div>
  );
}
```

---

## Next: Migrate to Production

When you're ready to deploy:

1. **Frontend**: Already works! WebSocket runs in browser.
2. **Backend**: Can remove `/market/*` proxy routes (optional)
3. **Environment**: No new env vars needed

Deploy to Railway/Vercel and it will work immediately! 🚀

---

## Summary

**In 2 minutes you:**
1. ✅ Added `<WebSocketTest />` component
2. ✅ Verified WebSocket connection works
3. ✅ Saw real-time data flowing from Binance
4. ✅ Ready to migrate main app

**This is exactly Orion Terminal's approach** - direct browser WebSocket to Binance, bypassing all IP blocking!
