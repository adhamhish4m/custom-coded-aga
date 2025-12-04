# AI Growth Accelerator - Custom Backend Edition

> **🎉 You now have a fully custom-coded backend that completely replaces n8n!**

This repository contains a complete AI-powered lead enrichment and personalization system with a custom TypeScript backend that replaces all n8n workflows.

## 📁 Project Structure

```
custom-coded-aga/
├── backend/                    # 🆕 Custom backend (replaces n8n)
│   ├── src/                   # Source code
│   ├── package.json
│   ├── README.md              # Backend API documentation
│   └── install.sh             # Automated installation script
│
├── src/                       # React frontend
│   └── services/
│       └── agaBackend.ts      # 🆕 Backend API client
│
├── n8n-workflows/             # 📦 Archived workflows (for reference)
│   ├── nov 2025 AGA.json
│   ├── internal extract CSV.json
│   └── internal personalization.json
│
├── SETUP_GUIDE.md             # 📖 Complete setup instructions
├── QUICK_START.md             # ⚡ Get running in 5 minutes
├── MIGRATION_CHECKLIST.md     # ✅ Migration checklist
├── ARCHITECTURE.md            # 🏗️ System architecture diagrams
└── PROJECT_SUMMARY.md         # 📊 Project overview
```

## 🚀 Quick Start

### Option 1: Automated Installation (Recommended)

```bash
cd backend
./install.sh
```

Then:
1. Edit `backend/.env` with your API keys
2. Run `npm run dev`
3. Test with `curl http://localhost:3001/api/health`

### Option 2: Manual Installation

```bash
# Backend
cd backend
npm install
cp .env.example .env
# Edit .env with your keys
npm run dev

# Frontend (in another terminal)
cd ..
npm install
cp .env.example .env
# Edit .env with VITE_BACKEND_URL=http://localhost:3001
npm run dev
```

## 📚 Documentation

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [QUICK_START.md](QUICK_START.md) | Get running in 5 minutes | Start here |
| [SETUP_GUIDE.md](SETUP_GUIDE.md) | Complete setup & testing | After quick start |
| [backend/README.md](backend/README.md) | Backend API reference | When integrating |
| [MIGRATION_CHECKLIST.md](MIGRATION_CHECKLIST.md) | n8n → Custom backend | When migrating |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture | Understanding internals |
| [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) | Project overview | Big picture view |

## 🎯 What's New

### ✅ Replaced n8n Workflows

| Old (n8n) | New (Custom Backend) |
|-----------|---------------------|
| `nov 2025 AGA.json` | `campaign-orchestrator.ts` |
| `internal extract CSV.json` | `csv-processor.ts` |
| `internal personalization.json` | `personalization.ts` |

### ✅ New Features

- **Full TypeScript**: Type safety throughout
- **Better Error Handling**: Retry logic, graceful degradation
- **Batch Processing**: Optimized for large lead lists
- **Real-time Status**: Track campaign progress
- **CSV Export**: Download enriched leads
- **Health Checks**: Monitor system status
- **Test Endpoint**: Validate configuration before processing

## 🔑 Required API Keys

Get these before starting:

1. **Supabase** (free tier available)
   - URL and Service Role Key
   - Get from: Project Settings > API

2. **Perplexity AI** (paid)
   - API key for company research
   - Get from: https://www.perplexity.ai/

3. **OpenRouter** (paid)
   - API key for Claude access
   - Get from: https://openrouter.ai/

## 💡 Key Benefits vs n8n

| Feature | n8n | Custom Backend |
|---------|-----|----------------|
| **Monthly Cost** | $0-$348 | $0 (infra only) |
| **Code Control** | Limited | Complete |
| **Debugging** | Difficult | Easy |
| **Type Safety** | None | Full TypeScript |
| **Performance** | Good | Optimized |
| **Customization** | Limited | Unlimited |
| **Testing** | Manual | Automated |
| **Version Control** | Workflows only | Everything |

## 📡 API Endpoints

Once running on `http://localhost:3001`:

- `GET /api/health` - Health check
- `POST /api/campaigns/process` - Start campaign
- `GET /api/campaigns/status/:runId` - Check status
- `GET /api/campaigns/results/:campaignLeadsId` - Get results
- `GET /api/campaigns/export/:campaignLeadsId` - Export CSV

## 🧪 Testing

```bash
# Health check
curl http://localhost:3001/api/health

# Test configuration (with your test CSV)
curl -X POST http://localhost:3001/api/campaigns/test \
  -F "csv_file=@test-leads.csv" \
  -F "leadSource=csv" \
  -F "campaign_id=$(uuidgen)" \
  -F "campaign_leads_id=$(uuidgen)" \
  -F "user_id=$(uuidgen)" \
  -F "campaignName=Test" \
  -F "perplexityPrompt=Research company" \
  -F "personalizationPrompt=Create message" \
  -F "promptTask=Cold outreach" \
  -F "promptGuidelines=25 words max" \
  -F "promptExample=Example" \
  -F "personalizationStrategy=Research" \
  -F "demo=true"
```

## 🔄 Migration from n8n

Follow these steps to migrate:

1. ✅ Set up backend (use `QUICK_START.md`)
2. ✅ Test with sample data (2-3 leads)
3. ✅ Update frontend to use `agaBackend` client
4. ✅ Run parallel test with n8n (optional)
5. ✅ Migrate production traffic
6. ✅ Archive n8n workflows
7. ✅ Cancel n8n subscription

See [MIGRATION_CHECKLIST.md](MIGRATION_CHECKLIST.md) for detailed steps.

## 🏗️ Architecture

```
React Frontend
     ↓
Custom Backend (Express + TypeScript)
     ↓
  ┌──┴─────┬────────────┐
  ↓        ↓            ↓
Supabase  Perplexity  OpenRouter
  DB        AI        (Claude)
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed diagrams.

## 🛠️ Tech Stack

### Backend
- Node.js 18+
- TypeScript
- Express.js
- Supabase (PostgreSQL)
- Perplexity AI
- OpenRouter (Claude Sonnet 4)

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui

## 📊 Processing Flow

1. User uploads CSV with leads
2. Backend validates and parses CSV
3. Leads batched for processing (10/batch)
4. For each lead:
   - Perplexity researches company
   - Claude generates personalized message
   - Saved to database
   - KPIs updated
5. User gets enriched leads

Processing time: ~10-15 seconds per lead

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Backend won't start | Check `.env` file has all required keys |
| 401 API errors | Verify API keys are correct |
| Can't connect to DB | Use `SUPABASE_SERVICE_ROLE_KEY` (not anon key) |
| No leads processed | Check CSV has `Email` and `Company` columns |
| Frontend connection error | Ensure backend is running on port 3001 |

Full troubleshooting guide: [SETUP_GUIDE.md](SETUP_GUIDE.md#troubleshooting)

## 📈 Performance

- **Batch Size**: 10 leads/batch (configurable)
- **Processing Speed**: ~10-15s per lead
- **Retry Logic**: 3 attempts, 2s delay
- **Timeout**: 60s per AI call
- **Max File Size**: 10MB CSV

## 🔒 Security

- ✅ Environment variable validation
- ✅ CORS configured
- ✅ Input validation
- ✅ File upload restrictions
- ✅ SQL injection prevention
- ✅ Error message sanitization

## 🚀 Deployment

### Backend
- Railway (recommended)
- Render
- DigitalOcean
- AWS/GCP

### Frontend
- Vercel (recommended)
- Netlify
- Cloudflare Pages

See [SETUP_GUIDE.md](SETUP_GUIDE.md#production-deployment) for deployment instructions.

## 📝 Environment Variables

### Backend (`backend/.env`)
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
PERPLEXITY_API_KEY=xxx
OPENROUTER_API_KEY=xxx
```

### Frontend (`.env`)
```env
VITE_BACKEND_URL=http://localhost:3001
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

## 🎓 Learning Resources

- [Express.js Guide](https://expressjs.com)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Supabase Docs](https://supabase.com/docs)
- [Perplexity API](https://docs.perplexity.ai)
- [OpenRouter Docs](https://openrouter.ai/docs)

## 🤝 Support

Need help?

1. Check [QUICK_START.md](QUICK_START.md)
2. Review [SETUP_GUIDE.md](SETUP_GUIDE.md)
3. See troubleshooting section above
4. Check backend console logs
5. Test with `/api/health` endpoint

## 📄 License

MIT

---

## 🎉 Success!

You've successfully replaced n8n with a custom backend! You now have:

- ✅ Full control over your code
- ✅ Better performance and reliability
- ✅ Lower costs (no n8n subscription)
- ✅ Easier debugging and testing
- ✅ Complete type safety
- ✅ Unlimited customization

**Next steps:**
1. Follow [QUICK_START.md](QUICK_START.md) to get running
2. Test with sample data
3. Update your frontend
4. Deploy to production
5. Decommission n8n

---

*Built with ❤️ using TypeScript, Express, and modern best practices*

**Questions?** Check the documentation files listed above.
