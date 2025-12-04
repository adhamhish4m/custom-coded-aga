# Quick Start Guide - Custom AGA Backend

## 🚀 Get Running in 5 Minutes

### Step 1: Backend Setup (2 minutes)
```bash
# Install dependencies
cd backend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start server
npm run dev
```

### Step 2: Frontend Setup (1 minute)
```bash
# Go back to root
cd ..

# Configure environment
cp .env.example .env
# Edit .env with VITE_BACKEND_URL=http://localhost:3001

# Start frontend
npm run dev
```

### Step 3: Test (2 minutes)
```bash
# Health check
curl http://localhost:3001/api/health

# Test with sample CSV
curl -X POST http://localhost:3001/api/campaigns/test \
  -F "csv_file=@your-test.csv" \
  -F "leadSource=csv" \
  -F "campaign_id=$(uuidgen)" \
  -F "campaign_leads_id=$(uuidgen)" \
  -F "user_id=$(uuidgen)" \
  -F "campaignName=Test" \
  -F "perplexityPrompt=Research company" \
  -F "personalizationPrompt=Personalize message" \
  -F "promptTask=Cold outreach" \
  -F "promptGuidelines=25 words max" \
  -F "promptExample=Example message" \
  -F "personalizationStrategy=Research" \
  -F "demo=true"
```

## 📋 Required Environment Variables

### Backend (backend/.env)
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
PERPLEXITY_API_KEY=xxx
OPENROUTER_API_KEY=xxx
```

### Frontend (.env)
```env
VITE_BACKEND_URL=http://localhost:3001
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

## 🔑 Where to Get API Keys

1. **Supabase**: Project Settings > API
2. **Perplexity**: https://www.perplexity.ai/ > API
3. **OpenRouter**: https://openrouter.ai/ > Keys

## 📡 Main Endpoints

- `POST /api/campaigns/process` - Start campaign
- `GET /api/campaigns/status/:runId` - Check status
- `GET /api/campaigns/results/:campaignLeadsId` - Get results
- `GET /api/campaigns/export/:campaignLeadsId` - Export CSV

## 💻 Frontend Integration

```typescript
import { agaBackend } from '@/services/agaBackend';

// Start campaign
const response = await agaBackend.processCampaign({
  csv_file: file,
  leadSource: 'csv',
  campaign_id: 'uuid',
  campaign_leads_id: 'uuid',
  user_id: 'uuid',
  campaignName: 'My Campaign',
  perplexityPrompt: '...',
  personalizationPrompt: '...',
  promptTask: '...',
  promptGuidelines: '...',
  promptExample: '...',
  personalizationStrategy: '...',
  demo: 'false'
});

// Poll for completion
await agaBackend.pollUntilComplete(
  response.run_id,
  (status) => console.log(status.status)
);

// Get results
const results = await agaBackend.getCampaignResults(
  response.campaign_leads_id
);
```

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Backend won't start | Check `.env` file exists and has all keys |
| 401 API errors | Verify API keys are correct |
| Can't connect to DB | Check SUPABASE_SERVICE_ROLE_KEY (not anon) |
| Frontend can't reach backend | Ensure backend is running on port 3001 |
| No leads processed | Check CSV has Email and Company columns |

## 📚 Full Documentation

- Complete setup: `SETUP_GUIDE.md`
- Migration from n8n: `MIGRATION_CHECKLIST.md`
- Backend API: `backend/README.md`

## ✅ Verification Checklist

- [ ] Backend health check returns "ok"
- [ ] Test endpoint validates CSV successfully
- [ ] Campaign processes 2-3 test leads
- [ ] Leads saved to `campaign_leads` table
- [ ] KPIs updated in `Client Metrics`
- [ ] Can export results as CSV

## 🎯 What This Replaces

This custom backend completely replaces:
- ❌ n8n "nov 2025 AGA" workflow
- ❌ n8n "internal extract CSV" workflow
- ❌ n8n "internal personalization" workflow

You now have:
- ✅ Full code control
- ✅ Better error handling
- ✅ Type safety
- ✅ No subscription costs
- ✅ Faster execution

---

**Need help?** Check `SETUP_GUIDE.md` for detailed instructions.
