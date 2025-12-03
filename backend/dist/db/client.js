"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDatabase = connectDatabase;
// PostgreSQL database client
const pg_1 = require("pg");
const schema_1 = require("./schema");
const pool = new pg_1.Pool({
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
async function connectDatabase() {
    try {
        await pool.query('SELECT NOW()');
        console.log('Database connection test successful');
        await (0, schema_1.initializeDatabase)(pool);
    }
    catch (error) {
        console.error('Failed to connect to database:', error);
        throw error;
    }
}
exports.default = pool;
