// Backend-first market data service (FAST - data pre-calculated on server)
import { backendAPI } from './backendAPI';
import type { MarketData } from '../types';

export class BackendMarketDataService {
  private marketData: Map<string, MarketData> = new Map();
  private updateCallbacks: Set<(data: Map<string, MarketData>) => void> = new Set();
  private isInitialized: boolean = false;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {}

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('Backend market data service already initialized');
      return;
    }

    try {
      console.log('🚀 Connecting to backend market data service...');
      console.log('   Backend calculates CVD/OI/Signals 24/7');
      console.log('   Frontend just displays pre-calculated data');

      // Fetch initial data from backend (instant - served from memory)
      await this.fetchBackendData();

      // Poll backend every 10 seconds for updates
      this.updateInterval = setInterval(async () => {
        try {
          await this.fetchBackendData();
        } catch (error) {
          console.error('Error polling backend:', error);
        }
      }, 10000);

      this.isInitialized = true;
      console.log('✅ Backend market data service initialized');
    } catch (error) {
      console.error('❌ Failed to connect to backend:', error);
      throw error;
    }
  }

  private async fetchBackendData(): Promise<void> {
    try {
      const response = await backendAPI.getMarketData();

      if (!response || !response.data) {
        console.warn('⚠️ No data from backend');
        return;
      }

      // Update market data map
      this.marketData.clear();
      response.data.forEach((item: MarketData) => {
        this.marketData.set(item.symbol, item);
      });

      console.log(`📊 Received ${this.marketData.size} symbols from backend`);

      // Notify listeners
      this.notifyUpdate();
    } catch (error) {
      console.error('Error fetching from backend:', error);
      throw error;
    }
  }

  private notifyUpdate(): void {
    this.updateCallbacks.forEach(callback => {
      try {
        callback(this.marketData);
      } catch (error) {
        console.error('Error in update callback:', error);
      }
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

// Export singleton instance
export const backendMarketDataService = new BackendMarketDataService();
