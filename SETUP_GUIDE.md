# AI Growth Accelerator - Complete Setup Guide

This guide will walk you through setting up your fully custom-coded AGA system that replaces all n8n workflows.

## 🎯 What We've Built

We've created a **complete custom backend** that replaces your three n8n workflows:

1. ✅ **Main Campaign Orchestrator** - Replaces `nov 2025 AGA.json`
2. ✅ **CSV Lead Extraction** - Replaces `internal extract CSV.json`
3. ✅ **AI Personalization** - Replaces `internal personalization.json`

### Architecture Overview

```
┌─────────────────┐
│  React Frontend │
│  (Vite + React) │
└────────┬────────┘
         │
         │ HTTP/REST API
         │
┌────────▼────────────────────┐
│   Custom Backend (NEW!)     │
│   - Express + TypeScript    │
│   - CSV Processing          │
│   - AI Orchestration        │
│   - Batch Processing        │
└────────┬────────────────────┘
         │
    ┌────┴─────┬─────────────┬──────────┐
    │          │             │          │
┌───▼───┐  ┌──▼───┐  ┌──────▼─────┐  ┌▼──────┐
│Supabase│ │Perple-│ │  OpenRouter │ │ Other  │
│  DB    │ │xity AI│ │  (Claude)   │ │ APIs   │
└────────┘ └───────┘ └─────────────┘ └────────┘
```

## 📋 Prerequisites

Before you begin, ensure you have:

- [x] Node.js 18+ or Bun installed
- [x] Supabase account and project
- [x] Perplexity AI API key
- [x] OpenRouter API key (for Claude access)
- [x] Git (for version control)

## 🚀 Step-by-Step Setup

### Step 1: Backend Setup

#### 1.1 Navigate to Backend Directory
```bash
cd backend
```

#### 1.2 Install Dependencies
```bash
npm install
```

#### 1.3 Configure Environment Variables
```bash
cp .env.example .env
```

Edit `.env` and fill in your credentials:
```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# AI Service API Keys
PERPLEXITY_API_KEY=your_perplexity_api_key_here
OPENROUTER_API_KEY=your_openrouter_api_key_here

# API Configuration
MAX_BATCH_SIZE=50
RETRY_ATTEMPTS=3
RETRY_DELAY_MS=2000
```

**Where to find these keys:**

- **Supabase Keys**:
  - Go to your Supabase project dashboard
  - Navigate to Settings > API
  - Copy `URL`, `anon public`, and `service_role` keys

- **Perplexity API Key**:
  - Sign up at https://www.perplexity.ai/
  - Go to API settings
  - Generate an API key

- **OpenRouter API Key**:
  - Sign up at https://openrouter.ai/
  - Go to Keys section
  - Create a new API key

#### 1.4 Start Backend Server
```bash
npm run dev
```

You should see:
```
🚀 AGA Backend Server Started
📡 Server running on http://localhost:3001
🌍 Environment: development
```

#### 1.5 Test Backend Health
Open a new terminal and run:
```bash
curl http://localhost:3001/api/health
```

You should get:
```json
{
  "status": "ok",
  "timestamp": "2025-12-03T...",
  "services": {
    "api": "operational",
    "database": "operational",
    "ai": "operational"
  }
}
```

### Step 2: Frontend Setup

#### 2.1 Navigate to Root Directory
```bash
cd ..  # Go back to root directory
```

#### 2.2 Configure Frontend Environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Backend API URL
VITE_BACKEND_URL=http://localhost:3001
```

#### 2.3 Install Frontend Dependencies (if not already done)
```bash
npm install
```

#### 2.4 Start Frontend Dev Server
```bash
npm run dev
```

The frontend should start on `http://localhost:5173`

### Step 3: Database Setup

Your existing Supabase database should already have the required tables. Verify these tables exist:

- ✅ `campaigns`
- ✅ `campaign_leads`
- ✅ `Client Metrics`
- ✅ `AGA Runs Progress`

If you need to create them, refer to `database_setup.sql` in your project.

### Step 4: Test the System

#### 4.1 Prepare a Test CSV

Create a test CSV file (`test-leads.csv`) with this format:
```csv
First Name,Last Name,Email,Company,Company URL,Job Title,LinkedIn URL,Location
John,Doe,john@example.com,Example Corp,https://example.com,CEO,https://linkedin.com/in/johndoe,San Francisco
Jane,Smith,jane@acme.com,Acme Inc,https://acme.com,CTO,https://linkedin.com/in/janesmith,New York
```

#### 4.2 Test Configuration Endpoint

```bash
curl -X POST http://localhost:3001/api/campaigns/test \
  -F "csv_file=@test-leads.csv" \
  -F "leadSource=csv" \
  -F "campaign_id=$(uuidgen)" \
  -F "campaign_leads_id=$(uuidgen)" \
  -F "user_id=$(uuidgen)" \
  -F "campaignName=Test Campaign" \
  -F "perplexityPrompt=Research the company" \
  -F "personalizationPrompt=Create a personalized message" \
  -F "promptTask=Write a cold outreach opener" \
  -F "promptGuidelines=Max 25 words, conversational tone" \
  -F "promptExample=Noticed your company..." \
  -F "personalizationStrategy=Research-based" \
  -F "demo=true"
```

You should get:
```json
{
  "success": true,
  "message": "Configuration is valid",
  "lead_preview": {
    "total": 2,
    "sample": [...]
  }
}
```

#### 4.3 Test Full Campaign Processing

Use the frontend to:

1. Log in to your app
2. Navigate to the campaign creation page
3. Upload your test CSV
4. Fill in the prompts
5. Click "Process Campaign"

Monitor the backend console for progress logs.

## 🔧 Frontend Integration

### Update Your Campaign Form

If you're using a custom form component, integrate with the backend client:

```typescript
import { agaBackend } from '@/services/agaBackend';
import { v4 as uuidv4 } from 'uuid';

const handleSubmit = async (formData: FormData) => {
  try {
    // Create campaign in Supabase first
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert({
        name: formData.get('campaignName'),
        user_id: user.id,
        completed_count: 0
      })
      .select()
      .single();

    if (error) throw error;

    // Create campaign_leads entry
    const { data: campaignLeads, error: leadsError } = await supabase
      .from('campaign_leads')
      .insert({
        campaign_id: campaign.id,
        user_id: user.id,
        lead_data: []
      })
      .select()
      .single();

    if (leadsError) throw leadsError;

    // Call backend to process campaign
    const response = await agaBackend.processCampaign({
      csv_file: formData.get('csv_file') as File,
      leadSource: 'csv',
      campaign_id: campaign.id,
      campaign_leads_id: campaignLeads.id,
      user_id: user.id,
      campaignName: campaign.name,
      perplexityPrompt: formData.get('perplexityPrompt') as string,
      personalizationPrompt: formData.get('personalizationPrompt') as string,
      promptTask: formData.get('promptTask') as string,
      promptGuidelines: formData.get('promptGuidelines') as string,
      promptExample: formData.get('promptExample') as string,
      personalizationStrategy: formData.get('strategy') as string,
      demo: 'false'
    });

    console.log('Campaign started:', response.run_id);

    // Poll for completion
    await agaBackend.pollUntilComplete(
      response.run_id,
      (status) => {
        console.log('Status update:', status.status);
        // Update UI with status
      }
    );

    // Get results
    const results = await agaBackend.getCampaignResults(campaignLeads.id);
    console.log('Results:', results);

  } catch (error) {
    console.error('Campaign failed:', error);
  }
};
```

## 🎨 Updating Existing Forms

### If you're using UpdatedSimplifiedEnhancedForm.tsx

Replace the n8n webhook call with:

```typescript
// OLD (n8n):
const n8nResponse = await fetch('https://n8n.example.com/webhook/...', {
  method: 'POST',
  body: formData
});

// NEW (Custom Backend):
import { agaBackend } from '@/services/agaBackend';

const response = await agaBackend.processCampaign({
  csv_file: csvFile,
  leadSource: 'csv',
  campaign_id: campaignId,
  campaign_leads_id: campaignLeadsId,
  user_id: userId,
  // ... other fields
});
```

## 📊 Monitoring & Debugging

### Backend Logs

The backend logs everything to console:
- ✅ Campaign start/completion
- ✅ Each lead being processed
- ✅ AI API calls and responses
- ✅ Errors with stack traces
- ✅ Database operations

### Check Campaign Status

```bash
# Get status
curl http://localhost:3001/api/campaigns/status/{run_id}

# Get results
curl http://localhost:3001/api/campaigns/results/{campaign_leads_id}

# Export CSV
curl http://localhost:3001/api/campaigns/export/{campaign_leads_id} > results.csv
```

### Database Monitoring

Check Supabase dashboard:
1. Go to Table Editor
2. View `AGA Runs Progress` for status
3. View `campaign_leads` for enriched data
4. View `Client Metrics` for updated KPIs

## 🚨 Troubleshooting

### Backend Won't Start

**Error: Invalid environment variables**
- Check your `.env` file in the `backend/` directory
- Ensure all required variables are set
- No quotes around values

**Error: Cannot connect to Supabase**
- Verify SUPABASE_URL is correct
- Check SUPABASE_SERVICE_ROLE_KEY (not anon key)
- Test connection in Supabase dashboard

### AI API Errors

**Perplexity 401 Unauthorized**
- Verify PERPLEXITY_API_KEY is correct
- Check API key hasn't expired
- Ensure you have credits

**OpenRouter 401 Unauthorized**
- Verify OPENROUTER_API_KEY is correct
- Check you have credits
- Ensure Claude model is enabled

### Frontend Can't Connect to Backend

**Network Error**
- Ensure backend is running (`npm run dev` in backend/)
- Check VITE_BACKEND_URL in frontend `.env`
- Verify CORS is configured (should allow localhost:5173)

### No Leads Processing

**Status stuck on "extracting"**
- Check backend console for CSV parsing errors
- Verify CSV has required columns (Email, Company)
- Test with `/api/campaigns/test` endpoint first

**Status shows "failed"**
- Check backend console for error
- Query `AGA Runs Progress` table for error_message
- Check AI API keys and credits

## 🎯 Production Deployment

### Backend Deployment

1. **Build for production:**
```bash
cd backend
npm run build
```

2. **Deploy to your hosting service:**
   - Railway: Connect GitHub repo, auto-deploys
   - Render: Connect repo, add environment variables
   - DigitalOcean App Platform: Similar process
   - AWS/GCP: Use container or serverless

3. **Set production environment variables:**
```env
NODE_ENV=production
SUPABASE_URL=your_production_supabase
# ... other production values
```

4. **Update CORS origins:**
Edit `backend/src/middleware/cors.ts`:
```typescript
origin: ['https://your-production-domain.com']
```

### Frontend Deployment

1. **Update `.env.production`:**
```env
VITE_BACKEND_URL=https://your-backend-domain.com
```

2. **Build:**
```bash
npm run build
```

3. **Deploy `dist/` folder to:**
   - Vercel
   - Netlify
   - Cloudflare Pages
   - Any static hosting

## 📈 Next Steps

Now that your custom backend is running:

1. ✅ **Remove n8n dependency** - You no longer need n8n!
2. ✅ **Update frontend forms** - Use `agaBackend` client
3. ✅ **Test thoroughly** - Run multiple campaigns
4. ✅ **Monitor costs** - Track AI API usage
5. ✅ **Scale as needed** - Add more batch processing if needed

## 🎉 Benefits of Your New System

Compared to n8n, you now have:

- ✅ **Full Code Control** - Modify anything you want
- ✅ **Better Debugging** - See exactly what's happening
- ✅ **Type Safety** - TypeScript catches errors before runtime
- ✅ **Lower Costs** - No n8n subscription needed
- ✅ **Faster Execution** - Optimized batch processing
- ✅ **Better Error Handling** - Retry logic and graceful degradation
- ✅ **Easier Testing** - Test endpoints directly
- ✅ **Better Logging** - Comprehensive console logs

## 🆘 Need Help?

If you encounter issues:

1. Check backend console logs
2. Test with `/api/health` endpoint
3. Verify all environment variables
4. Test with `/api/campaigns/test` before processing
5. Check Supabase logs for database errors

## 📚 Additional Documentation

- Backend API: See `backend/README.md`
- Frontend Client: See `src/services/agaBackend.ts`
- Database Schema: See `src/docs/DATABASE_SCHEMA.md`
- n8n Workflow Analysis: See workflow analysis in this guide

---

**Congratulations! 🎉**

You've successfully replaced n8n with a fully custom, production-ready backend. Your AGA system is now completely under your control!
