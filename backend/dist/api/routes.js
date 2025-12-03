"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// API Routes
const express_1 = require("express");
const client_1 = __importDefault(require("../db/client"));
const schema_1 = require("../db/schema");
const axios_1 = __importDefault(require("axios"));
const marketDataService_1 = require("../services/marketDataService");
const router = (0, express_1.Router)();
const BINANCE_API = 'https://fapi.binance.com';
// Health check
router.get('/health', (req, res) => {
    const marketStats = marketDataService_1.marketDataService.getStats();
    res.json({
        status: marketDataService_1.marketDataService.isHealthy() ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        marketData: {
            totalSymbols: marketStats.totalSymbols,
            lastUpdate: marketStats.lastUpdate,
            isRunning: marketStats.isRunning,
        },
    });
});
// Get all cached market data (fast - served from memory)
router.get('/market/data', (req, res) => {
    try {
        const data = marketDataService_1.marketDataService.getAllData();
        const stats = marketDataService_1.marketDataService.getStats();
        res.json({
            data,
            stats,
            timestamp: Date.now(),
        });
    }
    catch (error) {
        console.error('Error fetching market data:', error);
        res.status(500).json({ error: 'Failed to fetch market data' });
    }
});
// Get specific symbol data
router.get('/market/data/:symbol', (req, res) => {
    try {
        const { symbol } = req.params;
        const data = marketDataService_1.marketDataService.getData(symbol.toUpperCase());
        if (!data) {
            return res.status(404).json({ error: 'Symbol not found' });
        }
        res.json({ data });
    }
    catch (error) {
        console.error(`Error fetching data for ${req.params.symbol}:`, error);
        res.status(500).json({ error: 'Failed to fetch symbol data' });
    }
});
// Get market data stats
router.get('/market/stats', (req, res) => {
    try {
        const stats = marketDataService_1.marketDataService.getStats();
        res.json(stats);
    }
    catch (error) {
        console.error('Error fetching market stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});
// Get all alerts (past 6 hours only, limit 50 for performance)
router.get('/alerts', async (req, res) => {
    try {
        const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000);
        const limit = parseInt(req.query.limit) || 50; // Default 50, max enforced below
        const result = await client_1.default.query(`SELECT * FROM confluence_alerts
       WHERE timestamp > $1
       AND severity IN ('CRITICAL', 'HIGH')
       ORDER BY timestamp DESC, confluence_score DESC
       LIMIT $2`, [sixHoursAgo, Math.min(limit, 100)]);
        const alerts = result.rows.map(row => ({
            id: row.id,
            symbol: row.symbol,
            setupType: row.setup_type,
            severity: row.severity,
            title: row.title,
            description: row.description,
            signals: row.signals,
            confluenceScore: row.confluence_score,
            timestamp: parseInt(row.timestamp),
            data: row.data,
        }));
        res.json({ alerts, count: alerts.length });
    }
    catch (error) {
        console.error('Error fetching alerts:', error);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});
// Get alerts by symbol
router.get('/alerts/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
        const result = await client_1.default.query(`SELECT * FROM confluence_alerts
       WHERE symbol = $1 AND timestamp > $2
       ORDER BY timestamp DESC`, [symbol.toUpperCase(), fortyEightHoursAgo]);
        const alerts = result.rows.map(row => ({
            id: row.id,
            symbol: row.symbol,
            setupType: row.setup_type,
            severity: row.severity,
            title: row.title,
            description: row.description,
            signals: row.signals,
            confluenceScore: row.confluence_score,
            timestamp: parseInt(row.timestamp),
            data: row.data,
        }));
        res.json({ alerts, count: alerts.length });
    }
    catch (error) {
        console.error('Error fetching alerts for symbol:', error);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});
// Get alerts by severity
router.get('/alerts/severity/:severity', async (req, res) => {
    try {
        const { severity } = req.params;
        const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
        const result = await client_1.default.query(`SELECT * FROM confluence_alerts
       WHERE severity = $1 AND timestamp > $2
       ORDER BY timestamp DESC`, [severity.toUpperCase(), fortyEightHoursAgo]);
        const alerts = result.rows.map(row => ({
            id: row.id,
            symbol: row.symbol,
            setupType: row.setup_type,
            severity: row.severity,
            title: row.title,
            description: row.description,
            signals: row.signals,
            confluenceScore: row.confluence_score,
            timestamp: parseInt(row.timestamp),
            data: row.data,
        }));
        res.json({ alerts, count: alerts.length });
    }
    catch (error) {
        console.error('Error fetching alerts by severity:', error);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});
// DELETE all alerts (admin endpoint for "Clear All" button)
router.delete('/alerts', async (req, res) => {
    try {
        const result = await client_1.default.query('DELETE FROM confluence_alerts RETURNING id');
        const deletedCount = result.rowCount || 0;
        console.log(`🗑️  Deleted ${deletedCount} alerts from database (user triggered)`);
        res.json({
            success: true,
            deleted: deletedCount,
            message: `Successfully deleted ${deletedCount} alert${deletedCount !== 1 ? 's' : ''} from database`,
        });
    }
    catch (error) {
        console.error('❌ Error deleting alerts:', error);
        res.status(500).json({ error: 'Failed to delete alerts from database' });
    }
});
// Manual cleanup endpoint
router.post('/cleanup', async (req, res) => {
    try {
        const deletedCount = await (0, schema_1.cleanupOldAlerts)(client_1.default);
        res.json({ message: 'Cleanup completed', deletedCount });
    }
    catch (error) {
        console.error('Error during cleanup:', error);
        res.status(500).json({ error: 'Cleanup failed' });
    }
});
// Stats endpoint
router.get('/stats', async (req, res) => {
    try {
        const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
        const [total, bySeverity, bySetup] = await Promise.all([
            client_1.default.query('SELECT COUNT(*) FROM confluence_alerts WHERE timestamp > $1', [fortyEightHoursAgo]),
            client_1.default.query(`SELECT severity, COUNT(*) as count
         FROM confluence_alerts
         WHERE timestamp > $1
         GROUP BY severity`, [fortyEightHoursAgo]),
            client_1.default.query(`SELECT setup_type, COUNT(*) as count
         FROM confluence_alerts
         WHERE timestamp > $1
         GROUP BY setup_type`, [fortyEightHoursAgo]),
        ]);
        res.json({
            totalAlerts: parseInt(total.rows[0].count),
            bySeverity: bySeverity.rows.reduce((acc, row) => {
                acc[row.severity] = parseInt(row.count);
                return acc;
            }, {}),
            bySetupType: bySetup.rows.reduce((acc, row) => {
                acc[row.setup_type] = parseInt(row.count);
                return acc;
            }, {}),
        });
    }
    catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});
// Proxy endpoint for Binance market data (avoids timeout on frontend)
router.get('/market/ticker', async (req, res) => {
    try {
        const response = await axios_1.default.get(`${BINANCE_API}/fapi/v1/ticker/24hr`, {
            timeout: 10000,
        });
        res.json(response.data);
    }
    catch (error) {
        console.error('Error fetching ticker data:', error);
        res.status(500).json({ error: 'Failed to fetch market data' });
    }
});
// Proxy endpoint for funding rates
router.get('/market/funding', async (req, res) => {
    try {
        const response = await axios_1.default.get(`${BINANCE_API}/fapi/v1/premiumIndex`, {
            timeout: 10000,
        });
        res.json(response.data);
    }
    catch (error) {
        console.error('Error fetching funding rates:', error);
        res.status(500).json({ error: 'Failed to fetch funding rates' });
    }
});
// Proxy endpoint for exchange info
router.get('/market/exchangeInfo', async (req, res) => {
    try {
        const response = await axios_1.default.get(`${BINANCE_API}/fapi/v1/exchangeInfo`, {
            timeout: 10000,
        });
        res.json(response.data);
    }
    catch (error) {
        console.error('Error fetching exchange info:', error);
        res.status(500).json({ error: 'Failed to fetch exchange info' });
    }
});
// Proxy endpoint for Open Interest (single symbol)
router.get('/market/openInterest/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const response = await axios_1.default.get(`${BINANCE_API}/fapi/v1/openInterest`, {
            params: { symbol: symbol.toUpperCase() },
            timeout: 5000,
        });
        res.json(response.data);
    }
    catch (error) {
        console.error(`Error fetching OI for ${req.params.symbol}:`, error);
        res.status(500).json({ error: 'Failed to fetch open interest' });
    }
});
// Proxy endpoint for Aggregate Trades (for CVD calculation)
router.get('/market/aggTrades/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const limit = req.query.limit || 1000;
        const response = await axios_1.default.get(`${BINANCE_API}/fapi/v1/aggTrades`, {
            params: {
                symbol: symbol.toUpperCase(),
                limit: parseInt(limit)
            },
            timeout: 5000,
        });
        res.json(response.data);
    }
    catch (error) {
        console.error(`Error fetching agg trades for ${req.params.symbol}:`, error);
        res.status(500).json({ error: 'Failed to fetch aggregate trades' });
    }
});
exports.default = router;
