import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  const supabase = createClient(supabaseUrl!, serviceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log("1. Inspecting profiles columns...");
  const { data: cols, error: colsErr } = await supabase.rpc('inspect_table_columns', { table_name: 'profiles' });
  
  // If inspect_table_columns RPC doesn't exist, query PG catalog directly
  const { data: colsCatalog, error: catalogErr } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);

  if (catalogErr) {
    console.error("Error reading profiles:", catalogErr.message);
  } else {
    console.log("Profiles read successfully. Rows exist.");
  }

  // Let's run a raw query using a catalog select to find details about profiles
  // We can query pg_attribute to get the columns of profiles
  const { data: columnsInfo, error: errInfo } = await supabase
    .from('profiles')
    .select('id, role, gym_id, full_name, phone, avatar_url, is_active, created_by')
    .limit(1);

  if (errInfo) {
    console.error("Profiles columns query failed:", errInfo.message);
  } else {
    console.log("All columns are valid and accessible!");
  }

  // Try to insert a mock profile to see the exact constraint error
  console.log("2. Attempting mock profile insert...");
  const testId = '99999999-9999-9999-9999-999999999999';
  const { error: insertErr } = await supabase
    .from('profiles')
    .insert({
      id: testId,
      role: 'super_admin',
      full_name: 'Mock Insert Test',
      is_active: true
    });

  if (insertErr) {
    console.error("Mock insert failed with:", insertErr.message, insertErr.details, insertErr.hint);
  } else {
    console.log("Mock insert succeeded. Cleaning up...");
    await supabase.from('profiles').delete().eq('id', testId);
  }
}

run().catch(console.error);
