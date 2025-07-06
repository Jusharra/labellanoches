import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
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

    console.log(`${req.method} ${pathname}`)

    // GET /business-operations/settings - Get business settings
    if (req.method === 'GET' && pathname.endsWith('/settings')) {
      let { data: business, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('name', 'La Bella Noches')
        .maybeSingle()

      if (error) {
        console.error('Error fetching business settings:', error)
        const errorResponse: ErrorResponse = {
          success: false,
          error: `Failed to fetch business settings: ${error.message}`,
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

      // If no business record exists, create a default one
      if (!business) {
        console.log('No business record found, creating default La Bella Noches business')
        
        const { data: newBusiness, error: createError } = await supabase
          .from('businesses')
          .insert({
            name: 'La Bella Noches',
            industry: 'Restaurant',
            active: true,
            timezone: 'UTC',
            settings: {},
            twilio_config: {}
          })
          .select()
          .single()

        if (createError) {
          console.error('Error creating default business:', createError)
          const errorResponse: ErrorResponse = {
            success: false,
            error: `Failed to create default business: ${createError.message}`,
            details: createError
          }
          
          return new Response(
            JSON.stringify(errorResponse),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        business = newBusiness
      }

      const successResponse: SuccessResponse = {
        success: true,
        data: business
      }

      return new Response(
        JSON.stringify(successResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PUT /business-operations/settings - Update business settings
    if (req.method === 'PUT' && pathname.endsWith('/settings')) {
      let requestData
      
      try {
        const requestText = await req.text()
        if (!requestText || requestText.trim() === '') {
          throw new Error('Request body is empty')
        }
        requestData = JSON.parse(requestText)
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

      // Map settings to database fields
      const updateData: any = {}
      if (requestData.businessName !== undefined) {
        updateData.name = requestData.businessName
      }
      if (requestData.address !== undefined) {
        updateData.address = requestData.address
      }
      if (requestData.phone !== undefined) {
        updateData.phone_number = requestData.phone
      }
      if (requestData.email !== undefined) {
        updateData.admin_email = requestData.email
      }
      if (requestData.website !== undefined) {
        updateData.website = requestData.website
      }
      if (requestData.webhookUrl !== undefined) {
        updateData.webhook_url = requestData.webhookUrl && requestData.webhookUrl.trim() !== '' 
          ? requestData.webhookUrl 
          : null
      }
      if (requestData.twilioNumber !== undefined) {
        updateData.twilio_number = requestData.twilioNumber && requestData.twilioNumber.trim() !== '' 
          ? requestData.twilioNumber 
          : null
      }

      // Try to update existing business
      let { data: updatedBusiness, error } = await supabase
        .from('businesses')
        .update(updateData)
        .eq('name', 'La Bella Noches')
        .select()
        .maybeSingle()

      if (error) {
        console.error('Error updating business settings:', error)
        const errorResponse: ErrorResponse = {
          success: false,
          error: `Failed to update business settings: ${error.message}`,
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

      // If no business was updated (doesn't exist), create a new one
      if (!updatedBusiness) {
        console.log('No business record found to update, creating new La Bella Noches business')
        
        const insertData = {
          name: 'La Bella Noches',
          industry: 'Restaurant',
          active: true,
          timezone: 'UTC',
          settings: {},
          twilio_config: {},
          ...updateData
        }

        const { data: newBusiness, error: createError } = await supabase
          .from('businesses')
          .insert(insertData)
          .select()
          .single()

        if (createError) {
          console.error('Error creating business:', createError)
          const errorResponse: ErrorResponse = {
            success: false,
            error: `Failed to create business: ${createError.message}`,
            details: createError
          }
          
          return new Response(
            JSON.stringify(errorResponse),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        updatedBusiness = newBusiness
      }

      const successResponse: SuccessResponse = {
        success: true,
        data: updatedBusiness
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
    console.error('Unexpected error in business operations:', error)
    
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