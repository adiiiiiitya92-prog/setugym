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

  const testUserId = '88888888-8888-8888-8888-888888888888';
  const adminUserId = '4d92f468-ee3f-4e5f-9641-31dbbe9ed659'; // Super Admin ID from DB

  console.log("Simulating trigger INSERT...");
  const { error } = await supabase
    .from('profiles')
    .insert({
      id: testUserId,
      role: 'gym_owner',
      gym_id: null,
      full_name: 'Test Gym Owner',
      phone: null,
      avatar_url: null,
      is_active: true,
      created_by: adminUserId
    });

  if (error) {
    console.error("Simulation failed!");
    console.error("Message:", error.message);
    console.error("Details:", error.details);
    console.error("Hint:", error.hint);
  } else {
    console.log("Simulation succeeded! Profile inserted.");
    console.log("Cleaning up simulated profile...");
    await supabase.from('profiles').delete().eq('id', testUserId);
  }
}

run().catch(console.error);
