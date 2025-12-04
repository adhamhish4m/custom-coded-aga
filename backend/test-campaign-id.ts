/**
 * Test campaign_id column functionality
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import crypto from 'crypto';

config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testCampaignId() {
  console.log('\n🧪 Testing campaign_id column...\n');

  try {
    // Step 1: Create a test campaign
    console.log('1. Creating test campaign...');
    const campaignId = crypto.randomUUID();
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        id: campaignId,
        name: 'Test Campaign - Schema Verification',
        status: 'test',
        user_auth_id: 'test-user'
      })
      .select()
      .single();

    if (campaignError) {
      console.log('❌ Failed to create campaign:', campaignError.message);
      return false;
    }
    console.log('✅ Campaign created:', campaign.id);

    // Step 2: Create a run with campaign_id
    console.log('\n2. Creating run with campaign_id...');
    const runId = crypto.randomUUID();
    const { data: run, error: runError } = await supabase
      .from('campaign_runs')
      .insert({
        run_id: runId,
        campaign_id: campaignId,
        status: 'test',
        campaign_name: 'Test Campaign - Schema Verification',
        user_auth_id: 'test-user'
      })
      .select()
      .single();

    if (runError) {
      console.log('❌ Failed to create run:', runError.message);
      console.log('   Error details:', runError);

      // Clean up campaign
      await supabase.from('campaigns').delete().eq('id', campaignId);
      return false;
    }
    console.log('✅ Run created with campaign_id:', run.campaign_id);

    // Step 3: Query the run to verify campaign_id
    console.log('\n3. Querying run to verify campaign_id...');
    const { data: queriedRun, error: queryError } = await supabase
      .from('campaign_runs')
      .select('run_id, campaign_id, status')
      .eq('run_id', runId)
      .single();

    if (queryError) {
      console.log('❌ Failed to query run:', queryError.message);

      // Clean up
      await supabase.from('campaign_runs').delete().eq('run_id', runId);
      await supabase.from('campaigns').delete().eq('id', campaignId);
      return false;
    }
    console.log('✅ Successfully queried run with campaign_id:', queriedRun.campaign_id);

    // Step 4: Clean up
    console.log('\n4. Cleaning up test data...');
    await supabase.from('campaign_runs').delete().eq('run_id', runId);
    await supabase.from('campaigns').delete().eq('id', campaignId);
    console.log('✅ Test data cleaned up');

    console.log('\n✅ All tests passed! campaign_id column is working correctly.\n');
    return true;

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    return false;
  }
}

testCampaignId().then(success => {
  process.exit(success ? 0 : 1);
});
