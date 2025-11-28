// High-Quality Confluence Pattern Detector
// Designed for fewer, higher win-rate signals
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
    fundingZScore: number; // How extreme vs historical average
    oiChange8hr: number;
    vdelta1hr: number;
    priceChange: number;
    volume24h: number;
  };
}

interface TimeSeriesData {
  timestamp: number;
  oi: number;
  cvd: number;
  price: number;
  fundingRate: number;
  volume: number;
}

export class ConfluenceDetector {
  private timeSeries: Map<string, TimeSeriesData[]> = new Map();
  private fundingRateStats: Map<string, { mean: number; stdDev: number }> = new Map();
  private lastAlertTime: Map<string, number> = new Map();
  private readonly ALERT_COOLDOWN = 2 * 60 * 60 * 1000; // 2 hours between alerts per symbol

  // Time windows (in milliseconds)
  private readonly ONE_HOUR = 60 * 60 * 1000;
  private readonly EIGHT_HOURS = 8 * 60 * 60 * 1000;
  private readonly TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  private readonly MAX_HISTORY = 48 * 60 * 60 * 1000; // Keep 48 hours of data

  // Process market data and detect confluence patterns
  detectPatterns(currentData: MarketData[]): ConfluenceAlert[] {
    const alerts: ConfluenceAlert[] = [];
    const now = Date.now();

    // Filter for high-liquidity coins only (top volume)
    const highLiquidityCoins = currentData
      .filter(d => d.quoteVolume > 10_000_000) // Min $10M 24h volume
      .sort((a, b) => b.quoteVolume - a.quoteVolume)
      .slice(0, 100); // Top 100 by volume

    for (const data of highLiquidityCoins) {
      // Update time series
      this.updateTimeSeries(data, now);

      // Update funding rate statistics
      this.updateFundingStats(data.symbol);

      // Check if we have enough historical data
      if (!this.hasEnoughHistory(data.symbol, now)) {
        continue;
      }

      // Check cooldown period
      const lastAlert = this.lastAlertTime.get(data.symbol) || 0;
      if (now - lastAlert < this.ALERT_COOLDOWN) {
        continue;
      }

      // Detect patterns (stricter criteria)
      const shortSqueezeAlert = this.detectShortSqueeze(data, now);
      if (shortSqueezeAlert) {
        alerts.push(shortSqueezeAlert);
        this.lastAlertTime.set(data.symbol, now);
        continue; // Only one alert per symbol per cycle
      }

      const longFlushAlert = this.detectLongFlush(data, now);
      if (longFlushAlert) {
        alerts.push(longFlushAlert);
        this.lastAlertTime.set(data.symbol, now);
        continue;
      }

      const capitulationAlert = this.detectCapitulation(data, now);
      if (capitulationAlert) {
        alerts.push(capitulationAlert);
        this.lastAlertTime.set(data.symbol, now);
        continue;
      }

      const divergenceAlert = this.detectDivergence(data, now);
      if (divergenceAlert) {
        alerts.push(divergenceAlert);
        this.lastAlertTime.set(data.symbol, now);
      }
    }

    // Cleanup old data
    this.cleanupOldData(now);

    // Sort by confluence score
    return alerts.sort((a, b) => b.confluenceScore - a.confluenceScore);
  }

  // Pattern 1: Short Squeeze Setup (STRICT)
  // Requires: Extreme negative funding + OI surge + Strong CVD accumulation
  private detectShortSqueeze(data: MarketData, now: number): ConfluenceAlert | null {
    const signals: string[] = [];
    let confluenceScore = 0;

    const fundingAPR = data.fundingRate * 3 * 365 * 100;
    const fundingZScore = this.calculateFundingZScore(data.symbol, data.fundingRate);
    const oiChange8hr = this.calculateOIChange(data.symbol, now, this.EIGHT_HOURS);
    const vdelta1hr = this.calculateVDelta(data.symbol, now, this.ONE_HOUR);
    const priceChange = this.calculatePriceChange(data.symbol, now, this.ONE_HOUR);

    // Signal 1: Funding rate extremely negative (dynamic threshold)
    if (fundingZScore < -2.0) { // More than 2 std devs below mean
      signals.push(`🔥 Extreme negative funding: ${(data.fundingRate * 100).toFixed(4)}% (${fundingZScore.toFixed(1)}σ)`);
      confluenceScore += 35;

      if (fundingZScore < -3.0) {
        signals.push(`💥 UNPRECEDENTED shorts crowding (${fundingZScore.toFixed(1)}σ below normal)`);
        confluenceScore += 25;
      }
    } else {
      return null; // Must have extreme funding
    }

    // Signal 2: Open Interest surging (new shorts piling in)
    if (oiChange8hr > 10) {
      signals.push(`📈 OI +${oiChange8hr.toFixed(1)}% in 8hr - New shorts entering`);
      confluenceScore += 30;

      if (oiChange8hr > 20) {
        signals.push(`⚡ MASSIVE OI surge - Short FOMO accelerating`);
        confluenceScore += 20;
      }
    }

    // Signal 3: 1hr VDelta strongly positive (hidden accumulation)
    if (vdelta1hr > 0) {
      const vdeltaPercent = (vdelta1hr / data.volume) * 100;
      if (vdeltaPercent > 5) {
        signals.push(`💪 Strong buying: +${vdeltaPercent.toFixed(1)}% buy pressure (1hr VDelta)`);
        confluenceScore += 30;

        if (vdeltaPercent > 15) {
          signals.push(`🚀 EXTREME accumulation - Whales absorbing supply`);
          confluenceScore += 25;
        }
      }
    }

    // Signal 4: Bullish divergence (price down, accumulation up)
    if (priceChange < -2 && vdelta1hr > 0) {
      signals.push(`🎯 BULLISH DIVERGENCE: Price -${Math.abs(priceChange).toFixed(1)}% but strong buying`);
      confluenceScore += 35;
    }

    // STRICT CRITERIA: Need 3+ signals AND score >= 80 for CRITICAL or >= 65 for HIGH
    if (signals.length >= 3 && confluenceScore >= 65) {
      return {
        id: `${data.symbol}-SHORT-SQUEEZE-${now}`,
        symbol: data.symbol,
        setupType: SetupType.SHORT_SQUEEZE,
        severity: confluenceScore >= 80 ? AlertSeverity.CRITICAL : AlertSeverity.HIGH,
        title: `🚀 SHORT SQUEEZE SETUP - ${data.symbol}`,
        description: 'Extreme short crowding + OI surge + hidden accumulation. High probability squeeze.',
        signals,
        confluenceScore,
        timestamp: now,
        data: {
          fundingRate: data.fundingRate,
          fundingAPR,
          fundingZScore,
          oiChange8hr,
          vdelta1hr,
          priceChange,
          volume24h: data.quoteVolume,
        },
      };
    }

    return null;
  }

  // Pattern 2: Long Flush Setup (STRICT)
  // Requires: Extreme positive funding + OI at peak + Strong selling pressure
  private detectLongFlush(data: MarketData, now: number): ConfluenceAlert | null {
    const signals: string[] = [];
    let confluenceScore = 0;

    const fundingAPR = data.fundingRate * 3 * 365 * 100;
    const fundingZScore = this.calculateFundingZScore(data.symbol, data.fundingRate);
    const oiChange8hr = this.calculateOIChange(data.symbol, now, this.EIGHT_HOURS);
    const vdelta1hr = this.calculateVDelta(data.symbol, now, this.ONE_HOUR);
    const priceChange = this.calculatePriceChange(data.symbol, now, this.ONE_HOUR);
    const oiAtPeak = this.isOIAtPeak(data.symbol, now);

    // Signal 1: Funding rate extremely positive (dynamic threshold)
    if (fundingZScore > 2.0) { // More than 2 std devs above mean
      signals.push(`🔥 Extreme positive funding: ${(data.fundingRate * 100).toFixed(4)}% (${fundingZScore.toFixed(1)}σ)`);
      confluenceScore += 35;

      if (fundingZScore > 3.0) {
        signals.push(`💥 UNPRECEDENTED longs crowding (${fundingZScore.toFixed(1)}σ above normal)`);
        confluenceScore += 25;
      }
    } else {
      return null; // Must have extreme funding
    }

    // Signal 2: OI at local peak (maximum exposure)
    if (oiAtPeak) {
      signals.push(`📊 OI at 24hr peak - Maximum long exposure reached`);
      confluenceScore += 30;
    }

    // Signal 3: 1hr VDelta strongly negative (distribution)
    if (vdelta1hr < 0) {
      const vdeltaPercent = (Math.abs(vdelta1hr) / data.volume) * 100;
      if (vdeltaPercent > 5) {
        signals.push(`📉 Heavy selling: -${vdeltaPercent.toFixed(1)}% sell pressure (1hr VDelta)`);
        confluenceScore += 30;

        if (vdeltaPercent > 15) {
          signals.push(`⚡ EXTREME distribution - Whales dumping`);
          confluenceScore += 25;
        }
      }
    }

    // Signal 4: Bearish divergence (price up, distribution)
    if (priceChange > 2 && vdelta1hr < 0) {
      signals.push(`🎯 BEARISH DIVERGENCE: Price +${priceChange.toFixed(1)}% but heavy selling`);
      confluenceScore += 35;
    }

    // STRICT CRITERIA: Need 3+ signals AND score >= 65
    if (signals.length >= 3 && confluenceScore >= 65) {
      return {
        id: `${data.symbol}-LONG-FLUSH-${now}`,
        symbol: data.symbol,
        setupType: SetupType.LONG_FLUSH,
        severity: confluenceScore >= 80 ? AlertSeverity.CRITICAL : AlertSeverity.HIGH,
        title: `⚠️ LONG FLUSH SETUP - ${data.symbol}`,
        description: 'Extreme long crowding + OI maxed + distribution. High probability liquidation cascade.',
        signals,
        confluenceScore,
        timestamp: now,
        data: {
          fundingRate: data.fundingRate,
          fundingAPR,
          fundingZScore,
          oiChange8hr,
          vdelta1hr,
          priceChange,
          volume24h: data.quoteVolume,
        },
      };
    }

    return null;
  }

  // Pattern 3: Capitulation/Reversal (STRICT)
  // Requires: Massive OI drop + Funding normalization + Absorption
  private detectCapitulation(data: MarketData, now: number): ConfluenceAlert | null {
    const signals: string[] = [];
    let confluenceScore = 0;

    const fundingAPR = data.fundingRate * 3 * 365 * 100;
    const fundingZScore = this.calculateFundingZScore(data.symbol, data.fundingRate);
    const oiChange8hr = this.calculateOIChange(data.symbol, now, this.EIGHT_HOURS);
    const vdelta1hr = this.calculateVDelta(data.symbol, now, this.ONE_HOUR);
    const priceChange = this.calculatePriceChange(data.symbol, now, this.EIGHT_HOURS);

    // Signal 1: OI collapsing (liquidation cascade)
    if (oiChange8hr < -15) {
      signals.push(`💥 OI -${Math.abs(oiChange8hr).toFixed(1)}% in 8hr - MASS LIQUIDATIONS`);
      confluenceScore += 40;

      if (oiChange8hr < -25) {
        signals.push(`🔻 EXTREME cascade event - Margin calls spreading`);
        confluenceScore += 30;
      }
    } else {
      return null; // Must have massive OI drop
    }

    // Signal 2: Funding normalizing
    if (Math.abs(fundingZScore) < 0.5) {
      signals.push(`⚖️ Funding normalizing (${fundingZScore.toFixed(2)}σ) - Overcrowding cleared`);
      confluenceScore += 25;
    }

    // Bottom capitulation
    if (priceChange < -8) {
      const vdeltaPercent = (vdelta1hr / data.volume) * 100;

      // Signal 3: Absorption (price crashes, buying emerges)
      if (vdelta1hr > 0 && vdeltaPercent > 3) {
        signals.push(`🎯 ABSORPTION: Price -${Math.abs(priceChange).toFixed(1)}% but +${vdeltaPercent.toFixed(1)}% buying (1hr)`);
        confluenceScore += 45;
      }

      if (signals.length >= 2 && confluenceScore >= 75) {
        return {
          id: `${data.symbol}-CAPITULATION-BOTTOM-${now}`,
          symbol: data.symbol,
          setupType: SetupType.CAPITULATION_BOTTOM,
          severity: AlertSeverity.CRITICAL,
          title: `🟢 CAPITULATION BOTTOM - ${data.symbol}`,
          description: 'Mass liquidations complete. Funding reset. Strong hands absorbing. Reversal likely.',
          signals,
          confluenceScore,
          timestamp: now,
          data: {
            fundingRate: data.fundingRate,
            fundingAPR,
            fundingZScore,
            oiChange8hr,
            vdelta1hr,
            priceChange,
            volume24h: data.quoteVolume,
          },
        };
      }
    }

    // Top capitulation
    if (priceChange > 8) {
      const vdeltaPercent = (Math.abs(vdelta1hr) / data.volume) * 100;

      // Signal 3: Distribution (price pumps, selling emerges)
      if (vdelta1hr < 0 && vdeltaPercent > 3) {
        signals.push(`🎯 DISTRIBUTION: Price +${priceChange.toFixed(1)}% but -${vdeltaPercent.toFixed(1)}% selling (1hr)`);
        confluenceScore += 45;
      }

      if (signals.length >= 2 && confluenceScore >= 75) {
        return {
          id: `${data.symbol}-CAPITULATION-TOP-${now}`,
          symbol: data.symbol,
          setupType: SetupType.CAPITULATION_TOP,
          severity: AlertSeverity.CRITICAL,
          title: `🔴 CAPITULATION TOP - ${data.symbol}`,
          description: 'Mass liquidations complete. Funding reset. Smart money distributing. Reversal likely.',
          signals,
          confluenceScore,
          timestamp: now,
          data: {
            fundingRate: data.fundingRate,
            fundingAPR,
            fundingZScore,
            oiChange8hr,
            vdelta1hr,
            priceChange,
            volume24h: data.quoteVolume,
          },
        };
      }
    }

    return null;
  }

  // Pattern 4: Strong Divergence (STRICT)
  private detectDivergence(data: MarketData, now: number): ConfluenceAlert | null {
    const priceChange = this.calculatePriceChange(data.symbol, now, this.EIGHT_HOURS);
    const vdelta1hr = this.calculateVDelta(data.symbol, now, this.ONE_HOUR);
    const vdeltaPercent = (Math.abs(vdelta1hr) / data.volume) * 100;

    // Bullish divergence (STRICT: Large price drop + Strong accumulation)
    if (priceChange < -5 && vdelta1hr > 0 && vdeltaPercent > 8) {
      return {
        id: `${data.symbol}-BULL-DIV-${now}`,
        symbol: data.symbol,
        setupType: SetupType.BULLISH_DIVERGENCE,
        severity: AlertSeverity.HIGH,
        title: `📈 STRONG BULLISH DIVERGENCE - ${data.symbol}`,
        description: `Price crashed ${Math.abs(priceChange).toFixed(1)}% but heavy accumulation (+${vdeltaPercent.toFixed(1)}%). Smart money buying.`,
        signals: [
          `Price down ${Math.abs(priceChange).toFixed(1)}% (8hr)`,
          `Strong buying: +${vdeltaPercent.toFixed(1)}% buy pressure (1hr)`,
          `Hidden accumulation by smart money`,
        ],
        confluenceScore: 75,
        timestamp: now,
        data: {
          fundingRate: data.fundingRate,
          fundingAPR: data.fundingRate * 3 * 365 * 100,
          fundingZScore: this.calculateFundingZScore(data.symbol, data.fundingRate),
          oiChange8hr: this.calculateOIChange(data.symbol, now, this.EIGHT_HOURS),
          vdelta1hr,
          priceChange,
          volume24h: data.quoteVolume,
        },
      };
    }

    // Bearish divergence (STRICT: Large price pump + Strong distribution)
    if (priceChange > 5 && vdelta1hr < 0 && vdeltaPercent > 8) {
      return {
        id: `${data.symbol}-BEAR-DIV-${now}`,
        symbol: data.symbol,
        setupType: SetupType.BEARISH_DIVERGENCE,
        severity: AlertSeverity.HIGH,
        title: `📉 STRONG BEARISH DIVERGENCE - ${data.symbol}`,
        description: `Price pumped ${priceChange.toFixed(1)}% but heavy distribution (-${vdeltaPercent.toFixed(1)}%). Smart money selling.`,
        signals: [
          `Price up ${priceChange.toFixed(1)}% (8hr)`,
          `Heavy selling: -${vdeltaPercent.toFixed(1)}% sell pressure (1hr)`,
          `Hidden distribution by smart money`,
        ],
        confluenceScore: 75,
        timestamp: now,
        data: {
          fundingRate: data.fundingRate,
          fundingAPR: data.fundingRate * 3 * 365 * 100,
          fundingZScore: this.calculateFundingZScore(data.symbol, data.fundingRate),
          oiChange8hr: this.calculateOIChange(data.symbol, now, this.EIGHT_HOURS),
          vdelta1hr,
          priceChange,
          volume24h: data.quoteVolume,
        },
      };
    }

    return null;
  }

  // Helper: Update time series
  private updateTimeSeries(data: MarketData, now: number): void {
    if (!this.timeSeries.has(data.symbol)) {
      this.timeSeries.set(data.symbol, []);
    }

    const series = this.timeSeries.get(data.symbol)!;
    series.push({
      timestamp: now,
      oi: data.openInterestValue,
      cvd: data.cvd,
      price: data.price,
      fundingRate: data.fundingRate,
      volume: data.volume,
    });

    // Keep only last 48 hours
    const cutoff = now - this.MAX_HISTORY;
    this.timeSeries.set(
      data.symbol,
      series.filter(d => d.timestamp > cutoff)
    );
  }

  // Helper: Check if we have enough history
  private hasEnoughHistory(symbol: string, now: number): boolean {
    const series = this.timeSeries.get(symbol);
    if (!series || series.length < 10) return false;

    // Check we have data spanning at least 8 hours
    const oldest = series[0].timestamp;
    return (now - oldest) >= this.EIGHT_HOURS;
  }

  // Helper: Calculate 8hr OI change
  private calculateOIChange(symbol: string, now: number, windowMs: number): number {
    const series = this.timeSeries.get(symbol);
    if (!series || series.length < 2) return 0;

    const cutoff = now - windowMs;
    const oldData = series.find(d => d.timestamp <= cutoff);
    const currentData = series[series.length - 1];

    if (!oldData) return 0;

    return ((currentData.oi - oldData.oi) / oldData.oi) * 100;
  }

  // Helper: Calculate 1hr Volume Delta
  private calculateVDelta(symbol: string, now: number, windowMs: number): number {
    const series = this.timeSeries.get(symbol);
    if (!series || series.length < 2) return 0;

    const cutoff = now - windowMs;
    const oldData = series.find(d => d.timestamp <= cutoff);
    const currentData = series[series.length - 1];

    if (!oldData) return 0;

    return currentData.cvd - oldData.cvd;
  }

  // Helper: Calculate price change
  private calculatePriceChange(symbol: string, now: number, windowMs: number): number {
    const series = this.timeSeries.get(symbol);
    if (!series || series.length < 2) return 0;

    const cutoff = now - windowMs;
    const oldData = series.find(d => d.timestamp <= cutoff);
    const currentData = series[series.length - 1];

    if (!oldData) return 0;

    return ((currentData.price - oldData.price) / oldData.price) * 100;
  }

  // Helper: Calculate funding rate Z-score (dynamic threshold)
  private calculateFundingZScore(symbol: string, currentFunding: number): number {
    const stats = this.fundingRateStats.get(symbol);
    if (!stats) return 0;

    return (currentFunding - stats.mean) / stats.stdDev;
  }

  // Helper: Update funding rate statistics
  private updateFundingStats(symbol: string): void {
    const series = this.timeSeries.get(symbol);
    if (!series || series.length < 10) return;

    const fundingRates = series.map(d => d.fundingRate);
    const mean = fundingRates.reduce((a, b) => a + b, 0) / fundingRates.length;
    const variance = fundingRates.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / fundingRates.length;
    const stdDev = Math.sqrt(variance);

    this.fundingRateStats.set(symbol, { mean, stdDev: Math.max(stdDev, 0.0001) }); // Prevent div by 0
  }

  // Helper: Check if OI is at 24hr peak
  private isOIAtPeak(symbol: string, now: number): boolean {
    const series = this.timeSeries.get(symbol);
    if (!series) return false;

    const cutoff = now - this.TWENTY_FOUR_HOURS;
    const last24h = series.filter(d => d.timestamp > cutoff);
    if (last24h.length < 10) return false;

    const currentOI = series[series.length - 1].oi;
    const maxOI = Math.max(...last24h.map(d => d.oi));

    return currentOI >= maxOI * 0.98; // Within 2% of 24hr peak
  }

  // Helper: Cleanup old data
  private cleanupOldData(now: number): void {
    const cutoff = now - this.MAX_HISTORY;

    for (const [symbol, series] of this.timeSeries.entries()) {
      const filtered = series.filter(d => d.timestamp > cutoff);
      if (filtered.length === 0) {
        this.timeSeries.delete(symbol);
        this.fundingRateStats.delete(symbol);
        this.lastAlertTime.delete(symbol);
      } else {
        this.timeSeries.set(symbol, filtered);
      }
    }
  }

  reset(): void {
    this.timeSeries.clear();
    this.fundingRateStats.clear();
    this.lastAlertTime.clear();
  }
}

// Export singleton
export const confluenceDetector = new ConfluenceDetector();
