/**
 * Check actual database schema
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSchema() {
  console.log('\n🔍 Checking AGA Runs Progress schema...\n');

  try {
    // Try to query with campaign_id
    const { data, error } = await supabase
      .from('campaign_runs')
      .select('*')
      .limit(1);

    if (error) {
      console.log('❌ Error querying table:', error.message);
      console.log('\nDetails:', error);

      if (error.message.includes('campaign_id') || error.message.includes('schema cache')) {
        console.log('\n⚠️  The campaign_id column is missing!\n');
        console.log('Please run this SQL in Supabase Dashboard:\n');
        console.log('━'.repeat(60));
        console.log(`
-- Add campaign_id column to AGA Runs Progress
ALTER TABLE "AGA Runs Progress"
ADD COLUMN IF NOT EXISTS campaign_id UUID;

-- Add foreign key constraint
ALTER TABLE "AGA Runs Progress"
ADD CONSTRAINT IF NOT EXISTS "AGA Runs Progress_campaign_id_fkey"
FOREIGN KEY (campaign_id)
REFERENCES campaigns(id)
ON DELETE CASCADE;

-- Create index
CREATE INDEX IF NOT EXISTS idx_aga_runs_campaign_id
ON "AGA Runs Progress"(campaign_id);
        `.trim());
        console.log('━'.repeat(60));

        const projectRef = process.env.SUPABASE_URL?.match(/https:\/\/(.+?)\.supabase\.co/)?.[1];
        console.log('\n📍 Go to: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
        console.log('   Copy the SQL above and click "Run"\n');

        return false;
      }
    }

    // If no error, show the columns
    console.log('✅ Successfully queried table');
    if (data && data.length > 0) {
      console.log('\nColumns in first record:');
      Object.keys(data[0]).forEach(col => console.log(`  - ${col}`));
    } else {
      console.log('Table is empty (no records to show columns)');

      // Try to insert a test record to see what columns are required
      console.log('\nAttempting to check available columns...');
      const { error: insertError } = await supabase
        .from('campaign_runs')
        .insert({
          run_id: 'test-' + Date.now(),
          status: 'test',
          campaign_id: null
        });

      if (insertError) {
        console.log('Insert test result:', insertError.message);
      }
    }

    return true;
  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message);
    return false;
  }
}

checkSchema().then(success => {
  process.exit(success ? 0 : 1);
});
