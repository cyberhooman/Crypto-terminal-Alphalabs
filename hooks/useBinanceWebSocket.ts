// React hook for Binance WebSocket connection
// Provides real-time market data directly from user's browser
'use client';

import { useEffect, useState, useCallback } from 'react';
import { binanceWS, type TickerData, type MarkPriceData } from '@/lib/binance/websocketClient';
import type { MarketData } from '@/lib/types';

export function useBinanceWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [marketData, setMarketData] = useState<Map<string, MarketData>>(new Map());
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Connect on mount
  useEffect(() => {
    console.log('🔌 Initializing Binance WebSocket connection...');
    binanceWS.connect();

    // Check connection status every 2 seconds
    const statusInterval = setInterval(() => {
      setIsConnected(binanceWS.isConnected());
    }, 2000);

    return () => {
      clearInterval(statusInterval);
      binanceWS.disconnect();
    };
  }, []);

  // Subscribe to all 24hr tickers
  useEffect(() => {
    if (!binanceWS.isConnected()) return;

    console.log('📡 Subscribing to all 24hr tickers...');

    const unsubscribe = binanceWS.subscribeAllTickers((tickers: TickerData[]) => {
      setMarketData((prev) => {
        const updated = new Map(prev);

        tickers.forEach((ticker) => {
          const existing = updated.get(ticker.s) || ({} as MarketData);

          updated.set(ticker.s, {
            ...existing,
            symbol: ticker.s,
            price: parseFloat(ticker.c),
            priceChange: parseFloat(ticker.p),
            priceChangePercent: parseFloat(ticker.P),
            volume: parseFloat(ticker.v),
            quoteVolume: parseFloat(ticker.q),
            high: parseFloat(ticker.h),
            low: parseFloat(ticker.l),
            trades: ticker.n,
            openTime: ticker.O,
            closeTime: ticker.C,
          });
        });

        setLastUpdate(Date.now());
        return updated;
      });
    });

    return unsubscribe;
  }, [isConnected]);

  // Subscribe to all mark prices (for funding rates)
  useEffect(() => {
    if (!binanceWS.isConnected()) return;

    console.log('📡 Subscribing to all mark prices (funding rates)...');

    const unsubscribe = binanceWS.subscribeAllMarkPrices((markPrices: MarkPriceData[]) => {
      setMarketData((prev) => {
        const updated = new Map(prev);

        markPrices.forEach((mp) => {
          const existing = updated.get(mp.s) || ({} as MarketData);

          updated.set(mp.s, {
            ...existing,
            symbol: mp.s,
            fundingRate: parseFloat(mp.r),
            markPrice: parseFloat(mp.p),
            indexPrice: parseFloat(mp.i),
            nextFundingTime: mp.T,
          });
        });

        setLastUpdate(Date.now());
        return updated;
      });
    });

    return unsubscribe;
  }, [isConnected]);

  // Convert Map to Array for easier consumption
  const marketDataArray = Array.from(marketData.values());

  return {
    marketData: marketDataArray,
    isConnected,
    lastUpdate,
    connectionStatus: isConnected ? 'connected' : 'disconnected',
  };
}

// Hook for filtering USDT perpetual futures only
export function useUSDTFutures() {
  const { marketData, isConnected, lastUpdate } = useBinanceWebSocket();

  const usdtFutures = marketData.filter(
    (item) => item.symbol?.endsWith('USDT') && !item.symbol.includes('_')
  );

  return {
    marketData: usdtFutures,
    isConnected,
    lastUpdate,
    count: usdtFutures.length,
  };
}
