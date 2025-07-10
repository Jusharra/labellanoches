import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

// Helper function to strip leading and trailing quotes (both single and double)
function stripQuotes(str: string): string {
  return str.replace(/["']/g, '');
}

// Utility function to sanitize UUID arrays by removing invalid or badly formatted UUIDs
function sanitizeUUIDArray(input: any): string[] {
  if (!input || !Array.isArray(input)) return [];

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  return input
    .map((id) => {
      if (typeof id === 'string') {
        // Strip leading/trailing quotes and trim whitespace
        const cleaned = stripQuotes(id.trim());
        return uuidRegex.test(cleaned) ? cleaned : null;
      }
      return null;
    })
    .filter(Boolean) as string[];
}

// Helper function to sanitize a single UUID string
function sanitizeUUID(id: any): string | null {
  if (typeof id === 'string') {
    const cleaned = stripQuotes(id.trim());
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(cleaned) ? cleaned : null;
  }
  return null;
}

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
    // Common UUID validation regex
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (action === 'get_campaigns') {
      // Fetch campaigns with business_id included
      const { data: campaigns, error: campaignsError } = await supabaseClient
        .from('campaigns')
        .select(`
          id,
          title,
          status,
          target_contact_lists,
          message_template,
          scheduled_time,
          created_at,
          campaign_type,
          channel,
          media_url,
          message,
          webhook_url,
          business_id
        `);

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

      // Fetch businesses to map business IDs to names
      const { data: businesses, error: businessesError } = await supabaseClient
        .from('businesses')
        .select('id, name');

      if (businessesError) {
        console.error('Error fetching businesses:', businessesError);
        return new Response(
          JSON.stringify({ success: false, error: businessesError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
        );
      }

      const contactListMap = new Map(contactLists.map(list => [list.id, list.list_name]));
      const businessMap = new Map(businesses.map(business => [business.id, business.name]));

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
        
        // Ensure status is always a string, default to 'draft' if null/undefined
        const campaignStatus = campaign.status || 'draft';
        
        // Clean and map target_contact_lists (array of UUIDs) to list names
        let selectedListsNames = 'N/A';
        if (campaign.target_contact_lists && Array.isArray(campaign.target_contact_lists)) {
          const cleanedListIds = sanitizeUUIDArray(campaign.target_contact_lists);
          
          const listNames = cleanedListIds
            .map((listId: string) => contactListMap.get(listId))
            .filter(Boolean);
          
          selectedListsNames = listNames.length > 0 ? listNames.join(', ') : 'N/A';
        }

        // Get business name from the businessMap, fallback to 'Unknown Business' if not found
        const businessName = campaign.business_id 
          ? businessMap.get(campaign.business_id) || 'Unknown Business'
          : 'No Business Assigned';

        return {
          id: campaign.id,
          name: campaign.title,
          status: campaignStatus,
          listName: selectedListsNames, 
          templateName: campaign.message_template || 'Custom Message', 
          scheduledDate: scheduledDate,
          sentCount: sentCounts.get(campaign.id) || 0, 
          // NOTE: openRate is set to 'N/A' because the current database schema does not include 
          // a mechanism for tracking message opens. To implement this feature, additional 
          // tracking would need to be added to record when recipients open messages.
          openRate: 'N/A',
          createdDate: new Date(campaign.created_at).toLocaleDateString(),
          campaignType: campaign.campaign_type,
          // Use actual business name from database instead of hardcoded value
          business: businessName,
          selectedLists: campaign.target_contact_lists || [],
          // NOTE: templateId is set to 'N/A' because the campaigns table stores message_template 
          // (template name) but not a direct ID that maps to frontend template IDs. If a direct 
          // link is needed, the schema would need to be updated to include a template_id field.
          templateId: 'N/A',
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
      const { name, selectedLists, messageContent, channel, scheduledDate, scheduleTime, mediaUrl, campaignType, templateName, user_id } = rest;
      
      // Validate user_id
      const cleanUserId = sanitizeUUID(user_id);
      if (!cleanUserId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid or missing user ID' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
        );
      }
      
      // Get user profile to determine business_id
      const { data: userProfile, error: userProfileError } = await supabaseClient
        .from('user_profiles')
        .select('id, business_id, role')
        .eq('id', cleanUserId)
        .single();
        
      if (userProfileError) {
        console.error('Error fetching user profile:', userProfileError);
        return new Response(
          JSON.stringify({ success: false, error: `Failed to fetch user profile: ${userProfileError.message}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
        );
      }
      
      // Check if user has a business_id
      if (!userProfile.business_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'User does not have an associated business' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
        );
      }

      // Fetch business settings to get webhook_url and from_number
      const { data: business, error: businessError } = await supabaseClient
        .from('businesses')
        .select('webhook_url, twilio_number')
        .eq('id', userProfile.business_id)
        .single();
        
      if (businessError) {
        console.error('Error fetching business settings:', businessError);
        return new Response(
          JSON.stringify({ success: false, error: `Failed to fetch business settings: ${businessError.message}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
        );
      }

      let scheduled_time = null;
      if (scheduledDate && scheduleTime) {
        scheduled_time = new Date(`${scheduledDate}T${scheduleTime}`).toISOString();
      }

      // Clean selectedLists array using utility function
      const sanitizedLists = sanitizeUUIDArray(selectedLists);

      const { data: newCampaign, error: insertError } = await supabaseClient
        .from('campaigns')
        .insert({
          title: name,
          target_contact_lists: sanitizedLists,
          message: messageContent,
          channel: channel,
          scheduled_time: scheduled_time,
          media_url: mediaUrl,
          campaign_type: campaignType,
          message_template: templateName,
          status: scheduled_time ? 'scheduled' : 'draft', 
          business_id: userProfile.business_id, 
          created_by: cleanUserId,
          webhook_url: business.webhook_url,
          from_number: business.twilio_number
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

      // Validate campaign_id
      const cleanCampaignId = sanitizeUUID(campaign_id);
      if (!cleanCampaignId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid or missing campaign ID' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
        );
      }

      const { error: deleteError } = await supabaseClient
        .from('campaigns')
        .delete()
        .eq('id', cleanCampaignId);

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

      // Validate campaign_id
      const cleanCampaignId = sanitizeUUID(campaign_id);
      if (!cleanCampaignId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid or missing campaign ID' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
        );
      }

      const { data: updatedCampaign, error: updateError } = await supabaseClient
        .from('campaigns')
        .update({ status: status })
        .eq('id', cleanCampaignId)
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
    } else if (action === 'update_campaign_details') {
      const { campaign_id, name, selectedLists, messageContent, channel, scheduledDate, scheduleTime, mediaUrl, campaignType, templateName } = rest;

      const cleanCampaignId = sanitizeUUID(campaign_id);
      if (!cleanCampaignId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid or missing campaign ID' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
        );
      }

      // Get the campaign's business_id to fetch business settings
      const { data: campaign, error: campaignError } = await supabaseClient
        .from('campaigns')
        .select('business_id')
        .eq('id', cleanCampaignId)
        .single();
        
      if (campaignError) {
        console.error('Error fetching campaign:', campaignError);
        return new Response(
          JSON.stringify({ success: false, error: `Failed to fetch campaign: ${campaignError.message}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
        );
      }
      
      // Fetch business settings to get webhook_url and from_number
      const { data: business, error: businessError } = await supabaseClient
        .from('businesses')
        .select('webhook_url, twilio_number')
        .eq('id', campaign.business_id)
        .single();
        
      if (businessError) {
        console.error('Error fetching business settings:', businessError);
        return new Response(
          JSON.stringify({ success: false, error: `Failed to fetch business settings: ${businessError.message}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
        );
      }

      let scheduled_time = null;
      if (scheduledDate && scheduleTime) {
        scheduled_time = new Date(`${scheduledDate}T${scheduleTime}`).toISOString();
      }

      // Clean selectedLists array using utility function
      const sanitizedLists = sanitizeUUIDArray(selectedLists);

      const updateData: any = {};
      if (name !== undefined) updateData.title = name;
      if (selectedLists !== undefined) updateData.target_contact_lists = sanitizedLists;
      if (messageContent !== undefined) updateData.message = messageContent;
      if (channel !== undefined) updateData.channel = channel;
      if (scheduled_time !== undefined) updateData.scheduled_time = scheduled_time;
      if (mediaUrl !== undefined) updateData.media_url = mediaUrl;
      if (campaignType !== undefined) updateData.campaign_type = campaignType;
      if (templateName !== undefined) updateData.message_template = templateName;
      
      // Always update business-related fields from current business settings
      updateData.webhook_url = business.webhook_url;
      updateData.from_number = business.twilio_number;

      // Update status based on scheduling
      if (scheduled_time) {
        updateData.status = 'scheduled';
      } else if (scheduled_time === null && (scheduledDate === '' || scheduleTime === '')) {
        updateData.status = 'draft';
      }

      const { data: updatedCampaign, error: updateError } = await supabaseClient
        .from('campaigns')
        .update(updateData)
        .eq('id', cleanCampaignId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating campaign details:', updateError);
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