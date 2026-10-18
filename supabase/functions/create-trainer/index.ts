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

    // Verify caller role is gym_owner in profiles via service_role lookup
    const { data: callerProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('role, gym_id')
      .eq('id', user.id)
      .single()

    if (profileError || !callerProfile || callerProfile.role !== 'gym_owner') {
      return new Response(JSON.stringify({ error: 'Unauthorized: Only Gym Owners can add trainers' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const callerGymId = callerProfile.gym_id
    if (!callerGymId) {
      return new Response(JSON.stringify({ error: 'Caller does not belong to any gym' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse Input
    const body = await req.json()
    const { email, password, full_name, phone, specialization, schedule } = body

    if (!email || !password || !full_name) {
      return new Response(JSON.stringify({ error: 'Missing required parameters: email, password, full_name' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Create Trainer user via Auth Admin API
    const { data: createdUser, error: createUserError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'trainer',
        full_name,
        gym_id: callerGymId,
        created_by: user.id,
        phone: phone || null
      }
    })

    if (createUserError) {
      return new Response(JSON.stringify({ error: 'Failed to create trainer user: ' + createUserError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const trainerId = createdUser.user.id

    // 4. Insert into staff table in a try block for rollback support
    try {
      const { error: staffInsertError } = await adminClient
        .from('staff')
        .insert({
          id: trainerId,
          gym_id: callerGymId,
          specialization: specialization || null,
          schedule: schedule ? schedule : '{}'
        })

      if (staffInsertError) throw staffInsertError

      return new Response(JSON.stringify({
        success: true,
        user_id: trainerId,
        message: 'Trainer account and staff profile created successfully.'
      }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    } catch (innerError) {
      // Rollback: delete the created auth user
      await adminClient.auth.admin.deleteUser(trainerId)
      return new Response(JSON.stringify({ error: 'Database staff setup failed, rolled back user creation: ' + innerError.message }), {
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
