import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // 1. Initialize user client to verify identity & role
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    })

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired auth token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Initialize admin client for privileged operations and service role lookup
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Verify caller role is super_admin in profiles via service_role lookup
    const { data: callerProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !callerProfile || callerProfile.role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized: Only Super Admins can add Gym Owners' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse Input
    const body = await req.json()
    const { email, password, full_name, phone, gym_name, address_line1, city, state, pincode } = body

    if (!email || !password || !full_name || !gym_name) {
      return new Response(JSON.stringify({ error: 'Missing required parameters: email, password, full_name, gym_name' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Create Gym Owner user via Auth Admin API
    const { data: createdUser, error: createUserError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'gym_owner',
        full_name,
        created_by: user.id
      }
    })

    if (createUserError) {
      return new Response(JSON.stringify({ error: 'Failed to create owner user: ' + createUserError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const ownerId = createdUser.user.id
    const gymId = crypto.randomUUID()

    // 4. Create Gym record, link owner, update profile and setup trial subscription in a try block for rollback support
    try {
      // Create Gym record
      const { error: gymInsertError } = await adminClient
        .from('gyms')
        .insert({
          id: gymId,
          owner_id: ownerId,
          name: gym_name,
          address_line1: address_line1 || 'Main Street',
          city: city || 'New York',
          state: state || 'NY',
          pincode: pincode || '10001',
          phone: phone || null,
          email: email
        })

      if (gymInsertError) throw gymInsertError

      // Update gym owner profile with gym_id
      const { error: updateProfileError } = await adminClient
        .from('profiles')
        .update({ gym_id: gymId })
        .eq('id', ownerId)

      if (updateProfileError) throw updateProfileError

      // Create Gym Subscription record (trial mode, ends in 7 days)
      const trialEndsAt = new Date()
      trialEndsAt.setDate(trialEndsAt.getDate() + 7)

      const { error: subscriptionInsertError } = await adminClient
        .from('gym_subscriptions')
        .insert({
          gym_id: gymId,
          status: 'trial',
          trial_started_at: new Date().toISOString(),
          trial_ends_at: trialEndsAt.toISOString()
        })

      if (subscriptionInsertError) throw subscriptionInsertError

      return new Response(JSON.stringify({
        success: true,
        user_id: ownerId,
        gym_id: gymId,
        temp_password: password,
        message: 'Gym owner account and gym profile created successfully with a 7-day trial.'
      }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    } catch (innerError) {
      // Rollback: delete the created auth user
      await adminClient.auth.admin.deleteUser(ownerId)
      return new Response(JSON.stringify({ error: 'Database setup failed, rolled back user creation: ' + innerError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
