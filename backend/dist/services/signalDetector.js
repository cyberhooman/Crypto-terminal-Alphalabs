"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignalDetectionService = void 0;
// 24/7 Signal Detection Service
const axios_1 = __importDefault(require("axios"));
const client_1 = __importDefault(require("../db/client"));
const confluenceDetectorV2_1 = require("../lib/alerts/confluenceDetectorV2");
// Multiple API endpoints with fallback support
const API_ENDPOINTS = [
    'https://fapi.binance.com', // Primary
    'https://fapi1.binance.com', // Fallback 1
    'https://fapi2.binance.com', // Fallback 2
    'https://fapi3.binance.com', // Fallback 3
];
let currentEndpointIndex = 0;
class SignalDetectionService {
    constructor() {
        this.isRunning = false;
        this.detectionInterval = null;
        this.detector = new confluenceDetectorV2_1.ConfluenceDetectorV2();
    }
    // Start 24/7 detection
    async start() {
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
            }
            catch (error) {
                console.error('Error in detection cycle:', error);
            }
        }, 30000);
        console.log('✅ Signal detection service started (runs every 30s)');
    }
    // Stop detection
    stop() {
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
        }
        this.isRunning = false;
        console.log('⏸️  Signal detection service stopped');
    }
    // Fetch market data and detect signals
    async detectAndStore() {
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
        }
        catch (error) {
            console.error('Error in signal detection:', error);
        }
    }
    // Fetch with automatic fallback to alternative endpoints
    async fetchWithFallback(path) {
        const maxAttempts = API_ENDPOINTS.length;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const endpoint = API_ENDPOINTS[currentEndpointIndex];
            try {
                const response = await axios_1.default.get(`${endpoint}${path}`, {
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    },
                });
                return response.data;
            }
            catch (error) {
                const status = error?.response?.status;
                const isGeoBlocked = status === 451 || status === 403;
                if (isGeoBlocked) {
                    console.log(`⚠️  Endpoint ${endpoint} geo-blocked (${status}), trying next...`);
                    currentEndpointIndex = (currentEndpointIndex + 1) % API_ENDPOINTS.length;
                }
                else {
                    console.error(`Error fetching from ${endpoint}:`, error.message);
                    throw error;
                }
            }
        }
        throw new Error('All API endpoints failed or are geo-blocked');
    }
    // Fetch market data from Binance with fallback support
    async fetchMarketData() {
        try {
            // Fetch 24hr ticker with fallback
            const tickers = await this.fetchWithFallback('/fapi/v1/ticker/24hr');
            // Fetch funding rates with fallback
            const fundingRates = await this.fetchWithFallback('/fapi/v1/premiumIndex');
            const fundingMap = new Map(fundingRates.map((f) => [f.symbol, f]));
            // Combine data (filter USDT pairs only)
            const marketData = tickers
                .filter((t) => t.symbol.endsWith('USDT'))
                .map((ticker) => {
                const funding = fundingMap.get(ticker.symbol);
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
        }
        catch (error) {
            console.error('❌ All API endpoints failed:', error);
            return [];
        }
    }
    // Store alert in database
    async storeAlert(alert) {
        try {
            // Check if alert already exists (by ID)
            const existing = await client_1.default.query('SELECT id FROM confluence_alerts WHERE id = $1', [alert.id]);
            if (existing.rows.length > 0) {
                return; // Alert already stored
            }
            // Insert new alert
            await client_1.default.query(`INSERT INTO confluence_alerts
         (id, symbol, setup_type, severity, title, description, signals, confluence_score, timestamp, data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
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
            ]);
            console.log(`📊 Stored ${alert.severity} alert: ${alert.symbol} - ${alert.title}`);
        }
        catch (error) {
            console.error('Error storing alert:', error);
        }
    }
}
exports.SignalDetectionService = SignalDetectionService;
