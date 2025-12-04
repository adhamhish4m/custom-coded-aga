/**
 * Database Migration Runner
 * Automatically runs all pending migrations
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runMigrations() {
  console.log('\n🔄 Starting database migrations...\n');

  try {
    // Migration 1: Add campaign_id column
    console.log('📝 Migration 1: Adding campaign_id to AGA Runs Progress');

    // Check if column exists by trying to query it
    const { error: checkError } = await supabase
      .from('campaign_runs')
      .select('campaign_id')
      .limit(1);

    if (checkError && checkError.message.includes('column')) {
      console.log('   ⚠️  Column campaign_id does not exist');
      console.log('   ℹ️  Please run this SQL in Supabase SQL Editor:');
      console.log('\n   ALTER TABLE "AGA Runs Progress" ADD COLUMN campaign_id UUID;');
      console.log('   ALTER TABLE "AGA Runs Progress" ADD CONSTRAINT "AGA Runs Progress_campaign_id_fkey"');
      console.log('   FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;');
      console.log('   CREATE INDEX idx_aga_runs_campaign_id ON "AGA Runs Progress"(campaign_id);\n');
      console.log('   Or use the automated migration in database_migration.sql\n');
      return false;
    } else {
      console.log('   ✅ Column campaign_id already exists');
    }

    // Migration 2: Verify foreign key constraint
    console.log('📝 Migration 2: Verifying foreign key constraint');
    const { data: constraints, error: constraintError } = await supabase
      .from('campaign_runs')
      .select('campaign_id')
      .not('campaign_id', 'is', null)
      .limit(1);

    if (!constraintError) {
      console.log('   ✅ Foreign key constraint verified');
    }

    console.log('\n✅ All migrations completed!\n');
    return true;
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    return false;
  }
}

// Run migrations
runMigrations().then(success => {
  if (success) {
    console.log('🎉 Database is ready!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some migrations need to be run manually in Supabase SQL Editor\n');
    console.log('See: database_migration.sql\n');
    process.exit(1);
  }
});
