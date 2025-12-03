// 24/7 Market Data Service - Runs independently on server
import axios from 'axios';
import type { MarketData } from '../lib/types';

// Multiple Binance API endpoints with fallback
const API_ENDPOINTS = [
  'https://fapi.binance.com',
  'https://fapi1.binance.com',
  'https://fapi2.binance.com',
  'https://fapi3.binance.com',
];

let currentEndpointIndex = 0;

export class MarketDataService {
  private marketData: Map<string, MarketData> = new Map();
  private symbols: string[] = [];
  private isRunning: boolean = false;
  private updateInterval: NodeJS.Timeout | null = null;
  private oiUpdateInterval: NodeJS.Timeout | null = null;
  private lastUpdate: number = 0;
  private updateCallbacks: Set<(data: MarketData[]) => void> = new Set();

  constructor() {}

  // Start continuous data fetching
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Market data service already running');
      return;
    }

    console.log('🚀 Starting 24/7 market data service...');
    this.isRunning = true;

    try {
      // Initial data load
      await this.fetchAllData();

      // Update prices & funding every 2 seconds
      this.updateInterval = setInterval(async () => {
        try {
          await this.updatePricesAndFunding();
        } catch (error) {
          console.error('Error updating prices:', error);
        }
      }, 2000);

      // Update OI every 30 seconds (more expensive)
      this.oiUpdateInterval = setInterval(async () => {
        try {
          await this.updateOpenInterest();
        } catch (error) {
          console.error('Error updating OI:', error);
        }
      }, 30000);

      console.log('✅ Market data service started');
      console.log('   - Price updates: every 2s');
      console.log('   - OI updates: every 30s');
      this.logStats();
    } catch (error) {
      console.error('❌ Failed to start market data service:', error);
      this.isRunning = false;
      throw error;
    }
  }

  // Stop the service
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    if (this.oiUpdateInterval) {
      clearInterval(this.oiUpdateInterval);
      this.oiUpdateInterval = null;
    }
    this.isRunning = false;
    console.log('⏹️  Market data service stopped');
  }

  // Fetch with automatic endpoint fallback
  private async fetchWithFallback(path: string, params?: any): Promise<any> {
    const maxAttempts = API_ENDPOINTS.length;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const endpoint = API_ENDPOINTS[currentEndpointIndex];

      try {
        const response = await axios.get(`${endpoint}${path}`, {
          params,
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; CryptoTerminal/1.0)',
          },
        });
        return response.data;
      } catch (error: any) {
        const status = error?.response?.status;
        const isGeoBlocked = status === 451 || status === 403;
        const isRateLimited = status === 429 || status === 418;

        if (isGeoBlocked || isRateLimited) {
          console.log(`⚠️  Endpoint ${currentEndpointIndex + 1} issue (${status}), rotating...`);
          currentEndpointIndex = (currentEndpointIndex + 1) % API_ENDPOINTS.length;

          if (isRateLimited && attempt < maxAttempts - 1) {
            // Wait before retry on rate limit
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } else if (attempt === maxAttempts - 1) {
          console.error(`❌ All endpoints failed for ${path}:`, error.message);
          throw error;
        }
      }
    }

    throw new Error('All API endpoints failed');
  }

  // Initial data fetch - load everything
  private async fetchAllData(): Promise<void> {
    console.log('📡 Fetching initial market data...');

    try {
      // Fetch all active symbols
      const exchangeInfo = await this.fetchWithFallback('/fapi/v1/exchangeInfo');
      this.symbols = exchangeInfo.symbols
        .filter((s: any) => s.status === 'TRADING' && s.contractType === 'PERPETUAL' && s.quoteAsset === 'USDT')
        .map((s: any) => s.symbol);

      console.log(`📊 Loaded ${this.symbols.length} USDT perpetual pairs`);

      // Fetch ticker data
      const tickers = await this.fetchWithFallback('/fapi/v1/ticker/24hr');
      const tickerMap = new Map(tickers.map((t: any) => [t.symbol, t]));

      // Fetch funding rates
      const fundingRates = await this.fetchWithFallback('/fapi/v1/premiumIndex');
      const fundingMap = new Map(fundingRates.map((f: any) => [f.symbol, f]));

      // Initialize market data
      for (const symbol of this.symbols) {
        const ticker = tickerMap.get(symbol) as any;
        const funding = fundingMap.get(symbol) as any;

        if (!ticker) continue;

        const marketData: MarketData = {
          symbol,
          price: parseFloat(ticker.lastPrice),
          priceChange: parseFloat(ticker.priceChange),
          priceChangePercent: parseFloat(ticker.priceChangePercent),
          volume: parseFloat(ticker.volume),
          quoteVolume: parseFloat(ticker.quoteVolume),
          fundingRate: funding ? parseFloat(funding.lastFundingRate) : 0,
          nextFundingTime: funding ? funding.nextFundingTime : Date.now() + 28800000,
          openInterest: 0,
          openInterestValue: 0,
          cvd: 0,
          buyVolume: 0,
          sellVolume: 0,
          high: parseFloat(ticker.highPrice),
          low: parseFloat(ticker.lowPrice),
          trades: parseInt(ticker.count),
          lastUpdate: Date.now(),
        };

        this.marketData.set(symbol, marketData);
      }

      // Fetch OI for top 200 symbols by volume
      await this.updateOpenInterest();

      this.lastUpdate = Date.now();
      console.log(`✅ Initial data loaded: ${this.marketData.size} pairs`);

      // Notify subscribers
      this.notifyUpdate();
    } catch (error) {
      console.error('❌ Error fetching initial data:', error);
      throw error;
    }
  }

  // Update prices and funding (fast, runs every 2s)
  private async updatePricesAndFunding(): Promise<void> {
    try {
      const [tickers, fundingRates] = await Promise.all([
        this.fetchWithFallback('/fapi/v1/ticker/24hr'),
        this.fetchWithFallback('/fapi/v1/premiumIndex'),
      ]);

      const fundingMap = new Map(fundingRates.map((f: any) => [f.symbol, f]));

      let updated = 0;
      for (const ticker of tickers) {
        const data = this.marketData.get(ticker.symbol);
        if (!data) continue;

        const funding = fundingMap.get(ticker.symbol) as any;

        data.price = parseFloat(ticker.lastPrice);
        data.priceChange = parseFloat(ticker.priceChange);
        data.priceChangePercent = parseFloat(ticker.priceChangePercent);
        data.volume = parseFloat(ticker.volume);
        data.quoteVolume = parseFloat(ticker.quoteVolume);
        data.high = parseFloat(ticker.highPrice);
        data.low = parseFloat(ticker.lowPrice);
        data.trades = parseInt(ticker.count);
        data.lastUpdate = Date.now();

        if (funding) {
          data.fundingRate = parseFloat(funding.lastFundingRate);
          data.nextFundingTime = funding.nextFundingTime;
        }

        this.marketData.set(ticker.symbol, data);
        updated++;
      }

      this.lastUpdate = Date.now();

      // Notify subscribers every 10th update (~20 seconds)
      if (updated > 0 && Math.random() < 0.1) {
        this.notifyUpdate();
      }
    } catch (error) {
      console.error('Error updating prices & funding:', error);
    }
  }

  // Update open interest (slower, runs every 30s)
  private async updateOpenInterest(): Promise<void> {
    try {
      // Get top 200 symbols by volume
      const topSymbols = Array.from(this.marketData.values())
        .sort((a, b) => b.quoteVolume - a.quoteVolume)
        .slice(0, 200)
        .map(d => d.symbol);

      console.log(`📈 Updating OI for top ${topSymbols.length} symbols...`);

      let updated = 0;
      let failed = 0;

      // Batch process: 10 symbols at a time
      const batchSize = 10;
      for (let i = 0; i < topSymbols.length; i += batchSize) {
        const batch = topSymbols.slice(i, i + batchSize);

        const results = await Promise.allSettled(
          batch.map(symbol => this.fetchWithFallback('/fapi/v1/openInterest', { symbol }))
        );

        results.forEach((result, idx) => {
          const symbol = batch[idx];
          const data = this.marketData.get(symbol);

          if (result.status === 'fulfilled' && data) {
            const oi = parseFloat(result.value.openInterest || 0);
            data.openInterest = oi;
            data.openInterestValue = oi * data.price;
            this.marketData.set(symbol, data);
            updated++;
          } else {
            failed++;
          }
        });

        // Small delay to avoid rate limiting
        if (i + batchSize < topSymbols.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`✅ OI updated: ${updated} success, ${failed} failed`);

      // Notify subscribers after OI update
      this.notifyUpdate();
    } catch (error) {
      console.error('Error updating open interest:', error);
    }
  }

  // Subscribe to updates
  onUpdate(callback: (data: MarketData[]) => void): () => void {
    this.updateCallbacks.add(callback);
    return () => {
      this.updateCallbacks.delete(callback);
    };
  }

  // Notify all subscribers
  private notifyUpdate(): void {
    const data = this.getAllData();
    this.updateCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in update callback:', error);
      }
    });
  }

  // Get all market data
  getAllData(): MarketData[] {
    return Array.from(this.marketData.values());
  }

  // Get specific symbol data
  getData(symbol: string): MarketData | undefined {
    return this.marketData.get(symbol);
  }

  // Get stats
  getStats() {
    const data = Array.from(this.marketData.values());
    const withOI = data.filter(d => d.openInterest > 0).length;
    const withFunding = data.filter(d => d.fundingRate !== 0).length;

    return {
      totalSymbols: data.length,
      withOI,
      withFunding,
      lastUpdate: this.lastUpdate,
      uptime: this.isRunning ? Date.now() - this.lastUpdate : 0,
      isRunning: this.isRunning,
    };
  }

  // Log statistics
  private logStats(): void {
    const stats = this.getStats();
    console.log('📊 Market Data Statistics:');
    console.log(`   - Total symbols: ${stats.totalSymbols}`);
    console.log(`   - With OI: ${stats.withOI} (${((stats.withOI / stats.totalSymbols) * 100).toFixed(1)}%)`);
    console.log(`   - With funding: ${stats.withFunding} (${((stats.withFunding / stats.totalSymbols) * 100).toFixed(1)}%)`);
  }

  // Check if service is healthy
  isHealthy(): boolean {
    const timeSinceUpdate = Date.now() - this.lastUpdate;
    return this.isRunning && timeSinceUpdate < 10000 && this.marketData.size > 0;
  }
}

// Export singleton instance
export const marketDataService = new MarketDataService();
