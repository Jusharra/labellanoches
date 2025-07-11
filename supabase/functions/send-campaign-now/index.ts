import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

// Helper function to strip leading and trailing quotes (both single and double)
function stripQuotes(str: string): string {
  return str.replace(/^["']+|["']+$/g, '');
}

// Utility function to sanitize UUID arrays by removing invalid or badly formatted UUIDs
function sanitizeUUIDArray(input: any): string[] {
  if (!input) return [];
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  // Handle array input
  if (Array.isArray(input)) {
    return input
      .map((id) => {
        if (typeof id === 'string') {
          const cleaned = stripQuotes(id.trim());
          return uuidRegex.test(cleaned) ? cleaned : null;
        }
        return null;
      })
      .filter(Boolean) as string[];
  }
  
  // Handle object input (where keys are UUIDs)
  if (typeof input === 'object' && input !== null) {
    return Object.keys(input)
      .map((id) => {
        const cleaned = stripQuotes(id.trim());
        return uuidRegex.test(cleaned) ? cleaned : null;
      })
      .filter(Boolean) as string[];
  }
  
  return [];
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

  // Parse request body
  let campaignId = null;
  try {
    const body = await req.json();
    campaignId = body.campaign_id;
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

  // Validate that campaign_id is provided
  if (!campaignId) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Missing required "campaign_id" parameter in request body.' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 400 
      }
    );
  }

  // Validate campaign_id format
  const cleanCampaignId = sanitizeUUID(campaignId);
  if (!cleanCampaignId) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Invalid campaign_id format. Please provide a valid UUID.' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 400 
      }
    );
  }

  // Initialize Supabase client with the service role key to bypass RLS for administrative actions
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
    console.log(`🚀 send-campaign-now: Processing immediate send for campaign ${cleanCampaignId}`);

    // Fetch the campaign to be sent
    const { data: campaign, error: fetchError } = await supabaseClient
      .from('campaigns')
      .select('*')
      .eq('id', cleanCampaignId)
      .is('original_campaign_id', null) // Only process original campaign definitions
      .single();

    if (fetchError) {
      console.error('❌ send-campaign-now: Error fetching campaign:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to fetch campaign: ${fetchError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
      );
    }

    if (!campaign) {
      return new Response(
        JSON.stringify({ success: false, error: 'Campaign not found or is not a main campaign definition.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 },
      );
    }

    // Validate campaign status - only allow draft, scheduled, or Message Content Ready campaigns to be sent immediately
    if (!['draft', 'scheduled', 'Message Content Ready'].includes(campaign.status)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Campaign cannot be sent immediately. Current status: ${campaign.status}. Only draft, scheduled, or Message Content Ready campaigns can be sent.` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      );
    }

    // Update campaign status to 'processing' to indicate it's being handled
    const { error: updateProcessingError } = await supabaseClient
      .from('campaigns')
      .update({ status: 'processing' })
      .eq('id', cleanCampaignId);

    if (updateProcessingError) {
      console.error('❌ send-campaign-now: Error updating campaign status to processing:', updateProcessingError);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to update campaign status: ${updateProcessingError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
      );
    }

    const targetListIds = sanitizeUUIDArray(campaign.target_contact_lists);
    console.log(`🔢 Extracted ${targetListIds.length} valid list IDs: ${JSON.stringify(targetListIds)}`);
    
    if (targetListIds.length === 0) {
      console.warn(`⚠️ send-campaign-now: Campaign ${cleanCampaignId} has no target contact lists.`);
      // Update campaign status to 'completed_no_recipients'
      await supabaseClient
        .from('campaigns')
        .update({ status: 'completed_no_recipients' })
        .eq('id', cleanCampaignId);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Campaign has no target contact lists. Please add contact lists before sending.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      );
    }

    // Fetch all contacts from the target lists
    const { data: contactListMembers, error: membersError } = await supabaseClient
      .from('contact_list_members')
      .select('contact_id')
      .in('contact_list_id', targetListIds);

    if (membersError) {
      console.error(`❌ send-campaign-now: Error fetching contact list members for campaign ${cleanCampaignId}:`, membersError);
      // Update campaign status to error
      await supabaseClient
        .from('campaigns')
        .update({ status: 'error_fetching_contacts' })
        .eq('id', cleanCampaignId);
      
      return new Response(
        JSON.stringify({ success: false, error: `Failed to fetch contact list members: ${membersError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
      );
    }

    const contactIds = contactListMembers.map(member => member.contact_id);
    if (contactIds.length === 0) {
      console.warn(`⚠️ send-campaign-now: No contacts found in target lists for campaign ${cleanCampaignId}.`);
      await supabaseClient
        .from('campaigns')
        .update({ status: 'completed_no_recipients' })
        .eq('id', cleanCampaignId);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No contacts found in the selected contact lists. Please add contacts to the lists before sending.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      );
    }

    const { data: contacts, error: contactsError } = await supabaseClient
      .from('contacts')
      .select('id, name, phone_number, whatsapp_number, email')
      .in('id', contactIds);

    if (contactsError) {
      console.error(`❌ send-campaign-now: Error fetching contacts for campaign ${cleanCampaignId}:`, contactsError);
      await supabaseClient
        .from('campaigns')
        .update({ status: 'error_fetching_contacts' })
        .eq('id', cleanCampaignId);
      
      return new Response(
        JSON.stringify({ success: false, error: `Failed to fetch contacts: ${contactsError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
      );
    }

    console.log(`👥 send-campaign-now: Found ${contacts.length} contacts for campaign ${cleanCampaignId}`);

    // Create individual campaign records for each contact
    const recordsToInsert = [];
    const currentTime = new Date().toISOString();
    
    for (const contact of contacts) {
      recordsToInsert.push({
        original_campaign_id: campaign.id,
        title: campaign.title,
        message: campaign.message,
        channel: campaign.channel,
        scheduled_time: currentTime, // Set to current time for immediate sending
        media_url: campaign.media_url,
        campaign_type: campaign.campaign_type,
        message_template: campaign.message_template,
        status: 'ready_to_send', // Status for individual messages ready to be sent
        business_id: campaign.business_id,
        created_by: campaign.created_by,
        webhook_url: campaign.webhook_url,
        from_number: campaign.from_number,
        recipient_phone_number: contact.phone_number,
        recipient_name: contact.name,
        recipient_whatsapp_number: contact.whatsapp_number,
        recipient_email: contact.email,
        // Do NOT include target_contact_lists for individual messages
      });
    }

    if (recordsToInsert.length > 0) {
      const { error: insertRecordsError } = await supabaseClient
        .from('campaigns')
        .insert(recordsToInsert);

      if (insertRecordsError) {
        console.error(`❌ send-campaign-now: Error inserting individual campaign records for campaign ${cleanCampaignId}:`, insertRecordsError);
        await supabaseClient
          .from('campaigns')
          .update({ status: 'error_inserting_records' })
          .eq('id', cleanCampaignId);
        
        return new Response(
          JSON.stringify({ success: false, error: `Failed to create individual message records: ${insertRecordsError.message}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
        );
      }
      console.log(`✅ send-campaign-now: Successfully created ${recordsToInsert.length} individual records for campaign ${cleanCampaignId}.`);
    } else {
      console.warn(`⚠️ send-campaign-now: No individual records to insert for campaign ${cleanCampaignId}.`);
    }

    // Update the original campaign's status to 'sent' (for immediate sends)
    const { error: updateStatusError } = await supabaseClient
      .from('campaigns')
      .update({ 
        status: 'sent',
        sent_at: currentTime // Record when the campaign was sent
      })
      .eq('id', cleanCampaignId);

    if (updateStatusError) {
      console.error(`❌ send-campaign-now: Error updating original campaign status for ${cleanCampaignId}:`, updateStatusError);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to update campaign status: ${updateStatusError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
      );
    }

    console.log(`✅ send-campaign-now: Campaign ${cleanCampaignId} sent successfully to ${contacts.length} contacts.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Campaign sent successfully to ${contacts.length} contacts.`,
        campaign_id: cleanCampaignId,
        recipients_count: contacts.length,
        records_created: recordsToInsert.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );

  } catch (error) {
    console.error('❌ Unhandled error in send-campaign-now:', error);
    
    // Try to update campaign status to error if possible
    try {
      await supabaseClient
        .from('campaigns')
        .update({ status: 'error_processing' })
        .eq('id', cleanCampaignId);
    } catch (updateError) {
      console.error('❌ Failed to update campaign status to error:', updateError);
    }
    
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'An unexpected error occurred while sending the campaign' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});