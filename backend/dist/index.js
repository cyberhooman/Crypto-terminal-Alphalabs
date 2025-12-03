"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Main backend server
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("./db/client");
const signalDetector_1 = require("./services/signalDetector");
const marketDataService_1 = require("./services/marketDataService");
const schema_1 = require("./db/schema");
const routes_1 = __importDefault(require("./api/routes"));
const client_2 = __importDefault(require("./db/client"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middleware - CORS configuration
const allowedOrigins = [
    'http://localhost:3000',
    'https://crypto-trading-terminal.up.railway.app',
    process.env.FRONTEND_URL
].filter(Boolean);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, curl, etc.)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            console.warn(`⚠️  CORS blocked request from origin: ${origin}`);
            callback(null, true); // Allow anyway for now (can restrict later if needed)
        }
    },
    credentials: true,
}));
app.use(express_1.default.json());
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
app.use('/api', routes_1.default);
// Service instances
let signalDetector = null;
let marketDataStarted = false;
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
        // Start market data service (independent of database)
        console.log('📊 Starting 24/7 market data service...');
        await marketDataService_1.marketDataService.start();
        marketDataStarted = true;
        console.log('✅ Market data service online');
        // Try to connect to database with retries
        await connectWithRetry();
        // Start signal detection (requires database)
        signalDetector = new signalDetector_1.SignalDetectionService();
        await signalDetector.start();
        // Schedule periodic cleanup (every hour)
        setInterval(async () => {
            const deleted = await (0, schema_1.cleanupOldAlerts)(client_2.default);
            if (deleted > 0) {
                console.log(`🧹 Cleaned up ${deleted} old alerts (>48h)`);
            }
        }, 60 * 60 * 1000);
    }
    catch (error) {
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
            await (0, client_1.connectDatabase)();
            console.log('✅ Connected to PostgreSQL');
            return;
        }
        catch (error) {
            console.error(`❌ Connection attempt ${i} failed:`, error.message);
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
            await (0, client_1.connectDatabase)();
            console.log('✅ Database reconnected!');
            // Start signal detection if it wasn't started
            if (!signalDetector) {
                signalDetector = new signalDetector_1.SignalDetectionService();
                await signalDetector.start();
            }
        }
        catch (error) {
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
    if (marketDataStarted) {
        marketDataService_1.marketDataService.stop();
    }
    client_2.default.end();
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('\n⏹️  SIGINT received, shutting down gracefully...');
    if (signalDetector) {
        signalDetector.stop();
    }
    if (marketDataStarted) {
        marketDataService_1.marketDataService.stop();
    }
    client_2.default.end();
    process.exit(0);
});
// Start the server
startServer();
