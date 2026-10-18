import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
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
    
    // Initialize Supabase Client with caller's authorization header to respect RLS
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    })

    // Parse Input
    const { qr_payload, scanned_by } = await req.json()
    if (!qr_payload) {
      return new Response(JSON.stringify({ error: 'Missing qr_payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse qr_payload JSON
    let parsedPayload;
    try {
      parsedPayload = JSON.parse(qr_payload)
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid QR code payload format (must be JSON)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { member_id, gym_id } = parsedPayload
    if (!member_id || !gym_id) {
      return new Response(JSON.stringify({ error: 'Invalid QR payload content: member_id and gym_id are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. Validate Gym Activity
    const { data: gymActive, error: activeCheckError } = await supabase.rpc('is_gym_active', { gym_id_param: gym_id })
    if (activeCheckError) {
      return new Response(JSON.stringify({ error: 'Error checking gym subscription status' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!gymActive) {
      return new Response(JSON.stringify({ error: 'Gym subscription is inactive/expired. Access denied.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Fetch member and associated profiles details
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', member_id)
      .single()

    if (profileError || !profileData) {
      return new Response(JSON.stringify({ error: 'Member profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select('status, expiry_date')
      .eq('id', member_id)
      .single()

    if (memberError || !memberData) {
      return new Response(JSON.stringify({ error: 'Member record not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate member status
    if (memberData.status !== 'active') {
      return new Response(JSON.stringify({ error: `Member is not active (Status: ${memberData.status})` }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate member expiry
    if (memberData.expiry_date && new Date(memberData.expiry_date) < new Date()) {
      return new Response(JSON.stringify({ error: 'Membership plan has expired' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Insert Attendance
    const { error: insertError } = await supabase
      .from('attendance')
      .insert({
        gym_id,
        member_id,
        scanned_by: scanned_by || null,
        method: scanned_by ? 'manual' : 'qr_scan',
        check_in_time: new Date().toISOString(),
        check_in_date: new Date().toISOString().split('T')[0]
      })

    if (insertError) {
      // Catch unique daily check-in constraint error (PostgreSQL error code 23505)
      if (insertError.code === '23505') {
        return new Response(JSON.stringify({ 
          success: false, 
          already_checked_in: true,
          member_name: profileData.full_name,
          photo_url: profileData.avatar_url,
          message: 'Member has already checked in today.' 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ error: 'Failed to record attendance: ' + insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({
      success: true,
      member_name: profileData.full_name,
      photo_url: profileData.avatar_url,
      message: 'Attendance recorded successfully.'
    }), {
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
