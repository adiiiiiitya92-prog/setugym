const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://pzvgijertrdqmxahultn.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function runCleanup() {
  console.log('Fetching trainer profiles...');
  const { data: profiles, error: fetchError } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'trainer');

  if (fetchError) {
    console.error('Error fetching trainers:', fetchError.message);
    process.exit(1);
  }

  if (!profiles || profiles.length === 0) {
    console.log('No trainer profiles found. Nothing to clean up.');
    return;
  }

  const trainerIds = profiles.map(p => p.id);
  console.log(`Found ${profiles.length} trainer(s):`, profiles.map(p => p.full_name));

  console.log('Deleting trainer records from the members table...');
  const { data: deleteData, error: deleteError } = await supabase
    .from('members')
    .delete()
    .in('id', trainerIds);

  if (deleteError) {
    console.error('Error deleting from members:', deleteError.message);
    process.exit(1);
  }

  console.log('Accidental trainer records successfully deleted from members table.');
}

runCleanup();
