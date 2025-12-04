-- ===================================
-- AGA CUSTOM BACKEND DATABASE SCHEMA
-- Run this SQL in your Supabase SQL Editor
-- ===================================

-- 1. Create campaigns table (if not exists)
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create campaign_leads table
CREATE TABLE IF NOT EXISTS campaign_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_data JSONB[] DEFAULT '{}',  -- Array of enriched lead objects
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Client Metrics table
CREATE TABLE IF NOT EXISTS "Client Metrics" (
  user_auth_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  num_personalized_leads INTEGER DEFAULT 0,
  hours_saved NUMERIC(10,2) DEFAULT 0,
  money_saved INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create AGA Runs Progress table
CREATE TABLE IF NOT EXISTS "AGA Runs Progress" (
  run_id UUID PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'extracting',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('verifying', 'extracting', 'personalizing', 'completed', 'failed'))
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_campaign_id ON campaign_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_user_id ON campaign_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_lead_data ON campaign_leads USING GIN (lead_data);
CREATE INDEX IF NOT EXISTS idx_aga_runs_campaign_id ON "AGA Runs Progress"(campaign_id);
CREATE INDEX IF NOT EXISTS idx_aga_runs_status ON "AGA Runs Progress"(status);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Client Metrics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AGA Runs Progress" ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for campaigns
DROP POLICY IF EXISTS "Users can view own campaigns" ON campaigns;
CREATE POLICY "Users can view own campaigns" ON campaigns
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own campaigns" ON campaigns;
CREATE POLICY "Users can insert own campaigns" ON campaigns
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own campaigns" ON campaigns;
CREATE POLICY "Users can update own campaigns" ON campaigns
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own campaigns" ON campaigns;
CREATE POLICY "Users can delete own campaigns" ON campaigns
  FOR DELETE USING (auth.uid() = user_id);

-- 8. Create RLS policies for campaign_leads
DROP POLICY IF EXISTS "Users can view own campaign leads" ON campaign_leads;
CREATE POLICY "Users can view own campaign leads" ON campaign_leads
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own campaign leads" ON campaign_leads;
CREATE POLICY "Users can insert own campaign leads" ON campaign_leads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own campaign leads" ON campaign_leads;
CREATE POLICY "Users can update own campaign leads" ON campaign_leads
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own campaign leads" ON campaign_leads;
CREATE POLICY "Users can delete own campaign leads" ON campaign_leads
  FOR DELETE USING (auth.uid() = user_id);

-- 9. Create RLS policies for Client Metrics
DROP POLICY IF EXISTS "Users can view own metrics" ON "Client Metrics";
CREATE POLICY "Users can view own metrics" ON "Client Metrics"
  FOR SELECT USING (auth.uid() = user_auth_id);

DROP POLICY IF EXISTS "Users can insert own metrics" ON "Client Metrics";
CREATE POLICY "Users can insert own metrics" ON "Client Metrics"
  FOR INSERT WITH CHECK (auth.uid() = user_auth_id);

DROP POLICY IF EXISTS "Users can update own metrics" ON "Client Metrics";
CREATE POLICY "Users can update own metrics" ON "Client Metrics"
  FOR UPDATE USING (auth.uid() = user_auth_id);

-- 10. Create RLS policies for AGA Runs Progress
DROP POLICY IF EXISTS "Users can view own runs" ON "AGA Runs Progress";
CREATE POLICY "Users can view own runs" ON "AGA Runs Progress"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = "AGA Runs Progress".campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own runs" ON "AGA Runs Progress";
CREATE POLICY "Users can insert own runs" ON "AGA Runs Progress"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own runs" ON "AGA Runs Progress";
CREATE POLICY "Users can update own runs" ON "AGA Runs Progress"
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = "AGA Runs Progress".campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- 11. Create service role policies (bypass RLS for backend)
DROP POLICY IF EXISTS "Service role full access campaigns" ON campaigns;
CREATE POLICY "Service role full access campaigns" ON campaigns
  FOR ALL USING (current_setting('role') = 'service_role');

DROP POLICY IF EXISTS "Service role full access campaign_leads" ON campaign_leads;
CREATE POLICY "Service role full access campaign_leads" ON campaign_leads
  FOR ALL USING (current_setting('role') = 'service_role');

DROP POLICY IF EXISTS "Service role full access metrics" ON "Client Metrics";
CREATE POLICY "Service role full access metrics" ON "Client Metrics"
  FOR ALL USING (current_setting('role') = 'service_role');

DROP POLICY IF EXISTS "Service role full access runs" ON "AGA Runs Progress";
CREATE POLICY "Service role full access runs" ON "AGA Runs Progress"
  FOR ALL USING (current_setting('role') = 'service_role');

-- 12. Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 13. Create triggers for updated_at
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_campaign_leads_updated_at ON campaign_leads;
CREATE TRIGGER update_campaign_leads_updated_at
  BEFORE UPDATE ON campaign_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_metrics_updated_at ON "Client Metrics";
CREATE TRIGGER update_client_metrics_updated_at
  BEFORE UPDATE ON "Client Metrics"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_aga_runs_updated_at ON "AGA Runs Progress";
CREATE TRIGGER update_aga_runs_updated_at
  BEFORE UPDATE ON "AGA Runs Progress"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'AGA Custom Backend database schema created successfully!' as result,
       'Tables: campaigns, campaign_leads, Client Metrics, AGA Runs Progress' as tables_created,
       'All RLS policies and triggers configured' as security_status;
