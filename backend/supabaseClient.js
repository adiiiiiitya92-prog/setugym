const { createClient } = require('@supabase/supabase-js');

// Load environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use Service Role Key for backend administration

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[Supabase Client] Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not defined in the backend environment.');
}

// Initialize Supabase Admin Client
// Note: We use the service_role key here because backends typically run privileged operations
// such as cron tasks, bulk seeding, or push messaging that bypass row-level security.
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

module.exports = { supabaseAdmin };
