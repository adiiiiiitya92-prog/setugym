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
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    })

    // Parse Input
    const { gym_id } = await req.json()
    if (!gym_id) {
      return new Response(JSON.stringify({ error: 'Missing gym_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch subscription details for the gym
    const { data: subscription, error: subError } = await supabase
      .from('gym_subscriptions')
      .select('status, trial_ends_at, current_period_end')
      .eq('gym_id', gym_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (subError) {
      return new Response(JSON.stringify({ error: 'Database error: ' + subError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Default response if no subscription record is found
    if (!subscription) {
      return new Response(JSON.stringify({
        status: 'none',
        days_remaining: 0,
        trial_ends_at: null,
        requires_upgrade: true
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { status, trial_ends_at, current_period_end } = subscription
    
    let days_remaining = 0
    let requires_upgrade = false

    if (status === 'trial' && trial_ends_at) {
      const trialEnds = new Date(trial_ends_at)
      const now = new Date()
      const diffTime = trialEnds.getTime() - now.getTime()
      days_remaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
      requires_upgrade = now >= trialEnds
    } else if (status === 'active') {
      requires_upgrade = false
      if (current_period_end) {
        const periodEnd = new Date(current_period_end)
        const diffTime = periodEnd.getTime() - new Date().getTime()
        days_remaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
      }
    } else {
      // status in expired, cancelled, suspended
      days_remaining = 0
      requires_upgrade = true
    }

    return new Response(JSON.stringify({
      status,
      days_remaining,
      trial_ends_at,
      requires_upgrade
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
