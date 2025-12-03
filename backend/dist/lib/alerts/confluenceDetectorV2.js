"use strict";
// High Win-Rate Confluence Detector - Percentile-Based Scoring
// Based on Opus 4.5 recommendations for maximum signal quality
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfluenceDetectorV2 = exports.SetupType = exports.AlertSeverity = void 0;
var AlertSeverity;
(function (AlertSeverity) {
    AlertSeverity["LOW"] = "LOW";
    AlertSeverity["MEDIUM"] = "MEDIUM";
    AlertSeverity["HIGH"] = "HIGH";
    AlertSeverity["CRITICAL"] = "CRITICAL";
})(AlertSeverity || (exports.AlertSeverity = AlertSeverity = {}));
var SetupType;
(function (SetupType) {
    SetupType["SHORT_SQUEEZE"] = "SHORT_SQUEEZE";
    SetupType["LONG_FLUSH"] = "LONG_FLUSH";
    SetupType["CAPITULATION_REVERSAL"] = "CAPITULATION_REVERSAL";
})(SetupType || (exports.SetupType = SetupType = {}));
class ConfluenceDetectorV2 {
    constructor() {
        this.timeSeries = new Map();
        this.lastAlertTime = new Map();
        // Configuration
        this.ALERT_COOLDOWN = 4 * 60 * 60 * 1000; // 4 hours (6 signals/day max per symbol)
        this.LOOKBACK_WINDOW = 30 * 24 * 60 * 60 * 1000; // 30 days for percentiles
        this.MIN_OI_VALUE = 10000000; // $10M minimum OI
        this.MIN_VOLUME = 50000000; // $50M 24h volume
        this.SCORE_THRESHOLD = 75; // Minimum 75/100 to alert
        // Time windows
        this.ONE_HOUR = 60 * 60 * 1000;
        this.FOUR_HOURS = 4 * 60 * 60 * 1000;
        this.EIGHT_HOURS = 8 * 60 * 60 * 1000;
        this.TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    }
    // Main detection entry point
    detectPatterns(currentData) {
        const alerts = [];
        const now = Date.now();
        // Filter: Only liquid pairs with sufficient OI
        const liquidPairs = currentData
            .filter(d => d.quoteVolume > this.MIN_VOLUME &&
            d.openInterestValue > this.MIN_OI_VALUE)
            .sort((a, b) => b.openInterestValue - a.openInterestValue)
            .slice(0, 20); // Top 20 by OI only
        console.log(`🔍 Analyzing ${liquidPairs.length} liquid pairs for confluence patterns`);
        for (const data of liquidPairs) {
            // Update time series
            this.updateTimeSeries(data, now);
            // Check cooldown
            const lastAlert = this.lastAlertTime.get(data.symbol) || 0;
            if (now - lastAlert < this.ALERT_COOLDOWN) {
                continue;
            }
            // Need at least 7 days of history for percentile calculation
            if (!this.hasMinimumHistory(data.symbol, now)) {
                continue;
            }
            // Calculate percentiles
            const fundingPercentile = this.calculateFundingPercentile(data.symbol, data.fundingRate);
            const oiStats = this.calculateOIStats(data.symbol, now);
            // Detect patterns using percentile-based scoring
            const shortSqueeze = this.detectShortSqueeze(data, fundingPercentile, oiStats, now);
            if (shortSqueeze && shortSqueeze.confluenceScore >= this.SCORE_THRESHOLD) {
                alerts.push(shortSqueeze);
                this.lastAlertTime.set(data.symbol, now);
                continue; // One alert per symbol per cycle
            }
            const longFlush = this.detectLongFlush(data, fundingPercentile, oiStats, now);
            if (longFlush && longFlush.confluenceScore >= this.SCORE_THRESHOLD) {
                alerts.push(longFlush);
                this.lastAlertTime.set(data.symbol, now);
                continue;
            }
            const capitulation = this.detectCapitulation(data, oiStats, now);
            if (capitulation && capitulation.confluenceScore >= this.SCORE_THRESHOLD) {
                alerts.push(capitulation);
                this.lastAlertTime.set(data.symbol, now);
            }
        }
        // Cleanup old data
        this.cleanupOldData(now);
        console.log(`✅ Generated ${alerts.length} high-quality confluence alerts`);
        return alerts.sort((a, b) => b.confluenceScore - a.confluenceScore);
    }
    // SHORT SQUEEZE: Negative funding + OI surge + CVD absorption
    detectShortSqueeze(data, fundingPercentile, oiStats, now) {
        const signals = [];
        let score = 0;
        const fundingAPR = data.fundingRate * 3 * 365 * 100;
        const oiChange8hr = this.calculateOIChange(data.symbol, now, this.EIGHT_HOURS);
        const vdelta1hr = this.calculateVDelta(data.symbol, now, this.ONE_HOUR);
        const priceChange = this.calculatePriceChange(data.symbol, now, this.ONE_HOUR);
        // Signal 1: Funding in bottom 10th percentile (extreme negative)
        if (fundingPercentile <= 10) {
            signals.push(`🔥 Funding at ${fundingPercentile.toFixed(0)}th percentile: ${(data.fundingRate * 100).toFixed(4)}%`);
            score += 30;
            if (fundingPercentile <= 5) {
                signals.push(`💥 EXTREME shorts crowding (bottom 5% historically)`);
                score += 10;
            }
        }
        else {
            return null; // Must have extreme funding
        }
        // Signal 2: OI rising >5% in 8hr (new shorts entering)
        if (oiChange8hr > 5) {
            signals.push(`📈 OI +${oiChange8hr.toFixed(1)}% in 8hr (shorts piling in)`);
            score += 25;
            if (oiChange8hr > 10) {
                signals.push(`⚡ MASSIVE OI surge: ${oiChange8hr.toFixed(1)}%`);
                score += 10;
            }
        }
        // Signal 3: CVD Divergence (price down, CVD up = absorption)
        if (priceChange < 0 && vdelta1hr > 0) {
            const vdeltaPercent = (vdelta1hr / data.volume) * 100;
            if (vdeltaPercent > 3) {
                signals.push(`💪 BULLISH DIVERGENCE: Price ${priceChange.toFixed(1)}% but VDelta +${vdeltaPercent.toFixed(1)}%`);
                score += 25;
                if (vdeltaPercent > 10) {
                    signals.push(`🚀 Whale accumulation: ${vdeltaPercent.toFixed(1)}% buy pressure`);
                    score += 10;
                }
            }
        }
        // Signal 4: Funding momentum (getting MORE negative)
        const fundingMomentum = this.calculateFundingMomentum(data.symbol, now);
        if (fundingMomentum < -0.00005) {
            signals.push(`📉 Funding momentum: ${(fundingMomentum * 100).toFixed(5)}% (accelerating)`);
            score += 10;
        }
        // Require at least 3 signals and score >= 75
        if (signals.length >= 3 && score >= 75) {
            const severity = score >= 90 ? AlertSeverity.CRITICAL : AlertSeverity.HIGH;
            return {
                id: `${data.symbol}-SHORT-SQUEEZE-${now}`,
                symbol: data.symbol,
                setupType: SetupType.SHORT_SQUEEZE,
                severity,
                title: `🚀 SHORT SQUEEZE SETUP - ${data.symbol}`,
                description: `Score: ${score}/100. Extreme short crowding + confluence signals. High probability squeeze incoming.`,
                signals,
                confluenceScore: score,
                timestamp: now,
                data: {
                    fundingRate: data.fundingRate,
                    fundingAPR,
                    fundingPercentile,
                    oiChange8hr,
                    oiPercentile: 0,
                    vdelta1hr,
                    priceChange,
                    volume24h: data.quoteVolume,
                },
            };
        }
        return null;
    }
    // LONG FLUSH: Positive funding + OI peak + CVD distribution
    detectLongFlush(data, fundingPercentile, oiStats, now) {
        const signals = [];
        let score = 0;
        const fundingAPR = data.fundingRate * 3 * 365 * 100;
        const oiChange8hr = this.calculateOIChange(data.symbol, now, this.EIGHT_HOURS);
        const vdelta1hr = this.calculateVDelta(data.symbol, now, this.ONE_HOUR);
        const priceChange = this.calculatePriceChange(data.symbol, now, this.ONE_HOUR);
        // Signal 1: Funding in top 90th percentile (extreme positive)
        if (fundingPercentile >= 90) {
            signals.push(`🔥 Funding at ${fundingPercentile.toFixed(0)}th percentile: ${(data.fundingRate * 100).toFixed(4)}%`);
            score += 30;
            if (fundingPercentile >= 95) {
                signals.push(`💥 EXTREME longs crowding (top 5% historically)`);
                score += 10;
            }
        }
        else {
            return null; // Must have extreme funding
        }
        // Signal 2: OI at local high (above 1σ of mean)
        const currentOI = data.openInterestValue;
        if (currentOI > oiStats.mean + oiStats.stdDev) {
            signals.push(`📊 OI at local high: $${(currentOI / 1e6).toFixed(1)}M (${((currentOI - oiStats.mean) / oiStats.stdDev).toFixed(1)}σ above avg)`);
            score += 25;
            if (currentOI > oiStats.mean + 2 * oiStats.stdDev) {
                signals.push(`⚠️ OI PEAK: 2σ above normal - maximum exposure`);
                score += 10;
            }
        }
        // Signal 3: CVD Divergence (price up, CVD flat/down = distribution)
        if (priceChange > 0 && vdelta1hr <= 0) {
            const vdeltaPercent = (Math.abs(vdelta1hr) / data.volume) * 100;
            if (vdeltaPercent > 3) {
                signals.push(`💀 BEARISH DIVERGENCE: Price +${priceChange.toFixed(1)}% but VDelta -${vdeltaPercent.toFixed(1)}%`);
                score += 25;
                if (vdeltaPercent > 10) {
                    signals.push(`🩸 Heavy distribution: ${vdeltaPercent.toFixed(1)}% sell pressure`);
                    score += 10;
                }
            }
        }
        // Signal 4: Funding momentum (still climbing)
        const fundingMomentum = this.calculateFundingMomentum(data.symbol, now);
        if (fundingMomentum > 0.00005) {
            signals.push(`📈 Funding momentum: ${(fundingMomentum * 100).toFixed(5)}% (accelerating)`);
            score += 10;
        }
        // Require at least 3 signals and score >= 75
        if (signals.length >= 3 && score >= 75) {
            const severity = score >= 90 ? AlertSeverity.CRITICAL : AlertSeverity.HIGH;
            return {
                id: `${data.symbol}-LONG-FLUSH-${now}`,
                symbol: data.symbol,
                setupType: SetupType.LONG_FLUSH,
                severity,
                title: `⚠️ LONG FLUSH SETUP - ${data.symbol}`,
                description: `Score: ${score}/100. Extreme long crowding + confluence signals. High probability liquidation cascade.`,
                signals,
                confluenceScore: score,
                timestamp: now,
                data: {
                    fundingRate: data.fundingRate,
                    fundingAPR,
                    fundingPercentile,
                    oiChange8hr,
                    oiPercentile: 0,
                    vdelta1hr,
                    priceChange,
                    volume24h: data.quoteVolume,
                },
            };
        }
        return null;
    }
    // CAPITULATION REVERSAL: OI crash + funding reset + absorption
    detectCapitulation(data, oiStats, now) {
        const signals = [];
        let score = 0;
        const fundingAPR = data.fundingRate * 3 * 365 * 100;
        const oiChange24hr = this.calculateOIChange(data.symbol, now, this.TWENTY_FOUR_HOURS);
        const vdelta1hr = this.calculateVDelta(data.symbol, now, this.ONE_HOUR);
        const priceChange = this.calculatePriceChange(data.symbol, now, this.FOUR_HOURS);
        // Signal 1: OI dropped >10% in 24h (liquidation cascade)
        if (oiChange24hr < -10) {
            signals.push(`🌊 Liquidation cascade: OI -${Math.abs(oiChange24hr).toFixed(1)}% in 24hr`);
            score += 30;
            if (oiChange24hr < -20) {
                signals.push(`💥 MASSIVE liquidations: OI -${Math.abs(oiChange24hr).toFixed(1)}%`);
                score += 10;
            }
        }
        else {
            return null; // Must have liquidation cascade
        }
        // Signal 2: Funding resetting toward neutral
        const fundingMomentum = this.calculateFundingMomentum(data.symbol, now);
        if (Math.abs(fundingMomentum) < 0.00003 && Math.abs(data.fundingRate) < 0.0003) {
            signals.push(`⚖️ Funding resetting: ${(data.fundingRate * 100).toFixed(4)}% (normalizing)`);
            score += 25;
        }
        // Signal 3: CVD absorption during crash
        if (priceChange < -5 && vdelta1hr > 0) {
            const vdeltaPercent = (vdelta1hr / data.volume) * 100;
            if (vdeltaPercent > 3) {
                signals.push(`🎯 ABSORPTION: Price -${Math.abs(priceChange).toFixed(1)}% but VDelta +${vdeltaPercent.toFixed(1)}%`);
                score += 30;
                if (vdeltaPercent > 10) {
                    signals.push(`🐋 Whale accumulation during panic`);
                    score += 15;
                }
            }
        }
        // Require at least 3 signals and score >= 75
        if (signals.length >= 3 && score >= 75) {
            return {
                id: `${data.symbol}-CAPITULATION-${now}`,
                symbol: data.symbol,
                setupType: SetupType.CAPITULATION_REVERSAL,
                severity: AlertSeverity.CRITICAL,
                title: `🟢 CAPITULATION REVERSAL - ${data.symbol}`,
                description: `Score: ${score}/100. Liquidation complete, funding reset, absorption detected. Reversal likely.`,
                signals,
                confluenceScore: score,
                timestamp: now,
                data: {
                    fundingRate: data.fundingRate,
                    fundingAPR,
                    fundingPercentile: 50,
                    oiChange8hr: oiChange24hr,
                    oiPercentile: 0,
                    vdelta1hr,
                    priceChange,
                    volume24h: data.quoteVolume,
                },
            };
        }
        return null;
    }
    // Calculate funding rate percentile over last 30 days
    calculateFundingPercentile(symbol, currentFunding) {
        const history = this.timeSeries.get(symbol) || [];
        if (history.length < 7 * 24)
            return 50; // Need 7 days minimum
        const fundingRates = history.map(h => h.fundingRate).sort((a, b) => a - b);
        const rank = fundingRates.filter(f => f <= currentFunding).length;
        return (rank / fundingRates.length) * 100;
    }
    // Calculate OI statistics (mean, stdDev)
    calculateOIStats(symbol, now) {
        const history = this.timeSeries.get(symbol) || [];
        const recent = history.filter(h => now - h.timestamp < this.LOOKBACK_WINDOW);
        if (recent.length === 0) {
            return { p10: 0, p90: 0, mean: 0, stdDev: 0 };
        }
        const oiValues = recent.map(h => h.oi);
        const mean = oiValues.reduce((a, b) => a + b, 0) / oiValues.length;
        const variance = oiValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / oiValues.length;
        const stdDev = Math.sqrt(variance);
        const sorted = [...oiValues].sort((a, b) => a - b);
        const p10 = sorted[Math.floor(sorted.length * 0.1)];
        const p90 = sorted[Math.floor(sorted.length * 0.9)];
        return { p10, p90, mean, stdDev };
    }
    // Calculate OI change over time window
    calculateOIChange(symbol, now, window) {
        const history = this.timeSeries.get(symbol) || [];
        const past = history.find(h => Math.abs(h.timestamp - (now - window)) < 10 * 60 * 1000);
        const current = history[history.length - 1];
        if (!past || !current || past.oi === 0)
            return 0;
        return ((current.oi - past.oi) / past.oi) * 100;
    }
    // Calculate VDelta over time window
    calculateVDelta(symbol, now, window) {
        const history = this.timeSeries.get(symbol) || [];
        const recentData = history.filter(h => now - h.timestamp < window);
        if (recentData.length < 2)
            return 0;
        const startCVD = recentData[0].cvd;
        const endCVD = recentData[recentData.length - 1].cvd;
        return endCVD - startCVD;
    }
    // Calculate price change over time window
    calculatePriceChange(symbol, now, window) {
        const history = this.timeSeries.get(symbol) || [];
        const past = history.find(h => Math.abs(h.timestamp - (now - window)) < 10 * 60 * 1000);
        const current = history[history.length - 1];
        if (!past || !current || past.price === 0)
            return 0;
        return ((current.price - past.price) / past.price) * 100;
    }
    // Calculate funding rate momentum (derivative)
    calculateFundingMomentum(symbol, now) {
        const history = this.timeSeries.get(symbol) || [];
        if (history.length < 2)
            return 0;
        const recent = history.slice(-6); // Last 6 data points (12 hours)
        if (recent.length < 2)
            return 0;
        const oldRate = recent[0].fundingRate;
        const newRate = recent[recent.length - 1].fundingRate;
        return newRate - oldRate;
    }
    // Update time series data
    updateTimeSeries(data, now) {
        if (!this.timeSeries.has(data.symbol)) {
            this.timeSeries.set(data.symbol, []);
        }
        const history = this.timeSeries.get(data.symbol);
        history.push({
            timestamp: now,
            fundingRate: data.fundingRate,
            oi: data.openInterestValue,
            cvd: data.cvd,
            price: data.price,
            volume: data.volume,
        });
        // Keep only last 30 days
        const cutoff = now - this.LOOKBACK_WINDOW;
        this.timeSeries.set(data.symbol, history.filter(h => h.timestamp > cutoff));
    }
    // Check if we have minimum history
    hasMinimumHistory(symbol, now) {
        const history = this.timeSeries.get(symbol) || [];
        const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
        return history.some(h => h.timestamp < sevenDaysAgo);
    }
    // Cleanup old data
    cleanupOldData(now) {
        const cutoff = now - this.LOOKBACK_WINDOW;
        for (const [symbol, history] of this.timeSeries.entries()) {
            const filtered = history.filter(h => h.timestamp > cutoff);
            if (filtered.length === 0) {
                this.timeSeries.delete(symbol);
            }
            else {
                this.timeSeries.set(symbol, filtered);
            }
        }
    }
}
exports.ConfluenceDetectorV2 = ConfluenceDetectorV2;
