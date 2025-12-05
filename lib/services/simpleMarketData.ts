// Simple Market Data Service - Fast and Reliable
// Uses only Binance public APIs that work without rate limits
// No CoinGlass dependency, no complex CVD calculations

import axios from 'axios';
import type { MarketData } from '../types';

const BINANCE_FUTURES = 'https://fapi.binance.com';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// Try backend first, fall back to Binance direct
const USE_BACKEND_PROXY = true;

export class SimpleMarketDataService {
  private marketData: Map<string, MarketData> = new Map();
  private updateCallbacks: Set<(data: Map<string, MarketData>) => void> = new Set();
  private isInitialized: boolean = false;
  private updateInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {}

  async initialize(): Promise<void> {
    if (typeof window === 'undefined') {
      console.log('Skipping - not in browser');
      return;
    }

    if (this.isInitialized) {
      console.log('Already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing Simple Market Data Service...');
      console.log('📡 Using Binance Futures API directly');

      // Fetch all data at once
      await this.fetchAllData();

      // Update every 10 seconds
      this.updateInterval = setInterval(() => {
        this.fetchAllData().catch(console.error);
      }, 10000);

      this.isInitialized = true;
      console.log('✅ Market data service ready!');
    } catch (error) {
      console.error('❌ Failed to initialize:', error);
      throw error;
    }
  }

  private async fetchAllData(): Promise<void> {
    try {
      // Fetch everything in parallel
      const [tickers, fundingRates, openInterestList] = await Promise.all([
        this.fetchTickers(),
        this.fetchFundingRates(),
        this.fetchOpenInterest(),
      ]);

      // Create maps for quick lookup
      const fundingMap = new Map(fundingRates.map(f => [f.symbol, f]));
      const oiMap = new Map(openInterestList.map(oi => [oi.symbol, oi]));

      // Update market data
      let count = 0;
      let withCVD = 0;
      let withOI = 0;

      for (const ticker of tickers) {
        if (!ticker.symbol.endsWith('USDT')) continue;

        const funding = fundingMap.get(ticker.symbol);
        const oi = oiMap.get(ticker.symbol);

        // Calculate OI value = OI * price
        const openInterest = oi?.openInterest || 0;
        const openInterestValue = openInterest * ticker.price;

        // Calculate CVD from taker buy/sell volume
        const cvd = this.calculateSimpleCVD(ticker);

        const data: MarketData = {
          symbol: ticker.symbol,
          price: ticker.price,
          priceChange: ticker.priceChange,
          priceChangePercent: ticker.priceChangePercent,
          volume: ticker.volume,
          quoteVolume: ticker.quoteVolume,
          fundingRate: funding?.fundingRate || 0,
          nextFundingTime: funding?.nextFundingTime || Date.now() + 28800000,
          openInterest: openInterest,
          openInterestValue: openInterestValue,
          cvd: cvd,
          buyVolume: ticker.takerBuyVolume || ticker.volume * 0.5,
          sellVolume: ticker.takerSellVolume || ticker.volume * 0.5,
          high: ticker.high,
          low: ticker.low,
          trades: ticker.trades,
          lastUpdate: Date.now(),
        };

        this.marketData.set(ticker.symbol, data);
        count++;

        if (cvd !== 0) withCVD++;
        if (openInterest > 0) withOI++;
      }

      console.log(`📊 Updated ${count} symbols (CVD: ${withCVD}, OI: ${withOI})`);
      this.notifyUpdate();
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }

  // Fetch 24hr tickers (includes volume, price change, etc.)
  private async fetchTickers(): Promise<any[]> {
    const parseTickers = (data: any[]) => data.map((t: any) => ({
      symbol: t.symbol,
      price: parseFloat(t.lastPrice),
      priceChange: parseFloat(t.priceChange),
      priceChangePercent: parseFloat(t.priceChangePercent),
      volume: parseFloat(t.volume),
      quoteVolume: parseFloat(t.quoteVolume),
      high: parseFloat(t.highPrice),
      low: parseFloat(t.lowPrice),
      trades: parseInt(t.count),
      takerBuyVolume: parseFloat(t.takerBuyBaseAssetVolume || 0),
      takerSellVolume: parseFloat(t.volume) - parseFloat(t.takerBuyBaseAssetVolume || 0),
    }));

    try {
      // Try backend proxy first
      if (USE_BACKEND_PROXY) {
        try {
          const response = await axios.get(`${BACKEND_URL}/api/market/ticker`, {
            timeout: 10000,
          });
          return parseTickers(response.data);
        } catch (proxyError) {
          console.warn('⚠️ Backend proxy failed for tickers, trying Binance direct...');
        }
      }

      // Fallback to Binance directly
      const response = await axios.get(`${BINANCE_FUTURES}/fapi/v1/ticker/24hr`, {
        timeout: 10000,
      });
      return parseTickers(response.data);
    } catch (error) {
      console.error('Error fetching tickers:', error);
      return [];
    }
  }

  // Fetch funding rates (all symbols at once)
  private async fetchFundingRates(): Promise<any[]> {
    const parseFunding = (data: any[]) => data.map((f: any) => ({
      symbol: f.symbol,
      fundingRate: parseFloat(f.lastFundingRate),
      nextFundingTime: f.nextFundingTime,
    }));

    try {
      // Try backend proxy first
      if (USE_BACKEND_PROXY) {
        try {
          const response = await axios.get(`${BACKEND_URL}/api/market/funding`, {
            timeout: 10000,
          });
          return parseFunding(response.data);
        } catch (proxyError) {
          console.warn('⚠️ Backend proxy failed for funding, trying Binance direct...');
        }
      }

      // Fallback to Binance directly
      const response = await axios.get(`${BINANCE_FUTURES}/fapi/v1/premiumIndex`, {
        timeout: 10000,
      });
      return parseFunding(response.data);
    } catch (error) {
      console.error('Error fetching funding rates:', error);
      return [];
    }
  }

  // Fetch open interest for ALL symbols
  // Uses parallel requests in batches to get OI quickly for all symbols
  private async fetchOpenInterest(): Promise<any[]> {
    try {
      // First try to get exchange info to get all active symbols
      let exchangeInfoUrl = USE_BACKEND_PROXY
        ? `${BACKEND_URL}/api/market/exchangeInfo`
        : `${BINANCE_FUTURES}/fapi/v1/exchangeInfo`;

      let exchangeInfoResponse;
      try {
        exchangeInfoResponse = await axios.get(exchangeInfoUrl, { timeout: 10000 });
      } catch {
        // Fallback to Binance direct
        exchangeInfoResponse = await axios.get(`${BINANCE_FUTURES}/fapi/v1/exchangeInfo`, {
          timeout: 10000,
        });
      }

      const activeSymbols = exchangeInfoResponse.data.symbols
        .filter((s: any) => s.status === 'TRADING' && s.symbol.endsWith('USDT'))
        .map((s: any) => s.symbol);

      console.log(`📊 Fetching OI for ${activeSymbols.length} symbols...`);

      const results: any[] = [];
      const batchSize = 20; // Fetch 20 at a time

      // Fetch in parallel batches
      for (let i = 0; i < activeSymbols.length; i += batchSize) {
        const batch = activeSymbols.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map((symbol: string) => this.fetchSingleOI(symbol))
        );

        batchResults.forEach((result) => {
          if (result.status === 'fulfilled' && result.value) {
            results.push(result.value);
          }
        });

        // Small delay between batches to avoid rate limits
        if (i + batchSize < activeSymbols.length) {
          await new Promise(r => setTimeout(r, 50));
        }
      }

      console.log(`✅ Fetched OI for ${results.length} symbols`);
      return results;
    } catch (error) {
      console.error('Error fetching open interest:', error);
      return [];
    }
  }

  private async fetchSingleOI(symbol: string): Promise<any | null> {
    try {
      // Try backend proxy first
      if (USE_BACKEND_PROXY) {
        try {
          const response = await axios.get(`${BACKEND_URL}/api/market/openInterest/${symbol}`, {
            timeout: 5000,
          });
          return {
            symbol: response.data.symbol,
            openInterest: parseFloat(response.data.openInterest),
            openInterestValue: 0,
          };
        } catch {
          // Fall through to direct Binance
        }
      }

      // Fallback to Binance direct
      const response = await axios.get(`${BINANCE_FUTURES}/fapi/v1/openInterest`, {
        params: { symbol },
        timeout: 5000,
      });

      return {
        symbol: response.data.symbol,
        openInterest: parseFloat(response.data.openInterest),
        openInterestValue: 0,
      };
    } catch {
      return null;
    }
  }

  // Simple CVD calculation from taker buy/sell volume
  // This is an approximation but gives useful directional info
  private calculateSimpleCVD(ticker: any): number {
    const buyVol = ticker.takerBuyVolume || 0;
    const sellVol = ticker.takerSellVolume || 0;
    // CVD = cumulative (buy - sell) volume
    // For 24hr, we use the difference directly
    return buyVol - sellVol;
  }

  private notifyUpdate(): void {
    this.updateCallbacks.forEach(callback => {
      try {
        callback(this.marketData);
      } catch (error) {
        console.error('Error in callback:', error);
      }
    });
  }

  onUpdate(callback: (data: Map<string, MarketData>) => void): () => void {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }

  getAllData(): MarketData[] {
    return Array.from(this.marketData.values());
  }

  getData(symbol: string): MarketData | undefined {
    return this.marketData.get(symbol);
  }

  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.marketData.clear();
    this.updateCallbacks.clear();
    this.isInitialized = false;
  }
}

export const simpleMarketDataService = new SimpleMarketDataService();
