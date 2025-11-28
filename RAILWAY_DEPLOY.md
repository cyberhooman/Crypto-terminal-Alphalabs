# Railway Deployment Guide

## Step-by-Step Instructions

### 1. Create Railway Account
- Go to [railway.app](https://railway.app)
- Sign up with GitHub

### 2. Create New Project
- Click "New Project"
- Select "Deploy from GitHub repo"
- Choose your `Crypto-terminal-Alphalabs` repository

### 3. Add PostgreSQL Database
- In your project, click "New"
- Select "Database" → "Add PostgreSQL"
- Railway will auto-provision the database
- **Copy the DATABASE_URL** from the PostgreSQL service

### 4. Configure Backend Service

**IMPORTANT: Set Root Directory**

Railway will try to deploy the entire repo. You need to tell it to only deploy the backend:

1. Click on your service
2. Go to "Settings" tab
3. Find "Root Directory" or "Working Directory"
4. **Set it to: `backend`**

### 5. Add Environment Variables

In your backend service, go to "Variables" tab and add:

```
DATABASE_URL=<paste from PostgreSQL service>
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-app.vercel.app
```

**Note:** Railway will auto-inject `DATABASE_URL` if you link the PostgreSQL service.

### 6. Deploy

Railway will auto-deploy. Watch the build logs:

Expected output:
```
✓ Installing dependencies...
✓ Building TypeScript...
✓ Starting server...
🚀 Server running on port 3001
✅ Connected to PostgreSQL
🎯 Signal detection started
```

### 7. Get Your Backend URL

After deployment:
- Find your service URL (e.g., `https://xxx.railway.app`)
- Test it: `https://xxx.railway.app/api/health`

### 8. Update Frontend on Vercel

Add environment variable in Vercel:
```
NEXT_PUBLIC_BACKEND_URL=https://xxx.railway.app
```

Redeploy frontend.

## Troubleshooting

### "Cannot find module 'express'"
**Cause:** Railway is building from wrong directory
**Fix:** Set Root Directory to `backend` in service settings

### "Database connection failed"
**Cause:** DATABASE_URL not set
**Fix:** Link PostgreSQL service or manually add DATABASE_URL

### "Build fails"
**Cause:** Dependencies not installed
**Fix:** Make sure `backend/package.json` exists and Root Directory is set

## Alternative: Manual Setup

If Railway auto-detect doesn't work:

1. Use "Empty Service" instead
2. Connect GitHub repo
3. Set Root Directory: `backend`
4. Set custom build command: `npm install && npm run build`
5. Set start command: `npm start`

## Cost

Free tier includes:
- $5 credit/month
- 500 execution hours
- 1GB RAM
- PostgreSQL database

This is sufficient for 24/7 operation.
