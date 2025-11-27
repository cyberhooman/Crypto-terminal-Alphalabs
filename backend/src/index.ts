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

// Routes
app.use('/api', router);

// Signal detection service instance
const signalDetector = new SignalDetectionService();

// Startup
async function startServer() {
  try {
    console.log('🚀 Starting Crypto Terminal Backend...');

    // Connect to database
    await connectDatabase();

    // Start signal detection
    await signalDetector.start();

    // Schedule periodic cleanup (every hour)
    setInterval(async () => {
      const deleted = await cleanupOldAlerts(pool);
      if (deleted > 0) {
        console.log(`🧹 Cleaned up ${deleted} old alerts (>48h)`);
      }
    }, 60 * 60 * 1000);

    // Start HTTP server
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📡 API: http://localhost:${PORT}/api`);
      console.log(`🎯 Frontend CORS: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n⏹️  SIGTERM received, shutting down gracefully...');
  signalDetector.stop();
  pool.end();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n⏹️  SIGINT received, shutting down gracefully...');
  signalDetector.stop();
  pool.end();
  process.exit(0);
});

// Start the server
startServer();
