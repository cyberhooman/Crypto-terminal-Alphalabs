// API Routes
import { Router, Request, Response } from 'express';
import pool from '../db/client';
import { cleanupOldAlerts } from '../db/schema';
import axios from 'axios';

const router = Router();

const BINANCE_API = 'https://fapi.binance.com';

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all alerts (past 6 hours only, limit 50 for performance)
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000);
    const limit = parseInt(req.query.limit as string) || 50; // Default 50, max enforced below

    const result = await pool.query(
      `SELECT * FROM confluence_alerts
       WHERE timestamp > $1
       AND severity IN ('CRITICAL', 'HIGH')
       ORDER BY timestamp DESC, confluence_score DESC
       LIMIT $2`,
      [sixHoursAgo, Math.min(limit, 100)]
    );

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
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Get alerts by symbol
router.get('/alerts/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);

    const result = await pool.query(
      `SELECT * FROM confluence_alerts
       WHERE symbol = $1 AND timestamp > $2
       ORDER BY timestamp DESC`,
      [symbol.toUpperCase(), fortyEightHoursAgo]
    );

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
  } catch (error) {
    console.error('Error fetching alerts for symbol:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Get alerts by severity
router.get('/alerts/severity/:severity', async (req: Request, res: Response) => {
  try {
    const { severity } = req.params;
    const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);

    const result = await pool.query(
      `SELECT * FROM confluence_alerts
       WHERE severity = $1 AND timestamp > $2
       ORDER BY timestamp DESC`,
      [severity.toUpperCase(), fortyEightHoursAgo]
    );

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
  } catch (error) {
    console.error('Error fetching alerts by severity:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Manual cleanup endpoint
router.post('/cleanup', async (req: Request, res: Response) => {
  try {
    const deletedCount = await cleanupOldAlerts(pool);
    res.json({ message: 'Cleanup completed', deletedCount });
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

// Stats endpoint
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);

    const [total, bySeverity, bySetup] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM confluence_alerts WHERE timestamp > $1', [fortyEightHoursAgo]),
      pool.query(
        `SELECT severity, COUNT(*) as count
         FROM confluence_alerts
         WHERE timestamp > $1
         GROUP BY severity`,
        [fortyEightHoursAgo]
      ),
      pool.query(
        `SELECT setup_type, COUNT(*) as count
         FROM confluence_alerts
         WHERE timestamp > $1
         GROUP BY setup_type`,
        [fortyEightHoursAgo]
      ),
    ]);

    res.json({
      totalAlerts: parseInt(total.rows[0].count),
      bySeverity: bySeverity.rows.reduce((acc: any, row: any) => {
        acc[row.severity] = parseInt(row.count);
        return acc;
      }, {}),
      bySetupType: bySetup.rows.reduce((acc: any, row: any) => {
        acc[row.setup_type] = parseInt(row.count);
        return acc;
      }, {}),
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Proxy endpoint for Binance market data (avoids timeout on frontend)
router.get('/market/ticker', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${BINANCE_API}/fapi/v1/ticker/24hr`, {
      timeout: 10000,
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching ticker data:', error);
    res.status(500).json({ error: 'Failed to fetch market data' });
  }
});

// Proxy endpoint for funding rates
router.get('/market/funding', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${BINANCE_API}/fapi/v1/premiumIndex`, {
      timeout: 10000,
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching funding rates:', error);
    res.status(500).json({ error: 'Failed to fetch funding rates' });
  }
});

// Proxy endpoint for exchange info
router.get('/market/exchangeInfo', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${BINANCE_API}/fapi/v1/exchangeInfo`, {
      timeout: 10000,
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching exchange info:', error);
    res.status(500).json({ error: 'Failed to fetch exchange info' });
  }
});

// Proxy endpoint for Open Interest (single symbol)
router.get('/market/openInterest/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const response = await axios.get(`${BINANCE_API}/fapi/v1/openInterest`, {
      params: { symbol: symbol.toUpperCase() },
      timeout: 5000,
    });
    res.json(response.data);
  } catch (error) {
    console.error(`Error fetching OI for ${req.params.symbol}:`, error);
    res.status(500).json({ error: 'Failed to fetch open interest' });
  }
});

// Proxy endpoint for Aggregate Trades (for CVD calculation)
router.get('/market/aggTrades/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const limit = req.query.limit || 1000;
    const response = await axios.get(`${BINANCE_API}/fapi/v1/aggTrades`, {
      params: {
        symbol: symbol.toUpperCase(),
        limit: parseInt(limit as string)
      },
      timeout: 5000,
    });
    res.json(response.data);
  } catch (error) {
    console.error(`Error fetching agg trades for ${req.params.symbol}:`, error);
    res.status(500).json({ error: 'Failed to fetch aggregate trades' });
  }
});

export default router;
