/**
 * Automatic Database Migration Runner
 * Uses Supabase REST API to execute SQL
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import axios from 'axios';

config();

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function runMigrations() {
  console.log('\n🔄 Running automatic database migrations...\n');

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check if campaign_id column exists
    console.log('📝 Checking current schema...');

    const { data: testData, error: testError } = await supabase
      .from('campaign_runs')
      .select('campaign_id')
      .limit(1);

    if (testError && testError.message.includes('column "campaign_id" does not exist')) {
      console.log('   ⚠️  campaign_id column missing\n');
      console.log('🔧 Applying migration via Supabase SQL API...\n');

      // Use Supabase's SQL endpoint to run migrations
      const projectRef = supabaseUrl.match(/https:\/\/(.+?)\.supabase\.co/)?.[1];

      const migrationSQL = `
-- Add campaign_id column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'campaign_runs'
        AND column_name = 'campaign_id'
    ) THEN
        ALTER TABLE "AGA Runs Progress" ADD COLUMN campaign_id UUID;
        RAISE NOTICE 'Added campaign_id column';
    END IF;
END $$;

-- Add foreign key constraint
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
    END IF;
END $$;

-- Create index
CREATE INDEX IF NOT EXISTS idx_aga_runs_campaign_id ON "AGA Runs Progress"(campaign_id);
      `.trim();

      console.log('📋 Migration SQL:');
      console.log('━'.repeat(60));
      console.log(migrationSQL);
      console.log('━'.repeat(60));
      console.log('\n⚠️  Note: Supabase JavaScript client cannot execute raw SQL for security.');
      console.log('   Please run the migration using ONE of these methods:\n');
      console.log('   METHOD 1 - Supabase Dashboard (Easiest):');
      console.log('   1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
      console.log('   2. Copy the SQL above');
      console.log('   3. Paste and click "Run"\n');
      console.log('   METHOD 2 - Use the migration file:');
      console.log('   1. Open: database_migration.sql');
      console.log('   2. Copy all SQL');
      console.log('   3. Run in Supabase SQL Editor\n');

      return false;
    } else if (!testError) {
      console.log('   ✅ campaign_id column exists\n');

      // Verify we can query with campaign_id
      const { error: queryError } = await supabase
        .from('campaign_runs')
        .select('run_id, campaign_id, status')
        .limit(1);

      if (queryError) {
        console.log('   ⚠️  Error querying campaign_id:', queryError.message);
        return false;
      }

      console.log('✅ All migrations verified!\n');
      return true;
    } else {
      console.error('   ❌ Unexpected error:', testError);
      return false;
    }

  } catch (error: any) {
    console.error('\n❌ Migration check failed:', error.message);
    return false;
  }
}

// Run migrations
runMigrations().then(success => {
  if (success) {
    console.log('🎉 Database schema is up to date!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Please run the migration SQL in Supabase Dashboard\n');
    console.log('   After running the SQL, restart your backend with: npm run dev\n');
    process.exit(1);
  }
});
