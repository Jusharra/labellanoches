import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Initialize default values
  let action = null;
  let rest = {};

  // Try to parse JSON body with error handling
  try {
    const body = await req.json();
    action = body.action;
    rest = { ...body };
    delete rest.action;
  } catch (error) {
    console.error('Error parsing JSON request body:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Invalid JSON in request body. Please ensure the request contains valid JSON data.' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 400 
      }
    );
  }

  // Validate that action is provided
  if (!action) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Missing required "action" parameter in request body.' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 400 
      }
    );
  }
  
  // Initialize Supabase client with the service role key to bypass RLS for administrative actions
  // In a production environment, ensure SUPABASE_SERVICE_ROLE_KEY is set as a secret for the Edge function.
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', 
    {
      auth: {
        persistSession: false,
      },
    },
  );

  try {
    if (action === 'get_campaigns') {
      // Fetch campaigns
      const { data: campaigns, error: campaignsError } = await supabaseClient
        .from('campaigns')
        .select('*');

      if (campaignsError) {
        console.error('Error fetching campaigns:', campaignsError);
        return new Response(
          JSON.stringify({ success: false, error: campaignsError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
        );
      }

      // Fetch contact lists to map list IDs to names
      const { data: contactLists, error: contactListsError } = await supabaseClient
        .from('contact_lists')
        .select('id, list_name');

      if (contactListsError) {
        console.error('Error fetching contact lists:', contactListsError);
        return new Response(
          JSON.stringify({ success: false, error: contactListsError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
        );
      }

      const contactListMap = new Map(contactLists.map(list => [list.id, list.list_name]));

      // Fetch campaign logs to calculate sentCount
      const { data: campaignLogs, error: campaignLogsError } = await supabaseClient
        .from('campaign_logs')
        .select('campaign_id, status');

      if (campaignLogsError) {
        console.error('Error fetching campaign logs:', campaignLogsError);
        return new Response(
          JSON.stringify({ success: false, error: campaignLogsError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
        );
      }

      const sentCounts = new Map<string, number>();
      campaignLogs.forEach(log => {
        if (log.status === 'sent' || log.status === 'delivered') { 
          sentCounts.set(log.campaign_id, (sentCounts.get(log.campaign_id) || 0) + 1);
        }
      });

      const formattedCampaigns = campaigns.map((campaign: any) => {
        const scheduledDate = campaign.scheduled_time ? new Date(campaign.scheduled_time).toLocaleDateString() : '';
        const scheduleTime = campaign.scheduled_time ? new Date(campaign.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        
        // Map target_contact_lists (array of UUIDs) to list names
        const selectedListsNames = campaign.target_contact_lists
          ? campaign.target_contact_lists.map((listId: string) => contactListMap.get(listId)).filter(Boolean).join(', ')
          : 'N/A';

        return {
          id: campaign.id,
          name: campaign.title,
          status: campaign.status,
          listName: selectedListsNames, 
          templateName: campaign.message_template || 'Custom Message', 
          scheduledDate: scheduledDate,
          sentCount: sentCounts.get(campaign.id) || 0, 
          openRate: 'N/A', // Placeholder, as 'opened' status is not in schema
          createdDate: new Date(campaign.created_at).toLocaleDateString(),
          campaignType: campaign.campaign_type,
          business: 'La Bella Noches', // Placeholder, ideally fetched from user's business
          selectedLists: campaign.target_contact_lists || [],
          templateId: 'N/A', // Not directly available from DB, can be derived if needed
          channel: campaign.channel,
          scheduleTime: scheduleTime,
          mediaUrl: campaign.media_url,
          messageContent: campaign.message,
          webhookUrl: campaign.webhook_url,
        };
      });

      return new Response(
        JSON.stringify({ success: true, data: formattedCampaigns }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    } else if (action === 'create_campaign') {
      const { name, selectedLists, messageContent, channel, scheduledDate, scheduleTime, mediaUrl, campaignType, templateName } = rest;

      let scheduled_time = null;
      if (scheduledDate && scheduleTime) {
        scheduled_time = new Date(`${scheduledDate}T${scheduleTime}`).toISOString();
      }

      // Placeholder UUIDs for business_id and created_by.
      // In a production app, these should be dynamically retrieved from the authenticated user's session
      // or a business context.
      const placeholderBusinessId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; 
      const placeholderCreatedBy = 'df4f18aa-6d39-4e87-91aa-a584979e3867'; 

      const { data: newCampaign, error: insertError } = await supabaseClient
        .from('campaigns')
        .insert({
          title: name,
          target_contact_lists: selectedLists || [],
          message: messageContent,
          channel: channel,
          scheduled_time: scheduled_time,
          media_url: mediaUrl,
          campaign_type: campaignType,
          message_template: templateName,
          status: scheduled_time ? 'scheduled' : 'draft', 
          business_id: placeholderBusinessId, 
          created_by: placeholderCreatedBy 
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating campaign:', insertError);
        return new Response(
          JSON.stringify({ success: false, error: insertError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
        );
      }

      return new Response(
        JSON.stringify({ success: true, data: newCampaign }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 },
      );
    } else if (action === 'delete_campaign') {
      const { campaign_id } = rest;

      const { error: deleteError } = await supabaseClient
        .from('campaigns')
        .delete()
        .eq('id', campaign_id);

      if (deleteError) {
        console.error('Error deleting campaign:', deleteError);
        return new Response(
          JSON.stringify({ success: false, error: deleteError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Campaign deleted successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    } else if (action === 'update_campaign') {
      const { campaign_id, status } = rest; 

      const { data: updatedCampaign, error: updateError } = await supabaseClient
        .from('campaigns')
        .update({ status: status })
        .eq('id', campaign_id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating campaign:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: updateError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
        );
      }

      return new Response(
        JSON.stringify({ success: true, data: updatedCampaign }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    );
  } catch (error) {
    console.error('Unhandled error in campaign-operations:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'An unexpected error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});