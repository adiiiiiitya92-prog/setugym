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
      return new Response(JSON.stringify({ error: 'Unauthorized: Only Gym Owners can add members' }), {
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
    const { email, password, full_name, phone, date_of_birth, gender, address, membership_plan_id, assigned_trainer_id } = body

    if (!email || !password || !full_name) {
      return new Response(JSON.stringify({ error: 'Missing required parameters: email, password, full_name' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Create Member user via Auth Admin API
    const { data: createdUser, error: createUserError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'member',
        full_name,
        gym_id: callerGymId,
        created_by: user.id,
        phone: phone || null
      }
    })

    if (createUserError) {
      return new Response(JSON.stringify({ error: 'Failed to create member user: ' + createUserError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const memberId = createdUser.user.id

    // 4. Calculate member expiry, fetch code, and insert into members table in a try/rollback block
    try {
      // Calculate expiry date if plan is provided
      let expiryDate: string | null = null
      if (membership_plan_id) {
        const { data: planData, error: planError } = await adminClient
          .from('membership_plans')
          .select('duration_days')
          .eq('id', membership_plan_id)
          .single()

        if (planError) throw planError

        if (planData?.duration_days) {
          const d = new Date()
          d.setDate(d.getDate() + planData.duration_days)
          expiryDate = d.toISOString().split('T')[0]
        }
      }

      // Generate member code via database RPC
      const { data: memberCode, error: codeError } = await adminClient
        .rpc('generate_member_code', { gym_id_param: callerGymId })

      if (codeError) throw codeError

      // Sanitize gender to match DB enum constraints
      const dbGender = gender ? gender.toLowerCase() : null

      // Insert Member record
      const { error: memberInsertError } = await adminClient
        .from('members')
        .insert({
          id: memberId,
          gym_id: callerGymId,
          member_code: memberCode,
          membership_plan_id: membership_plan_id || null,
          assigned_trainer_id: assigned_trainer_id || null,
          date_of_birth: date_of_birth || null,
          gender: dbGender,
          address: address || null,
          status: 'active',
          qr_payload: JSON.stringify({ member_id: memberId, gym_id: callerGymId })
        })

      if (memberInsertError) throw memberInsertError

      return new Response(JSON.stringify({
        success: true,
        user_id: memberId,
        member_code: memberCode,
        message: 'Member account and member profile created successfully.'
      }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    } catch (innerError) {
      // Rollback: delete the created auth user
      await adminClient.auth.admin.deleteUser(memberId)
      return new Response(JSON.stringify({ error: 'Database member setup failed, rolled back user creation: ' + innerError.message }), {
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
