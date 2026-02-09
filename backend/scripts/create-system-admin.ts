/**
 * One-off script to create the first system_admin user.
 * Run from repo root: cd backend && bun run scripts/create-system-admin.ts
 * Or: bun run backend/scripts/create-system-admin.ts (from root, may need to set cwd for .env)
 *
 * Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Optional env: SYSTEM_ADMIN_EMAIL, SYSTEM_ADMIN_PASSWORD (defaults: admin@vizzocheck.local, change-me)
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.SYSTEM_ADMIN_EMAIL || 'admin@vizzocheck.local';
const password = process.env.SYSTEM_ADMIN_PASSWORD || 'change-me';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (existing) {
    console.log(`User ${email} already exists. Exiting.`);
    process.exit(0);
  }

  const password_hash = await bcrypt.hash(password, 10);
  const { error } = await supabase.from('users').insert({
    email,
    password_hash,
    role: 'system_admin',
    agency_id: null
  });

  if (error) {
    console.error('Failed to create system_admin:', error.message);
    process.exit(1);
  }

  console.log(`System admin created: ${email}`);
  console.log('Change the password after first login or set SYSTEM_ADMIN_PASSWORD when running this script.');
}

main();
