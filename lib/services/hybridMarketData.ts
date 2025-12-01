// Hybrid market data service: CoinGlass for Funding/OI, Binance for CVD
// Only runs in browser - prevents build-time API calls on Railway
import type { MarketData } from '../types';
import type { Trade } from '../utils/cvd';

// Lazy imports to prevent build-time execution
let binanceAPI: any = null;
let binanceWS: any = null;
let coinGlassAPI: any = null;
let cvdCalculator: any = null;

const loadDependencies = async () => {
  if (typeof window === 'undefined') return false;

  if (!binanceAPI) {
    const [binanceModule, wsModule, coinglassModule, cvdModule] = await Promise.all([
      import('../binance/api'),
      import('../binance/websocketClient'),
      import('../coinglass/api'),
      import('../utils/cvd'),
    ]);
    binanceAPI = binanceModule.binanceAPI;
    binanceWS = wsModule.binanceWS;
    coinGlassAPI = coinglassModule.coinGlassAPI;
    cvdCalculator = cvdModule.cvdCalculator;
  }
  return true;
};

export class HybridMarketDataService {
  private marketData: Map<string, MarketData> = new Map();
  private symbols: string[] = [];
  private updateCallbacks: Set<(data: Map<string, MarketData>) => void> = new Set();
  private isInitialized: boolean = false;
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private useCoinGlass: boolean = true;

  constructor() {}

  async initialize(): Promise<void> {
    // Guard: Only run in browser
    if (typeof window === 'undefined') {
      console.log('Skipping initialization - not in browser');
      return;
    }

    if (this.isInitialized) {
      console.log('Hybrid market data service already initialized');
      return;
    }

    try {
      // Load dependencies dynamically
      const loaded = await loadDependencies();
      if (!loaded) {
        console.log('Failed to load dependencies - not in browser');
        return;
      }

      console.log('Initializing hybrid market data service...');
      console.log('- CoinGlass: Funding rates & OI (aggregated)');
      console.log('- Binance: CVD & price data');

      // Test CoinGlass availability
      const coinGlassAvailable = await this.testCoinGlass();
      this.useCoinGlass = coinGlassAvailable;

      if (!coinGlassAvailable) {
        console.warn('⚠️  CoinGlass unavailable. Falling back to Binance only.');
      } else {
        console.log('✅ CoinGlass connected - Using aggregated data');
      }

      // Fetch initial data
      await this.fetchInitialData();

      // Connect WebSocket for real-time price & CVD
      await binanceWS.connect();
      this.subscribeToStreams();

      // Start periodic updates for funding/OI
      this.startPeriodicUpdates();

      this.isInitialized = true;
      console.log('✅ Hybrid market data service initialized');
    } catch (error) {
      console.error('Error initializing hybrid service:', error);
      throw error;
    }
  }

  private async testCoinGlass(): Promise<boolean> {
    try {
      const testData = await coinGlassAPI.getFundingRates();
      return Array.isArray(testData) && testData.length > 0;
    } catch (error) {
      return false;
    }
  }

  private async fetchInitialData(): Promise<void> {
    try {
      // Get symbols from Binance
      const exchangeInfo: Array<{ symbol: string; quoteAsset: string }> = await binanceAPI.getExchangeInfo();
      this.symbols = exchangeInfo
        .filter((s: { quoteAsset: string }) => s.quoteAsset === 'USDT')
        .map((s: { symbol: string }) => s.symbol);

      console.log(`📊 Loaded ${this.symbols.length} USDT perpetual symbols`);

      // Fetch price data from Binance
      const tickers: any[] = await binanceAPI.get24hrTicker();
      const tickerMap = new Map(tickers.map((t: any) => [t.symbol, t]));

      // Fetch funding & OI from CoinGlass (if available) or Binance
      let fundingMap = new Map();
      let oiMap = new Map();

      // Helper to normalize CoinGlass symbols to Binance format
      const normalizeCoinGlassSymbol = (symbol: string): string => {
        // CoinGlass may use "BTC" or "BTCUSD" - we need "BTCUSDT"
        if (symbol.endsWith('USDT')) return symbol;
        if (symbol.endsWith('USD')) return symbol.slice(0, -3) + 'USDT';
        return symbol + 'USDT';
      };

      // Always fetch from Binance first (reliable baseline)
      console.log('📡 Fetching funding rates from Binance...');
      const binanceFunding: any[] = await binanceAPI.getFundingRates();
      binanceFunding.forEach((f: any) => {
        fundingMap.set(f.symbol, {
          fundingRate: f.fundingRate,
          nextFundingTime: f.nextFundingTime,
        });
      });

      if (this.useCoinGlass) {
        // Overlay CoinGlass aggregated data (more accurate for major pairs)
        console.log('📡 Fetching aggregated funding rates from CoinGlass...');
        try {
          const fundingRates: any[] = await coinGlassAPI.getFundingRates();
          fundingRates.forEach((f: any) => {
            const symbol = normalizeCoinGlassSymbol(f.symbol);
            if (this.symbols.includes(symbol)) {
              fundingMap.set(symbol, {
                fundingRate: f.rate,
                nextFundingTime: f.nextFundingTime,
              });
            }
          });
        } catch (e) {
          console.warn('CoinGlass funding fetch failed, using Binance data');
        }

        console.log('📡 Fetching aggregated OI from CoinGlass...');
        try {
          const openInterests: any[] = await coinGlassAPI.getOpenInterest();
          openInterests.forEach((oi: any) => {
            const symbol = normalizeCoinGlassSymbol(oi.symbol);
            if (this.symbols.includes(symbol)) {
              oiMap.set(symbol, {
                openInterest: oi.totalOI,
                openInterestValue: oi.totalOIValue,
              });
            }
          });
        } catch (e) {
          console.warn('CoinGlass OI fetch failed');
        }

        console.log(`✅ CoinGlass: ${fundingMap.size} funding rates, ${oiMap.size} OI values`);
      }

      // Fetch OI from Binance for symbols not covered by CoinGlass
      console.log('📡 Fetching OI from Binance for remaining symbols...');
      await this.fetchBinanceOI(oiMap, tickers);

      // Initialize market data
      for (const ticker of tickers) {
        if (!this.symbols.includes(ticker.symbol)) continue;

        const funding = fundingMap.get(ticker.symbol);
        const oi = oiMap.get(ticker.symbol);

        const marketData: MarketData = {
          symbol: ticker.symbol,
          price: ticker.price,
          priceChange: ticker.priceChange,
          priceChangePercent: ticker.priceChangePercent,
          volume: ticker.volume,
          quoteVolume: ticker.quoteVolume,
          fundingRate: funding?.fundingRate || 0,
          nextFundingTime: funding?.nextFundingTime || Date.now() + 28800000,
          openInterest: oi?.openInterest || 0,
          openInterestValue: oi?.openInterestValue || 0,
          cvd: 0,
          buyVolume: 0,
          sellVolume: 0,
          high: ticker.high,
          low: ticker.low,
          trades: ticker.trades,
          lastUpdate: Date.now(),
        };

        this.marketData.set(ticker.symbol, marketData);
      }

      console.log('✅ Initial market data loaded');
      console.log('📊 Starting background data fetch (CVD)...');

      // Initialize CVD for top 150 symbols by volume (async, non-blocking)
      const topSymbolsByVolume = tickers
        .filter((t: any) => this.symbols.includes(t.symbol))
        .sort((a: any, b: any) => b.quoteVolume - a.quoteVolume)
        .slice(0, 150)
        .map((t: any) => t.symbol);

      // Start CVD calculation in background
      this.initializeCVD(topSymbolsByVolume).then(() => {
        console.log('✅ CVD data ready');
        this.notifyUpdate();
      });
    } catch (error) {
      console.error('Error fetching initial data:', error);
      throw error;
    }
  }

  private subscribeToStreams(): void {
    // Subscribe to price updates (Binance)
    binanceWS.subscribeAllTickers((data: any) => {
      if (Array.isArray(data)) {
        data.forEach((ticker: any) => this.handleMiniTickerUpdate(ticker));
      }
    });

    // Subscribe to mark price for real-time funding (if not using CoinGlass)
    if (!this.useCoinGlass) {
      binanceWS.subscribeAllMarkPrices((data: any) => {
        if (Array.isArray(data)) {
          data.forEach((markPrice: any) => this.handleMarkPriceUpdate(markPrice));
        }
      });
    }

    // Note: subscribeAggTrades removed - CVD calculation will be handled differently
    // The new WebSocket client doesn't support individual symbol trade streams
    // CVD will be calculated from initial historical data only

    console.log('✅ Subscribed to real-time streams');
  }

  private handleMiniTickerUpdate(ticker: any): void {
    const data = this.marketData.get(ticker.s);
    if (!data) return;

    data.price = parseFloat(ticker.c);
    data.high = parseFloat(ticker.h);
    data.low = parseFloat(ticker.l);
    data.volume = parseFloat(ticker.v);
    data.quoteVolume = parseFloat(ticker.q);
    data.lastUpdate = ticker.E;

    this.marketData.set(ticker.s, data);
    this.notifyUpdate();
  }

  private handleMarkPriceUpdate(markPrice: any): void {
    const data = this.marketData.get(markPrice.s);
    if (!data) return;

    data.fundingRate = parseFloat(markPrice.r);
    data.nextFundingTime = markPrice.T;
    data.lastUpdate = markPrice.E;

    this.marketData.set(markPrice.s, data);
    this.notifyUpdate();
  }

  private handleAggTrade(symbol: string, trade: any): void {
    const tradeData: Trade = {
      price: parseFloat(trade.p),
      quantity: parseFloat(trade.q),
      timestamp: trade.T,
      isBuyerMaker: trade.m,
    };

    const cvdData = cvdCalculator.processTrade(symbol, tradeData);

    const data = this.marketData.get(symbol);
    if (data) {
      data.cvd = cvdData.cvd;
      data.buyVolume = cvdData.buyVolume;
      data.sellVolume = cvdData.sellVolume;
      data.lastUpdate = Date.now();

      this.marketData.set(symbol, data);
      this.notifyUpdate();
    }
  }

  private async initializeCVD(symbols: string[]): Promise<void> {
    console.log(`🔄 Initializing CVD for ${symbols.length} symbols...`);

    let completed = 0;
    let failed = 0;

    // Process in batches to avoid overwhelming API
    const batchSize = 20;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);

      const results = await Promise.allSettled(batch.map(async (symbol) => {
        const trades: any[] = await binanceAPI.getAggTrades(symbol, 1000);
        const historicalTrades: Trade[] = trades.map((t: any) => ({
          price: t.price,
          quantity: t.quantity,
          timestamp: t.timestamp,
          isBuyerMaker: t.isBuyerMaker,
        }));

        const cvdData = cvdCalculator.calculateHistoricalCVD(symbol, historicalTrades);

        const data = this.marketData.get(symbol);
        if (data) {
          data.cvd = cvdData.cvd;
          data.buyVolume = cvdData.buyVolume;
          data.sellVolume = cvdData.sellVolume;
          this.marketData.set(symbol, data);
        }
        return symbol;
      }));

      results.forEach(result => {
        if (result.status === 'fulfilled') completed++;
        else failed++;
      });

      // Notify UI of progress
      if (i % 60 === 0) {
        this.notifyUpdate();
      }

      // Small delay between batches
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`✅ CVD initialized: ${completed} success, ${failed} failed`);
  }

  // Fetch OI from Binance for symbols not in oiMap
  private async fetchBinanceOI(oiMap: Map<string, any>, tickers: any[]): Promise<void> {
    // Sort by volume and get top 200 symbols that don't have OI data
    const symbolsNeedingOI = tickers
      .filter((t: any) => this.symbols.includes(t.symbol) && !oiMap.has(t.symbol))
      .sort((a: any, b: any) => b.quoteVolume - a.quoteVolume)
      .slice(0, 200)
      .map((t: any) => t.symbol);

    if (symbolsNeedingOI.length === 0) {
      console.log('✅ All symbols have OI from CoinGlass');
      return;
    }

    console.log(`📡 Fetching OI for ${symbolsNeedingOI.length} symbols from Binance...`);

    let successCount = 0;
    let failCount = 0;

    // Batch fetch with rate limiting
    const batchSize = 15;
    for (let i = 0; i < symbolsNeedingOI.length; i += batchSize) {
      const batch = symbolsNeedingOI.slice(i, i + batchSize);

      const results = await Promise.allSettled(batch.map(async (symbol: string) => {
        const oi = await binanceAPI.getOpenInterest(symbol);
        const ticker = tickers.find((t: any) => t.symbol === symbol);
        const price = ticker?.price || 0;

        oiMap.set(symbol, {
          openInterest: oi.openInterest,
          openInterestValue: oi.openInterest * price,
        });
        return symbol;
      }));

      results.forEach(result => {
        if (result.status === 'fulfilled') successCount++;
        else failCount++;
      });

      // Small delay to avoid rate limiting
      if (i + batchSize < symbolsNeedingOI.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    console.log(`✅ Binance OI: ${successCount} success, ${failCount} failed (total: ${oiMap.size})`);
  }

  private startPeriodicUpdates(): void {
    // Update funding & OI every 5 minutes (CoinGlass) or 30 seconds (Binance)
    const interval = this.useCoinGlass ? 300000 : 30000;

    this.updateInterval = setInterval(async () => {
      if (this.useCoinGlass) {
        await this.updateFromCoinGlass();
      } else {
        await this.updateFromBinance();
      }
    }, interval);

    console.log(`⏱️  Periodic updates: every ${interval / 1000}s`);
  }

  // Helper to normalize CoinGlass symbols
  private normalizeCoinGlassSymbol(symbol: string): string {
    if (symbol.endsWith('USDT')) return symbol;
    if (symbol.endsWith('USD')) return symbol.slice(0, -3) + 'USDT';
    return symbol + 'USDT';
  }

  private async updateFromCoinGlass(): Promise<void> {
    try {
      const [fundingRates, openInterests]: [any[], any[]] = await Promise.all([
        coinGlassAPI.getFundingRates(),
        coinGlassAPI.getOpenInterest(),
      ]);

      fundingRates.forEach((f: any) => {
        const symbol = this.normalizeCoinGlassSymbol(f.symbol);
        const data = this.marketData.get(symbol);
        if (data) {
          data.fundingRate = f.rate;
          data.nextFundingTime = f.nextFundingTime;
          this.marketData.set(symbol, data);
        }
      });

      openInterests.forEach((oi: any) => {
        const symbol = this.normalizeCoinGlassSymbol(oi.symbol);
        const data = this.marketData.get(symbol);
        if (data) {
          data.openInterest = oi.totalOI;
          data.openInterestValue = oi.totalOIValue;
          this.marketData.set(symbol, data);
        }
      });

      this.notifyUpdate();
    } catch (error) {
      console.error('Error updating from CoinGlass:', error);
    }
  }

  private async updateFromBinance(): Promise<void> {
    try {
      const topSymbols = this.symbols.slice(0, 50);

      for (const symbol of topSymbols) {
        try {
          const oi = await binanceAPI.getOpenInterest(symbol);
          const data = this.marketData.get(symbol);

          if (data) {
            data.openInterest = oi.openInterest;
            data.openInterestValue = oi.openInterest * data.price;
            this.marketData.set(symbol, data);
          }
        } catch (error) {
          // Continue on error
        }

        await new Promise(resolve => setTimeout(resolve, 50));
      }

      this.notifyUpdate();
    } catch (error) {
      console.error('Error updating from Binance:', error);
    }
  }

  private notifyUpdate(): void {
    this.updateCallbacks.forEach(callback => {
      callback(this.marketData);
    });
  }

  onUpdate(callback: (data: Map<string, MarketData>) => void): () => void {
    this.updateCallbacks.add(callback);
    return () => {
      this.updateCallbacks.delete(callback);
    };
  }

  getAllData(): MarketData[] {
    return Array.from(this.marketData.values());
  }

  getData(symbol: string): MarketData | undefined {
    return this.marketData.get(symbol);
  }

  isUsingCoinGlass(): boolean {
    return this.useCoinGlass;
  }

  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    if (binanceWS) {
      binanceWS.disconnect();
    }
    this.marketData.clear();
    this.updateCallbacks.clear();
    if (cvdCalculator) {
      cvdCalculator.resetAll();
    }
    this.isInitialized = false;
  }
}

// Export singleton instance
export const hybridMarketDataService = new HybridMarketDataService();
