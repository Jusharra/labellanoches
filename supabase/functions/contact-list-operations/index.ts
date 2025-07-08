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

interface ClerkJWTPayload {
  sub: string; // user ID
  iss: string;
  aud: string;
  exp: number;
  iat: number;
}

/**
 * Helper function to create a Supabase client with service role
 */
function getServiceSupabaseClient(supabaseUrl: string, serviceRoleKey: string) {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * Helper function to validate Clerk JWT and get user info
 */
async function validateClerkAuth(req: Request, supabaseUrl: string, serviceRoleKey: string) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      error: {
        success: false,
        error: 'Authentication required. Please sign in.',
        status: 401
      }
    }
  }

  const token = authHeader.replace('Bearer ', '')
  
  try {
    // Extract the user ID from the token without verification for now
    const payload = JSON.parse(atob(token.split('.')[1])) as ClerkJWTPayload
    
    // Check if token has expired
    const currentTime = Math.floor(Date.now() / 1000)
    if (payload.exp && currentTime > payload.exp) {
      return {
        error: {
          success: false,
          error: 'Authentication token has expired. Please sign in again.',
          status: 401
        }
      }
    }
    
    const userId = payload.sub

    if (!userId) {
      return {
        error: {
          success: false,
          error: 'Invalid token: missing user ID',
          status: 401
        }
      }
    }

    // Create service role client for database operations
    const serviceSupabase = getServiceSupabaseClient(supabaseUrl, serviceRoleKey)
    
    // Check user permissions using service role client
    const { data: userProfile, error: profileError } = await serviceSupabase
      .from('user_profiles')
      .select('role, business_id')
      .eq('id', userId)
      .single()

    if (profileError || !userProfile) {
      console.error('Error fetching user profile:', profileError)
      return {
        error: {
          success: false,
          error: 'Unable to verify user permissions.',
          status: 403
        }
      }
    }

    return {
      userId,
      userProfile,
      serviceSupabase,
      authHeader
    }
  } catch (error) {
    console.error('Error validating Clerk token:', error)
    return {
      error: {
        success: false,
        error: 'Invalid authentication token. Please sign in again.',
        status: 401
      }
    }
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const url = new URL(req.url)
    const pathname = url.pathname
    const searchParams = url.searchParams

    console.log(`${req.method} ${pathname}`)

    // GET /contact-list-operations/members/:listId - Get members of a specific list
    if (req.method === 'GET' && pathname.includes('/members/')) {
      const authResult = await validateClerkAuth(req, supabaseUrl, supabaseServiceKey)
      
      if (authResult.error) {
        return new Response(
          JSON.stringify(authResult.error),
          { 
            status: authResult.error.status, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const { serviceSupabase } = authResult
      const listId = pathname.split('/').pop()

      const { data: members, error } = await serviceSupabase
        .from('contact_list_members')
        .select(`
          contact_id,
          contacts!inner(
            id,
            name,
            phone_number,
            email,
            opted_in,
            tags,
            language,
            created_at
          )
        `)
        .eq('contact_list_id', listId)

      if (error) {
        console.error('Error fetching list members:', error)
        const errorResponse: ErrorResponse = {
          success: false,
          error: `Failed to fetch list members: ${error.message}`,
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

      const transformedMembers = members?.map(member => ({
        id: member.contacts.id,
        name: member.contacts.name,
        phone: member.contacts.phone_number,
        email: member.contacts.email,
        opted_in: member.contacts.opted_in,
        tags: member.contacts.tags,
        language: member.contacts.language,
        date: new Date(member.contacts.created_at).toISOString().split('T')[0]
      })) || []

      const successResponse: SuccessResponse = {
        success: true,
        data: transformedMembers
      }

      return new Response(
        JSON.stringify(successResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /contact-list-operations/add-members - Add contacts to lists
    if (req.method === 'POST' && pathname.endsWith('/add-members')) {
      const authResult = await validateClerkAuth(req, supabaseUrl, supabaseServiceKey)
      
      if (authResult.error) {
        return new Response(
          JSON.stringify(authResult.error),
          { 
            status: authResult.error.status, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const { serviceSupabase } = authResult

      let requestData
      
      try {
        const requestText = await req.text()
        requestData = JSON.parse(requestText)
      } catch (parseError) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'Invalid JSON in request body'
        }
        
        return new Response(
          JSON.stringify(errorResponse),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const { contactIds, listIds } = requestData

      if (!Array.isArray(contactIds) || !Array.isArray(listIds) || contactIds.length === 0 || listIds.length === 0) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'contactIds and listIds must be non-empty arrays'
        }
        
        return new Response(
          JSON.stringify(errorResponse),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Create all combinations of contacts and lists
      const memberships = []
      for (const contactId of contactIds) {
        for (const listId of listIds) {
          memberships.push({
            contact_id: contactId,
            contact_list_id: listId
          })
        }
      }

      const { data: insertedMemberships, error } = await serviceSupabase
        .from('contact_list_members')
        .upsert(memberships, { 
          onConflict: 'contact_list_id,contact_id',
          ignoreDuplicates: true 
        })
        .select()

      if (error) {
        console.error('Error adding contacts to lists:', error)
        const errorResponse: ErrorResponse = {
          success: false,
          error: `Failed to add contacts to lists: ${error.message}`,
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
        data: { 
          message: `Successfully added ${contactIds.length} contact(s) to ${listIds.length} list(s)`,
          memberships: insertedMemberships?.length || 0
        }
      }

      return new Response(
        JSON.stringify(successResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DELETE /contact-list-operations/remove-members - Remove contacts from lists
    if (req.method === 'DELETE' && pathname.endsWith('/remove-members')) {
      const authResult = await validateClerkAuth(req, supabaseUrl, supabaseServiceKey)
      
      if (authResult.error) {
        return new Response(
          JSON.stringify(authResult.error),
          { 
            status: authResult.error.status, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const { serviceSupabase } = authResult

      let requestData
      
      try {
        const requestText = await req.text()
        requestData = JSON.parse(requestText)
      } catch (parseError) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'Invalid JSON in request body'
        }
        
        return new Response(
          JSON.stringify(errorResponse),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const { contactIds, listId } = requestData

      if (!Array.isArray(contactIds) || !listId || contactIds.length === 0) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'contactIds must be a non-empty array and listId is required'
        }
        
        return new Response(
          JSON.stringify(errorResponse),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const { error } = await serviceSupabase
        .from('contact_list_members')
        .delete()
        .eq('contact_list_id', listId)
        .in('contact_id', contactIds)

      if (error) {
        console.error('Error removing contacts from list:', error)
        const errorResponse: ErrorResponse = {
          success: false,
          error: `Failed to remove contacts from list: ${error.message}`,
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
        data: { 
          message: `Successfully removed ${contactIds.length} contact(s) from list`
        }
      }

      return new Response(
        JSON.stringify(successResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PUT /contact-list-operations/update-membership/:listId - Update membership for entire list
    if (req.method === 'PUT' && pathname.includes('/update-membership/')) {
      const authResult = await validateClerkAuth(req, supabaseUrl, supabaseServiceKey)
      
      if (authResult.error) {
        return new Response(
          JSON.stringify(authResult.error),
          { 
            status: authResult.error.status, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const { serviceSupabase } = authResult
      const listId = pathname.split('/').pop()
      
      let requestData
      
      try {
        const requestText = await req.text()
        requestData = JSON.parse(requestText)
      } catch (parseError) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'Invalid JSON in request body'
        }
        
        return new Response(
          JSON.stringify(errorResponse),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const { membershipData } = requestData

      if (!membershipData || typeof membershipData !== 'object') {
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'membershipData must be an object with contactId: boolean pairs'
        }
        
        return new Response(
          JSON.stringify(errorResponse),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Get current membership for this list
      const { data: currentMembers, error: fetchError } = await serviceSupabase
        .from('contact_list_members')
        .select('contact_id')
        .eq('contact_list_id', listId)

      if (fetchError) {
        console.error('Error fetching current members:', fetchError)
        const errorResponse: ErrorResponse = {
          success: false,
          error: `Failed to fetch current members: ${fetchError.message}`,
          details: fetchError
        }
        
        return new Response(
          JSON.stringify(errorResponse),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const currentMemberIds = new Set(currentMembers?.map(m => m.contact_id) || [])
      
      // Determine which contacts to add and remove
      const contactsToAdd = []
      const contactsToRemove = []

      for (const [contactId, shouldBeInList] of Object.entries(membershipData)) {
        const isCurrentlyInList = currentMemberIds.has(contactId)
        
        if (shouldBeInList && !isCurrentlyInList) {
          contactsToAdd.push(contactId)
        } else if (!shouldBeInList && isCurrentlyInList) {
          contactsToRemove.push(contactId)
        }
      }

      let addedCount = 0
      let removedCount = 0

      // Add new members
      if (contactsToAdd.length > 0) {
        const membershipsToAdd = contactsToAdd.map(contactId => ({
          contact_id: contactId,
          contact_list_id: listId
        }))

        const { error: addError } = await serviceSupabase
          .from('contact_list_members')
          .insert(membershipsToAdd)

        if (addError) {
          console.error('Error adding members:', addError)
          const errorResponse: ErrorResponse = {
            success: false,
            error: `Failed to add members: ${addError.message}`,
            details: addError
          }
          
          return new Response(
            JSON.stringify(errorResponse),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        addedCount = contactsToAdd.length
      }

      // Remove members
      if (contactsToRemove.length > 0) {
        const { error: removeError } = await serviceSupabase
          .from('contact_list_members')
          .delete()
          .eq('contact_list_id', listId)
          .in('contact_id', contactsToRemove)

        if (removeError) {
          console.error('Error removing members:', removeError)
          const errorResponse: ErrorResponse = {
            success: false,
            error: `Failed to remove members: ${removeError.message}`,
            details: removeError
          }
          
          return new Response(
            JSON.stringify(errorResponse),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        removedCount = contactsToRemove.length
      }

      const successResponse: SuccessResponse = {
        success: true,
        data: { 
          message: `Successfully updated list membership`,
          added: addedCount,
          removed: removedCount,
          totalChanges: addedCount + removedCount
        }
      }

      return new Response(
        JSON.stringify(successResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET /contact-list-operations/lists - Get all contact lists with member counts
    if (req.method === 'GET' && pathname.endsWith('/lists')) {
      const authResult = await validateClerkAuth(req, supabaseUrl, supabaseServiceKey)
      
      if (authResult.error) {
        return new Response(
          JSON.stringify(authResult.error),
          { 
            status: authResult.error.status, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const { serviceSupabase, userProfile } = authResult
      const businessId = searchParams.get('business_id')

      let query = serviceSupabase
        .from('contact_lists')
        .select(`
          id,
          list_name,
          description,
          created_at,
          business_id,
          contact_list_members(count)
        `)

      // If user is not admin, filter by their business
      if (userProfile.role !== 'admin' && userProfile.business_id) {
        query = query.eq('business_id', userProfile.business_id)
      } else if (businessId) {
        query = query.eq('business_id', businessId)
      }

      const { data: lists, error } = await query.order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching contact lists:', error)
        const errorResponse: ErrorResponse = {
          success: false,
          error: `Failed to fetch contact lists: ${error.message}`,
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

      const transformedLists = lists?.map(list => ({
        id: list.id,
        name: list.list_name,
        description: list.description,
        contactCount: list.contact_list_members?.[0]?.count || 0,
        createdDate: new Date(list.created_at).toISOString().split('T')[0]
      })) || []

      const successResponse: SuccessResponse = {
        success: true,
        data: transformedLists
      }

      return new Response(
        JSON.stringify(successResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /contact-list-operations/lists - Create new contact list
    if (req.method === 'POST' && pathname.endsWith('/lists')) {
      const authResult = await validateClerkAuth(req, supabaseUrl, supabaseServiceKey)
      
      if (authResult.error) {
        return new Response(
          JSON.stringify(authResult.error),
          { 
            status: authResult.error.status, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const { serviceSupabase } = authResult

      let requestData
      
      try {
        const requestText = await req.text()
        requestData = JSON.parse(requestText)
      } catch (parseError) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'Invalid JSON in request body'
        }
        
        return new Response(
          JSON.stringify(errorResponse),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Get the default business ID
      const { data: business, error: businessError } = await serviceSupabase
        .from('businesses')
        .select('id')
        .eq('name', 'La Bella Noches')
        .single()

      if (businessError || !business) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'Could not find business to associate list with'
        }
        
        return new Response(
          JSON.stringify(errorResponse),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const listData = {
        business_id: business.id,
        list_name: requestData.name,
        description: requestData.description || null
      }

      const { data: newList, error } = await serviceSupabase
        .from('contact_lists')
        .insert(listData)
        .select()
        .single()

      if (error) {
        console.error('Error creating contact list:', error)
        const errorResponse: ErrorResponse = {
          success: false,
          error: `Failed to create contact list: ${error.message}`,
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
        data: {
          id: newList.id,
          name: newList.list_name,
          description: newList.description,
          contactCount: 0,
          createdDate: new Date(newList.created_at).toISOString().split('T')[0]
        }
      }

      return new Response(
        JSON.stringify(successResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PUT /contact-list-operations/lists/:id - Update contact list
    if (req.method === 'PUT' && pathname.includes('/lists/') && !pathname.includes('/update-membership/')) {
      const authResult = await validateClerkAuth(req, supabaseUrl, supabaseServiceKey)
      
      if (authResult.error) {
        return new Response(
          JSON.stringify(authResult.error),
          { 
            status: authResult.error.status, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const { serviceSupabase } = authResult
      const listId = pathname.split('/').pop()
      
      let requestData
      
      try {
        const requestText = await req.text()
        requestData = JSON.parse(requestText)
      } catch (parseError) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'Invalid JSON in request body'
        }
        
        return new Response(
          JSON.stringify(errorResponse),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const updateData = {
        list_name: requestData.name,
        description: requestData.description || null
      }

      const { data: updatedList, error } = await serviceSupabase
        .from('contact_lists')
        .update(updateData)
        .eq('id', listId)
        .select()
        .single()

      if (error) {
        console.error('Error updating contact list:', error)
        const errorResponse: ErrorResponse = {
          success: false,
          error: `Failed to update contact list: ${error.message}`,
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
        data: {
          id: updatedList.id,
          name: updatedList.list_name,
          description: updatedList.description,
          contactCount: 0,
          createdDate: new Date(updatedList.created_at).toISOString().split('T')[0]
        }
      }

      return new Response(
        JSON.stringify(successResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DELETE /contact-list-operations/lists/:id - Delete contact list
    if (req.method === 'DELETE' && pathname.includes('/lists/')) {
      const authResult = await validateClerkAuth(req, supabaseUrl, supabaseServiceKey)
      
      if (authResult.error) {
        return new Response(
          JSON.stringify(authResult.error),
          { 
            status: authResult.error.status, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const { serviceSupabase } = authResult
      const listId = pathname.split('/').pop()

      // First, remove all members from the list
      const { error: membersError } = await serviceSupabase
        .from('contact_list_members')
        .delete()
        .eq('contact_list_id', listId)

      if (membersError) {
        console.error('Error removing list members:', membersError)
        const errorResponse: ErrorResponse = {
          success: false,
          error: `Failed to remove list members: ${membersError.message}`,
          details: membersError
        }
        
        return new Response(
          JSON.stringify(errorResponse),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Then delete the list itself
      const { error: listError } = await serviceSupabase
        .from('contact_lists')
        .delete()
        .eq('id', listId)

      if (listError) {
        console.error('Error deleting contact list:', listError)
        const errorResponse: ErrorResponse = {
          success: false,
          error: `Failed to delete contact list: ${listError.message}`,
          details: listError
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
        data: { message: 'Contact list deleted successfully' }
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
    console.error('Unexpected error in contact list operations:', error)
    
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