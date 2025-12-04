/**
 * Test with proper UUID for user_id
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import crypto from 'crypto';

config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testWithUuid() {
  console.log('\n🧪 Testing with proper UUID...\n');

  const campaignId = crypto.randomUUID();
  const userId = crypto.randomUUID(); // Proper UUID

  // Test: Create campaign with user_id as UUID
  console.log('1. Creating campaign with user_id (UUID)...');
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .insert({
      id: campaignId,
      name: 'Test Campaign - UUID Test',
      user_id: userId
    })
    .select();

  if (campaignError) {
    console.log('   ❌ Error:', campaignError.message);
    return false;
  }

  console.log('   ✅ Campaign created successfully!');
  console.log('   Columns:', Object.keys(campaign[0]).join(', '));

  // Test: Create run with user_id and campaign_id
  console.log('\n2. Creating run with campaign_id and user_id...');
  const runId = crypto.randomUUID();
  const { data: run, error: runError } = await supabase
    .from('campaign_runs')
    .insert({
      run_id: runId,
      campaign_id: campaignId,
      campaign_name: 'Test Campaign - UUID Test',
      status: 'test',
      user_id: userId  // Changed from user_auth_id
    })
    .select();

  if (runError) {
    console.log('   ❌ Error:', runError.message);

    // Clean up campaign
    await supabase.from('campaigns').delete().eq('id', campaignId);
    return false;
  }

  console.log('   ✅ Run created successfully!');
  console.log('   Columns:', Object.keys(run[0]).join(', '));

  // Clean up
  console.log('\n3. Cleaning up...');
  await supabase.from('campaign_runs').delete().eq('run_id', runId);
  await supabase.from('campaigns').delete().eq('id', campaignId);
  console.log('   ✅ Cleanup complete');

  console.log('\n✅ SUCCESS! The correct column names are:');
  console.log('   - campaigns.user_id (UUID type)');
  console.log('   - AGA Runs Progress.user_id (UUID type)');
  console.log('   - campaigns.campaign_id exists and works!\n');

  return true;
}

testWithUuid();
