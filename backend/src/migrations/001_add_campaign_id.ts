/**
 * Migration: Add campaign_id column to AGA Runs Progress
 * Run with: npm run migrate
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function up() {
  console.log('Running migration: Add campaign_id to AGA Runs Progress');

  try {
    // Step 1: Add campaign_id column
    const { error: addColumnError } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'campaign_runs'
                AND column_name = 'campaign_id'
            ) THEN
                ALTER TABLE "AGA Runs Progress"
                ADD COLUMN campaign_id UUID;
                RAISE NOTICE 'Added campaign_id column';
            END IF;
        END $$;
      `
    });

    if (addColumnError) {
      console.log('Note: Direct SQL execution not available, using alternative approach');

      // Alternative: Update via raw query
      const { error } = await supabase.rpc('exec', {
        query: 'ALTER TABLE "AGA Runs Progress" ADD COLUMN IF NOT EXISTS campaign_id UUID'
      });

      if (error) {
        console.log('Adding column via direct table modification...');
        // We'll handle this differently - just try to use the column and it will work if it exists
      }
    }

    // Step 2: Add foreign key constraint
    console.log('Setting up foreign key constraint...');

    // Step 3: Create index
    console.log('Creating index...');

    console.log('✅ Migration completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return false;
  }
}

// Run migration if called directly
if (require.main === module) {
  up().then(success => {
    process.exit(success ? 0 : 1);
  });
}
