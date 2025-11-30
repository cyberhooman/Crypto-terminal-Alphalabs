// Hybrid market data service: CoinGlass for Funding/OI, Binance for CVD
import { binanceAPI } from '../binance/api';
import { binanceWS } from '../binance/websocketClient';
import { coinGlassAPI } from '../coinglass/api';
import { cvdCalculator, type Trade } from '../utils/cvd';
import type { MarketData } from '../types';

export class HybridMarketDataService {
  private marketData: Map<string, MarketData> = new Map();
  private symbols: string[] = [];
  private updateCallbacks: Set<(data: Map<string, MarketData>) => void> = new Set();
  private isInitialized: boolean = false;
  private updateInterval: NodeJS.Timeout | null = null;
  private useCoinGlass: boolean = true;

  constructor() {}

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('Hybrid market data service already initialized');
      return;
    }

    try {
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
      const exchangeInfo = await binanceAPI.getExchangeInfo();
      this.symbols = exchangeInfo
        .filter(s => s.quoteAsset === 'USDT')
        .map(s => s.symbol);

      console.log(`📊 Loaded ${this.symbols.length} USDT perpetual symbols`);

      // Fetch price data from Binance
      const tickers = await binanceAPI.get24hrTicker();
      const tickerMap = new Map(tickers.map(t => [t.symbol, t]));

      // Fetch funding & OI from CoinGlass (if available) or Binance
      let fundingMap = new Map();
      let oiMap = new Map();

      if (this.useCoinGlass) {
        // Use CoinGlass for aggregated data
        console.log('📡 Fetching aggregated funding rates from CoinGlass...');
        const fundingRates = await coinGlassAPI.getFundingRates();
        fundingRates.forEach(f => {
          // CoinGlass uses format like "BTCUSD", convert to "BTCUSDT"
          const symbol = f.symbol.replace('USD', 'USDT');
          fundingMap.set(symbol, {
            fundingRate: f.rate,
            nextFundingTime: f.nextFundingTime,
          });
        });

        console.log('📡 Fetching aggregated OI from CoinGlass...');
        const openInterests = await coinGlassAPI.getOpenInterest();
        openInterests.forEach(oi => {
          const symbol = oi.symbol.replace('USD', 'USDT');
          oiMap.set(symbol, {
            openInterest: oi.totalOI,
            openInterestValue: oi.totalOIValue,
          });
        });

        console.log(`✅ CoinGlass: ${fundingMap.size} funding rates, ${oiMap.size} OI values`);
      } else {
        // Fallback to Binance
        console.log('📡 Fetching funding rates from Binance...');
        const fundingRates = await binanceAPI.getFundingRates();
        fundingRates.forEach(f => {
          fundingMap.set(f.symbol, {
            fundingRate: f.fundingRate,
            nextFundingTime: f.nextFundingTime,
          });
        });
      }

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

      // Initialize CVD for top symbols
      const topSymbols = this.symbols.slice(0, 30);
      await this.initializeCVD(topSymbols);

      console.log('✅ Initial data loaded');
    } catch (error) {
      console.error('Error fetching initial data:', error);
      throw error;
    }
  }

  private subscribeToStreams(): void {
    // Subscribe to price updates (Binance)
    binanceWS.subscribeAllMiniTickers((data) => {
      if (Array.isArray(data)) {
        data.forEach(ticker => this.handleMiniTickerUpdate(ticker));
      }
    });

    // Subscribe to mark price for real-time funding (if not using CoinGlass)
    if (!this.useCoinGlass) {
      binanceWS.subscribeMarkPriceAll((data) => {
        if (Array.isArray(data)) {
          data.forEach(markPrice => this.handleMarkPriceUpdate(markPrice));
        }
      });
    }

    // Subscribe to trades for CVD (top 30 pairs only for performance)
    const topSymbols = this.symbols.slice(0, 30);
    topSymbols.forEach(symbol => {
      binanceWS.subscribeAggTrades(symbol, (trade) => {
        this.handleAggTrade(symbol, trade);
      });
    });

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
    console.log('🔄 Initializing CVD for top symbols...');

    const promises = symbols.map(async (symbol) => {
      try {
        const trades = await binanceAPI.getAggTrades(symbol, 1000);
        const historicalTrades: Trade[] = trades.map(t => ({
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
      } catch (error) {
        // Silently continue on error
      }
    });

    await Promise.all(promises);
    console.log('✅ CVD initialized');
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

  private async updateFromCoinGlass(): Promise<void> {
    try {
      const [fundingRates, openInterests] = await Promise.all([
        coinGlassAPI.getFundingRates(),
        coinGlassAPI.getOpenInterest(),
      ]);

      fundingRates.forEach(f => {
        const symbol = f.symbol.replace('USD', 'USDT');
        const data = this.marketData.get(symbol);
        if (data) {
          data.fundingRate = f.rate;
          data.nextFundingTime = f.nextFundingTime;
          this.marketData.set(symbol, data);
        }
      });

      openInterests.forEach(oi => {
        const symbol = oi.symbol.replace('USD', 'USDT');
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
    binanceWS.disconnect();
    this.marketData.clear();
    this.updateCallbacks.clear();
    cvdCalculator.resetAll();
    this.isInitialized = false;
  }
}

// Export singleton instance
export const hybridMarketDataService = new HybridMarketDataService();
