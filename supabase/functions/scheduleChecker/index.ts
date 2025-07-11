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
    console.log('🔍 scheduleChecker: Checking for scheduled campaigns...');
    const now = new Date().toISOString();

    // Fetch campaigns that are scheduled and due, and are original campaign definitions
    console.log(`🔍 Searching for scheduled campaigns due by ${now}...`);
    const { data: scheduledCampaigns, error: fetchError } = await supabaseClient
      .from('campaigns')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_time', now)
      .is('original_campaign_id', null) // Only process original campaign definitions
      .not('scheduled_time', 'is', null); // Ensure scheduled_time is not null

    if (fetchError) {
      console.error('❌ scheduleChecker: Error fetching scheduled campaigns:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: fetchError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
      );
    }

    if (scheduledCampaigns.length === 0) {
      console.log('✅ scheduleChecker: No campaigns currently scheduled for dispatch.');
      return new Response(
        JSON.stringify({ success: true, message: 'No campaigns currently scheduled for dispatch.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    console.log(`📋 scheduleChecker: Found ${scheduledCampaigns.length} campaigns to process.`);

    for (const campaign of scheduledCampaigns) {
      console.log(`🔄 Processing campaign: ${campaign.title} (ID: ${campaign.id})`);

      // Log the target_contact_lists to debug
      console.log(`📋 Target contact lists: ${JSON.stringify(campaign.target_contact_lists)}`);

      // Update original campaign status to 'processing' to avoid re-processing
      await supabaseClient
        .from('campaigns')
        .update({ status: 'processing' })
        .eq('id', campaign.id);

      const targetListIds = sanitizeUUIDArray(campaign.target_contact_lists);
      console.log(`🔢 Extracted ${targetListIds.length} valid list IDs: ${JSON.stringify(targetListIds)}`);
      
      if (targetListIds.length === 0) {
        console.warn(`⚠️ Campaign ${campaign.id} has no target contact lists. Skipping.`);
        // Update original campaign status to 'completed_no_recipients'
        await supabaseClient
          .from('campaigns')
          .update({ status: 'completed_no_recipients' })
          .eq('id', campaign.id);
        continue;
      }

      // Fetch all contacts from the target lists
      const { data: contactListMembers, error: membersError } = await supabaseClient
        .from('contact_list_members')
        .select('contact_id')
        .in('contact_list_id', targetListIds);

      if (membersError) {
        console.error(`❌ scheduleChecker: Error fetching contact list members for campaign ${campaign.id}:`, membersError);
        // Revert campaign status or mark as error
        await supabaseClient
          .from('campaigns')
          .update({ status: 'error_fetching_contacts' })
          .eq('id', campaign.id);
        continue;
      }

      const contactIds = contactListMembers.map(member => member.contact_id);
      if (contactIds.length === 0) {
        console.warn(`⚠️ No contacts found in target lists for campaign ${campaign.id}. Skipping.`);
        await supabaseClient
          .from('campaigns')
          .update({ status: 'completed_no_recipients' })
          .eq('id', campaign.id);
        continue;
      }

      const { data: contacts, error: contactsError } = await supabaseClient
        .from('contacts')
        .select('id, name, phone_number, whatsapp_number, email')
        .in('id', contactIds);

      if (contactsError) {
        console.error(`❌ scheduleChecker: Error fetching contacts for campaign ${campaign.id}:`, contactsError);
        await supabaseClient
          .from('campaigns')
          .update({ status: 'error_fetching_contacts' })
          .eq('id', campaign.id);
        continue;
      }

      console.log(`👥 Found ${contacts.length} contacts for campaign ${campaign.id}`);

      const recordsToInsert = [];
      for (const contact of contacts) {
        recordsToInsert.push({
          original_campaign_id: campaign.id,
          title: campaign.title,
          message: campaign.message,
          channel: campaign.channel,
          scheduled_time: campaign.scheduled_time, // Keep original scheduled time for individual messages
          media_url: campaign.media_url,
          campaign_type: campaign.campaign_type,
          message_template: campaign.message_template,
          status: 'ready_to_send', // New status for individual messages
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
          console.error(`❌ scheduleChecker: Error inserting individual campaign records for campaign ${campaign.id}:`, insertRecordsError);
          await supabaseClient
            .from('campaigns')
            .update({ status: 'error_inserting_records' })
            .eq('id', campaign.id);
          continue;
        }
        console.log(`✅ scheduleChecker: Successfully created ${recordsToInsert.length} individual records for campaign ${campaign.id}.`);
      } else {
        console.warn(`⚠️ No individual records to insert for campaign ${campaign.id}.`);
      }

      // Update the original campaign's status to 'processed'
      const { error: updateStatusError } = await supabaseClient
        .from('campaigns')
        .update({ status: 'processed' })
        .eq('id', campaign.id);

      if (updateStatusError) {
        console.error(`❌ scheduleChecker: Error updating original campaign status for ${campaign.id}:`, updateStatusError);
      } else {
        console.log(`✅ scheduleChecker: Original campaign ${campaign.id} status updated to 'processed'.`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Scheduled campaigns processed successfully. Processed ${scheduledCampaigns.length} campaigns.`,
        campaignsProcessed: scheduledCampaigns.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );

  } catch (error) {
    console.error('❌ Unhandled error in scheduleChecker:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'An unexpected error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});