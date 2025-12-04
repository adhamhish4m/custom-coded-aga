-- ============================================================================
-- COMPLETE SCHEMA REDESIGN FROM SCRATCH
-- Following PostgreSQL and Supabase best practices
-- ============================================================================

-- Drop existing tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS "AGA Runs Progress" CASCADE;
DROP TABLE IF EXISTS campaign_leads CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS "Client Metrics" CASCADE;

-- ============================================================================
-- TABLE 1: campaigns
-- Stores user campaign information
-- ============================================================================
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Campaign details
    name TEXT NOT NULL,
    source TEXT, -- 'csv', 'apollo', etc.

    -- Configuration
    custom_prompt TEXT,
    personalization_strategy TEXT,

    -- Integration IDs
    instantly_campaign_id TEXT,

    -- Metrics
    lead_count INTEGER DEFAULT 0,
    completed_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT campaigns_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT campaigns_lead_count_positive CHECK (lead_count >= 0),
    CONSTRAINT campaigns_completed_count_positive CHECK (completed_count >= 0)
);

-- Indexes for campaigns
CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_campaigns_created_at ON campaigns(created_at DESC);
CREATE INDEX idx_campaigns_name ON campaigns(name);

-- Updated_at trigger for campaigns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE 2: campaign_runs
-- Tracks individual campaign execution runs
-- ============================================================================
CREATE TABLE campaign_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Run details
    status TEXT NOT NULL DEFAULT 'pending',
    source TEXT, -- 'csv', 'apollo'
    lead_count INTEGER,

    -- Progress tracking
    processed_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,

    -- Error handling
    error_message TEXT,

    -- Timestamps
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT campaign_runs_status_valid CHECK (
        status IN ('pending', 'in_queue', 'processing', 'completed', 'failed', 'cancelled')
    ),
    CONSTRAINT campaign_runs_counts_positive CHECK (
        processed_count >= 0 AND
        success_count >= 0 AND
        error_count >= 0
    )
);

-- Indexes for campaign_runs
CREATE INDEX idx_campaign_runs_campaign_id ON campaign_runs(campaign_id);
CREATE INDEX idx_campaign_runs_user_id ON campaign_runs(user_id);
CREATE INDEX idx_campaign_runs_status ON campaign_runs(status);
CREATE INDEX idx_campaign_runs_created_at ON campaign_runs(created_at DESC);

-- Updated_at trigger for campaign_runs
CREATE TRIGGER set_campaign_runs_updated_at
    BEFORE UPDATE ON campaign_runs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE 3: campaign_leads
-- Stores lead data and enrichment results for campaigns
-- ============================================================================
CREATE TABLE campaign_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

    -- Lead data (JSONB for flexibility)
    lead_data JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- CSV cache for reruns
    csv_cache JSONB,

    -- Status tracking
    status TEXT DEFAULT 'pending',
    processed_count INTEGER DEFAULT 0,
    total_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT campaign_leads_status_valid CHECK (
        status IN ('pending', 'processing', 'completed', 'failed')
    ),
    CONSTRAINT campaign_leads_counts_positive CHECK (
        processed_count >= 0 AND
        total_count >= 0
    )
);

-- Indexes for campaign_leads
CREATE INDEX idx_campaign_leads_campaign_id ON campaign_leads(campaign_id);
CREATE INDEX idx_campaign_leads_status ON campaign_leads(status);
CREATE INDEX idx_campaign_leads_created_at ON campaign_leads(created_at DESC);

-- JSONB indexes for faster queries
CREATE INDEX idx_campaign_leads_lead_data ON campaign_leads USING GIN (lead_data);

-- Updated_at trigger for campaign_leads
CREATE TRIGGER set_campaign_leads_updated_at
    BEFORE UPDATE ON campaign_leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE 4: user_metrics
-- User-level metrics and statistics
-- ============================================================================
CREATE TABLE user_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Metrics
    total_campaigns INTEGER DEFAULT 0,
    total_leads_processed INTEGER DEFAULT 0,
    total_leads_enriched INTEGER DEFAULT 0,

    -- Calculated savings
    hours_saved DECIMAL(10, 2) DEFAULT 0,
    money_saved DECIMAL(10, 2) DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT user_metrics_user_id_unique UNIQUE(user_id),
    CONSTRAINT user_metrics_counts_positive CHECK (
        total_campaigns >= 0 AND
        total_leads_processed >= 0 AND
        total_leads_enriched >= 0
    ),
    CONSTRAINT user_metrics_savings_positive CHECK (
        hours_saved >= 0 AND
        money_saved >= 0
    )
);

-- Indexes for user_metrics
CREATE INDEX idx_user_metrics_user_id ON user_metrics(user_id);

-- Updated_at trigger for user_metrics
CREATE TRIGGER set_user_metrics_updated_at
    BEFORE UPDATE ON user_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_metrics ENABLE ROW LEVEL SECURITY;

-- Campaigns policies
CREATE POLICY "Users can view their own campaigns"
    ON campaigns FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own campaigns"
    ON campaigns FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns"
    ON campaigns FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns"
    ON campaigns FOR DELETE
    USING (auth.uid() = user_id);

-- Campaign runs policies
CREATE POLICY "Users can view their own campaign runs"
    ON campaign_runs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own campaign runs"
    ON campaign_runs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaign runs"
    ON campaign_runs FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaign runs"
    ON campaign_runs FOR DELETE
    USING (auth.uid() = user_id);

-- Campaign leads policies (access through campaign ownership)
CREATE POLICY "Users can view leads for their campaigns"
    ON campaign_leads FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM campaigns
            WHERE campaigns.id = campaign_leads.campaign_id
            AND campaigns.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert leads for their campaigns"
    ON campaign_leads FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM campaigns
            WHERE campaigns.id = campaign_leads.campaign_id
            AND campaigns.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update leads for their campaigns"
    ON campaign_leads FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM campaigns
            WHERE campaigns.id = campaign_leads.campaign_id
            AND campaigns.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete leads for their campaigns"
    ON campaign_leads FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM campaigns
            WHERE campaigns.id = campaign_leads.campaign_id
            AND campaigns.user_id = auth.uid()
        )
    );

-- User metrics policies
CREATE POLICY "Users can view their own metrics"
    ON user_metrics FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own metrics"
    ON user_metrics FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own metrics"
    ON user_metrics FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update campaign metrics
CREATE OR REPLACE FUNCTION update_campaign_metrics(p_campaign_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE campaigns
    SET
        lead_count = (
            SELECT COALESCE(SUM(total_count), 0)
            FROM campaign_leads
            WHERE campaign_id = p_campaign_id
        ),
        completed_count = (
            SELECT COALESCE(SUM(success_count), 0)
            FROM campaign_runs
            WHERE campaign_id = p_campaign_id
        ),
        updated_at = NOW()
    WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update user metrics
CREATE OR REPLACE FUNCTION update_user_metrics(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_metrics (user_id, total_campaigns, total_leads_processed, total_leads_enriched)
    VALUES (
        p_user_id,
        (SELECT COUNT(*) FROM campaigns WHERE user_id = p_user_id),
        (SELECT COALESCE(SUM(processed_count), 0) FROM campaign_runs WHERE user_id = p_user_id),
        (SELECT COALESCE(SUM(success_count), 0) FROM campaign_runs WHERE user_id = p_user_id)
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_campaigns = EXCLUDED.total_campaigns,
        total_leads_processed = EXCLUDED.total_leads_processed,
        total_leads_enriched = EXCLUDED.total_leads_enriched,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Show all tables
SELECT
    tablename,
    schemaname
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('campaigns', 'campaign_runs', 'campaign_leads', 'user_metrics')
ORDER BY tablename;

-- Show all foreign keys
SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- Show all indexes
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN ('campaigns', 'campaign_runs', 'campaign_leads', 'user_metrics')
ORDER BY tablename, indexname;
