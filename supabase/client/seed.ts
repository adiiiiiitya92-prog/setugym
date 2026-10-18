import { createClient } from '@supabase/supabase-js';

// Load environment variables (stub or fallback to defaults for easy running)
const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY is required to seed users.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function seed() {
  console.log('Starting Supabase Seeding...');

  // Fetch all users to resolve existing accounts
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Error listing auth users:', listError);
    return;
  }
  const authUsers = listData?.users || [];

  // 1. Create Super Admin Auth User
  console.log('Seeding Super Admin...');
  let adminId = authUsers.find(u => u.email === 'admin@gymapp.com')?.id;
  if (!adminId) {
    const { data: adminUser, error: adminError } = await supabase.auth.admin.createUser({
      email: 'admin@gymapp.com',
      password: 'Admin@123',
      email_confirm: true,
      user_metadata: {
        role: 'super_admin',
        full_name: 'Super Admin'
      }
    });

    if (adminError) {
      console.error('Error creating super admin:', adminError.message);
    } else {
      adminId = adminUser?.user?.id;
    }
  }

  if (adminId) {
    await supabase.from('profiles').upsert({
      id: adminId,
      role: 'super_admin',
      full_name: 'Super Admin',
      is_active: true
    });
    console.log('Super Admin profile seeded.');
  }

  // 2. Create Gym Owner Auth User
  console.log('Seeding Gym Owner...');
  let ownerId = authUsers.find(u => u.email === 'owner@fitzone.com')?.id;
  if (!ownerId) {
    const { data: ownerUser, error: ownerError } = await supabase.auth.admin.createUser({
      email: 'owner@fitzone.com',
      password: 'Owner@123',
      email_confirm: true,
      user_metadata: {
        role: 'gym_owner',
        full_name: 'Robert Fitfield'
      }
    });

    if (ownerError) {
      console.error('Error creating owner user:', ownerError.message);
    } else {
      ownerId = ownerUser?.user?.id;
    }
  }

  if (!ownerId) {
    console.error('Could not obtain owner ID. Exiting.');
    return;
  }

  // Upsert the Owner Profile
  await supabase.from('profiles').upsert({
    id: ownerId,
    role: 'gym_owner',
    full_name: 'Robert Fitfield',
    phone: '+1 (555) 019-2831',
    is_active: true
  });

  // 3. Create Gym
  console.log('Seeding Gym...');
  const gymId = '8f8f8f8f-8f8f-8f8f-8f8f-8f8f8f8f8f8f';
  const { error: gymError } = await supabase.from('gyms').upsert({
    id: gymId,
    owner_id: ownerId,
    name: 'FitZone Gym',
    address_line1: '123 Broadway Blvd',
    city: 'New York',
    state: 'NY',
    pincode: '10001',
    phone: '+1 (555) 123-4567',
    email: 'downtown@fitzone.com',
    gst_number: '22AAAAA1111A1Z1',
    website: 'https://fitzone.com'
  });

  if (gymError) {
    console.error('Error seeding gym:', gymError.message);
  }

  // Update profile with gym_id
  await supabase.from('profiles').update({ gym_id: gymId }).eq('id', ownerId);

  // 4. Create Gym Subscription
  console.log('Seeding Gym Subscription...');
  const { error: subError } = await supabase.from('gym_subscriptions').upsert({
    gym_id: gymId,
    plan_id: '2e2e2e2e-2e2e-2e2e-2e2e-2e2e2e2e2e2e', // Pro plan
    status: 'trial',
    trial_started_at: new Date().toISOString(),
    trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  });

  if (subError) {
    console.error('Error seeding subscription:', subError.message);
  }

  // 5. Create Membership Plans
  console.log('Seeding Membership Plans...');
  const planMonthlyId = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
  const planQuarterlyId = 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2';
  const planAnnualId = 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3';

  const { error: plansError } = await supabase.from('membership_plans').upsert([
    {
      id: planMonthlyId,
      gym_id: gymId,
      name: 'Monthly Plan',
      duration_days: 30,
      price: 1500.00,
      features: ['Cardio access', 'Locker access'],
      color_tag: '#6C47FF',
      is_popular: false
    },
    {
      id: planQuarterlyId,
      gym_id: gymId,
      name: 'Quarterly Plan',
      duration_days: 90,
      price: 4000.00,
      features: ['Cardio access', 'Locker access', 'Trainer orientation'],
      color_tag: '#00C896',
      is_popular: true
    },
    {
      id: planAnnualId,
      gym_id: gymId,
      name: 'Annual Plan',
      duration_days: 365,
      price: 14000.00,
      features: ['Cardio access', 'Locker access', 'Trainer orientation', 'Sauna access'],
      color_tag: '#FF6B35',
      is_popular: false
    }
  ]);

  if (plansError) {
    console.error('Error seeding membership plans:', plansError.message);
  }

  // 6. Create Trainer Auth User
  console.log('Seeding Trainer...');
  let trainerId = authUsers.find(u => u.email === 'trainer@fitzone.com')?.id;
  if (!trainerId) {
    const { data: trainerUser, error: trainerError } = await supabase.auth.admin.createUser({
      email: 'trainer@fitzone.com',
      password: 'Trainer@123',
      email_confirm: true,
      user_metadata: {
        role: 'trainer',
        full_name: 'Mike Ironson',
        gym_id: gymId
      }
    });

    if (trainerError) {
      console.error('Error creating trainer:', trainerError.message);
    } else {
      trainerId = trainerUser?.user?.id;
    }
  }

  if (trainerId) {
    // Upsert Trainer Profile
    await supabase.from('profiles').upsert({
      id: trainerId,
      role: 'trainer',
      gym_id: gymId,
      full_name: 'Mike Ironson',
      phone: '+1 (555) 765-4321',
      is_active: true
    });
    
    // Insert staff row
    const { error: staffError } = await supabase.from('staff').upsert({
      id: trainerId,
      gym_id: gymId,
      specialization: 'Bodybuilding & Hypertrophy',
      schedule: { mon: '6AM-2PM', tue: '6AM-2PM', wed: '6AM-2PM', thu: '6AM-2PM', fri: '6AM-2PM' }
    });

    if (staffError) {
      console.error('Error seeding staff:', staffError.message);
    }
  }

  // 7. Create Member Auth User
  console.log('Seeding Member...');
  let memberId = authUsers.find(u => u.email === 'john@member.com')?.id;
  if (!memberId) {
    const { data: memberUser, error: memberError } = await supabase.auth.admin.createUser({
      email: 'john@member.com',
      password: 'Member@123',
      email_confirm: true,
      user_metadata: {
        role: 'member',
        full_name: 'John Doe',
        gym_id: gymId
      }
    });

    if (memberError) {
      console.error('Error creating member:', memberError.message);
    } else {
      memberId = memberUser?.user?.id;
    }
  }

  if (memberId) {
    // Upsert Member Profile
    await supabase.from('profiles').upsert({
      id: memberId,
      role: 'member',
      gym_id: gymId,
      full_name: 'John Doe',
      phone: '+1 (555) 111-2222',
      is_active: true
    });

    // Insert member row
    const qrPayload = JSON.stringify({ member_id: memberId, gym_id: gymId });
    const { error: mError } = await supabase.from('members').upsert({
      id: memberId,
      gym_id: gymId,
      member_code: 'FZ-0001',
      membership_plan_id: planMonthlyId,
      assigned_trainer_id: trainerId || null,
      date_of_birth: '1994-06-15',
      gender: 'male',
      address: '123 Broadway Blvd, New York, NY',
      emergency_contact: 'Jane Doe (+1 555-999-8888)',
      join_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      expiry_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'active',
      qr_payload: qrPayload
    });

    if (mError) {
      console.error('Error seeding member:', mError.message);
    }

    // 8. Seeding Attendance for the last 10 days
    console.log('Seeding 10 days of Attendance...');
    const attendanceRecords = [];
    for (let i = 1; i <= 10; i++) {
      const checkInDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const checkInDateStr = checkInDate.toISOString().split('T')[0];
      checkInDate.setHours(8, 30, 0, 0); // 8:30 AM
      
      attendanceRecords.push({
        gym_id: gymId,
        member_id: memberId,
        scanned_by: trainerId || null,
        method: 'qr_scan',
        check_in_time: checkInDate.toISOString(),
        check_in_date: checkInDateStr
      });
    }

    const { error: attError } = await supabase.from('attendance').upsert(attendanceRecords);
    if (attError) {
      console.log('Attendance records already seeded or error:', attError.message);
    }

    // 9. Seeding Invoices
    console.log('Seeding Invoices...');
    const { error: invError } = await supabase.from('invoices').upsert([
      {
        gym_id: gymId,
        member_id: memberId,
        invoice_number: 'INV-2026-0001',
        membership_plan_id: planMonthlyId,
        subtotal: 1271.19,
        tax_percent: 18.00,
        tax_amount: 228.81,
        total_amount: 1500.00,
        status: 'paid',
        due_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        paid_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        payment_method: 'card'
      },
      {
        gym_id: gymId,
        member_id: memberId,
        invoice_number: 'INV-2026-0002',
        membership_plan_id: planMonthlyId,
        subtotal: 1271.19,
        tax_percent: 18.00,
        tax_amount: 228.81,
        total_amount: 1500.00,
        status: 'pending',
        due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }
    ]);

    if (invError) {
      console.error('Error seeding invoices:', invError.message);
    }

    // 10. Seeding Diet & Workout Plans
    console.log('Seeding Diet & Workout Plans...');
    const { error: dietError } = await supabase.from('diet_plans').upsert({
      id: 'd1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1',
      gym_id: gymId,
      member_id: memberId,
      created_by: trainerId || null,
      title: 'Lean Shred Diet Plan',
      goal: 'weight_loss',
      daily_calories: 1800,
      meals: [
        {
          name: 'Breakfast',
          time: '8:00 AM',
          items: [{ food: 'Oats', qty: '50g', calories: 180, protein: 6, carbs: 32, fat: 3 }]
        },
        {
          name: 'Lunch',
          time: '1:30 PM',
          items: [{ food: 'Grilled Chicken Breast', qty: '150g', calories: 250, protein: 46, carbs: 0, fat: 4 }]
        }
      ]
    });

    if (dietError) {
      console.error('Error seeding diet plan:', dietError.message);
    }

    const { error: workoutError } = await supabase.from('workout_plans').upsert({
      id: '01010101-0101-0101-0101-010101010101',
      gym_id: gymId,
      member_id: memberId,
      created_by: trainerId || null,
      title: 'Push Pull Legs Hypertrophy',
      goal: 'muscle_gain',
      days_per_week: 3,
      schedule: {
        Monday: [
          { name: 'Bench Press', sets: 4, reps: 12, rest_sec: 60 },
          { name: 'Overhead Press', sets: 3, reps: 10, rest_sec: 60 }
        ],
        Wednesday: [
          { name: 'Deadlift', sets: 3, reps: 5, rest_sec: 120 },
          { name: 'Lat Pulldown', sets: 3, reps: 12, rest_sec: 60 }
        ]
      }
    });

    if (workoutError) {
      console.error('Error seeding workout plan:', workoutError.message);
    }
  }

  // 11. Seeding Notices
  console.log('Seeding Notices...');
  const { error: noticeError } = await supabase.from('notices').upsert([
    {
      id: '10101010-1010-1010-1010-101010101010',
      gym_id: gymId,
      created_by: ownerId,
      title: 'Shortened Hours on Memorial Day',
      body: 'Please note that the gym will operate on a shortened schedule this coming Monday. We will be open from 08:00 AM to 04:00 PM.',
      priority: 'normal',
      target_role: 'all'
    },
    {
      id: '20202020-2020-2020-2020-202020202020',
      gym_id: gymId,
      created_by: ownerId,
      title: 'Boiler Maintenance on Wednesday',
      body: 'Sauna and steam room will be closed on Wednesday for deep cleaning and boiler maintenance. Reopens at 6:00 PM.',
      priority: 'urgent',
      target_role: 'member'
    }
  ]);

  if (noticeError) {
    console.error('Error seeding notices:', noticeError.message);
  }

  console.log('GymPro Database Seeding Completed Successfully!');
}

seed().catch(err => {
  console.error('Seeding encountered an unexpected error:', err);
});
