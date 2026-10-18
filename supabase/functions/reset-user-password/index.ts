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

    // Fetch caller's profile details
    const { data: callerProfile, error: callerError } = await adminClient
      .from('profiles')
      .select('role, gym_id')
      .eq('id', user.id)
      .single()

    if (callerError || !callerProfile) {
      return new Response(JSON.stringify({ error: 'Caller profile not found' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse Input
    const body = await req.json()
    const { user_id, new_password } = body

    if (!user_id || !new_password) {
      return new Response(JSON.stringify({ error: 'Missing required parameters: user_id, new_password' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch target user's profile details
    const { data: targetProfile, error: targetError } = await adminClient
      .from('profiles')
      .select('role, gym_id')
      .eq('id', user_id)
      .single()

    if (targetError || !targetProfile) {
      return new Response(JSON.stringify({ error: 'Target user profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Verify permissions based on roles
    let isAllowed = false

    if (callerProfile.role === 'super_admin') {
      isAllowed = true
    } else if (callerProfile.role === 'gym_owner') {
      // Gym owners can reset passwords only for users in their gym who are trainers or members
      if (
        callerProfile.gym_id &&
        targetProfile.gym_id === callerProfile.gym_id &&
        (targetProfile.role === 'trainer' || targetProfile.role === 'member')
      ) {
        isAllowed = true
      }
    }

    if (!isAllowed) {
      return new Response(JSON.stringify({ error: 'Unauthorized to reset password for this user' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Update the target user's password using the Auth Admin API
    const { error: resetError } = await adminClient.auth.admin.updateUserById(user_id, {
      password: new_password
    })

    if (resetError) {
      return new Response(JSON.stringify({ error: 'Failed to reset password: ' + resetError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, message: 'Password reset successfully.' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
