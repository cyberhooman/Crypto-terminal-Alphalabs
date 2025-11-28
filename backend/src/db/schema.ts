// Database schema and migrations
import { Pool } from 'pg';

export const createTablesSQL = `
-- Confluence Alerts Table
CREATE TABLE IF NOT EXISTS confluence_alerts (
  id VARCHAR(255) PRIMARY KEY,
  symbol VARCHAR(50) NOT NULL,
  setup_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  signals JSONB NOT NULL,
  confluence_score INTEGER NOT NULL,
  timestamp BIGINT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_symbol ON confluence_alerts(symbol);
CREATE INDEX IF NOT EXISTS idx_timestamp ON confluence_alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_severity ON confluence_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_setup_type ON confluence_alerts(setup_type);

-- Auto-cleanup old alerts (older than 48 hours)
CREATE OR REPLACE FUNCTION cleanup_old_alerts()
RETURNS void AS $$
BEGIN
  DELETE FROM confluence_alerts
  WHERE timestamp < EXTRACT(EPOCH FROM NOW() - INTERVAL '48 hours') * 1000;
END;
$$ LANGUAGE plpgsql;
`;

export async function initializeDatabase(pool: Pool): Promise<void> {
  try {
    console.log('Initializing database schema...');
    await pool.query(createTablesSQL);
    console.log('✅ Database schema initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
}

export async function cleanupOldAlerts(pool: Pool): Promise<number> {
  try {
    const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
    const result = await pool.query(
      'DELETE FROM confluence_alerts WHERE timestamp < $1 RETURNING id',
      [fortyEightHoursAgo]
    );
    return result.rowCount || 0;
  } catch (error) {
    console.error('Error cleaning up old alerts:', error);
    return 0;
  }
}
