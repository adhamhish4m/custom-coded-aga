-- Add campaign_id column to AGA Runs Progress table
-- Run this in Supabase Dashboard > SQL Editor

-- Step 1: Add the column
ALTER TABLE "AGA Runs Progress"
ADD COLUMN IF NOT EXISTS campaign_id UUID;

-- Step 2: Add foreign key constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'AGA Runs Progress_campaign_id_fkey'
        AND table_name = 'AGA Runs Progress'
    ) THEN
        ALTER TABLE "AGA Runs Progress"
        ADD CONSTRAINT "AGA Runs Progress_campaign_id_fkey"
        FOREIGN KEY (campaign_id)
        REFERENCES campaigns(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- Step 3: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_aga_runs_campaign_id
ON "AGA Runs Progress"(campaign_id);

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'AGA Runs Progress'
AND column_name = 'campaign_id';
