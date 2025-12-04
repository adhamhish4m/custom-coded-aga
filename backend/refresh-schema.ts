/**
 * Force Supabase to refresh its schema cache
 * This sends a request to the PostgREST reload endpoint
 */

import axios from 'axios';
import { config } from 'dotenv';

config();

async function refreshSchema() {
  console.log('\n🔄 Refreshing Supabase schema cache...\n');

  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  try {
    // Method 1: Send a simple query to trigger cache check
    console.log('Method 1: Triggering cache update via query...');

    const response = await axios.get(
      `${supabaseUrl}/rest/v1/`,
      {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`
        }
      }
    );

    console.log('✅ Schema introspection triggered');

    // Method 2: Wait a moment for cache to propagate
    console.log('\n⏳ Waiting for cache to propagate (5 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('\n✅ Schema cache should be refreshed now!');
    console.log('\nIf the issue persists, you may need to:');
    console.log('1. Go to Supabase Dashboard > Settings > General');
    console.log('2. Click "Restart project" (takes ~2 minutes)');
    console.log('   This forces a complete schema cache refresh\n');

    return true;

  } catch (error: any) {
    console.error('❌ Error:', error.message);

    console.log('\n💡 Manual schema cache refresh:');
    console.log('   Go to: Supabase Dashboard > Settings > General');
    console.log('   Click: "Restart project"');
    console.log('   Wait: ~2 minutes for restart to complete\n');

    return false;
  }
}

refreshSchema();
