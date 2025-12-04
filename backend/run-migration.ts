/**
 * Run database migration directly via PostgreSQL connection
 * Set SUPABASE_DB_PASSWORD in .env to enable automatic migrations
 */

import pg from 'pg';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

config();

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

async function runMigration() {
  console.log('\n🔄 Running database migration...\n');

  const dbPassword = process.env.SUPABASE_DB_PASSWORD;

  if (!dbPassword) {
    console.log('❌ SUPABASE_DB_PASSWORD not set in .env\n');
    console.log('To enable automatic migrations:');
    console.log('1. Go to Supabase Dashboard > Settings > Database');
    console.log('2. Copy your database password');
    console.log('3. Add to .env: SUPABASE_DB_PASSWORD=your_password\n');
    console.log('OR run the SQL manually:');
    console.log('   File: add_campaign_id.sql\n');
    process.exit(1);
  }

  // Extract connection details from Supabase URL
  const supabaseUrl = process.env.SUPABASE_URL!;
  const projectRef = supabaseUrl.match(/https:\/\/(.+?)\.supabase\.co/)?.[1];

  const client = new Client({
    host: `db.${projectRef}.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: dbPassword,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Read and execute migration SQL
    const migrationSQL = readFileSync(join(__dirname, 'add_campaign_id.sql'), 'utf-8');

    console.log('📝 Executing migration...\n');
    await client.query(migrationSQL);

    console.log('✅ Migration completed successfully!\n');

    // Verify the column was added
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'campaign_runs'
      AND column_name = 'campaign_id';
    `);

    if (result.rows.length > 0) {
      console.log('✅ Verified: campaign_id column exists');
      console.log(`   Type: ${result.rows[0].data_type}\n`);
    } else {
      console.log('⚠️  Warning: Could not verify campaign_id column\n');
    }

    await client.end();
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.log('\nPlease run the SQL manually:');
    console.log('   File: add_campaign_id.sql');
    console.log('   Dashboard: https://supabase.com/dashboard/project/' + projectRef + '/sql/new\n');

    try {
      await client.end();
    } catch (e) {
      // Ignore
    }

    process.exit(1);
  }
}

runMigration();
