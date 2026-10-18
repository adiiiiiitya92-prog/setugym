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
    const { member_id, membership_plan_id } = await req.json()
    if (!member_id || !membership_plan_id) {
      return new Response(JSON.stringify({ error: 'Missing member_id or membership_plan_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. Fetch Member Details
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('gym_id, profiles(full_name)')
      .eq('id', member_id)
      .single()

    if (memberError || !member) {
      return new Response(JSON.stringify({ error: 'Member not found or unauthorized' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const gymId = member.gym_id
    const memberName = (member.profiles as any)?.full_name || 'Member'

    // 2. Fetch Membership Plan Details
    const { data: plan, error: planError } = await supabase
      .from('membership_plans')
      .select('name, price, duration_days')
      .eq('id', membership_plan_id)
      .single()

    if (planError || !plan) {
      return new Response(JSON.stringify({ error: 'Membership plan not found or unauthorized' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Perform Calculations (18% Tax Exclusive)
    const subtotal = Number(plan.price)
    const taxPercent = 18.00
    const taxAmount = Number((subtotal * 0.18).toFixed(2))
    const totalAmount = Number((subtotal + taxAmount).toFixed(2))

    // 4. Generate Invoice Number via Database Function
    const { data: invoiceNo, error: rpcError } = await supabase
      .rpc('generate_invoice_number', { gym_id_param: gymId })

    if (rpcError || !invoiceNo) {
      return new Response(JSON.stringify({ error: 'Failed to generate invoice number: ' + (rpcError?.message || 'unknown') }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Calculate Due Date (7 days from now)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 7)
    const dueDateStr = dueDate.toISOString().split('T')[0]

    // 5. Insert Invoice Row
    const { data: invoice, error: invoiceInsertError } = await supabase
      .from('invoices')
      .insert({
        gym_id: gymId,
        member_id,
        invoice_number: invoiceNo,
        membership_plan_id,
        subtotal,
        tax_percent: taxPercent,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        status: 'pending',
        due_date: dueDateStr
      })
      .select()
      .single()

    if (invoiceInsertError) {
      return new Response(JSON.stringify({ error: 'Failed to create invoice: ' + invoiceInsertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Append member name & plan name for UI convenience
    const responsePayload = {
      ...invoice,
      member_name: memberName,
      plan_name: plan.name
    }

    return new Response(JSON.stringify(responsePayload), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
