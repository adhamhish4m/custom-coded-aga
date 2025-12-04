/**
 * Test which user column works
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import crypto from 'crypto';

config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testUserIdColumn() {
  console.log('\n🧪 Testing user_id vs user_auth_id...\n');

  const testId = crypto.randomUUID();

  // Test 1: Try with user_id
  console.log('1. Testing with user_id...');
  const { data: test1, error: error1 } = await supabase
    .from('campaigns')
    .insert({
      id: testId,
      name: 'Test Campaign',
      user_id: 'test-user-123'
    })
    .select();

  if (error1) {
    console.log('   ❌ Error:', error1.message);
  } else {
    console.log('   ✅ Success with user_id!');
    console.log('   Returned columns:', Object.keys(test1[0]).join(', '));

    // Clean up
    await supabase.from('campaigns').delete().eq('id', testId);
    return 'user_id';
  }

  // Test 2: Try with user_auth_id if user_id failed
  console.log('\n2. Testing with user_auth_id...');
  const { data: test2, error: error2 } = await supabase
    .from('campaigns')
    .insert({
      id: testId,
      name: 'Test Campaign',
      user_auth_id: 'test-user-123'
    })
    .select();

  if (error2) {
    console.log('   ❌ Error:', error2.message);
    return null;
  } else {
    console.log('   ✅ Success with user_auth_id!');

    // Clean up
    await supabase.from('campaigns').delete().eq('id', testId);
    return 'user_auth_id';
  }
}

testUserIdColumn().then(result => {
  if (result) {
    console.log(`\n✅ Use column: ${result}\n`);
  } else {
    console.log('\n❌ Both columns failed\n');
  }
});
