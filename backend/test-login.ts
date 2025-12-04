/**
 * Test login credentials
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as readline from 'readline';

config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function testLogin() {
  console.log('\n🔐 Testing Login Credentials\n');

  const email = await ask('Email: ');
  const password = await ask('Password: ');

  console.log('\n1. Attempting to sign in...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: password.trim(),
  });

  if (error) {
    console.log('   ❌ Login failed!');
    console.log('   Error code:', error.status);
    console.log('   Error message:', error.message);
    console.log('   Error name:', error.name);
    console.log('\n   Full error:', JSON.stringify(error, null, 2));

    // Check if user exists but isn't confirmed
    if (error.message.includes('Email not confirmed')) {
      console.log('\n💡 The user exists but email is not confirmed.');
      console.log('   Go to Supabase Dashboard > Authentication > Users');
      console.log('   Find your user and click "Confirm email"');
    }
  } else {
    console.log('   ✅ Login successful!');
    console.log('   User ID:', data.user?.id);
    console.log('   Email:', data.user?.email);
    console.log('   Email confirmed:', data.user?.email_confirmed_at ? 'Yes' : 'No');
    console.log('   Session:', data.session ? 'Active' : 'None');
  }

  // Check if user exists in database using service role
  console.log('\n2. Checking user in database (using service role)...');
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();

  if (listError) {
    console.log('   ❌ Error listing users:', listError.message);
  } else {
    const user = users.users.find(u => u.email === email.trim());
    if (user) {
      console.log('   ✅ User found in auth.users table');
      console.log('   ID:', user.id);
      console.log('   Email confirmed:', user.email_confirmed_at ? 'Yes ✅' : 'No ❌');
      console.log('   Created:', user.created_at);
      console.log('   Last sign in:', user.last_sign_in_at || 'Never');

      if (!user.email_confirmed_at) {
        console.log('\n   🔧 Fixing: Confirming email...');
        const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
          user.id,
          { email_confirm: true }
        );

        if (confirmError) {
          console.log('   ❌ Error confirming email:', confirmError.message);
        } else {
          console.log('   ✅ Email confirmed! Try logging in again.');
        }
      }
    } else {
      console.log('   ❌ User not found in database');
      console.log('   Available users:', users.users.map(u => u.email).join(', '));
    }
  }

  rl.close();
}

testLogin();
