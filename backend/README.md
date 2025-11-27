# Crypto Terminal Backend - 24/7 Signal Detection

Backend service that runs continuously to detect confluence signals and store them in PostgreSQL.

## Features

- ✅ **24/7 Signal Detection** - Runs every 30 seconds
- ✅ **PostgreSQL Storage** - Persistent alert history
- ✅ **48-Hour Retention** - Auto-cleanup old alerts
- ✅ **REST API** - Fetch historical signals
- ✅ **Real Binance Data** - Live market data from Binance Futures

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Setup Database

Create a PostgreSQL database (Railway provides one for free).

### 3. Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-frontend.vercel.app
```

### 4. Run Locally

Development:
```bash
npm run dev
```

Production:
```bash
npm run build
npm start
```

## API Endpoints

### Get All Alerts (Past 48h)
```
GET /api/alerts
```

Response:
```json
{
  "alerts": [...],
  "count": 15
}
```

### Get Alerts by Symbol
```
GET /api/alerts/BTCUSDT
```

### Get Alerts by Severity
```
GET /api/alerts/severity/CRITICAL
```

### Get Statistics
```
GET /api/stats
```

Response:
```json
{
  "totalAlerts": 25,
  "bySeverity": {
    "CRITICAL": 5,
    "HIGH": 10,
    "MEDIUM": 10
  },
  "bySetupType": {
    "SHORT_SQUEEZE": 8,
    "LONG_FLUSH": 10,
    "CAPITULATION_BOTTOM": 7
  }
}
```

### Health Check
```
GET /api/health
```

## Deployment to Railway

### 1. Create Railway Account

Go to [railway.app](https://railway.app) and sign up.

### 2. Create New Project

- Click "New Project"
- Select "Deploy from GitHub repo"
- Connect your GitHub repository
- Select the `crypto-terminal` repo

### 3. Add PostgreSQL

- Click "New" → "Database" → "PostgreSQL"
- Railway will auto-provision a database
- Copy the `DATABASE_URL` from the PostgreSQL service

### 4. Configure Backend Service

- Click "New" → "GitHub Repo" → Select your repo
- Set Root Directory: `backend`
- Add Environment Variables:
  - `DATABASE_URL`: (from PostgreSQL service)
  - `PORT`: `3001`
  - `NODE_ENV`: `production`
  - `FRONTEND_URL`: `https://your-app.vercel.app`

### 5. Deploy

- Railway will auto-deploy on push to main
- Get your backend URL: `https://your-backend.railway.app`

### 6. Update Frontend

Add to Vercel environment variables:
```
NEXT_PUBLIC_BACKEND_URL=https://your-backend.railway.app
```

Redeploy frontend.

## How It Works

1. **Signal Detection Service** runs every 30 seconds
2. Fetches live data from Binance Futures API
3. Runs confluence detection algorithm
4. Stores new signals in PostgreSQL
5. Frontend fetches historical signals on load
6. Automatic cleanup removes alerts older than 48 hours

## Database Schema

```sql
CREATE TABLE confluence_alerts (
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
```

## Cost

**Railway Free Tier:**
- $5 free credit/month
- 500 hours execution
- 1GB RAM
- 1GB storage

**Sufficient for:**
- 24/7 backend (730 hours/month)
- PostgreSQL database
- Signal detection every 30s

**Estimated cost:** **FREE** (within free tier limits)

## Monitoring

Check logs in Railway dashboard:
- Signal detection: `✅ Detected and stored X new signal(s)`
- Cleanup: `🧹 Cleaned up X old alerts (>48h)`
- Errors: Any issues will be logged

## Support

For issues, check:
1. Railway logs
2. Database connection
3. Frontend CORS settings
4. Environment variables
