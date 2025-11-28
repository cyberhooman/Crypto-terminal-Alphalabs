// Advanced confluence pattern detector for high-probability setups
import type { MarketData } from '../types';

export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum SetupType {
  SHORT_SQUEEZE = 'SHORT_SQUEEZE',
  LONG_FLUSH = 'LONG_FLUSH',
  CAPITULATION_BOTTOM = 'CAPITULATION_BOTTOM',
  CAPITULATION_TOP = 'CAPITULATION_TOP',
  BULLISH_DIVERGENCE = 'BULLISH_DIVERGENCE',
  BEARISH_DIVERGENCE = 'BEARISH_DIVERGENCE',
}

export interface ConfluenceAlert {
  id: string;
  symbol: string;
  setupType: SetupType;
  severity: AlertSeverity;
  title: string;
  description: string;
  signals: string[];
  confluenceScore: number; // 0-100
  timestamp: number;
  data: {
    fundingRate: number;
    fundingAPR: number;
    oiChange: number;
    cvdTrend: 'UP' | 'DOWN' | 'NEUTRAL';
    priceChange: number;
  };
}

export class ConfluenceDetector {
  private previousData: Map<string, MarketData> = new Map();
  private oiHistory: Map<string, number[]> = new Map();
  private cvdHistory: Map<string, number[]> = new Map();
  private priceHistory: Map<string, number[]> = new Map();
  private readonly historyLimit = 20; // Keep last 20 data points

  // Process market data and detect confluence patterns
  detectPatterns(currentData: MarketData[]): ConfluenceAlert[] {
    const alerts: ConfluenceAlert[] = [];

    for (const data of currentData) {
      // Update histories
      this.updateHistories(data);

      // Only analyze if we have enough history
      if (!this.hasEnoughHistory(data.symbol)) {
        this.previousData.set(data.symbol, data);
        continue;
      }

      // Detect each pattern type
      const shortSqueezeAlert = this.detectShortSqueeze(data);
      if (shortSqueezeAlert) alerts.push(shortSqueezeAlert);

      const longFlushAlert = this.detectLongFlush(data);
      if (longFlushAlert) alerts.push(longFlushAlert);

      const capitulationAlert = this.detectCapitulation(data);
      if (capitulationAlert) alerts.push(capitulationAlert);

      const divergenceAlert = this.detectDivergence(data);
      if (divergenceAlert) alerts.push(divergenceAlert);

      // Store current data for next iteration
      this.previousData.set(data.symbol, data);
    }

    // Sort by severity and confluence score
    return alerts.sort((a, b) => {
      const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      return b.confluenceScore - a.confluenceScore;
    });
  }

  // Pattern 1: Short Squeeze Setup
  // - Funding deeply negative (shorts overcrowded)
  // - OI rising (new positions building)
  // - CVD trending up or diverging bullish
  private detectShortSqueeze(data: MarketData): ConfluenceAlert | null {
    const signals: string[] = [];
    let confluenceScore = 0;

    const fundingAPR = data.fundingRate * 3 * 365 * 100; // Annualized %
    const oiChange = this.calculateOIChange(data.symbol);
    const cvdTrend = this.calculateCVDTrend(data.symbol);

    // Check: Funding deeply negative
    if (data.fundingRate < -0.0003) {
      signals.push(`⚠️ Deeply negative funding: ${(fundingAPR).toFixed(1)}% APR`);
      confluenceScore += 30;

      if (data.fundingRate < -0.0005) {
        signals.push(`🔥 EXTREME negative funding: Shorts very crowded`);
        confluenceScore += 20;
      }
    }

    // Check: OI rising
    if (oiChange > 5) {
      signals.push(`📈 OI rising ${oiChange.toFixed(1)}% - New positions building`);
      confluenceScore += 25;
    }

    // Check: CVD trending up (bullish)
    if (cvdTrend === 'UP') {
      signals.push(`💪 CVD trending up - Buyers accumulating`);
      confluenceScore += 25;
    }

    // Check: Price declining while CVD rising (bullish divergence)
    const priceChange = this.calculatePriceChange(data.symbol);
    if (priceChange < -2 && cvdTrend === 'UP') {
      signals.push(`🎯 BULLISH DIVERGENCE: Price down ${priceChange.toFixed(1)}% but CVD rising`);
      confluenceScore += 30;
    }

    // Must have at least 2 signals and score > 50
    if (signals.length >= 2 && confluenceScore >= 50) {
      return {
        id: `${data.symbol}-SHORT-SQUEEZE-${Date.now()}`,
        symbol: data.symbol,
        setupType: SetupType.SHORT_SQUEEZE,
        severity: confluenceScore >= 80 ? AlertSeverity.CRITICAL :
                  confluenceScore >= 65 ? AlertSeverity.HIGH : AlertSeverity.MEDIUM,
        title: `🚀 SHORT SQUEEZE SETUP - ${data.symbol}`,
        description: 'High probability short squeeze forming. Shorts overcrowded, OI building, buyers stepping in.',
        signals,
        confluenceScore,
        timestamp: Date.now(),
        data: {
          fundingRate: data.fundingRate,
          fundingAPR,
          oiChange,
          cvdTrend,
          priceChange,
        },
      };
    }

    return null;
  }

  // Pattern 2: Long Flush Setup
  // - Funding extremely positive (longs overcrowded)
  // - OI at local highs (max exposure)
  // - CVD diverging bearish (price up, CVD flat/down)
  private detectLongFlush(data: MarketData): ConfluenceAlert | null {
    const signals: string[] = [];
    let confluenceScore = 0;

    const fundingAPR = data.fundingRate * 3 * 365 * 100;
    const oiChange = this.calculateOIChange(data.symbol);
    const cvdTrend = this.calculateCVDTrend(data.symbol);
    const oiAtHighs = this.isOIAtLocalHigh(data.symbol);

    // Check: Funding extremely positive
    if (data.fundingRate > 0.0003) {
      signals.push(`⚠️ High positive funding: ${fundingAPR.toFixed(1)}% APR`);
      confluenceScore += 30;

      if (data.fundingRate > 0.0005) {
        signals.push(`🔥 EXTREME positive funding: Longs very crowded`);
        confluenceScore += 20;
      }
    }

    // Check: OI at local highs
    if (oiAtHighs) {
      signals.push(`📊 OI at local highs - Maximum exposure reached`);
      confluenceScore += 30;
    }

    // Check: CVD diverging bearish
    const priceChange = this.calculatePriceChange(data.symbol);
    if (priceChange > 2 && (cvdTrend === 'DOWN' || cvdTrend === 'NEUTRAL')) {
      signals.push(`🎯 BEARISH DIVERGENCE: Price up ${priceChange.toFixed(1)}% but CVD ${cvdTrend.toLowerCase()}`);
      confluenceScore += 35;
    }

    // Check: CVD declining
    if (cvdTrend === 'DOWN') {
      signals.push(`📉 CVD trending down - Sellers dominating`);
      confluenceScore += 20;
    }

    // Must have at least 2 signals and score > 50
    if (signals.length >= 2 && confluenceScore >= 50) {
      return {
        id: `${data.symbol}-LONG-FLUSH-${Date.now()}`,
        symbol: data.symbol,
        setupType: SetupType.LONG_FLUSH,
        severity: confluenceScore >= 80 ? AlertSeverity.CRITICAL :
                  confluenceScore >= 65 ? AlertSeverity.HIGH : AlertSeverity.MEDIUM,
        title: `⚠️ LONG FLUSH SETUP - ${data.symbol}`,
        description: 'High probability long liquidation. Longs overcrowded, OI maxed, sellers taking control.',
        signals,
        confluenceScore,
        timestamp: Date.now(),
        data: {
          fundingRate: data.fundingRate,
          fundingAPR,
          oiChange,
          cvdTrend,
          priceChange,
        },
      };
    }

    return null;
  }

  // Pattern 3: Capitulation/Reversal Setup
  // - OI dropping sharply (liquidations)
  // - Funding resetting toward neutral
  // - CVD showing absorption (falling price, rising CVD)
  private detectCapitulation(data: MarketData): ConfluenceAlert | null {
    const signals: string[] = [];
    let confluenceScore = 0;

    const fundingAPR = data.fundingRate * 3 * 365 * 100;
    const oiChange = this.calculateOIChange(data.symbol);
    const cvdTrend = this.calculateCVDTrend(data.symbol);
    const priceChange = this.calculatePriceChange(data.symbol);
    const fundingNormalizing = this.isFundingNormalizing(data.symbol);

    // Check: OI dropping sharply (liquidations)
    if (oiChange < -8) {
      signals.push(`🔻 OI dropping ${Math.abs(oiChange).toFixed(1)}% - Mass liquidations!`);
      confluenceScore += 35;

      if (oiChange < -15) {
        signals.push(`💥 EXTREME liquidations - Cascade event`);
        confluenceScore += 25;
      }
    }

    // Check: Funding normalizing
    if (fundingNormalizing) {
      signals.push(`⚖️ Funding resetting to neutral - Overcrowding clearing`);
      confluenceScore += 25;
    }

    // Determine if bottom or top capitulation
    const isBottomCapitulation = priceChange < -5;
    const isTopCapitulation = priceChange > 5;

    if (isBottomCapitulation) {
      // Bottom capitulation: Price falling, CVD rising (absorption)
      if (cvdTrend === 'UP') {
        signals.push(`🎯 ABSORPTION: Price down ${Math.abs(priceChange).toFixed(1)}% but CVD rising - Bottom forming`);
        confluenceScore += 40;
      }

      if (signals.length >= 2 && confluenceScore >= 60) {
        return {
          id: `${data.symbol}-CAPITULATION-BOTTOM-${Date.now()}`,
          symbol: data.symbol,
          setupType: SetupType.CAPITULATION_BOTTOM,
          severity: AlertSeverity.CRITICAL,
          title: `🟢 CAPITULATION BOTTOM - ${data.symbol}`,
          description: 'Potential bottom forming. Liquidations clearing, funding normalizing, buyers absorbing.',
          signals,
          confluenceScore,
          timestamp: Date.now(),
          data: {
            fundingRate: data.fundingRate,
            fundingAPR,
            oiChange,
            cvdTrend,
            priceChange,
          },
        };
      }
    }

    if (isTopCapitulation) {
      // Top capitulation: Price rising, CVD falling (distribution)
      if (cvdTrend === 'DOWN') {
        signals.push(`🎯 DISTRIBUTION: Price up ${priceChange.toFixed(1)}% but CVD falling - Top forming`);
        confluenceScore += 40;
      }

      if (signals.length >= 2 && confluenceScore >= 60) {
        return {
          id: `${data.symbol}-CAPITULATION-TOP-${Date.now()}`,
          symbol: data.symbol,
          setupType: SetupType.CAPITULATION_TOP,
          severity: AlertSeverity.CRITICAL,
          title: `🔴 CAPITULATION TOP - ${data.symbol}`,
          description: 'Potential top forming. Liquidations clearing, funding normalizing, sellers distributing.',
          signals,
          confluenceScore,
          timestamp: Date.now(),
          data: {
            fundingRate: data.fundingRate,
            fundingAPR,
            oiChange,
            cvdTrend,
            priceChange,
          },
        };
      }
    }

    return null;
  }

  // Pattern 4: Divergence Detection
  private detectDivergence(data: MarketData): ConfluenceAlert | null {
    const priceChange = this.calculatePriceChange(data.symbol);
    const cvdTrend = this.calculateCVDTrend(data.symbol);

    // Bullish divergence: Price down, CVD up
    if (priceChange < -3 && cvdTrend === 'UP') {
      return {
        id: `${data.symbol}-BULL-DIV-${Date.now()}`,
        symbol: data.symbol,
        setupType: SetupType.BULLISH_DIVERGENCE,
        severity: AlertSeverity.HIGH,
        title: `📈 BULLISH DIVERGENCE - ${data.symbol}`,
        description: `Price down ${Math.abs(priceChange).toFixed(1)}% but CVD rising - Hidden buying`,
        signals: [
          `Price declining: ${priceChange.toFixed(1)}%`,
          `CVD trending up - Buyers accumulating`,
        ],
        confluenceScore: 70,
        timestamp: Date.now(),
        data: {
          fundingRate: data.fundingRate,
          fundingAPR: data.fundingRate * 3 * 365 * 100,
          oiChange: this.calculateOIChange(data.symbol),
          cvdTrend,
          priceChange,
        },
      };
    }

    // Bearish divergence: Price up, CVD down
    if (priceChange > 3 && cvdTrend === 'DOWN') {
      return {
        id: `${data.symbol}-BEAR-DIV-${Date.now()}`,
        symbol: data.symbol,
        setupType: SetupType.BEARISH_DIVERGENCE,
        severity: AlertSeverity.HIGH,
        title: `📉 BEARISH DIVERGENCE - ${data.symbol}`,
        description: `Price up ${priceChange.toFixed(1)}% but CVD falling - Hidden selling`,
        signals: [
          `Price rising: ${priceChange.toFixed(1)}%`,
          `CVD trending down - Sellers distributing`,
        ],
        confluenceScore: 70,
        timestamp: Date.now(),
        data: {
          fundingRate: data.fundingRate,
          fundingAPR: data.fundingRate * 3 * 365 * 100,
          oiChange: this.calculateOIChange(data.symbol),
          cvdTrend,
          priceChange,
        },
      };
    }

    return null;
  }

  // Helper methods
  private updateHistories(data: MarketData): void {
    // Update OI history
    if (!this.oiHistory.has(data.symbol)) {
      this.oiHistory.set(data.symbol, []);
    }
    const oiHist = this.oiHistory.get(data.symbol)!;
    oiHist.push(data.openInterestValue);
    if (oiHist.length > this.historyLimit) oiHist.shift();

    // Update CVD history
    if (!this.cvdHistory.has(data.symbol)) {
      this.cvdHistory.set(data.symbol, []);
    }
    const cvdHist = this.cvdHistory.get(data.symbol)!;
    cvdHist.push(data.cvd);
    if (cvdHist.length > this.historyLimit) cvdHist.shift();

    // Update price history
    if (!this.priceHistory.has(data.symbol)) {
      this.priceHistory.set(data.symbol, []);
    }
    const priceHist = this.priceHistory.get(data.symbol)!;
    priceHist.push(data.price);
    if (priceHist.length > this.historyLimit) priceHist.shift();
  }

  private hasEnoughHistory(symbol: string): boolean {
    return (
      (this.oiHistory.get(symbol)?.length || 0) >= 5 &&
      (this.cvdHistory.get(symbol)?.length || 0) >= 5 &&
      (this.priceHistory.get(symbol)?.length || 0) >= 5
    );
  }

  private calculateOIChange(symbol: string): number {
    const history = this.oiHistory.get(symbol);
    if (!history || history.length < 5) return 0;

    const current = history[history.length - 1];
    const previous = history[history.length - 6] || history[0];

    return ((current - previous) / previous) * 100;
  }

  private calculateCVDTrend(symbol: string): 'UP' | 'DOWN' | 'NEUTRAL' {
    const history = this.cvdHistory.get(symbol);
    if (!history || history.length < 5) return 'NEUTRAL';

    const recent = history.slice(-5);
    const slope = this.calculateSlope(recent);

    if (slope > 0.1) return 'UP';
    if (slope < -0.1) return 'DOWN';
    return 'NEUTRAL';
  }

  private calculatePriceChange(symbol: string): number {
    const history = this.priceHistory.get(symbol);
    if (!history || history.length < 5) return 0;

    const current = history[history.length - 1];
    const previous = history[history.length - 6] || history[0];

    return ((current - previous) / previous) * 100;
  }

  private isOIAtLocalHigh(symbol: string): boolean {
    const history = this.oiHistory.get(symbol);
    if (!history || history.length < 10) return false;

    const current = history[history.length - 1];
    const max = Math.max(...history.slice(-10));

    return current >= max * 0.98; // Within 2% of local high
  }

  private isFundingNormalizing(symbol: string): boolean {
    const prev = this.previousData.get(symbol);
    if (!prev) return false;

    const current = this.previousData.get(symbol);
    if (!current) return false;

    const prevAbs = Math.abs(prev.fundingRate);
    const currentAbs = Math.abs(current.fundingRate);

    return currentAbs < prevAbs && currentAbs < 0.0002;
  }

  private calculateSlope(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = values.reduce((sum, _, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  reset(): void {
    this.previousData.clear();
    this.oiHistory.clear();
    this.cvdHistory.clear();
    this.priceHistory.clear();
  }
}

// Export singleton
export const confluenceDetector = new ConfluenceDetector();
