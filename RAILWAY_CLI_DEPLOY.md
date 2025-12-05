# 🚂 Railway CLI Deployment Guide

## Step-by-Step Deployment

### Step 1: Login to Railway
Run this command and follow the browser authentication:
```bash
cd backend
railway login
```

This will open a browser window. Log in with your GitHub account and authorize the CLI.

### Step 2: Create a New Railway Project
```bash
railway init
```

You'll be prompted to:
- Enter a project name (e.g., "aga-backend")
- Choose to create a new project

### Step 3: Link to Railway Project
After creating the project:
```bash
railway link
```

Select the project you just created.

### Step 4: Set Environment Variables
Add all your environment variables one by one:

```bash
# Node environment
railway variables --set NODE_ENV=production
railway variables --set PORT=3001

# Supabase
railway variables --set SUPABASE_URL=your_supabase_url_here
railway variables --set SUPABASE_ANON_KEY=your_supabase_anon_key_here
railway variables --set SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
railway variables --set SUPABASE_DB_PASSWORD=your_supabase_db_password_here

# AI Services
railway variables --set PERPLEXITY_API_KEY=your_perplexity_api_key_here
railway variables --set OPENROUTER_API_KEY=your_openrouter_api_key_here

# Notifications
railway variables --set SLACK_WEBHOOK_URL=your_slack_webhook_url_here

# Configuration
railway variables --set MAX_BATCH_SIZE=50
railway variables --set RETRY_ATTEMPTS=3
railway variables --set RETRY_DELAY_MS=2000
```

### Step 5: Deploy
```bash
railway up
```

This will:
- Build your TypeScript project
- Package it up
- Deploy to Railway
- Give you a public URL

### Step 6: Get Your Deployment URL
```bash
railway domain
```

This will show your Railway deployment URL (e.g., `https://aga-backend-production.up.railway.app`)

---

## Alternative: Bulk Set Variables from .env

If you prefer, you can set all variables at once from your .env file:

```bash
cd backend
railway variables --set-from-env .env
```

This will read your `.env` file and set all variables automatically.

---

## Useful Commands

### View logs in real-time
```bash
railway logs
```

### Check deployment status
```bash
railway status
```

### Open Railway dashboard for this project
```bash
railway open
```

### Redeploy
```bash
railway up
```

### View all environment variables
```bash
railway variables
```

---

## After Deployment

1. **Copy your Railway URL** (from `railway domain` command)
2. **Add FRONTEND_URL variable**:
   ```bash
   railway variables --set FRONTEND_URL=https://your-app.vercel.app
   ```
   (You'll get this URL after deploying the frontend to Vercel)

3. **Test the deployment**:
   ```bash
   curl https://your-railway-url.up.railway.app/api/health
   ```

4. **Use this URL in your Vercel frontend**:
   - Set `VITE_BACKEND_URL=https://your-railway-url.up.railway.app` in Vercel

---

## Troubleshooting

### Build fails
- Check logs: `railway logs`
- Ensure `package.json` has correct `build` and `start` scripts
- Verify TypeScript compiles locally: `npm run build`

### Deployment successful but app not responding
- Check if PORT is set to 3001
- Verify environment variables: `railway variables`
- Check runtime logs: `railway logs --follow`

### Environment variables not working
- List all variables: `railway variables`
- Re-set a variable: `railway variables --set VARIABLE_NAME=value`
- Redeploy: `railway up`

---

## Next Steps

After backend is deployed:
1. Copy your Railway backend URL
2. Deploy frontend to Vercel with `VITE_BACKEND_URL` set to your Railway URL
3. Update Railway `FRONTEND_URL` with your Vercel URL
4. Test the full application end-to-end
