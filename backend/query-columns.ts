/**
 * Query actual table columns from information_schema
 */

import pg from 'pg';
import { config } from 'dotenv';

config();

const { Client } = pg;

async function queryColumns() {
  // Extract connection details from Supabase URL
  const supabaseUrl = process.env.SUPABASE_URL!;
  const projectRef = supabaseUrl.match(/https:\/\/(.+?)\.supabase\.co/)?.[1];

  const client = new Client({
    host: `db.${projectRef}.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD || '',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('\n🔍 Querying AGA Runs Progress columns from database...\n');
    await client.connect();

    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'campaign_runs'
      ORDER BY ordinal_position;
    `);

    if (result.rows.length === 0) {
      console.log('❌ Table "AGA Runs Progress" not found in schema');
    } else {
      console.log('✅ Found table with columns:\n');
      result.rows.forEach(row => {
        console.log(`  - ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });

      const hasCampaignId = result.rows.some(row => row.column_name === 'campaign_id');
      console.log('\n' + (hasCampaignId ? '✅' : '❌') + ` campaign_id column ${hasCampaignId ? 'EXISTS' : 'MISSING'}`);

      if (!hasCampaignId) {
        console.log('\n⚠️  You need to add the campaign_id column!');
        console.log('\nRun this SQL in Supabase Dashboard:\n');
        console.log('━'.repeat(60));
        console.log(`
ALTER TABLE "AGA Runs Progress"
ADD COLUMN campaign_id UUID;

ALTER TABLE "AGA Runs Progress"
ADD CONSTRAINT "AGA Runs Progress_campaign_id_fkey"
FOREIGN KEY (campaign_id)
REFERENCES campaigns(id)
ON DELETE CASCADE;

CREATE INDEX idx_aga_runs_campaign_id
ON "AGA Runs Progress"(campaign_id);
        `.trim());
        console.log('━'.repeat(60));
        console.log('\n📍 Go to: https://supabase.com/dashboard/project/' + projectRef + '/sql/new\n');
      }
    }

    await client.end();
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.log('\nℹ️  Note: Direct database connection requires SUPABASE_DB_PASSWORD');
    console.log('   You can find this in Supabase Dashboard > Settings > Database');
    console.log('   Or use the SQL Editor to check columns manually.\n');
    process.exit(1);
  }
}

queryColumns();
