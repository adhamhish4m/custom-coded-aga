-- ============================================================================
-- COMPREHENSIVE SCHEMA REDESIGN
-- Makes database consistent, efficient, and properly structured
-- ============================================================================

-- ============================================================================
-- PART 1: Standardize campaigns table
-- ============================================================================

-- Ensure user_id column exists and is correct type
ALTER TABLE campaigns
ALTER COLUMN user_id SET NOT NULL;

-- Remove user_auth_id if it exists (deprecated column)
ALTER TABLE campaigns
DROP COLUMN IF EXISTS user_auth_id;

-- Add campaign_id foreign key constraint if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'campaigns_user_id_fkey'
        AND table_name = 'campaigns'
    ) THEN
        ALTER TABLE campaigns
        ADD CONSTRAINT campaigns_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at DESC);

-- ============================================================================
-- PART 2: Fix AGA Runs Progress table
-- ============================================================================

-- Add campaign_id column if it doesn't exist
ALTER TABLE "AGA Runs Progress"
ADD COLUMN IF NOT EXISTS campaign_id UUID;

-- Rename user_auth_id to user_id if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'AGA Runs Progress'
        AND column_name = 'user_auth_id'
    ) THEN
        -- If user_id doesn't exist, rename user_auth_id to user_id
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'AGA Runs Progress'
            AND column_name = 'user_id'
        ) THEN
            ALTER TABLE "AGA Runs Progress"
            RENAME COLUMN user_auth_id TO user_id;
        ELSE
            -- Both exist, copy data and drop old column
            UPDATE "AGA Runs Progress"
            SET user_id = user_auth_id
            WHERE user_id IS NULL AND user_auth_id IS NOT NULL;

            ALTER TABLE "AGA Runs Progress"
            DROP COLUMN user_auth_id;
        END IF;
    END IF;
END $$;

-- Add foreign key constraints
DO $$
BEGIN
    -- Campaign foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'aga_runs_campaign_id_fkey'
        AND table_name = 'AGA Runs Progress'
    ) THEN
        ALTER TABLE "AGA Runs Progress"
        ADD CONSTRAINT aga_runs_campaign_id_fkey
        FOREIGN KEY (campaign_id)
        REFERENCES campaigns(id)
        ON DELETE CASCADE;
    END IF;

    -- User foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'aga_runs_user_id_fkey'
        AND table_name = 'AGA Runs Progress'
    ) THEN
        ALTER TABLE "AGA Runs Progress"
        ADD CONSTRAINT aga_runs_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_aga_runs_campaign_id ON "AGA Runs Progress"(campaign_id);
CREATE INDEX IF NOT EXISTS idx_aga_runs_user_id ON "AGA Runs Progress"(user_id);
CREATE INDEX IF NOT EXISTS idx_aga_runs_status ON "AGA Runs Progress"(status);
CREATE INDEX IF NOT EXISTS idx_aga_runs_created_at ON "AGA Runs Progress"(created_at DESC);

-- ============================================================================
-- PART 3: Fix campaign_leads table
-- ============================================================================

-- Ensure campaign_id has proper foreign key
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'campaign_leads_campaign_id_fkey'
        AND table_name = 'campaign_leads'
    ) THEN
        ALTER TABLE campaign_leads
        ADD CONSTRAINT campaign_leads_campaign_id_fkey
        FOREIGN KEY (campaign_id)
        REFERENCES campaigns(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_campaign_leads_campaign_id ON campaign_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_status ON campaign_leads(status);

-- ============================================================================
-- PART 4: Fix Client Metrics table (if used)
-- ============================================================================

-- Rename user_auth_id to user_id if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Client Metrics'
        AND column_name = 'user_auth_id'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'Client Metrics'
            AND column_name = 'user_id'
        ) THEN
            ALTER TABLE "Client Metrics"
            RENAME COLUMN user_auth_id TO user_id;
        ELSE
            -- Both exist, drop old one
            ALTER TABLE "Client Metrics"
            DROP COLUMN user_auth_id;
        END IF;
    END IF;
END $$;

-- Add user_id foreign key if not exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Client Metrics'
        AND column_name = 'user_id'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'client_metrics_user_id_fkey'
            AND table_name = 'Client Metrics'
        ) THEN
            ALTER TABLE "Client Metrics"
            ADD CONSTRAINT client_metrics_user_id_fkey
            FOREIGN KEY (user_id)
            REFERENCES auth.users(id)
            ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- ============================================================================
-- PART 5: Verify schema
-- ============================================================================

-- Show final schema for campaigns
SELECT
    'campaigns' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'campaigns'
ORDER BY ordinal_position;

-- Show final schema for AGA Runs Progress
SELECT
    'AGA Runs Progress' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'AGA Runs Progress'
ORDER BY ordinal_position;

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
    AND tc.table_name IN ('campaigns', 'AGA Runs Progress', 'campaign_leads')
ORDER BY tc.table_name, tc.constraint_name;
