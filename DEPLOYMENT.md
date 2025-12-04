# 🚀 Deployment Guide

Complete guide to deploy your AGA application to production.

## Overview

- **Frontend**: Vercel (React/Vite)
- **Backend**: Railway (Express/TypeScript)
- **Database**: Supabase (already hosted)

---

## 1️⃣ Backend Deployment (Railway)

### Step 1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign in with your GitHub account

### Step 2: Create New Project
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your repository
4. Railway will auto-detect Node.js

### Step 3: Configure Root Directory
Since your backend is in a subfolder:
1. Go to **Settings** → **Service Settings**
2. Set **Root Directory** to: `backend`

### Step 4: Verify Build Configuration
Railway should auto-detect these, but verify:
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Install Command**: `npm install`

### Step 5: Add Environment Variables
Go to **Variables** tab and add all these variables:

```bash
NODE_ENV=production
PORT=3001

# Supabase
SUPABASE_URL=https://erxxyzvsmjkyubdxqcfd.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyeHh5enZzbWpreXViZHhxY2ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3OTA4MjEsImV4cCI6MjA4MDM2NjgyMX0.wyvHRVeqjF9vmLGfMIIPJ61qnFA-7blB8S7OVNapITE
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyeHh5enZzbWpreXViZHhxY2ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc5MDgyMSwiZXhwIjoyMDgwMzY2ODIxfQ.3ZV203Cv3T1oNmdNMvdipkHcN78FAw1HwAuyNeEYMEM
SUPABASE_DB_PASSWORD=Du6Tr!Qq#LmGX3A

# AI Services
PERPLEXITY_API_KEY=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
OPENROUTER_API_KEY=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

# Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/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

# Frontend URL (add after deploying frontend)
FRONTEND_URL=https://your-app.vercel.app

# Configuration
MAX_BATCH_SIZE=50
RETRY_ATTEMPTS=3
RETRY_DELAY_MS=2000
```

### Step 6: Deploy
1. Click **"Deploy"**
2. Wait for build to complete (~2-3 minutes)
3. Railway will provide a public URL like: `https://your-app.up.railway.app`
4. **⚠️ Copy this URL** - you'll need it for frontend configuration

### Step 7: Test Backend
Visit your Railway URL to verify:
```
https://your-app.up.railway.app/api/health
```
Should return: `{"status":"ok","timestamp":"..."}`

---

## 2️⃣ Frontend Deployment (Vercel)

### Step 1: Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign in with your GitHub account

### Step 2: Import Project
1. Click **"Add New"** → **"Project"**
2. Select your repository
3. Vercel will auto-detect Vite

### Step 3: Configure Project Settings
- **Framework Preset**: Vite (auto-detected)
- **Root Directory**: `./` (leave as root)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Step 4: Add Environment Variables
Go to **Settings** → **Environment Variables** and add:

```bash
VITE_SUPABASE_URL=https://erxxyzvsmjkyubdxqcfd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyeHh5enZzbWpreXViZHhxY2ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3OTA4MjEsImV4cCI6MjA4MDM2NjgyMX0.wyvHRVeqjF9vmLGfMIIPJ61qnFA-7blB8S7OVNapITE
VITE_BACKEND_URL=https://your-backend.up.railway.app
```

**⚠️ Important**: Replace `https://your-backend.up.railway.app` with your actual Railway backend URL from Step 1!

### Step 5: Deploy
1. Click **"Deploy"**
2. Wait for build (~1-2 minutes)
3. You'll get a URL like: `https://your-app.vercel.app`

### Step 6: Update Backend CORS
Now that you have your Vercel URL, go back to Railway:
1. Open your Railway project
2. Go to **Variables**
3. Update `FRONTEND_URL` to your Vercel URL: `https://your-app.vercel.app`
4. Railway will automatically redeploy

---

## 3️⃣ Post-Deployment Verification

### Test the Full Flow

1. **Visit your frontend**: `https://your-app.vercel.app`
2. **Sign in** with your Supabase credentials
3. **Create a campaign** with a small CSV (5-10 leads)
4. **Verify**:
   - Campaign status updates in real-time
   - Leads get personalized
   - Completed count increases
   - Slack notification arrives (if enabled)

### Check Backend Health
```bash
curl https://your-backend.up.railway.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-12-04T20:00:00.000Z",
  "environment": "production"
}
```

### Check Frontend Connection
1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Trigger any action (view campaign, submit form)
4. Verify API calls go to your Railway backend URL
5. No CORS errors should appear

---

## 4️⃣ Custom Domain (Optional)

### For Backend (Railway)
1. Go to Railway project → **Settings** → **Domains**
2. Click **"Add Custom Domain"**
3. Enter your domain (e.g., `api.yourdomain.com`)
4. Add DNS records as shown by Railway
5. Update `FRONTEND_URL` in Vercel to your custom domain

### For Frontend (Vercel)
1. Go to Vercel project → **Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter your domain (e.g., `app.yourdomain.com`)
4. Follow Vercel's DNS configuration steps
5. Update `VITE_BACKEND_URL` to point to your backend custom domain

---

## 5️⃣ Continuous Deployment

Both Railway and Vercel are now configured for **automatic deployments**:

### Automatic Deploys on Git Push
- Push to `main` branch → Both frontend and backend automatically deploy
- Pull requests can create preview deployments (enable in settings)

### Manual Redeploy
- **Railway**: Go to Deployments → Click "Redeploy"
- **Vercel**: Go to Deployments → Click "Redeploy"

---

## 6️⃣ Monitoring & Logs

### Backend Logs (Railway)
1. Go to your Railway project
2. Click on **"Logs"** tab
3. View real-time logs of your backend
4. Filter by log level (info, error, etc.)

### Frontend Logs (Vercel)
1. Go to your Vercel project
2. Click on **"Logs"** in deployment details
3. View build logs and function logs

### Database Monitoring (Supabase)
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **"Database"** → **"Logs"**
4. Monitor queries and performance

---

## 7️⃣ Environment Variable Management

### Adding New Environment Variables

**Backend (Railway)**:
1. Go to Variables tab
2. Add new variable
3. Railway auto-redeploys

**Frontend (Vercel)**:
1. Go to Settings → Environment Variables
2. Add variable (must start with `VITE_` to be accessible)
3. Trigger manual redeploy to use new variables

### Security Best Practices
- ✅ Never commit `.env` files to Git
- ✅ Use different API keys for development and production
- ✅ Rotate Supabase service role key if exposed
- ✅ Use Railway/Vercel's secret management (variables are encrypted)

---

## 8️⃣ Troubleshooting

### Backend Won't Start
**Check Railway Logs**:
```
Environment variable missing: SUPABASE_URL
```
**Fix**: Add missing environment variables in Railway Variables tab

### CORS Errors
**Error**: `Access to fetch at 'https://backend.com' from origin 'https://frontend.com' has been blocked by CORS`

**Fix**:
1. Verify `FRONTEND_URL` in Railway matches your Vercel URL exactly
2. Check Railway logs for CORS errors
3. Redeploy backend after updating `FRONTEND_URL`

### Frontend Can't Connect to Backend
**Check**:
1. Is `VITE_BACKEND_URL` set correctly in Vercel?
2. Open browser DevTools → Network tab
3. Verify API calls go to correct Railway URL
4. Check if backend is responding at `/api/health`

### Build Failures

**Backend Build Error**:
- Check Railway build logs
- Common issue: TypeScript errors
- Run `npm run build` locally first to catch errors

**Frontend Build Error**:
- Check Vercel deployment logs
- Common issue: Missing environment variables
- Ensure all `VITE_*` variables are set in Vercel

### Slow Performance
- **Railway**: Upgrade to paid plan for better resources
- **Vercel**: Check function execution time in logs
- **Supabase**: Review query performance in dashboard

---

## 9️⃣ Cost Estimate

### Free Tier Limits

**Railway** (Free $5/month credit):
- Good for ~500 hours of uptime
- 512MB RAM, 1GB disk
- Should be sufficient for development/testing

**Vercel** (Free):
- Unlimited bandwidth
- 100GB bandwidth per month
- 6000 build minutes per month
- More than enough for most apps

**Supabase** (Free):
- 500MB database space
- 1GB file storage
- 2GB bandwidth
- 50,000 monthly active users
- Should handle several thousand leads

### When to Upgrade
- **Railway**: When you need 24/7 uptime ($5-10/month)
- **Vercel**: Usually stay on free tier unless you need team features
- **Supabase**: When you exceed 500MB database ($25/month for Pro)

---

## 🎉 You're Live!

Your application is now deployed and accessible worldwide:

- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-backend.up.railway.app`
- **Database**: Already on Supabase cloud

Every git push to main will automatically deploy updates to both services!

---

## Quick Reference URLs

- **Railway Dashboard**: https://railway.app/dashboard
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Backend Health Check**: `https://your-backend.up.railway.app/api/health`
- **Frontend App**: `https://your-app.vercel.app`

---

## Support

If you encounter issues:
1. Check Railway and Vercel logs first
2. Verify all environment variables are set correctly
3. Test backend health endpoint
4. Check browser console for frontend errors
5. Review Supabase dashboard for database issues
