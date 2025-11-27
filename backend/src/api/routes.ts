// API Routes
import { Router, Request, Response } from 'express';
import pool from '../db/client';
import { cleanupOldAlerts } from '../db/schema';

const router = Router();

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all alerts (past 48 hours)
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);

    const result = await pool.query(
      `SELECT * FROM confluence_alerts
       WHERE timestamp > $1
       ORDER BY timestamp DESC`,
      [fortyEightHoursAgo]
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

export default router;
