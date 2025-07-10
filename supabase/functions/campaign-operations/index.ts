import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

function stripQuotes(str: string): string {
  return str.replace(/^\"+|\"+$/g, '').replace(/^'+|'+$/g, '');
}

function sanitizeUUIDArray(input: any): string[] {
  if (!input || !Array.isArray(input)) return [];
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return input.map(id => {
    if (typeof id === 'string') {
      const cleaned = stripQuotes(id.trim());
      return uuidRegex.test(cleaned) ? cleaned : null;
    }
    return null;
  }).filter(Boolean) as string[];
}

function sanitizeUUID(id: any): string | null {
  if (typeof id === 'string') {
    const cleaned = stripQuotes(id.trim());
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(cleaned) ? cleaned : null;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let action = null;
  let rest = {};

  try {
    const body = await req.json();
    action = body.action;
    rest = { ...body };
    delete rest.action;
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid JSON in request body.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }

  if (!action) {
    return new Response(
      JSON.stringify({ success: false, error: 'Missing required "action" parameter.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (action === 'get_campaigns') {
      const { data: campaigns, error: campaignsError } = await supabaseClient
        .from('campaigns')
        .select('*');

      if (campaignsError) throw campaignsError;

      return new Response(
        JSON.stringify({ success: true, data: campaigns }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (action === 'create_campaign') {
      const { name, selectedLists, user_id, ...fields } = rest;
      if (!user_id || !sanitizeUUID(user_id)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid user ID' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const { data: userProfile, error: profileError } = await supabaseClient
        .from('user_profiles')
        .select('id, business_id')
        .eq('id', user_id)
        .single();

      if (profileError || !userProfile?.business_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid user or missing business ID' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const { data: business, error: businessError } = await supabaseClient
        .from('businesses')
        .select('webhook_url, twilio_number')
        .eq('id', userProfile.business_id)
        .single();

      if (businessError) throw businessError;

      const sanitizedLists = sanitizeUUIDArray(selectedLists);
      const scheduled_time = fields.scheduledDate && fields.scheduleTime
        ? new Date(`${fields.scheduledDate}T${fields.scheduleTime}`).toISOString()
        : null;

      const { data: newCampaign, error: insertError } = await supabaseClient
        .from('campaigns')
        .insert({
          title: name,
          target_contact_lists: sanitizedLists,
          ...fields,
          scheduled_time,
          business_id: userProfile.business_id,
          created_by: user_id,
          webhook_url: business.webhook_url,
          from_number: business.twilio_number,
          status: scheduled_time ? 'scheduled' : 'draft'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return new Response(
        JSON.stringify({ success: true, data: newCampaign }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Unexpected error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
