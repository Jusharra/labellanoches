import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface ErrorResponse {
  success: false;
  error: string;
  details?: any;
}

interface SuccessResponse<T = any> {
  success: true;
  data: T;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const url = new URL(req.url)
    const pathname = url.pathname
    const searchParams = url.searchParams

    console.log(`${req.method} ${pathname}`)

    // GET /campaign-operations/campaigns - Get all campaigns
    if (req.method === 'GET' && pathname.endsWith('/campaigns')) {
      const businessId = searchParams.get('business_id')

      let query = supabase
        .from('campaigns')
        .select('*')

      if (businessId) {
        query = query.eq('business_id', businessId)
      }

      const { data: campaigns, error } = await query.order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching campaigns:', error)
        const errorResponse: ErrorResponse = {
          success: false,
          error: `Failed to fetch campaigns: ${error.message}`,
          details: error
        }
        
        return new Response(
          JSON.stringify(errorResponse),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Collect all unique list IDs from all campaigns
      const allListIds: Set<string> = new Set();
      const campaignIds: string[] = [];
      
      campaigns?.forEach(campaign => {
        campaignIds.push(campaign.id);
        if (campaign.target_contact_lists && Array.isArray(campaign.target_contact_lists)) {
          campaign.target_contact_lists.forEach((listId: string) => allListIds.add(listId));
        }
      });

      // Fetch contact list names for all unique list IDs
      let listNamesMap: Map<string, string> = new Map();
      if (allListIds.size > 0) {
        const { data: contactLists, error: listsError } = await supabase
          .from('contact_lists')
          .select('id, list_name')
          .in('id', Array.from(allListIds));

        if (listsError) {
          console.error('Error fetching contact list names:', listsError);
          // Continue without list names rather than failing completely
        } else {
          contactLists?.forEach(list => {
            listNamesMap.set(list.id, list.list_name);
          });
        }
      }

      // Fetch actual sent counts from campaign_logs table
      let sentCountsMap: Map<string, number> = new Map();
      if (campaignIds.length > 0) {
        const { data: campaignLogs, error: logsError } = await supabase
          .from('campaign_logs')
          .select('campaign_id')
          .in('campaign_id', campaignIds)
          .in('status', ['sent', 'delivered']);

        if (logsError) {
          console.error('Error fetching campaign logs:', logsError);
          // Continue with zero counts rather than failing completely
        } else {
          // Count sent messages per campaign
          campaignLogs?.forEach(log => {
            const currentCount = sentCountsMap.get(log.campaign_id) || 0;
            sentCountsMap.set(log.campaign_id, currentCount + 1);
          });
        }
      }

      // Transform campaigns to match the expected frontend format
      const transformedCampaigns = campaigns?.map(campaign => {
        // Parse target_contact_lists safely
        let targetLists = []
        try {
          targetLists = campaign.target_contact_lists ? 
            (Array.isArray(campaign.target_contact_lists) ? 
              campaign.target_contact_lists : 
              JSON.parse(campaign.target_contact_lists)
            ) : []
        } catch (e) {
          console.warn('Error parsing target_contact_lists:', e)
          targetLists = []
        }

        // Calculate accurate list name display
        let listName = 'No lists';
        if (targetLists.length > 0) {
          const names = targetLists.map((listId: string) => listNamesMap.get(listId)).filter(Boolean);
          if (names.length > 0) {
            listName = names.join(', ');
          } else {
            listName = 'Lists not found';
          }
        }

        // Get real sent count from campaign logs
        const sentCount = sentCountsMap.get(campaign.id) || 0

        // Calculate open rate (placeholder for now)
        const openRate = sentCount > 0 ? '68%' : 'N/A'

        return {
          id: campaign.id,
          name: campaign.title || 'Untitled Campaign',
          status: campaign.status || 'draft',
          listName: listName,
          templateName: campaign.message_template || 'Custom Message',
          scheduledDate: campaign.scheduled_time ? 
            new Date(campaign.scheduled_time).toISOString().split('T')[0] : '',
          sentCount: sentCount,
          openRate: openRate,
          createdDate: new Date(campaign.created_at).toISOString().split('T')[0],
          campaignType: campaign.campaign_type || 'Regular Campaign',
          business: 'la-bella-noches',
          selectedLists: targetLists,
          templateId: 'custom',
          channel: campaign.channel || 'sms',
          scheduleTime: campaign.scheduled_time ? 
            new Date(campaign.scheduled_time).toLocaleTimeString('en-US', { 
              hour12: false, 
              hour: '2-digit', 
              minute: '2-digit' 
            }) : '',
          mediaUrl: campaign.media_url || '',
          messageContent: campaign.message || '',
          webhookUrl: campaign.webhook_url
        }
      }) || []

      const successResponse: SuccessResponse = {
        success: true,
        data: transformedCampaigns
      }

      return new Response(
        JSON.stringify(successResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /campaign-operations/campaigns - Create new campaign
    if (req.method === 'POST' && pathname.endsWith('/campaigns')) {
      // Extract the user's authorization token from request headers
      const authHeader = req.headers.get('Authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error('Missing or invalid Authorization header')
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'Authentication required. Please sign in to create campaigns.'
        }
        
        return new Response(
          JSON.stringify(errorResponse),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const userToken = authHeader.replace('Bearer ', '')
      
      // Create a new Supabase client using the user's token for RLS compliance
      const userSupabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      })

      // Get the authenticated user's information
      const { data: { user }, error: userError } = await userSupabase.auth.getUser(userToken)
      
      if (userError || !user) {
        console.error('Error getting authenticated user:', userError)
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'Invalid authentication token. Please sign in again.'
        }
        
        return new Response(
          JSON.stringify(errorResponse),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Verify user has admin permissions
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError || !userProfile || userProfile.role !== 'admin') {
        console.error('User does not have admin permissions:', profileError)
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'Admin permissions required to create campaigns.'
        }
        
        return new Response(
          JSON.stringify(errorResponse),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      let campaignData
      
      try {
        const requestText = await req.text()
        if (!requestText || requestText.trim() === '') {
          throw new Error('Request body is empty')
        }
        campaignData = JSON.parse(requestText)
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError)
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'Invalid JSON in request body',
          details: parseError.message
        }
        
        return new Response(
          JSON.stringify(errorResponse),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Get the Bella Vista business ID
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id, webhook_url, twilio_number')
        .eq('name', 'La Bella Noches')
        .single()

      if (businessError || !business) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'Could not find business to associate campaign with',
          details: businessError
        }
        
        return new Response(
          JSON.stringify(errorResponse),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Determine schedule time
      let scheduledTime = null
      if (campaignData.scheduledDate && campaignData.scheduleTime) {
        scheduledTime = `${campaignData.scheduledDate}T${campaignData.scheduleTime}:00`
      }

      // Determine status based on schedule
      const status = scheduledTime ? 'scheduled' : 'draft'

      // Clean UUIDs to remove any extra quotes that might be wrapped around them
      const cleanedLists = (campaignData.selectedLists || []).map(id => 
        typeof id === 'string' ? id.replace(/"/g, '') : id
      );

      console.log('Creating campaign with user ID:', user.id)
      console.log('Business twilio_number:', business.twilio_number)

      const newCampaignData = {
        business_id: business.id,
        title: campaignData.name,
        message: campaignData.messageContent,
        message_template: campaignData.templateName || campaignData.selectedTemplate || 'Custom Message',
        channel: campaignData.channel,
        scheduled_time: scheduledTime,
        status: status,
        created_by: user.id, // Use the authenticated user's ID
        campaign_type: campaignData.campaignType || 'Regular Campaign',
        media_url: campaignData.mediaUrl && campaignData.mediaUrl.trim() !== '' ? campaignData.mediaUrl : null,
        target_contact_lists: cleanedLists,
        webhook_url: business.webhook_url || null,
        from_number: business.twilio_number || null // Use business Twilio number
      }

      // Use the user's Supabase client for RLS compliance
      const { data: newCampaign, error } = await userSupabase
        .from('campaigns')
        .insert(newCampaignData)
        .select()
        .single()

      if (error) {
        console.error('Error creating campaign:', error)
        const errorResponse: ErrorResponse = {
          success: false,
          error: `Failed to create campaign: ${error.message}`,
          details: error
        }
        
        return new Response(
          JSON.stringify(errorResponse),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Fetch list names for the new campaign
      let targetLists = []
      try {
        targetLists = newCampaign.target_contact_lists ? 
          (Array.isArray(newCampaign.target_contact_lists) ? 
            newCampaign.target_contact_lists : 
            JSON.parse(newCampaign.target_contact_lists)
          ) : []
      } catch (e) {
        console.warn('Error parsing target_contact_lists:', e)
        targetLists = []
      }

      let listNamesMap: Map<string, string> = new Map();
      if (targetLists.length > 0) {
        const { data: contactLists, error: listsError } = await supabase
          .from('contact_lists')
          .select('id, list_name')
          .in('id', targetLists);

        if (listsError) {
          console.error('Error fetching contact list names for new campaign:', listsError);
        } else {
          contactLists?.forEach(list => {
            listNamesMap.set(list.id, list.list_name);
          });
        }
      }

      let listName = 'No lists';
      if (targetLists.length > 0) {
        const names = targetLists.map((listId: string) => listNamesMap.get(listId)).filter(Boolean);
        if (names.length > 0) {
          listName = names.join(', ');
        } else {
          listName = 'Lists not found';
        }
      }

      // Transform the created campaign to match frontend format
      const transformedCampaign = {
        id: newCampaign.id,
        name: newCampaign.title,
        status: newCampaign.status,
        listName: listName,
        templateName: newCampaign.message_template || 'Custom Message',
        scheduledDate: newCampaign.scheduled_time ? 
          new Date(newCampaign.scheduled_time).toISOString().split('T')[0] : '',
        sentCount: 0,
        openRate: 'N/A',
        createdDate: new Date(newCampaign.created_at).toISOString().split('T')[0],
        campaignType: newCampaign.campaign_type,
        business: 'la-bella-noches',
        selectedLists: campaignData.selectedLists || [],
        templateId: 'custom',
        channel: newCampaign.channel,
        scheduleTime: newCampaign.scheduled_time ? 
          new Date(newCampaign.scheduled_time).toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
          }) : '',
        mediaUrl: newCampaign.media_url,
        messageContent: newCampaign.message,
        webhookUrl: newCampaign.webhook_url
      }

      const successResponse: SuccessResponse = {
        success: true,
        data: transformedCampaign
      }

      return new Response(
        JSON.stringify(successResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PUT /campaign-operations/campaigns/:id - Update campaign
    if (req.method === 'PUT' && pathname.includes('/campaigns/')) {
      const campaignId = pathname.split('/').pop()
      
      let updateData
      
      try {
        const requestText = await req.text()
        if (!requestText || requestText.trim() === '') {
          throw new Error('Request body is empty')
        }
        updateData = JSON.parse(requestText)
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError)
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'Invalid JSON in request body',
          details: parseError.message
        }
        
        return new Response(
          JSON.stringify(errorResponse),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Prepare update object with comprehensive field mapping
      const campaignUpdateData: any = {}

      // Map all possible update fields
      if (updateData.status !== undefined) {
        campaignUpdateData.status = updateData.status
      }

      if (updateData.title !== undefined) {
        campaignUpdateData.title = updateData.title
      }

      if (updateData.message !== undefined) {
        campaignUpdateData.message = updateData.message
      }

      if (updateData.templateName !== undefined || updateData.selectedTemplate !== undefined) {
        campaignUpdateData.message_template = updateData.templateName || updateData.selectedTemplate || 'Custom Message'
      }

      if (updateData.channel !== undefined) {
        campaignUpdateData.channel = updateData.channel
      }

      if (updateData.media_url !== undefined) {
        campaignUpdateData.media_url = updateData.media_url && updateData.media_url.trim() !== '' ? updateData.media_url : null
      }

      if (updateData.target_contact_lists !== undefined) {
        campaignUpdateData.target_contact_lists = updateData.target_contact_lists
      }

      if (updateData.webhook_url !== undefined) {
        campaignUpdateData.webhook_url = updateData.webhook_url && updateData.webhook_url.trim() !== '' ? updateData.webhook_url : null
      }

      // Always ensure webhook_url is synced with business settings when updating
      // First, fetch the campaign's business_id and the business's current webhook_url
      const { data: campaignWithBusiness, error: fetchError } = await supabase
        .from('campaigns')
        .select(`
          business_id,
          businesses!inner(webhook_url)
        `)
        .eq('id', campaignId)
        .single()

      if (fetchError) {
        console.error('Error fetching campaign business info:', fetchError)
      } else if (campaignWithBusiness?.businesses?.webhook_url) {
        // Sync the webhook URL from the business
        campaignUpdateData.webhook_url = campaignWithBusiness.businesses.webhook_url
      }

      // Handle scheduled time from separate date and time fields
      if (updateData.scheduledDate && updateData.scheduleTime) {
        campaignUpdateData.scheduled_time = `${updateData.scheduledDate}T${updateData.scheduleTime}:00`
      } else if (updateData.scheduledDate === '' || updateData.scheduleTime === '') {
        // Clear scheduled time if either field is empty
        campaignUpdateData.scheduled_time = null
      }

      const { data: updatedCampaign, error } = await supabase
        .from('campaigns')
        .update(campaignUpdateData)
        .eq('id', campaignId)
        .select()
        .single()

      if (error) {
        console.error('Error updating campaign:', error)
        const errorResponse: ErrorResponse = {
          success: false,
          error: `Failed to update campaign: ${error.message}`,
          details: error
        }
        
        return new Response(
          JSON.stringify(errorResponse),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Fetch list names for the updated campaign
      let targetLists = []
      try {
        targetLists = updatedCampaign.target_contact_lists ? 
          (Array.isArray(updatedCampaign.target_contact_lists) ? 
            updatedCampaign.target_contact_lists : 
            JSON.parse(updatedCampaign.target_contact_lists)
          ) : []
      } catch (e) {
        console.warn('Error parsing target_contact_lists:', e)
        targetLists = []
      }

      let listNamesMap: Map<string, string> = new Map();
      if (targetLists.length > 0) {
        const { data: contactLists, error: listsError } = await supabase
          .from('contact_lists')
          .select('id, list_name')
          .in('id', targetLists);

        if (listsError) {
          console.error('Error fetching contact list names for updated campaign:', listsError);
        } else {
          contactLists?.forEach(list => {
            listNamesMap.set(list.id, list.list_name);
          });
        }
      }

      let listName = 'No lists';
      if (targetLists.length > 0) {
        const names = targetLists.map((listId: string) => listNamesMap.get(listId)).filter(Boolean);
        if (names.length > 0) {
          listName = names.join(', ');
        } else {
          listName = 'Lists not found';
        }
      }

      const transformedCampaign = {
        id: updatedCampaign.id,
        name: updatedCampaign.title,
        status: updatedCampaign.status,
        listName: listName,
        templateName: updatedCampaign.message_template || 'Custom Message',
        scheduledDate: updatedCampaign.scheduled_time ? 
          new Date(updatedCampaign.scheduled_time).toISOString().split('T')[0] : '',
        sentCount: 0, // Will be calculated from campaign_logs
        openRate: 'N/A', // Will be calculated from campaign_logs
        createdDate: new Date(updatedCampaign.created_at).toISOString().split('T')[0],
        campaignType: updatedCampaign.campaign_type,
        business: 'la-bella-noches',
        selectedLists: targetLists,
        templateId: 'custom',
        channel: updatedCampaign.channel,
        scheduleTime: updatedCampaign.scheduled_time ? 
          new Date(updatedCampaign.scheduled_time).toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
          }) : '',
        mediaUrl: updatedCampaign.media_url,
        messageContent: updatedCampaign.message
      }

      const successResponse: SuccessResponse = {
        success: true,
        data: transformedCampaign
      }

      return new Response(
        JSON.stringify(successResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DELETE /campaign-operations/campaigns/:id - Delete campaign
    if (req.method === 'DELETE' && pathname.includes('/campaigns/')) {
      const campaignId = pathname.split('/').pop()

      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId)

      if (error) {
        console.error('Error deleting campaign:', error)
        const errorResponse: ErrorResponse = {
          success: false,
          error: `Failed to delete campaign: ${error.message}`,
          details: error
        }
        
        return new Response(
          JSON.stringify(errorResponse),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const successResponse: SuccessResponse = {
        success: true,
        data: { message: 'Campaign deleted successfully' }
      }

      return new Response(
        JSON.stringify(successResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If no route matches
    const errorResponse: ErrorResponse = {
      success: false,
      error: `Endpoint not found: ${req.method} ${pathname}`
    }

    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error in campaign operations:', error)
    
    const errorResponse: ErrorResponse = {
      success: false,
      error: error.message || 'An unexpected error occurred',
      details: error.stack
    }
    
    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})