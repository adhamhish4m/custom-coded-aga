/**
 * Simple test to check what columns exist
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function simpleTest() {
  console.log('\n🔍 Testing basic queries...\n');

  // Test 1: Query campaigns with minimal columns
  console.log('1. Query campaigns (id, name, user_auth_id only)...');
  const { data: campaigns, error: campaignsError } = await supabase
    .from('campaigns')
    .select('id, name, user_auth_id, created_at')
    .limit(1);

  if (campaignsError) {
    console.log('   ❌ Error:', campaignsError.message);
  } else {
    console.log('   ✅ Success');
  }

  // Test 2: Query runs with campaign_id
  console.log('\n2. Query AGA Runs Progress with campaign_id...');
  const { data: runs, error: runsError } = await supabase
    .from('campaign_runs')
    .select('run_id, campaign_id, status, user_auth_id')
    .limit(1);

  if (runsError) {
    console.log('   ❌ Error:', runsError.message);
  } else {
    console.log('   ✅ Success - campaign_id column exists!');
  }

  console.log('\n');
}

simpleTest();
