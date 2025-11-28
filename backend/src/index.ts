// Main backend server
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDatabase } from './db/client';
import { SignalDetectionService } from './services/signalDetector';
import { cleanupOldAlerts } from './db/schema';
import router from './api/routes';
import pool from './db/client';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Root route - server status
app.get('/', (_req, res) => {
  res.json({
    status: 'online',
    service: 'Crypto Terminal Backend',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      alerts: '/api/alerts',
      docs: 'https://github.com/cyberhooman/Crypto-terminal-Alphalabs'
    }
  });
});

// Routes
app.use('/api', router);

// Signal detection service instance
let signalDetector: SignalDetectionService | null = null;

// Startup with retry logic
async function startServer() {
  try {
    console.log('🚀 Starting Crypto Terminal Backend...');

    // Start HTTP server first (so Railway sees it as "running")
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📡 API: http://localhost:${PORT}/api`);
      console.log(`🎯 Frontend CORS: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    });

    // Try to connect to database with retries
    await connectWithRetry();

    // Start signal detection
    signalDetector = new SignalDetectionService();
    await signalDetector.start();

    // Schedule periodic cleanup (every hour)
    setInterval(async () => {
      const deleted = await cleanupOldAlerts(pool);
      if (deleted > 0) {
        console.log(`🧹 Cleaned up ${deleted} old alerts (>48h)`);
      }
    }, 60 * 60 * 1000);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    // Don't exit - keep server running even if DB connection fails
    console.log('⚠️  Server will continue without database. Retrying connection in background...');
    retryDatabaseConnection();
  }
}

// Retry database connection
async function connectWithRetry(maxRetries = 5) {
  for (let i = 1; i <= maxRetries; i++) {
    try {
      console.log(`🔌 Attempting database connection (${i}/${maxRetries})...`);
      await connectDatabase();
      console.log('✅ Connected to PostgreSQL');
      return;
    } catch (error) {
      console.error(`❌ Connection attempt ${i} failed:`, (error as Error).message);
      if (i < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, i), 30000); // Exponential backoff, max 30s
        console.log(`⏳ Retrying in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw new Error('Failed to connect to database after maximum retries');
}

// Keep retrying database connection in background
function retryDatabaseConnection() {
  setInterval(async () => {
    try {
      console.log('🔄 Retrying database connection...');
      await connectDatabase();
      console.log('✅ Database reconnected!');
      // Start signal detection if it wasn't started
      if (!signalDetector) {
        signalDetector = new SignalDetectionService();
        await signalDetector.start();
      }
    } catch (error) {
      console.error('❌ Database reconnection failed, will retry in 30s');
    }
  }, 30000); // Retry every 30 seconds
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n⏹️  SIGTERM received, shutting down gracefully...');
  if (signalDetector) {
    signalDetector.stop();
  }
  pool.end();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n⏹️  SIGINT received, shutting down gracefully...');
  if (signalDetector) {
    signalDetector.stop();
  }
  pool.end();
  process.exit(0);
});

// Start the server
startServer();
