// Market data aggregation service
import { binanceAPI } from '../binance/api';
import { binanceWS } from '../binance/websocket';
import { cvdCalculator, type Trade } from '../utils/cvd';
import type { MarketData, OpenInterest, FundingRate } from '../types';

export class MarketDataService {
  private marketData: Map<string, MarketData> = new Map();
  private symbols: string[] = [];
  private updateCallbacks: Set<(data: Map<string, MarketData>) => void> = new Set();
  private isInitialized: boolean = false;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {}

  // Initialize the service
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('Market data service already initialized');
      return;
    }

    try {
      console.log('Initializing market data service...');

      // Fetch initial data
      await this.fetchInitialData();

      // Try to connect WebSocket (non-blocking, optional)
      try {
        await binanceWS.connect();
        console.log('WebSocket connected successfully');

        // Subscribe to real-time streams
        this.subscribeToStreams();
      } catch (wsError) {
        console.warn('WebSocket connection failed (will use polling instead):', wsError);
        // Continue without WebSocket - polling will handle updates
      }

      // Start periodic updates for data that doesn't have real-time streams
      this.startPeriodicUpdates();

      this.isInitialized = true;
      console.log('Market data service initialized successfully');
    } catch (error) {
      console.error('Error initializing market data service:', error);
      throw error;
    }
  }

  // Fetch initial data
  private async fetchInitialData(): Promise<void> {
    try {
      console.log('Fetching initial data from backend proxy...');

      // Fetch data in parallel for faster loading
      const [exchangeInfo, tickers, fundingRates] = await Promise.all([
        binanceAPI.getExchangeInfo(),
        binanceAPI.get24hrTicker(),
        binanceAPI.getFundingRates(),
      ]);

      this.symbols = exchangeInfo
        .filter(s => s.quoteAsset === 'USDT') // Filter for USDT pairs
        .map(s => s.symbol);

      console.log(`Loaded ${this.symbols.length} USDT perpetual symbols`);

      const fundingMap = new Map(fundingRates.map(f => [f.symbol, f]));

      // Initialize market data (without OI and CVD for fast initial load)
      for (const ticker of tickers) {
        if (!this.symbols.includes(ticker.symbol)) continue;

        const funding = fundingMap.get(ticker.symbol);

        const marketData: MarketData = {
          symbol: ticker.symbol,
          price: ticker.price,
          priceChange: ticker.priceChange,
          priceChangePercent: ticker.priceChangePercent,
          volume: ticker.volume,
          quoteVolume: ticker.quoteVolume,
          fundingRate: funding?.fundingRate || 0,
          nextFundingTime: funding?.nextFundingTime || 0,
          openInterest: 0,
          openInterestValue: 0,
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

      console.log('Initial data fetch completed (OI and CVD will load in background)');

      // Load OI and CVD in background (non-blocking)
      this.loadSecondaryData();
    } catch (error) {
      console.error('Error fetching initial data:', error);
      throw error;
    }
  }

  // Load secondary data (OI, CVD) in background
  private async loadSecondaryData(): Promise<void> {
    try {
      console.log('Loading secondary data (OI and CVD) via backend proxy...');

      // Load OI for top 50 symbols
      const topSymbols = this.symbols.slice(0, 50);
      await this.updateOpenInterest(topSymbols);

      // Initialize CVD for top 20 symbols
      const top20 = this.symbols.slice(0, 20);
      await this.initializeCVD(top20);

      console.log('Secondary data loaded successfully');
      this.notifyUpdate();
    } catch (error) {
      console.warn('Error loading secondary data:', error);
    }
  }

  // Subscribe to real-time WebSocket streams
  private subscribeToStreams(): void {
    // Subscribe to all mini tickers for price updates
    binanceWS.subscribeAllMiniTickers((data) => {
      if (Array.isArray(data)) {
        data.forEach(ticker => this.handleMiniTickerUpdate(ticker));
      }
    });

    // Subscribe to mark price updates for funding rates
    binanceWS.subscribeMarkPriceAll((data) => {
      if (Array.isArray(data)) {
        data.forEach(markPrice => this.handleMarkPriceUpdate(markPrice));
      }
    });

    // Subscribe to agg trades for CVD calculation (top 20 symbols)
    const topSymbols = this.symbols.slice(0, 20);
    topSymbols.forEach(symbol => {
      binanceWS.subscribeAggTrades(symbol, (trade) => {
        this.handleAggTrade(symbol, trade);
      });
    });

    console.log('Subscribed to real-time streams');
  }

  // Handle mini ticker updates
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

  // Handle mark price updates (includes funding rate)
  private handleMarkPriceUpdate(markPrice: any): void {
    const data = this.marketData.get(markPrice.s);
    if (!data) return;

    data.fundingRate = parseFloat(markPrice.r);
    data.nextFundingTime = markPrice.T;
    data.lastUpdate = markPrice.E;

    this.marketData.set(markPrice.s, data);
    this.notifyUpdate();
  }

  // Handle aggregated trade for CVD calculation
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

  // Initialize CVD with historical trades
  private async initializeCVD(symbols: string[]): Promise<void> {
    console.log('Initializing CVD for top symbols...');

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
        console.error(`Error initializing CVD for ${symbol}:`, error);
      }
    });

    await Promise.all(promises);
    console.log('CVD initialization completed');
  }

  // Update open interest for symbols
  private async updateOpenInterest(symbols: string[]): Promise<void> {
    const batchSize = 10;
    const batches = [];

    for (let i = 0; i < symbols.length; i += batchSize) {
      batches.push(symbols.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const promises = batch.map(async (symbol) => {
        try {
          const oi = await binanceAPI.getOpenInterest(symbol);
          const data = this.marketData.get(symbol);

          if (data) {
            data.openInterest = oi.openInterest;
            data.openInterestValue = oi.openInterest * data.price;
            this.marketData.set(symbol, data);
          }
        } catch (error) {
          // Silently fail for individual symbols
        }
      });

      await Promise.all(promises);

      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Start periodic updates
  private startPeriodicUpdates(): void {
    // Update open interest every 30 seconds
    this.updateInterval = setInterval(() => {
      const topSymbols = this.symbols.slice(0, 50);
      this.updateOpenInterest(topSymbols).catch(console.error);
    }, 30000);
  }

  // Stop periodic updates
  private stopPeriodicUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // Notify all subscribers of data update
  private notifyUpdate(): void {
    this.updateCallbacks.forEach(callback => {
      callback(this.marketData);
    });
  }

  // Subscribe to data updates
  onUpdate(callback: (data: Map<string, MarketData>) => void): () => void {
    this.updateCallbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.updateCallbacks.delete(callback);
    };
  }

  // Get all market data
  getAllData(): MarketData[] {
    return Array.from(this.marketData.values());
  }

  // Get data for specific symbol
  getData(symbol: string): MarketData | undefined {
    return this.marketData.get(symbol);
  }

  // Get filtered data
  getFilteredData(filter: (data: MarketData) => boolean): MarketData[] {
    return Array.from(this.marketData.values()).filter(filter);
  }

  // Cleanup
  destroy(): void {
    this.stopPeriodicUpdates();
    binanceWS.disconnect();
    this.marketData.clear();
    this.updateCallbacks.clear();
    cvdCalculator.resetAll();
    this.isInitialized = false;
  }
}

// Export singleton instance
export const marketDataService = new MarketDataService();
