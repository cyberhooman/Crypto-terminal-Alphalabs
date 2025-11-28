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

      // Combine data (filter USDT pairs only)
      const marketData: MarketData[] = tickers
        .filter((t: any) => t.symbol.endsWith('USDT'))
        .map((ticker: any) => {
          const funding = fundingMap.get(ticker.symbol) as any;

          return {
            symbol: ticker.symbol,
            price: parseFloat(ticker.lastPrice),
            priceChange: parseFloat(ticker.priceChange),
            priceChangePercent: parseFloat(ticker.priceChangePercent),
            volume: parseFloat(ticker.volume),
            quoteVolume: parseFloat(ticker.quoteVolume),
            fundingRate: funding ? parseFloat(funding.lastFundingRate) : 0,
            nextFundingTime: funding ? funding.nextFundingTime : 0,
            openInterest: 0, // Will be fetched separately for top symbols
            openInterestValue: 0,
            cvd: 0, // Will be calculated separately
            buyVolume: 0,
            sellVolume: 0,
            high: parseFloat(ticker.highPrice),
            low: parseFloat(ticker.lowPrice),
            trades: parseInt(ticker.count),
            lastUpdate: Date.now(),
          };
        });

      console.log(`📊 Fetched ${marketData.length} market pairs`);
      return marketData;
    } catch (error) {
      console.error('❌ All API endpoints failed:', error);
      return [];
    }
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
