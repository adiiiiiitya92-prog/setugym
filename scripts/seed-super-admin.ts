import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load env from backend/.env
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env");
  process.exit(1);
}

async function seed() {
  const supabase = createClient(supabaseUrl!, serviceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // 1. Check if super_admin profile already exists
  const { data: superAdmins, error: queryError } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'super_admin');

  if (queryError) {
    console.error("Error querying profiles:", queryError.message);
    process.exit(1);
  }

  if (superAdmins && superAdmins.length > 0) {
    console.log("Super admin profile already exists. Skipping seeding.");
    process.exit(0);
  }

  // 2. Setup super admin credentials
  const email = 'admin@gymapp.com';
  const password = 'Admin@123';

  console.log(`Seeding super admin: ${email}...`);

  // 3. Create user using Auth Admin API
  const { data, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: 'super_admin',
      full_name: 'Super Admin'
    }
  });

  if (createError) {
    console.error("Error creating super admin user:", createError.message);
    process.exit(1);
  }

  console.log("\n========================================================");
  console.log("SUPER ADMIN SEEDED SUCCESSFULLY!");
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log("========================================================");
  console.log("⚠️ WARNING: Please change this password after your first login via the dashboard to keep the account secure.");
  console.log("========================================================\n");
}

seed().catch((err) => {
  console.error("Unhandled seeding error:", err);
  process.exit(1);
});
