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
    const { invoice_id, channel } = await req.json()
    if (!invoice_id || !channel) {
      return new Response(JSON.stringify({ error: 'Missing invoice_id or channel' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. Fetch Invoice and Member Details
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('invoice_number, total_amount, member_id, gym_id, members(profiles(full_name, phone, email))')
      .eq('id', invoice_id)
      .single()

    if (invoiceError || !invoice) {
      return new Response(JSON.stringify({ error: 'Invoice not found or unauthorized' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const memberProfile = (invoice.members as any)?.profiles
    const memberName = memberProfile?.full_name || 'Member'
    const memberEmail = memberProfile?.email
    const memberPhone = memberProfile?.phone

    // Construct the reminder message
    const message = `Dear ${memberName}, this is a reminder that payment of INR ${invoice.total_amount} for invoice ${invoice.invoice_number} is pending. Please pay at your earliest convenience.`

    // 2. Insert Payment Reminder Row
    const { data: reminder, error: reminderError } = await supabase
      .from('payment_reminders')
      .insert({
        invoice_id,
        member_id: invoice.member_id,
        sent_via: channel,
        message
      })
      .select()
      .single()

    if (reminderError) {
      return new Response(JSON.stringify({ error: 'Failed to record reminder: ' + reminderError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Stub the actual external delivery integration
    console.log(`[Reminder Dispatch] Sending invoice reminder via ${channel.toUpperCase()}:`)
    console.log(`Recipient: ${memberName} (${channel === 'email' ? memberEmail : memberPhone})`)
    console.log(`Content: "${message}"`)

    if (channel === 'email') {
      // TODO: Integrate SendGrid or Resend API
      // await sendgrid.send({ to: memberEmail, subject: 'Payment Reminder', text: message });
      console.log('-> SendGrid mock dispatch successful.');
    } else if (channel === 'sms') {
      // TODO: Integrate Twilio API
      // await twilio.messages.create({ body: message, to: memberPhone, from: 'GymPro' });
      console.log('-> Twilio mock dispatch successful.');
    } else if (channel === 'push') {
      // TODO: Integrate Firebase Cloud Messaging (FCM) or Expo Push Notifications
      // await sendPushNotification(memberProfile.push_token, message);
      console.log('-> Expo Push Notification mock dispatch successful.');
    }

    return new Response(JSON.stringify({
      success: true,
      reminder_id: reminder.id,
      message: 'Reminder processed and logged successfully.',
      dispatched_via: channel
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
