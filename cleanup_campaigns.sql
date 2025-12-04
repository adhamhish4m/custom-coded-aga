-- Cleanup Script: Delete test campaigns and verify deletion
-- Run this in your Supabase SQL Editor

-- Step 1: View all campaigns for your user (to confirm what exists)
SELECT
    id,
    name,
    created_at,
    status,
    user_auth_id
FROM campaigns
ORDER BY created_at DESC;

-- Step 2: Delete all test campaigns (UNCOMMENT THE LINES BELOW AFTER REVIEWING ABOVE)
-- WARNING: This will delete campaigns and their associated data
-- DELETE FROM campaigns WHERE name LIKE '%Test%';
-- DELETE FROM campaigns WHERE name LIKE '%test%';

-- Alternative: Delete a specific campaign by name
-- DELETE FROM campaigns WHERE name = 'Your Campaign Name Here';

-- Step 3: Verify deletion - check campaigns table
SELECT COUNT(*) as remaining_campaigns FROM campaigns;

-- Step 4: Check for orphaned records in AGA Runs Progress
SELECT
    arp.run_id,
    arp.campaign_name,
    arp.status,
    arp.campaign_id,
    c.id as campaign_exists
FROM "AGA Runs Progress" arp
LEFT JOIN campaigns c ON arp.campaign_id = c.id
WHERE c.id IS NULL;

-- Step 5: Clean up orphaned AGA Runs Progress records (UNCOMMENT AFTER REVIEWING)
-- DELETE FROM "AGA Runs Progress"
-- WHERE campaign_id NOT IN (SELECT id FROM campaigns);

-- Step 6: Check for orphaned campaign_leads
SELECT
    cl.id,
    cl.campaign_id,
    c.id as campaign_exists
FROM campaign_leads cl
LEFT JOIN campaigns c ON cl.campaign_id = c.id
WHERE c.id IS NULL;

-- Step 7: Clean up orphaned campaign_leads (UNCOMMENT AFTER REVIEWING)
-- DELETE FROM campaign_leads
-- WHERE campaign_id NOT IN (SELECT id FROM campaigns);
