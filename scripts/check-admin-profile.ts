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

  console.log("Fetching auth users list...");
  const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers();
  if (usersErr) {
    console.error("List users failed:", usersErr.message);
    return;
  }

  const adminUser = usersData.users.find(u => u.email === 'admin@gymapp.com');
  if (!adminUser) {
    console.error("admin@gymapp.com not found in auth.users!");
    return;
  }
  console.log("admin@gymapp.com auth ID is:", adminUser.id);

  console.log("Checking profiles table for admin ID...");
  const { data: adminProfile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', adminUser.id)
    .single();

  if (profileErr) {
    console.error("Admin profile NOT found in profiles table:", profileErr.message);
  } else {
    console.log("Admin profile found:", adminProfile);
  }

  console.log("Listing all profiles in database:");
  const { data: allProfiles, error: allErr } = await supabase
    .from('profiles')
    .select('id, role, full_name, gym_id');
  
  if (allErr) {
    console.error("Failed to list profiles:", allErr.message);
  } else {
    console.log(allProfiles);
  }
}

run().catch(console.error);
