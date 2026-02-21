/**
 * One-time migration: Add Matt's missing user_profiles row.
 *
 * Matt's user ID: fe1e0be6-4574-4bc1-8c89-9cb1b6bbe870
 * Root cause: Fragmented onboarding flow didn't guarantee user_profiles creation.
 *
 * Run with:
 *   node scripts/add-matt-profile.js
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local manually (no dotenv dependency required)
function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env.local');
    const lines = readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      process.env[key] = process.env[key] ?? val;
    }
  } catch (e) {
    console.error('Could not load .env.local:', e.message);
  }
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const MATT_USER_ID = 'fe1e0be6-4574-4bc1-8c89-9cb1b6bbe870';

async function run() {
  console.log('Checking for existing user_profiles row for Matt...');

  const { data: existing, error: checkError } = await supabase
    .from('user_profiles')
    .select('user_id, display_name')
    .eq('user_id', MATT_USER_ID)
    .maybeSingle();

  if (checkError) {
    console.error('Error checking existing row:', checkError.message);
    process.exit(1);
  }

  if (existing) {
    console.log('Row already exists:', existing);
    console.log('Nothing to do.');
    return;
  }

  console.log('No row found. Inserting...');

  const { data, error } = await supabase
    .from('user_profiles')
    .insert({
      user_id: MATT_USER_ID,
      display_name: 'Matt',
      preferred_checkin_time: 'evening',
    })
    .select()
    .single();

  if (error) {
    console.error('Insert failed:', error.message);
    process.exit(1);
  }

  console.log('Success! Row created:', data);

  // Verify
  const { data: verify } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', MATT_USER_ID)
    .maybeSingle();

  console.log('Verification — row in DB:', verify);
}

run().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});
