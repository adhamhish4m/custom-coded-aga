# n8n to Custom Backend Migration Checklist

This checklist will help you migrate from n8n workflows to your new custom backend.

## ✅ Pre-Migration Verification

### Backend Setup
- [ ] Backend dependencies installed (`cd backend && npm install`)
- [ ] Backend `.env` file configured with all API keys
- [ ] Backend server starts successfully (`npm run dev`)
- [ ] Backend health check passes (`curl http://localhost:3001/api/health`)

### API Keys & Credentials
- [ ] Supabase URL and Service Role Key configured
- [ ] Perplexity API key configured and has credits
- [ ] OpenRouter API key configured and has credits
- [ ] All keys tested and working

### Database
- [ ] All required tables exist in Supabase:
  - [ ] `campaigns`
  - [ ] `campaign_leads`
  - [ ] `Client Metrics`
  - [ ] `AGA Runs Progress`
- [ ] Database connection tested from backend

### Frontend Setup
- [ ] Frontend `.env` file configured with `VITE_BACKEND_URL`
- [ ] Frontend dependencies installed
- [ ] Frontend can connect to backend API

## ✅ Migration Steps

### 1. Test with Sample Data
- [ ] Create test CSV with 2-3 leads
- [ ] Test configuration endpoint: `POST /api/campaigns/test`
- [ ] Verify CSV parsing works correctly
- [ ] Check lead validation and deduplication

### 2. Run Test Campaign
- [ ] Process test campaign with 2-3 leads
- [ ] Monitor backend console logs
- [ ] Verify Perplexity API calls succeed
- [ ] Verify Claude API calls succeed
- [ ] Check leads saved to `campaign_leads` table
- [ ] Verify KPIs updated in `Client Metrics`

### 3. Update Frontend Code

#### Option A: Using Existing Forms
If using `UpdatedSimplifiedEnhancedForm.tsx` or similar:

- [ ] Import `agaBackend` client:
```typescript
import { agaBackend } from '@/services/agaBackend';
```

- [ ] Replace n8n webhook URL with backend call
- [ ] Update form submission handler
- [ ] Add status polling logic
- [ ] Test form submission end-to-end

#### Option B: Create New Integration
- [ ] Create campaign in Supabase first
- [ ] Create campaign_leads entry
- [ ] Call `agaBackend.processCampaign()`
- [ ] Poll for completion with `pollUntilComplete()`
- [ ] Display results when complete

### 4. Remove n8n Dependencies
- [ ] Document all n8n webhook URLs you're replacing
- [ ] Search codebase for n8n references: `grep -r "n8n" src/`
- [ ] Remove n8n webhook calls from code
- [ ] Update environment variables to remove n8n URLs
- [ ] Archive n8n workflow JSON files (keep for reference)

### 5. Production Testing
- [ ] Test with real but small dataset (10-20 leads)
- [ ] Monitor API costs (Perplexity + OpenRouter)
- [ ] Verify all leads processed correctly
- [ ] Check personalization quality
- [ ] Export results as CSV and verify format

## ✅ Deployment Preparation

### Backend Deployment
- [ ] Choose hosting platform (Railway, Render, etc.)
- [ ] Set up production environment variables
- [ ] Configure production CORS origins
- [ ] Build production bundle: `npm run build`
- [ ] Deploy and get production URL
- [ ] Test production health endpoint
- [ ] Run test campaign on production

### Frontend Deployment
- [ ] Update `.env.production` with production backend URL
- [ ] Build production bundle: `npm run build`
- [ ] Deploy to hosting (Vercel, Netlify, etc.)
- [ ] Test end-to-end on production

### Post-Deployment
- [ ] Run production campaign with real data
- [ ] Monitor logs and errors
- [ ] Verify costs are as expected
- [ ] Set up error alerting (optional)

## ✅ n8n Decommissioning

### Before Shutting Down n8n
- [ ] Verify all workflows migrated
- [ ] Run parallel testing (n8n vs custom backend) if needed
- [ ] Export all n8n workflows as backup
- [ ] Document any custom nodes or configurations used

### Shutdown n8n
- [ ] Archive n8n workflow files to `archive/` folder
- [ ] Remove n8n-related environment variables
- [ ] Cancel n8n subscription (if applicable)
- [ ] Update documentation to remove n8n references

## ✅ Post-Migration Validation

### Functionality Checks
- [ ] CSV upload and parsing works
- [ ] Lead deduplication works correctly
- [ ] Perplexity research generates insights
- [ ] Claude personalization creates messages
- [ ] Messages are under 25 words
- [ ] Demo mode limits to 20 leads
- [ ] Batch processing handles large files
- [ ] Error handling works (test with invalid data)
- [ ] Retry logic activates on failures
- [ ] Status tracking updates in real-time

### Data Validation
- [ ] All leads saved to database
- [ ] Personalized messages are relevant
- [ ] KPIs update correctly:
  - [ ] num_personalized_leads increases
  - [ ] hours_saved calculated (0.02 per lead)
  - [ ] money_saved calculated ($0.04 per lead)
- [ ] Campaign completed_count matches actual count
- [ ] CSV export includes all data

### Performance
- [ ] Processing speed acceptable (time per lead)
- [ ] API rate limits not exceeded
- [ ] Memory usage reasonable
- [ ] No database connection issues
- [ ] Batch processing handles 100+ leads

## ✅ Monitoring Setup (Optional but Recommended)

- [ ] Set up logging service (Datadog, LogRocket, etc.)
- [ ] Configure error tracking (Sentry)
- [ ] Set up uptime monitoring
- [ ] Create dashboard for key metrics:
  - [ ] Campaigns processed per day
  - [ ] Success/failure rate
  - [ ] Average processing time
  - [ ] API costs per campaign

## ✅ Documentation

- [ ] Update team documentation with new workflow
- [ ] Document API endpoints for team
- [ ] Create troubleshooting guide
- [ ] Update runbooks for operations team
- [ ] Document cost structure (API usage)

## 📊 Comparison: n8n vs Custom Backend

### Benefits Achieved
- [x] Full code control and customization
- [x] Better error handling and retry logic
- [x] Type safety with TypeScript
- [x] No n8n subscription costs
- [x] Faster execution with optimized batching
- [x] Better debugging and logging
- [x] Easier to test and validate
- [x] Version control for all business logic

### Potential Concerns Addressed
- [x] Retry logic implemented (3 attempts, 2s delay)
- [x] Error handling graceful (continues on failures)
- [x] Status tracking real-time
- [x] Batch processing optimized
- [x] Database operations atomic
- [x] API rate limiting respected

## 🎯 Success Criteria

Migration is successful when:

1. ✅ Backend processes campaigns without n8n
2. ✅ All AI integrations working (Perplexity + Claude)
3. ✅ Frontend successfully calls backend API
4. ✅ Leads processed and saved correctly
5. ✅ KPIs update accurately
6. ✅ CSV export works
7. ✅ Error handling prevents data loss
8. ✅ Performance meets or exceeds n8n
9. ✅ Team trained on new system
10. ✅ n8n completely shut down

## 📞 Support Contacts

If you encounter issues during migration:

1. **Check logs**: Backend console has detailed logging
2. **Test endpoints**: Use `/api/campaigns/test` to validate config
3. **Verify APIs**: Test Perplexity and OpenRouter directly
4. **Database**: Check Supabase logs for query errors
5. **Health check**: Monitor `/api/health` endpoint

## 🎉 Migration Complete!

Once all items are checked:

- [ ] Migration officially complete
- [ ] n8n decommissioned
- [ ] Team notified of new system
- [ ] Celebration! 🎊

---

**Date Started**: ___________

**Date Completed**: ___________

**Migrated By**: ___________

**Notes**:
_______________________________
_______________________________
_______________________________
