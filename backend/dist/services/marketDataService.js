"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.marketDataService = exports.MarketDataService = void 0;
// 24/7 Market Data Service - Runs independently on server
const axios_1 = __importDefault(require("axios"));
// Multiple Binance API endpoints with fallback
const API_ENDPOINTS = [
    'https://fapi.binance.com',
    'https://fapi1.binance.com',
    'https://fapi2.binance.com',
    'https://fapi3.binance.com',
];
let currentEndpointIndex = 0;
class MarketDataService {
    constructor() {
        this.marketData = new Map();
        this.symbols = [];
        this.isRunning = false;
        this.updateInterval = null;
        this.oiUpdateInterval = null;
        this.lastUpdate = 0;
        this.updateCallbacks = new Set();
    }
    // Start continuous data fetching
    async start() {
        if (this.isRunning) {
            console.log('⚠️  Market data service already running');
            return;
        }
        console.log('🚀 Starting 24/7 market data service...');
        this.isRunning = true;
        try {
            // Initial data load
            await this.fetchAllData();
            // Update prices & funding every 10 seconds (reduced from 2s to avoid rate limits)
            this.updateInterval = setInterval(async () => {
                try {
                    await this.updatePricesAndFunding();
                }
                catch (error) {
                    console.error('Error updating prices:', error);
                }
            }, 10000);
            // Update OI every 2 minutes (increased from 30s to avoid rate limits)
            this.oiUpdateInterval = setInterval(async () => {
                try {
                    await this.updateOpenInterest();
                }
                catch (error) {
                    console.error('Error updating OI:', error);
                }
            }, 120000);
            console.log('✅ Market data service started');
            console.log('   - Price updates: every 10s');
            console.log('   - OI updates: every 2min');
            this.logStats();
        }
        catch (error) {
            console.error('❌ Failed to start market data service:', error);
            this.isRunning = false;
            throw error;
        }
    }
    // Stop the service
    stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        if (this.oiUpdateInterval) {
            clearInterval(this.oiUpdateInterval);
            this.oiUpdateInterval = null;
        }
        this.isRunning = false;
        console.log('⏹️  Market data service stopped');
    }
    // Fetch with automatic endpoint fallback and exponential backoff
    async fetchWithFallback(path, params, retryCount = 0) {
        const maxRetries = 3;
        const endpoint = API_ENDPOINTS[currentEndpointIndex];
        try {
            const response = await axios_1.default.get(`${endpoint}${path}`, {
                params,
                timeout: 15000, // Increased from 10s to 15s
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; CryptoTerminal/1.0)',
                },
            });
            return response.data;
        }
        catch (error) {
            const status = error?.response?.status;
            const isGeoBlocked = status === 451 || status === 403;
            const isRateLimited = status === 429 || status === 418;
            const isTimeout = error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT';
            // Handle rate limiting with exponential backoff
            if (isRateLimited && retryCount < maxRetries) {
                const delay = Math.min(Math.pow(2, retryCount) * 2000, 10000); // 2s, 4s, 8s, max 10s
                console.log(`⚠️  Rate limited (${status}), waiting ${delay / 1000}s before retry ${retryCount + 1}/${maxRetries}...`);
                // Rotate endpoint
                currentEndpointIndex = (currentEndpointIndex + 1) % API_ENDPOINTS.length;
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.fetchWithFallback(path, params, retryCount + 1);
            }
            // Handle geo-blocking
            if (isGeoBlocked) {
                console.log(`⚠️  Endpoint ${currentEndpointIndex + 1} geo-blocked (${status}), rotating...`);
                currentEndpointIndex = (currentEndpointIndex + 1) % API_ENDPOINTS.length;
                if (retryCount < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return this.fetchWithFallback(path, params, retryCount + 1);
                }
            }
            // Handle timeouts
            if (isTimeout && retryCount < maxRetries) {
                console.log(`⚠️  Request timeout, retrying ${retryCount + 1}/${maxRetries}...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                return this.fetchWithFallback(path, params, retryCount + 1);
            }
            // If all retries exhausted, throw error
            if (retryCount >= maxRetries) {
                console.error(`❌ Max retries reached for ${path}`);
            }
            throw error;
        }
    }
    // Initial data fetch - load everything
    async fetchAllData() {
        console.log('📡 Fetching initial market data...');
        try {
            // Fetch all active symbols
            const exchangeInfo = await this.fetchWithFallback('/fapi/v1/exchangeInfo');
            this.symbols = exchangeInfo.symbols
                .filter((s) => s.status === 'TRADING' && s.contractType === 'PERPETUAL' && s.quoteAsset === 'USDT')
                .map((s) => s.symbol);
            console.log(`📊 Loaded ${this.symbols.length} USDT perpetual pairs`);
            // Fetch ticker data
            const tickers = await this.fetchWithFallback('/fapi/v1/ticker/24hr');
            const tickerMap = new Map(tickers.map((t) => [t.symbol, t]));
            // Fetch funding rates
            const fundingRates = await this.fetchWithFallback('/fapi/v1/premiumIndex');
            const fundingMap = new Map(fundingRates.map((f) => [f.symbol, f]));
            // Initialize market data
            for (const symbol of this.symbols) {
                const ticker = tickerMap.get(symbol);
                const funding = fundingMap.get(symbol);
                if (!ticker)
                    continue;
                // Calculate CVD from taker buy/sell volumes (24hr)
                const totalVolume = parseFloat(ticker.volume);
                const takerBuyVolume = parseFloat(ticker.takerBuyBaseAssetVolume || 0);
                const takerSellVolume = totalVolume - takerBuyVolume;
                const cvd = takerBuyVolume - takerSellVolume;
                const marketData = {
                    symbol,
                    price: parseFloat(ticker.lastPrice),
                    priceChange: parseFloat(ticker.priceChange),
                    priceChangePercent: parseFloat(ticker.priceChangePercent),
                    volume: totalVolume,
                    quoteVolume: parseFloat(ticker.quoteVolume),
                    fundingRate: funding ? parseFloat(funding.lastFundingRate) : 0,
                    nextFundingTime: funding ? funding.nextFundingTime : Date.now() + 28800000,
                    openInterest: 0,
                    openInterestValue: 0,
                    cvd: cvd,
                    buyVolume: takerBuyVolume,
                    sellVolume: takerSellVolume,
                    high: parseFloat(ticker.highPrice),
                    low: parseFloat(ticker.lowPrice),
                    trades: parseInt(ticker.count),
                    lastUpdate: Date.now(),
                };
                this.marketData.set(symbol, marketData);
            }
            // Fetch OI for top 200 symbols by volume
            await this.updateOpenInterest();
            this.lastUpdate = Date.now();
            console.log(`✅ Initial data loaded: ${this.marketData.size} pairs`);
            // Notify subscribers
            this.notifyUpdate();
        }
        catch (error) {
            console.error('❌ Error fetching initial data:', error);
            throw error;
        }
    }
    // Update prices and funding (fast, runs every 2s)
    async updatePricesAndFunding() {
        try {
            const [tickers, fundingRates] = await Promise.all([
                this.fetchWithFallback('/fapi/v1/ticker/24hr'),
                this.fetchWithFallback('/fapi/v1/premiumIndex'),
            ]);
            const fundingMap = new Map(fundingRates.map((f) => [f.symbol, f]));
            let updated = 0;
            for (const ticker of tickers) {
                const data = this.marketData.get(ticker.symbol);
                if (!data)
                    continue;
                const funding = fundingMap.get(ticker.symbol);
                // Calculate CVD from taker buy/sell volumes
                const totalVolume = parseFloat(ticker.volume);
                const takerBuyVolume = parseFloat(ticker.takerBuyBaseAssetVolume || 0);
                const takerSellVolume = totalVolume - takerBuyVolume;
                const cvd = takerBuyVolume - takerSellVolume;
                data.price = parseFloat(ticker.lastPrice);
                data.priceChange = parseFloat(ticker.priceChange);
                data.priceChangePercent = parseFloat(ticker.priceChangePercent);
                data.volume = totalVolume;
                data.quoteVolume = parseFloat(ticker.quoteVolume);
                data.high = parseFloat(ticker.highPrice);
                data.low = parseFloat(ticker.lowPrice);
                data.trades = parseInt(ticker.count);
                data.cvd = cvd;
                data.buyVolume = takerBuyVolume;
                data.sellVolume = takerSellVolume;
                data.lastUpdate = Date.now();
                // Also update OI value with current price (OI itself updated separately)
                if (data.openInterest > 0) {
                    data.openInterestValue = data.openInterest * data.price;
                }
                if (funding) {
                    data.fundingRate = parseFloat(funding.lastFundingRate);
                    data.nextFundingTime = funding.nextFundingTime;
                }
                this.marketData.set(ticker.symbol, data);
                updated++;
            }
            this.lastUpdate = Date.now();
            // Notify subscribers every 10th update (~20 seconds)
            if (updated > 0 && Math.random() < 0.1) {
                this.notifyUpdate();
            }
        }
        catch (error) {
            console.error('Error updating prices & funding:', error);
        }
    }
    // Update open interest (slower, runs every 2 minutes)
    async updateOpenInterest() {
        try {
            // Get top 100 symbols by volume (reduced from 200 to avoid rate limits)
            const topSymbols = Array.from(this.marketData.values())
                .sort((a, b) => b.quoteVolume - a.quoteVolume)
                .slice(0, 100)
                .map(d => d.symbol);
            console.log(`📈 Updating OI for top ${topSymbols.length} symbols...`);
            let updated = 0;
            let failed = 0;
            // Batch process: 5 symbols at a time (reduced from 10)
            const batchSize = 5;
            for (let i = 0; i < topSymbols.length; i += batchSize) {
                const batch = topSymbols.slice(i, i + batchSize);
                const results = await Promise.allSettled(batch.map(symbol => this.fetchWithFallback('/fapi/v1/openInterest', { symbol })));
                results.forEach((result, idx) => {
                    const symbol = batch[idx];
                    const data = this.marketData.get(symbol);
                    if (result.status === 'fulfilled' && data) {
                        const oi = parseFloat(result.value.openInterest || 0);
                        data.openInterest = oi;
                        data.openInterestValue = oi * data.price;
                        this.marketData.set(symbol, data);
                        updated++;
                    }
                    else {
                        failed++;
                    }
                });
                // Longer delay to avoid rate limiting (increased from 100ms to 500ms)
                if (i + batchSize < topSymbols.length) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
            console.log(`✅ OI updated: ${updated} success, ${failed} failed`);
            // Notify subscribers after OI update
            this.notifyUpdate();
        }
        catch (error) {
            console.error('Error updating open interest:', error);
        }
    }
    // Subscribe to updates
    onUpdate(callback) {
        this.updateCallbacks.add(callback);
        return () => {
            this.updateCallbacks.delete(callback);
        };
    }
    // Notify all subscribers
    notifyUpdate() {
        const data = this.getAllData();
        this.updateCallbacks.forEach(callback => {
            try {
                callback(data);
            }
            catch (error) {
                console.error('Error in update callback:', error);
            }
        });
    }
    // Get all market data
    getAllData() {
        return Array.from(this.marketData.values());
    }
    // Get specific symbol data
    getData(symbol) {
        return this.marketData.get(symbol);
    }
    // Get stats
    getStats() {
        const data = Array.from(this.marketData.values());
        const withOI = data.filter(d => d.openInterest > 0).length;
        const withCVD = data.filter(d => d.cvd !== 0).length;
        const withFunding = data.filter(d => d.fundingRate !== 0).length;
        return {
            totalSymbols: data.length,
            withOI,
            withCVD,
            withFunding,
            lastUpdate: this.lastUpdate,
            uptime: this.isRunning ? Date.now() - this.lastUpdate : 0,
            isRunning: this.isRunning,
        };
    }
    // Log statistics
    logStats() {
        const stats = this.getStats();
        console.log('📊 Market Data Statistics:');
        console.log(`   - Total symbols: ${stats.totalSymbols}`);
        console.log(`   - With OI: ${stats.withOI} (${((stats.withOI / stats.totalSymbols) * 100).toFixed(1)}%)`);
        console.log(`   - With CVD: ${stats.withCVD} (${((stats.withCVD / stats.totalSymbols) * 100).toFixed(1)}%)`);
        console.log(`   - With funding: ${stats.withFunding} (${((stats.withFunding / stats.totalSymbols) * 100).toFixed(1)}%)`);
    }
    // Check if service is healthy
    isHealthy() {
        const timeSinceUpdate = Date.now() - this.lastUpdate;
        return this.isRunning && timeSinceUpdate < 10000 && this.marketData.size > 0;
    }
}
exports.MarketDataService = MarketDataService;
// Export singleton instance
exports.marketDataService = new MarketDataService();
