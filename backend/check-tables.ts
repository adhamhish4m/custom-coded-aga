/**
 * Check what tables and columns exist
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkTables() {
  console.log('\n🔍 Checking database tables...\n');

  // Check campaigns table
  console.log('1. Querying campaigns table...');
  const { data: campaigns, error: campaignsError } = await supabase
    .from('campaigns')
    .select('*')
    .limit(1);

  if (campaignsError) {
    console.log('   Error:', campaignsError.message);
  } else {
    console.log('   ✅ Successfully queried campaigns');
    if (campaigns && campaigns.length > 0) {
      console.log('   Columns:', Object.keys(campaigns[0]).join(', '));
    } else {
      console.log('   Table is empty');
    }
  }

  // Check AGA Runs Progress table
  console.log('\n2. Querying AGA Runs Progress table...');
  const { data: runs, error: runsError } = await supabase
    .from('campaign_runs')
    .select('*')
    .limit(1);

  if (runsError) {
    console.log('   Error:', runsError.message);
  } else {
    console.log('   ✅ Successfully queried AGA Runs Progress');
    if (runs && runs.length > 0) {
      console.log('   Columns:', Object.keys(runs[0]).join(', '));
    } else {
      console.log('   Table is empty');
    }
  }

  // Check campaign_leads table
  console.log('\n3. Querying campaign_leads table...');
  const { data: leads, error: leadsError } = await supabase
    .from('campaign_leads')
    .select('*')
    .limit(1);

  if (leadsError) {
    console.log('   Error:', leadsError.message);
  } else {
    console.log('   ✅ Successfully queried campaign_leads');
    if (leads && leads.length > 0) {
      console.log('   Columns:', Object.keys(leads[0]).join(', '));
    } else {
      console.log('   Table is empty');
    }
  }

  console.log('\n');
}

checkTables();
