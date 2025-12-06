-- ============================================================================
-- Migration: Add qualifying status and qualified_count column
-- Date: 2025-12-06
-- Description:
--   1. Add 'qualifying' status to campaign_runs table
--   2. Add 'extracting' and 'personalizing' statuses (if not present)
--   3. Add qualified_count column to track qualified leads during intent filtering
-- ============================================================================

-- Step 1: Drop the existing status constraint
ALTER TABLE campaign_runs DROP CONSTRAINT IF EXISTS campaign_runs_status_valid;

-- Step 2: Add the new status constraint with all statuses
ALTER TABLE campaign_runs ADD CONSTRAINT campaign_runs_status_valid CHECK (
    status IN ('pending', 'in_queue', 'extracting', 'qualifying', 'personalizing', 'processing', 'completed', 'failed', 'cancelled')
);

-- Step 3: Add qualified_count column (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'campaign_runs'
        AND column_name = 'qualified_count'
    ) THEN
        ALTER TABLE campaign_runs ADD COLUMN qualified_count INTEGER DEFAULT 0;

        -- Add constraint to ensure qualified_count is positive
        ALTER TABLE campaign_runs DROP CONSTRAINT IF EXISTS campaign_runs_counts_positive;
        ALTER TABLE campaign_runs ADD CONSTRAINT campaign_runs_counts_positive CHECK (
            processed_count >= 0 AND
            success_count >= 0 AND
            error_count >= 0 AND
            qualified_count >= 0
        );
    END IF;
END $$;

-- Step 4: Verification queries
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'campaign_runs'
    AND column_name IN ('status', 'processed_count', 'success_count', 'error_count', 'qualified_count')
ORDER BY ordinal_position;

-- Show the updated constraint
SELECT
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname LIKE 'campaign_runs_%'
    AND conrelid = 'campaign_runs'::regclass;
