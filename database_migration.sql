-- Migration: Add campaign_id column to AGA Runs Progress
-- Run this in your Supabase SQL Editor

-- Step 1: Add campaign_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'AGA Runs Progress'
        AND column_name = 'campaign_id'
    ) THEN
        ALTER TABLE "AGA Runs Progress"
        ADD COLUMN campaign_id UUID;

        RAISE NOTICE 'Added campaign_id column to AGA Runs Progress';
    ELSE
        RAISE NOTICE 'campaign_id column already exists';
    END IF;
END $$;

-- Step 2: Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'AGA Runs Progress_campaign_id_fkey'
    ) THEN
        ALTER TABLE "AGA Runs Progress"
        ADD CONSTRAINT "AGA Runs Progress_campaign_id_fkey"
        FOREIGN KEY (campaign_id)
        REFERENCES campaigns(id)
        ON DELETE CASCADE;

        RAISE NOTICE 'Added foreign key constraint';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists';
    END IF;
END $$;

-- Step 3: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_aga_runs_campaign_id
ON "AGA Runs Progress"(campaign_id);

-- Step 4: Verify the changes
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'AGA Runs Progress'
ORDER BY ordinal_position;
