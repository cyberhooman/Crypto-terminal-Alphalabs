// Cumulative Volume Delta (CVD) calculation engine
import type { CVDData } from '../types';

export interface Trade {
  price: number;
  quantity: number;
  timestamp: number;
  isBuyerMaker: boolean;
}

export class CVDCalculator {
  private cvdCache: Map<string, CVDData> = new Map();
  private tradeHistory: Map<string, Trade[]> = new Map();
  private maxHistorySize: number = 10000;

  constructor(maxHistorySize: number = 10000) {
    this.maxHistorySize = maxHistorySize;
  }

  // Process a new trade and update CVD
  processTrade(symbol: string, trade: Trade): CVDData {
    // Get or initialize trade history
    if (!this.tradeHistory.has(symbol)) {
      this.tradeHistory.set(symbol, []);
    }

    const history = this.tradeHistory.get(symbol)!;
    history.push(trade);

    // Limit history size
    if (history.length > this.maxHistorySize) {
      history.shift();
    }

    // Get current CVD or initialize
    const currentCVD = this.cvdCache.get(symbol) || {
      symbol,
      cvd: 0,
      buyVolume: 0,
      sellVolume: 0,
      totalVolume: 0,
      timestamp: Date.now(),
    };

    // Calculate volume delta for this trade
    // isBuyerMaker = true means the buyer is the maker (passive), so it's a sell
    // isBuyerMaker = false means the buyer is the taker (aggressive), so it's a buy
    const volume = trade.quantity;
    const delta = trade.isBuyerMaker ? -volume : volume;

    // Update CVD
    const updatedCVD: CVDData = {
      symbol,
      cvd: currentCVD.cvd + delta,
      buyVolume: trade.isBuyerMaker ? currentCVD.buyVolume : currentCVD.buyVolume + volume,
      sellVolume: trade.isBuyerMaker ? currentCVD.sellVolume + volume : currentCVD.sellVolume,
      totalVolume: currentCVD.totalVolume + volume,
      timestamp: trade.timestamp,
    };

    this.cvdCache.set(symbol, updatedCVD);
    return updatedCVD;
  }

  // Calculate CVD from historical trades
  calculateHistoricalCVD(symbol: string, trades: Trade[]): CVDData {
    let cvd = 0;
    let buyVolume = 0;
    let sellVolume = 0;
    let totalVolume = 0;

    for (const trade of trades) {
      const volume = trade.quantity;
      const delta = trade.isBuyerMaker ? -volume : volume;

      cvd += delta;
      totalVolume += volume;

      if (trade.isBuyerMaker) {
        sellVolume += volume;
      } else {
        buyVolume += volume;
      }
    }

    const cvdData: CVDData = {
      symbol,
      cvd,
      buyVolume,
      sellVolume,
      totalVolume,
      timestamp: trades[trades.length - 1]?.timestamp || Date.now(),
    };

    this.cvdCache.set(symbol, cvdData);
    this.tradeHistory.set(symbol, trades.slice(-this.maxHistorySize));

    return cvdData;
  }

  // Get current CVD for a symbol
  getCVD(symbol: string): CVDData | undefined {
    return this.cvdCache.get(symbol);
  }

  // Get CVD for time window (last N trades)
  getCVDForWindow(symbol: string, windowSize: number): CVDData | null {
    const history = this.tradeHistory.get(symbol);
    if (!history || history.length === 0) {
      return null;
    }

    const windowTrades = history.slice(-windowSize);
    return this.calculateCVDFromTrades(symbol, windowTrades);
  }

  // Get CVD for time period (milliseconds)
  getCVDForTimePeriod(symbol: string, periodMs: number): CVDData | null {
    const history = this.tradeHistory.get(symbol);
    if (!history || history.length === 0) {
      return null;
    }

    const now = Date.now();
    const cutoff = now - periodMs;
    const periodTrades = history.filter(trade => trade.timestamp >= cutoff);

    if (periodTrades.length === 0) {
      return null;
    }

    return this.calculateCVDFromTrades(symbol, periodTrades);
  }

  // Helper to calculate CVD from trade array
  private calculateCVDFromTrades(symbol: string, trades: Trade[]): CVDData {
    let cvd = 0;
    let buyVolume = 0;
    let sellVolume = 0;
    let totalVolume = 0;

    for (const trade of trades) {
      const volume = trade.quantity;
      const delta = trade.isBuyerMaker ? -volume : volume;

      cvd += delta;
      totalVolume += volume;

      if (trade.isBuyerMaker) {
        sellVolume += volume;
      } else {
        buyVolume += volume;
      }
    }

    return {
      symbol,
      cvd,
      buyVolume,
      sellVolume,
      totalVolume,
      timestamp: trades[trades.length - 1]?.timestamp || Date.now(),
    };
  }

  // Calculate CVD momentum (rate of change)
  getCVDMomentum(symbol: string, periodMs: number = 60000): number {
    const history = this.tradeHistory.get(symbol);
    if (!history || history.length < 2) {
      return 0;
    }

    const now = Date.now();
    const cutoff = now - periodMs;

    // Get CVD at start and end of period
    const periodTrades = history.filter(trade => trade.timestamp >= cutoff);
    if (periodTrades.length < 2) {
      return 0;
    }

    const startTrades = periodTrades.slice(0, Math.floor(periodTrades.length / 2));
    const endTrades = periodTrades.slice(Math.floor(periodTrades.length / 2));

    const startCVD = this.calculateCVDFromTrades(symbol, startTrades).cvd;
    const endCVD = this.calculateCVDFromTrades(symbol, endTrades).cvd;

    return endCVD - startCVD;
  }

  // Get buy/sell ratio
  getBuySellRatio(symbol: string): number {
    const cvdData = this.cvdCache.get(symbol);
    if (!cvdData || cvdData.sellVolume === 0) {
      return 0;
    }
    return cvdData.buyVolume / cvdData.sellVolume;
  }

  // Reset CVD for a symbol
  reset(symbol: string) {
    this.cvdCache.delete(symbol);
    this.tradeHistory.delete(symbol);
  }

  // Reset all CVD data
  resetAll() {
    this.cvdCache.clear();
    this.tradeHistory.clear();
  }

  // Get all symbols with CVD data
  getSymbols(): string[] {
    return Array.from(this.cvdCache.keys());
  }

  // Get trade count for a symbol
  getTradeCount(symbol: string): number {
    return this.tradeHistory.get(symbol)?.length || 0;
  }
}

// Export singleton instance
export const cvdCalculator = new CVDCalculator();
