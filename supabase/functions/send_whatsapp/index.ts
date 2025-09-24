import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppRequest {
  eventId: number;
  number: string;
  text: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { eventId, number, text }: WhatsAppRequest = await req.json();

    console.log('Sending WhatsApp message for event:', eventId, 'to number:', number);

    // Get event details with account information
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select(`
        *,
        accounts!inner(whatsapp_host, whatsapp_token)
      `)
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      console.error('Event not found:', eventError);
      return new Response(
        JSON.stringify({ error: 'Event not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const account = event.accounts;
    if (!account.whatsapp_host || !account.whatsapp_token) {
      console.error('WhatsApp credentials not configured for event:', eventId);
      return new Response(
        JSON.stringify({ error: 'WhatsApp credentials not configured' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Send WhatsApp message
    const whatsappUrl = `${account.whatsapp_host}/send/text`;
    console.log('Sending to WhatsApp URL:', whatsappUrl);

    const whatsappResponse = await fetch(whatsappUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': account.whatsapp_token,
      },
      body: JSON.stringify({
        number: number,
        text: text,
      }),
    });

    if (!whatsappResponse.ok) {
      const errorText = await whatsappResponse.text();
      console.error('WhatsApp API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to send WhatsApp message', details: errorText }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const result = await whatsappResponse.json();
    console.log('WhatsApp message sent successfully:', result);

    return new Response(
      JSON.stringify({ success: true, result }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in send_whatsapp function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});