# AGA Backend - Custom n8n Replacement

A fully custom TypeScript backend that replaces n8n workflows for the AI Growth Accelerator (AGA) system. This backend handles lead enrichment, AI-powered personalization, and campaign orchestration.

## 🎯 What This Replaces

This backend completely replaces three n8n workflows:

1. **Main Workflow** (`nov 2025 AGA.json`) - Campaign orchestration
2. **CSV Extraction** (`internal extract CSV.json`) - Lead data processing
3. **Personalization** (`internal personalization.json`) - AI-powered lead enrichment

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ or Bun
- PostgreSQL (via Supabase)
- API keys for:
  - Supabase
  - Perplexity AI
  - OpenRouter (for Claude)

### Installation

```bash
cd backend
npm install
```

### Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Fill in your environment variables:
```env
# Server
PORT=3001
NODE_ENV=development

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# AI Services
PERPLEXITY_API_KEY=your_perplexity_api_key
OPENROUTER_API_KEY=your_openrouter_api_key

# Configuration
MAX_BATCH_SIZE=50
RETRY_ATTEMPTS=3
RETRY_DELAY_MS=2000
```

### Run Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3001`

### Build for Production

```bash
npm run build
npm start
```

## 📡 API Endpoints

### Health Check
```http
GET /api/health
```

Returns server health status and service connectivity.

### Process Campaign
```http
POST /api/campaigns/process
Content-Type: multipart/form-data

Parameters:
- csv_file: File (required for CSV source)
- leadSource: "csv" | "apollo"
- campaign_id: string (UUID)
- campaign_leads_id: string (UUID)
- user_id: string (UUID)
- run_id: string (UUID, optional - auto-generated)
- campaignName: string
- perplexityPrompt: string
- personalizationPrompt: string
- promptTask: string
- promptGuidelines: string
- promptExample: string
- personalizationStrategy: string
- demo: "true" | "false"
- rerun: "true" | "false"
```

Returns:
```json
{
  "success": true,
  "message": "Campaign processing started",
  "run_id": "uuid",
  "campaign_id": "uuid",
  "campaign_leads_id": "uuid"
}
```

### Get Campaign Status
```http
GET /api/campaigns/status/:runId
```

Returns:
```json
{
  "success": true,
  "status": {
    "run_id": "uuid",
    "campaign_id": "uuid",
    "status": "extracting" | "personalizing" | "completed" | "failed",
    "updated_at": "2025-12-03T...",
    "error_message": "optional error message"
  }
}
```

### Get Campaign Results
```http
GET /api/campaigns/results/:campaignLeadsId
```

Returns:
```json
{
  "success": true,
  "results": {
    "total": 100,
    "successful": 95,
    "failed": 5,
    "leads": [
      {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com",
        "company": "Example Corp",
        "personalized_message": "Noticed Example Corp...",
        "enrichment_status": "enriched"
      }
    ]
  }
}
```

### Export Campaign CSV
```http
GET /api/campaigns/export/:campaignLeadsId
```

Returns CSV file with all enriched leads.

### Test Configuration
```http
POST /api/campaigns/test
Content-Type: multipart/form-data

Same parameters as /process
```

Tests configuration without processing. Returns CSV preview if file provided.

## 🏗️ Architecture

### Service Layer

```
src/
├── config/
│   └── env.ts                 # Environment configuration
├── services/
│   ├── supabase.ts           # Database operations
│   ├── csv-processor.ts      # CSV parsing & validation
│   ├── personalization.ts    # Lead personalization orchestration
│   ├── campaign-orchestrator.ts  # Main workflow orchestration
│   └── ai/
│       ├── perplexity.ts     # Perplexity AI integration
│       └── claude.ts         # Claude/OpenRouter integration
├── routes/
│   ├── campaign.ts           # Campaign endpoints
│   └── health.ts             # Health check
├── middleware/
│   ├── cors.ts               # CORS configuration
│   └── error-handler.ts      # Error handling
├── types/
│   └── index.ts              # TypeScript types
└── index.ts                  # Express app setup
```

### Data Flow

```
1. Frontend uploads CSV + config
   ↓
2. POST /api/campaigns/process
   ↓
3. CSV Processor extracts & validates leads
   ↓
4. Campaign Orchestrator batches leads
   ↓
5. For each lead:
   a. Perplexity researches company
   b. Claude generates personalized message
   c. Save to Supabase
   d. Update KPIs
   ↓
6. Return completed status
```

### Error Handling

- **Retry Logic**: All AI calls retry 3 times with 2s delay
- **Graceful Degradation**: Continues processing even if individual leads fail
- **Status Tracking**: Real-time status updates in database
- **Error Messages**: Detailed error logging and user feedback

### Batch Processing

- Processes leads in configurable batches (default: 10)
- Respects API rate limits
- Parallel processing within batches
- Sequential batch execution

## 🗄️ Database Schema

### Tables Used

#### `campaign_leads`
```sql
{
  id: uuid,
  campaign_id: uuid,
  user_id: uuid,
  lead_data: jsonb[],  -- Array of enriched leads
  created_at: timestamp,
  updated_at: timestamp
}
```

#### `campaigns`
```sql
{
  id: uuid,
  name: string,
  user_id: uuid,
  completed_count: integer,
  created_at: timestamp,
  updated_at: timestamp
}
```

#### `Client Metrics`
```sql
{
  user_auth_id: uuid,
  num_personalized_leads: integer,
  hours_saved: float,
  money_saved: integer
}
```

#### `AGA Runs Progress`
```sql
{
  run_id: uuid,
  campaign_id: uuid,
  status: string,
  updated_at: timestamp,
  error_message: string (optional)
}
```

## 🤖 AI Integrations

### Perplexity AI
- **Model**: Sonar
- **Purpose**: Company research and intelligence gathering
- **Timeout**: 60 seconds
- **Retries**: 3 attempts with exponential backoff

### Claude (via OpenRouter)
- **Model**: claude-sonnet-4-20250514
- **Purpose**: Natural language personalization
- **Temperature**: 0.3 (focused, consistent)
- **Max Tokens**: 32,768
- **Output**: Structured JSON
- **Timeout**: 60 seconds
- **Retries**: 3 attempts with exponential backoff

## 📊 KPI Calculations

- **Time Saved**: 0.02 hours (1.2 minutes) per lead
- **Cost Saved**: $0.04 per lead
- Auto-updates user metrics after each successful personalization

## 🔒 Security

- Service role key for database operations
- CORS configured for trusted origins
- Input validation on all endpoints
- File upload size limits (10MB)
- CSV-only file uploads
- Environment variable validation

## 🧪 Testing

Run test configuration without processing:

```bash
curl -X POST http://localhost:3001/api/campaigns/test \
  -F "csv_file=@leads.csv" \
  -F "leadSource=csv" \
  -F "campaign_id=uuid" \
  # ... other params
```

## 📝 Example Usage

### Using cURL

```bash
# Start campaign processing
curl -X POST http://localhost:3001/api/campaigns/process \
  -F "csv_file=@leads.csv" \
  -F "leadSource=csv" \
  -F "campaign_id=your-campaign-id" \
  -F "campaign_leads_id=your-campaign-leads-id" \
  -F "user_id=your-user-id" \
  -F "campaignName=My Campaign" \
  -F "perplexityPrompt=Research the company..." \
  -F "personalizationPrompt=Create a personalized message..." \
  -F "promptTask=Write a cold outreach opener" \
  -F "promptGuidelines=Max 25 words, conversational" \
  -F "promptExample=Saw that your company..." \
  -F "personalizationStrategy=Research-based" \
  -F "demo=false" \
  -F "rerun=false"

# Check status
curl http://localhost:3001/api/campaigns/status/{run_id}

# Get results
curl http://localhost:3001/api/campaigns/results/{campaign_leads_id}

# Export CSV
curl http://localhost:3001/api/campaigns/export/{campaign_leads_id} > results.csv
```

### Using JavaScript

```javascript
const formData = new FormData();
formData.append('csv_file', fileInput.files[0]);
formData.append('leadSource', 'csv');
formData.append('campaign_id', campaignId);
// ... add other fields

const response = await fetch('http://localhost:3001/api/campaigns/process', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log('Run ID:', result.run_id);

// Poll for status
const statusResponse = await fetch(`http://localhost:3001/api/campaigns/status/${result.run_id}`);
const status = await statusResponse.json();
```

## 🚀 Deployment

### Docker (Coming Soon)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["node", "dist/index.js"]
```

### Environment Variables for Production

Make sure to set all environment variables in your production environment:
- Use service role key (not anon key) for Supabase
- Set `NODE_ENV=production`
- Configure proper CORS origins
- Use secure API keys

## 📈 Monitoring

The backend logs:
- All API requests
- Campaign processing stages
- AI API calls and responses
- Errors with stack traces
- Success/failure metrics

Consider integrating with logging services like:
- Datadog
- LogRocket
- Sentry

## 🔄 Migration from n8n

This backend is a **drop-in replacement** for your n8n workflows:

| n8n Workflow | Backend Service |
|--------------|----------------|
| nov 2025 AGA | campaign-orchestrator.ts |
| internal extract CSV | csv-processor.ts |
| internal personalization | personalization.ts |

**Benefits over n8n:**
- ✅ Full control over code
- ✅ Better error handling
- ✅ Easier debugging
- ✅ No n8n subscription costs
- ✅ Faster execution
- ✅ Better logging
- ✅ Type safety with TypeScript
- ✅ Easy to extend and customize

## 🛠️ Development

### Adding New Features

1. Create service in `src/services/`
2. Add route in `src/routes/`
3. Update types in `src/types/index.ts`
4. Test with `/api/campaigns/test`

### Code Style

- TypeScript strict mode
- ESM modules
- Async/await pattern
- Error-first callbacks
- Descriptive variable names

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Perplexity API Docs](https://docs.perplexity.ai)
- [OpenRouter API Docs](https://openrouter.ai/docs)
- [Express.js Guide](https://expressjs.com)

## 🤝 Support

For issues or questions:
1. Check logs in console
2. Test configuration with `/api/campaigns/test`
3. Verify environment variables
4. Check database connectivity

## 📄 License

MIT
