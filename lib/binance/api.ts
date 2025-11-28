// Binance Futures API integration
import axios from 'axios';
import type { Symbol, FundingRate, OpenInterest, TickerData } from '../types';

const BINANCE_FUTURES_API = 'https://fapi.binance.com';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
const USE_BACKEND_PROXY = true; // Set to true to use backend proxy (avoids Railway timeout)

export class BinanceAPI {
  private baseURL: string;
  private backendURL: string;

  constructor(baseURL: string = BINANCE_FUTURES_API) {
    this.baseURL = baseURL;
    this.backendURL = `${BACKEND_URL}/api/market`;
  }

  // Get all available futures symbols
  async getExchangeInfo(): Promise<Symbol[]> {
    try {
      const url = USE_BACKEND_PROXY
        ? `${this.backendURL}/exchangeInfo`
        : `${this.baseURL}/fapi/v1/exchangeInfo`;

      const response = await axios.get(url);
      return response.data.symbols
        .filter((s: any) => s.status === 'TRADING' && s.contractType === 'PERPETUAL')
        .map((s: any) => ({
          symbol: s.symbol,
          baseAsset: s.baseAsset,
          quoteAsset: s.quoteAsset,
          pricePrecision: s.pricePrecision,
          quantityPrecision: s.quantityPrecision,
        }));
    } catch (error) {
      // If backend proxy fails, try Binance directly as fallback
      if (USE_BACKEND_PROXY) {
        console.warn('⚠️ Backend proxy failed, trying Binance directly...');
        try {
          const response = await axios.get(`${this.baseURL}/fapi/v1/exchangeInfo`);
          return response.data.symbols
            .filter((s: any) => s.status === 'TRADING' && s.contractType === 'PERPETUAL')
            .map((s: any) => ({
              symbol: s.symbol,
              baseAsset: s.baseAsset,
              quoteAsset: s.quoteAsset,
              pricePrecision: s.pricePrecision,
              quantityPrecision: s.quantityPrecision,
            }));
        } catch (fallbackError) {
          console.error('❌ Binance direct fetch also failed:', fallbackError);
          throw fallbackError;
        }
      }
      console.error('Error fetching exchange info:', error);
      throw error;
    }
  }

  // Get current funding rate for all symbols
  async getFundingRates(): Promise<FundingRate[]> {
    try {
      const url = USE_BACKEND_PROXY
        ? `${this.backendURL}/funding`
        : `${this.baseURL}/fapi/v1/premiumIndex`;

      const response = await axios.get(url);
      return response.data.map((item: any) => ({
        symbol: item.symbol,
        fundingRate: parseFloat(item.lastFundingRate),
        fundingTime: item.time,
        markPrice: parseFloat(item.markPrice),
        nextFundingTime: item.nextFundingTime,
      }));
    } catch (error) {
      // If backend proxy fails, try Binance directly as fallback
      if (USE_BACKEND_PROXY) {
        console.warn('⚠️ Backend proxy failed for funding rates, trying Binance directly...');
        try {
          const response = await axios.get(`${this.baseURL}/fapi/v1/premiumIndex`);
          return response.data.map((item: any) => ({
            symbol: item.symbol,
            fundingRate: parseFloat(item.lastFundingRate),
            fundingTime: item.time,
            markPrice: parseFloat(item.markPrice),
            nextFundingTime: item.nextFundingTime,
          }));
        } catch (fallbackError) {
          console.error('❌ Binance direct fetch also failed:', fallbackError);
          throw fallbackError;
        }
      }
      console.error('Error fetching funding rates:', error);
      throw error;
    }
  }

  // Get funding rate history for a specific symbol
  async getFundingRateHistory(symbol: string, limit: number = 100): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseURL}/fapi/v1/fundingRate`, {
        params: { symbol, limit },
      });
      return response.data.map((item: any) => ({
        symbol: item.symbol,
        fundingRate: parseFloat(item.fundingRate),
        fundingTime: item.fundingTime,
      }));
    } catch (error) {
      console.error('Error fetching funding rate history:', error);
      throw error;
    }
  }

  // Get open interest for a specific symbol
  async getOpenInterest(symbol: string): Promise<OpenInterest> {
    try {
      const url = USE_BACKEND_PROXY
        ? `${this.backendURL}/openInterest/${symbol}`
        : `${this.baseURL}/fapi/v1/openInterest`;

      const response = USE_BACKEND_PROXY
        ? await axios.get(url)
        : await axios.get(url, { params: { symbol } });

      return {
        symbol: response.data.symbol,
        openInterest: parseFloat(response.data.openInterest),
        openInterestValue: 0, // Will be calculated
        timestamp: response.data.time || Date.now(),
      };
    } catch (error) {
      // If backend proxy fails, try Binance directly as fallback
      if (USE_BACKEND_PROXY) {
        console.warn(`⚠️ Backend proxy failed for OI ${symbol}, trying Binance directly...`);
        try {
          const response = await axios.get(`${this.baseURL}/fapi/v1/openInterest`, {
            params: { symbol }
          });
          return {
            symbol: response.data.symbol,
            openInterest: parseFloat(response.data.openInterest),
            openInterestValue: 0,
            timestamp: response.data.time || Date.now(),
          };
        } catch (fallbackError) {
          // If both fail, return default values instead of throwing
          console.warn(`⚠️ Both OI requests failed for ${symbol}, using defaults`);
          return {
            symbol,
            openInterest: 0,
            openInterestValue: 0,
            timestamp: Date.now(),
          };
        }
      }
      console.error('Error fetching open interest:', error);
      throw error;
    }
  }

  // Get open interest for all symbols
  async getAllOpenInterest(): Promise<OpenInterest[]> {
    try {
      const response = await axios.get(`${this.baseURL}/fapi/v1/openInterest`);
      return response.data.map((item: any) => ({
        symbol: item.symbol,
        openInterest: parseFloat(item.openInterest || 0),
        openInterestValue: 0,
        timestamp: Date.now(),
      }));
    } catch (error) {
      // Fallback: fetch symbols and get OI individually
      console.warn('Batch OI not available, using alternative method');
      return [];
    }
  }

  // Get 24hr ticker statistics
  async get24hrTicker(symbol?: string): Promise<TickerData[]> {
    try {
      const params = symbol ? { symbol } : {};
      const url = USE_BACKEND_PROXY
        ? `${this.backendURL}/ticker`
        : `${this.baseURL}/fapi/v1/ticker/24hr`;

      const response = await axios.get(url, { params });
      const data = Array.isArray(response.data) ? response.data : [response.data];

      return data.map((item: any) => ({
        symbol: item.symbol,
        price: parseFloat(item.lastPrice),
        priceChange: parseFloat(item.priceChange),
        priceChangePercent: parseFloat(item.priceChangePercent),
        volume: parseFloat(item.volume),
        quoteVolume: parseFloat(item.quoteVolume),
        high: parseFloat(item.highPrice),
        low: parseFloat(item.lowPrice),
        trades: parseInt(item.count),
      }));
    } catch (error) {
      // If backend proxy fails, try Binance directly as fallback
      if (USE_BACKEND_PROXY) {
        console.warn('⚠️ Backend proxy failed for 24hr ticker, trying Binance directly...');
        try {
          const params = symbol ? { symbol } : {};
          const response = await axios.get(`${this.baseURL}/fapi/v1/ticker/24hr`, { params });
          const data = Array.isArray(response.data) ? response.data : [response.data];

          return data.map((item: any) => ({
            symbol: item.symbol,
            price: parseFloat(item.lastPrice),
            priceChange: parseFloat(item.priceChange),
            priceChangePercent: parseFloat(item.priceChangePercent),
            volume: parseFloat(item.volume),
            quoteVolume: parseFloat(item.quoteVolume),
            high: parseFloat(item.highPrice),
            low: parseFloat(item.lowPrice),
            trades: parseInt(item.count),
          }));
        } catch (fallbackError) {
          console.error('❌ Binance direct fetch also failed:', fallbackError);
          throw fallbackError;
        }
      }
      console.error('Error fetching 24hr ticker:', error);
      throw error;
    }
  }

  // Get klines/candlestick data
  async getKlines(
    symbol: string,
    interval: string = '1m',
    limit: number = 500
  ): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseURL}/fapi/v1/klines`, {
        params: { symbol, interval, limit },
      });
      return response.data.map((kline: any) => ({
        openTime: kline[0],
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
        closeTime: kline[6],
        quoteVolume: parseFloat(kline[7]),
        trades: kline[8],
        takerBuyBaseVolume: parseFloat(kline[9]),
        takerBuyQuoteVolume: parseFloat(kline[10]),
      }));
    } catch (error) {
      console.error('Error fetching klines:', error);
      throw error;
    }
  }

  // Get aggregated trades for CVD calculation
  async getAggTrades(
    symbol: string,
    limit: number = 1000
  ): Promise<any[]> {
    try {
      const url = USE_BACKEND_PROXY
        ? `${this.backendURL}/aggTrades/${symbol}?limit=${limit}`
        : `${this.baseURL}/fapi/v1/aggTrades`;

      const response = USE_BACKEND_PROXY
        ? await axios.get(url)
        : await axios.get(url, { params: { symbol, limit } });

      return response.data.map((trade: any) => ({
        aggTradeId: trade.a,
        price: parseFloat(trade.p),
        quantity: parseFloat(trade.q),
        firstTradeId: trade.f,
        lastTradeId: trade.l,
        timestamp: trade.T,
        isBuyerMaker: trade.m,
      }));
    } catch (error) {
      // If backend proxy fails, try Binance directly as fallback
      if (USE_BACKEND_PROXY) {
        console.warn(`⚠️ Backend proxy failed for aggTrades ${symbol}, trying Binance directly...`);
        try {
          const response = await axios.get(`${this.baseURL}/fapi/v1/aggTrades`, {
            params: { symbol, limit }
          });
          return response.data.map((trade: any) => ({
            aggTradeId: trade.a,
            price: parseFloat(trade.p),
            quantity: parseFloat(trade.q),
            firstTradeId: trade.f,
            lastTradeId: trade.l,
            timestamp: trade.T,
            isBuyerMaker: trade.m,
          }));
        } catch (fallbackError) {
          // If both fail, return empty array instead of throwing
          console.warn(`⚠️ Both aggTrades requests failed for ${symbol}, returning empty`);
          return [];
        }
      }
      console.error('Error fetching agg trades:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const binanceAPI = new BinanceAPI();
