// CoinGlass API integration for aggregated funding rates and OI
import axios from 'axios';

const COINGLASS_API = 'https://open-api.coinglass.com/public/v2';

// Note: CoinGlass requires API key for production
// Free tier: 100 requests/day
// Get your key at: https://www.coinglass.com/pricing

export interface CoinGlassFundingRate {
  symbol: string;
  rate: number;
  nextFundingTime: number;
  exchangeRates: {
    [exchange: string]: number;
  };
}

export interface CoinGlassOI {
  symbol: string;
  totalOI: number;
  totalOIValue: number;
  exchangeOI: {
    [exchange: string]: {
      value: number;
      amount: number;
    };
  };
}

export class CoinGlassAPI {
  private apiKey: string | null = null;
  private baseURL: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || null;
    this.baseURL = COINGLASS_API;
  }

  private getHeaders() {
    return this.apiKey
      ? {
          'coinglassSecret': this.apiKey,
        }
      : {};
  }

  // Get aggregated funding rates across all exchanges
  async getFundingRates(): Promise<CoinGlassFundingRate[]> {
    try {
      const response = await axios.get(`${this.baseURL}/funding`, {
        headers: this.getHeaders(),
      });

      if (!response.data || !response.data.data) {
        console.warn('CoinGlass: No funding rate data');
        return [];
      }

      return response.data.data.map((item: any) => ({
        symbol: item.symbol,
        rate: parseFloat(item.rate || 0),
        nextFundingTime: item.nextFundingTime || Date.now() + 28800000, // 8 hours
        exchangeRates: item.exchangeRates || {},
      }));
    } catch (error: any) {
      if (error.response?.status === 429) {
        console.warn('CoinGlass: Rate limit exceeded. Falling back to Binance.');
      } else {
        console.error('CoinGlass: Error fetching funding rates:', error.message);
      }
      return [];
    }
  }

  // Get aggregated open interest across all exchanges
  async getOpenInterest(): Promise<CoinGlassOI[]> {
    try {
      const response = await axios.get(`${this.baseURL}/openInterest`, {
        headers: this.getHeaders(),
      });

      if (!response.data || !response.data.data) {
        console.warn('CoinGlass: No OI data');
        return [];
      }

      return response.data.data.map((item: any) => ({
        symbol: item.symbol,
        totalOI: parseFloat(item.openInterest || 0),
        totalOIValue: parseFloat(item.openInterestValue || 0),
        exchangeOI: item.exchangeOI || {},
      }));
    } catch (error: any) {
      if (error.response?.status === 429) {
        console.warn('CoinGlass: Rate limit exceeded. Falling back to Binance.');
      } else {
        console.error('CoinGlass: Error fetching OI:', error.message);
      }
      return [];
    }
  }

  // Get funding rate for specific symbol
  async getFundingRateForSymbol(symbol: string): Promise<CoinGlassFundingRate | null> {
    try {
      const response = await axios.get(`${this.baseURL}/funding`, {
        params: { symbol },
        headers: this.getHeaders(),
      });

      if (!response.data || !response.data.data) {
        return null;
      }

      const item = response.data.data;
      return {
        symbol: item.symbol,
        rate: parseFloat(item.rate || 0),
        nextFundingTime: item.nextFundingTime || Date.now() + 28800000,
        exchangeRates: item.exchangeRates || {},
      };
    } catch (error) {
      console.error(`CoinGlass: Error fetching funding for ${symbol}:`, error);
      return null;
    }
  }

  // Get OI for specific symbol
  async getOIForSymbol(symbol: string): Promise<CoinGlassOI | null> {
    try {
      const response = await axios.get(`${this.baseURL}/openInterest`, {
        params: { symbol },
        headers: this.getHeaders(),
      });

      if (!response.data || !response.data.data) {
        return null;
      }

      const item = response.data.data;
      return {
        symbol: item.symbol,
        totalOI: parseFloat(item.openInterest || 0),
        totalOIValue: parseFloat(item.openInterestValue || 0),
        exchangeOI: item.exchangeOI || {},
      };
    } catch (error) {
      console.error(`CoinGlass: Error fetching OI for ${symbol}:`, error);
      return null;
    }
  }

  // Get liquidation data (useful for alerts)
  async getLiquidations(timeRange: '24h' | '12h' | '4h' | '1h' = '24h'): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseURL}/liquidation`, {
        params: { timeRange },
        headers: this.getHeaders(),
      });

      return response.data?.data || [];
    } catch (error) {
      console.error('CoinGlass: Error fetching liquidations:', error);
      return [];
    }
  }

  // Check if API key is valid
  async validateApiKey(): Promise<boolean> {
    if (!this.apiKey) return false;

    try {
      const response = await axios.get(`${this.baseURL}/funding`, {
        headers: this.getHeaders(),
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
// Note: Pass API key via environment variable for production
export const coinGlassAPI = new CoinGlassAPI(process.env.NEXT_PUBLIC_COINGLASS_API_KEY);
