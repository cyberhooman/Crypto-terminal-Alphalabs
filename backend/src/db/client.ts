// PostgreSQL database client
import { Pool } from 'pg';
import { initializeDatabase } from './schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

// Initialize database schema on startup
export async function connectDatabase(): Promise<void> {
  try {
    await pool.query('SELECT NOW()');
    console.log('Database connection test successful');
    await initializeDatabase(pool);
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
}

export default pool;
