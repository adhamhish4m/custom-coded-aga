/**
 * Discover actual table schema
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function discoverSchema() {
  console.log('\n🔍 Discovering actual table schemas...\n');

  // Test campaigns - query all columns
  console.log('1. Campaigns table:');
  const { data: campaigns, error: campaignsError } = await supabase
    .from('campaigns')
    .select('*')
    .limit(1);

  if (campaignsError) {
    console.log('   ❌ Error:', campaignsError.message);
  } else if (campaigns && campaigns.length > 0) {
    console.log('   Columns:', Object.keys(campaigns[0]).join(', '));
  } else {
    console.log('   ✅ Table accessible but empty');
    console.log('   Cannot determine columns from empty table');
  }

  // Test AGA Runs Progress
  console.log('\n2. AGA Runs Progress table:');
  const { data: runs, error: runsError } = await supabase
    .from('campaign_runs')
    .select('*')
    .limit(1);

  if (runsError) {
    console.log('   ❌ Error:', runsError.message);
  } else if (runs && runs.length > 0) {
    console.log('   Columns:', Object.keys(runs[0]).join(', '));
  } else {
    console.log('   ✅ Table accessible but empty');
    console.log('   Cannot determine columns from empty table');
  }

  // Test campaign_leads
  console.log('\n3. campaign_leads table:');
  const { data: leads, error: leadsError } = await supabase
    .from('campaign_leads')
    .select('*')
    .limit(1);

  if (leadsError) {
    console.log('   ❌ Error:', leadsError.message);
  } else if (leads && leads.length > 0) {
    console.log('   Columns:', Object.keys(leads[0]).join(', '));
  } else {
    console.log('   ✅ Table accessible but empty');
    console.log('   Cannot determine columns from empty table');
  }

  console.log('\n📋 Since tables are empty, let me check RLS policies...\n');

  // Check if we can insert a test record
  console.log('4. Testing insert to find required columns...');

  const testCampaign = {
    id: crypto.randomUUID(),
    name: 'Test Discovery Campaign'
  };

  const { data: insertTest, error: insertError } = await supabase
    .from('campaigns')
    .insert(testCampaign)
    .select();

  if (insertError) {
    console.log('   Insert error:', insertError.message);
    console.log('   This tells us what columns are missing or have constraints');
  } else {
    console.log('   ✅ Insert successful!');
    console.log('   Columns:', Object.keys(insertTest[0]).join(', '));

    // Clean up
    await supabase.from('campaigns').delete().eq('id', testCampaign.id);
  }

  console.log('\n');
}

discoverSchema();
