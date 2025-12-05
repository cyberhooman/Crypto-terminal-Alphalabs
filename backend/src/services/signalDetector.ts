// 24/7 Signal Detection Service
import axios from 'axios';
import pool from '../db/client';
import { ConfluenceDetectorV2 } from '../lib/alerts/confluenceDetectorV2';
import type { MarketData } from '../lib/types';

// Multiple API endpoints with fallback support
const API_ENDPOINTS = [
  'https://fapi.binance.com', // Primary
  'https://fapi1.binance.com', // Fallback 1
  'https://fapi2.binance.com', // Fallback 2
  'https://fapi3.binance.com', // Fallback 3
];

let currentEndpointIndex = 0;

export class SignalDetectionService {
  private detector: ConfluenceDetectorV2;
  private isRunning: boolean = false;
  private detectionInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.detector = new ConfluenceDetectorV2();
  }

  // Start 24/7 detection
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Signal detection already running');
      return;
    }

    console.log('🚀 Starting 24/7 signal detection service...');
    this.isRunning = true;

    // Run immediately
    await this.detectAndStore();

    // Run every 30 seconds
    this.detectionInterval = setInterval(async () => {
      try {
        await this.detectAndStore();
      } catch (error) {
        console.error('Error in detection cycle:', error);
      }
    }, 30000);

    console.log('✅ Signal detection service started (runs every 30s)');
  }

  // Stop detection
  stop(): void {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
    this.isRunning = false;
    console.log('⏸️  Signal detection service stopped');
  }

  // Fetch market data and detect signals
  private async detectAndStore(): Promise<void> {
    try {
      // Fetch current market data from Binance
      const marketData = await this.fetchMarketData();

      if (marketData.length === 0) {
        console.log('No market data received');
        return;
      }

      // Detect confluence patterns
      const newAlerts = this.detector.detectPatterns(marketData);

      if (newAlerts.length === 0) {
        return;
      }

      // Store new alerts in database
      for (const alert of newAlerts) {
        await this.storeAlert(alert);
      }

      console.log(`✅ Detected and stored ${newAlerts.length} new signal(s)`);
    } catch (error) {
      console.error('Error in signal detection:', error);
    }
  }

  // Fetch with automatic fallback to alternative endpoints
  private async fetchWithFallback(path: string): Promise<any> {
    const maxAttempts = API_ENDPOINTS.length;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const endpoint = API_ENDPOINTS[currentEndpointIndex];

      try {
        const response = await axios.get(`${endpoint}${path}`, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });
        return response.data;
      } catch (error: any) {
        const status = error?.response?.status;
        const isGeoBlocked = status === 451 || status === 403;

        if (isGeoBlocked) {
          console.log(`⚠️  Endpoint ${endpoint} geo-blocked (${status}), trying next...`);
          currentEndpointIndex = (currentEndpointIndex + 1) % API_ENDPOINTS.length;
        } else {
          console.error(`Error fetching from ${endpoint}:`, error.message);
          throw error;
        }
      }
    }

    throw new Error('All API endpoints failed or are geo-blocked');
  }

  // Fetch market data from Binance with fallback support
  private async fetchMarketData(): Promise<MarketData[]> {
    try {
      // Fetch 24hr ticker with fallback
      const tickers = await this.fetchWithFallback('/fapi/v1/ticker/24hr');

      // Fetch funding rates with fallback
      const fundingRates = await this.fetchWithFallback('/fapi/v1/premiumIndex');
      const fundingMap = new Map<string, any>(fundingRates.map((f: any) => [f.symbol, f]));

      // Filter and sort USDT pairs by volume to get top pairs for OI fetch
      const usdtTickers = tickers
        .filter((t: any) => t.symbol.endsWith('USDT'))
        .sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume));

      // Fetch OI for top 50 symbols (the ones that matter for signals)
      const topSymbols = usdtTickers.slice(0, 50).map((t: any) => t.symbol);
      const oiMap = await this.fetchOpenInterestBatch(topSymbols);

      // Calculate simple CVD from taker buy/sell volumes
      const marketData: MarketData[] = usdtTickers.map((ticker: any) => {
        const funding = fundingMap.get(ticker.symbol) as any;
        const oi = oiMap.get(ticker.symbol);
        const price = parseFloat(ticker.lastPrice);

        // Calculate CVD from taker buy volume difference
        const takerBuyVolume = parseFloat(ticker.takerBuyBaseAssetVolume || 0);
        const totalVolume = parseFloat(ticker.volume);
        const takerSellVolume = totalVolume - takerBuyVolume;
        const cvd = takerBuyVolume - takerSellVolume;

        return {
          symbol: ticker.symbol,
          price: price,
          priceChange: parseFloat(ticker.priceChange),
          priceChangePercent: parseFloat(ticker.priceChangePercent),
          volume: totalVolume,
          quoteVolume: parseFloat(ticker.quoteVolume),
          fundingRate: funding ? parseFloat(funding.lastFundingRate) : 0,
          nextFundingTime: funding ? funding.nextFundingTime : 0,
          openInterest: oi?.openInterest || 0,
          openInterestValue: oi ? oi.openInterest * price : 0,
          cvd: cvd,
          buyVolume: takerBuyVolume,
          sellVolume: takerSellVolume,
          high: parseFloat(ticker.highPrice),
          low: parseFloat(ticker.lowPrice),
          trades: parseInt(ticker.count),
          lastUpdate: Date.now(),
        };
      });

      const withOI = marketData.filter(d => d.openInterest > 0).length;
      const withCVD = marketData.filter(d => d.cvd !== 0).length;
      console.log(`📊 Fetched ${marketData.length} pairs (OI: ${withOI}, CVD: ${withCVD})`);
      return marketData;
    } catch (error) {
      console.error('❌ All API endpoints failed:', error);
      return [];
    }
  }

  // Fetch OI for multiple symbols in parallel batches
  private async fetchOpenInterestBatch(symbols: string[]): Promise<Map<string, { openInterest: number }>> {
    const oiMap = new Map<string, { openInterest: number }>();
    const batchSize = 10;

    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (symbol) => {
          try {
            const data = await this.fetchWithFallback(`/fapi/v1/openInterest?symbol=${symbol}`);
            return { symbol, openInterest: parseFloat(data.openInterest) };
          } catch {
            return { symbol, openInterest: 0 };
          }
        })
      );

      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.openInterest > 0) {
          oiMap.set(result.value.symbol, { openInterest: result.value.openInterest });
        }
      });

      // Small delay between batches
      if (i + batchSize < symbols.length) {
        await new Promise(r => setTimeout(r, 100));
      }
    }

    return oiMap;
  }

  // Store alert in database
  private async storeAlert(alert: any): Promise<void> {
    try {
      // Check if alert already exists (by ID)
      const existing = await pool.query(
        'SELECT id FROM confluence_alerts WHERE id = $1',
        [alert.id]
      );

      if (existing.rows.length > 0) {
        return; // Alert already stored
      }

      // Insert new alert
      await pool.query(
        `INSERT INTO confluence_alerts
         (id, symbol, setup_type, severity, title, description, signals, confluence_score, timestamp, data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          alert.id,
          alert.symbol,
          alert.setupType,
          alert.severity,
          alert.title,
          alert.description,
          JSON.stringify(alert.signals),
          alert.confluenceScore,
          alert.timestamp,
          JSON.stringify(alert.data),
        ]
      );

      console.log(`📊 Stored ${alert.severity} alert: ${alert.symbol} - ${alert.title}`);
    } catch (error) {
      console.error('Error storing alert:', error);
    }
  }
}
