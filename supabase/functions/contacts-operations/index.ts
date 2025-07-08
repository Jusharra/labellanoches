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

    // GET /contacts-operations/contacts - Get all contacts
    if (req.method === 'GET' && pathname.endsWith('/contacts')) {
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
      const search = searchParams.get('search')

      // Build contacts query
      let contactsQuery = serviceSupabase
        .from('contacts')
        .select('*')

      // If user is not admin, filter by their business
      if (userProfile.role !== 'admin' && userProfile.business_id) {
        contactsQuery = contactsQuery.eq('business_id', userProfile.business_id)
      } else if (businessId) {
        contactsQuery = contactsQuery.eq('business_id', businessId)
      }

      if (search) {
        contactsQuery = contactsQuery.or(`name.ilike.%${search}%,phone_number.ilike.%${search}%,email.ilike.%${search}%`)
      }

      const { data: contacts, error: contactsError } = await contactsQuery.order('created_at', { ascending: false })

      if (contactsError) {
        console.error('Error fetching contacts:', contactsError)
        const errorResponse: ErrorResponse = {
          success: false,
          error: `Failed to fetch contacts: ${contactsError.message}`,
          details: contactsError
        }
        
        return new Response(
          JSON.stringify(errorResponse),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      if (!contacts || contacts.length === 0) {
        const successResponse: SuccessResponse = {
          success: true,
          data: []
        }

        return new Response(
          JSON.stringify(successResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get list memberships for these contacts
      const contactIds = contacts.map(c => c.id)
      const { data: memberships, error: membershipsError } = await serviceSupabase
        .from('contact_list_members')
        .select(`
          contact_id,
          contact_lists!inner(
            id,
            list_name
          )
        `)
        .in('contact_id', contactIds)

      if (membershipsError) {
        console.error('Error fetching list memberships:', membershipsError)
        // Continue without list data rather than failing completely
      }

      // Group memberships by contact ID
      const membershipsByContact: { [contactId: string]: string[] } = {}
      if (memberships) {
        memberships.forEach(membership => {
          if (!membershipsByContact[membership.contact_id]) {
            membershipsByContact[membership.contact_id] = []
          }
          membershipsByContact[membership.contact_id].push(membership.contact_lists.list_name)
        })
      }

      // Transform contacts to include list names
      const transformedContacts = contacts.map(contact => {
        const lists = membershipsByContact[contact.id] || []

        return {
          id: contact.id,
          name: contact.name,
          phone: contact.phone_number,
          email: contact.email,
          source: 'Database',
          date: new Date(contact.created_at).toISOString().split('T')[0],
          lists: lists,
          opted_in: contact.opted_in,
          tags: contact.tags,
          language: contact.language,
          last_contact: contact.last_contact
        }
      })

      const successResponse: SuccessResponse = {
        success: true,
        data: transformedContacts
      }

      return new Response(
        JSON.stringify(successResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET /contacts-operations/lists - Get all contact lists
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

      let listsQuery = serviceSupabase
        .from('contact_lists')
        .select('*')

      // If user is not admin, filter by their business
      if (userProfile.role !== 'admin' && userProfile.business_id) {
        listsQuery = listsQuery.eq('business_id', userProfile.business_id)
      } else if (businessId) {
        listsQuery = listsQuery.eq('business_id', businessId)
      }

      const { data: lists, error: listsError } = await listsQuery.order('created_at', { ascending: false })

      if (listsError) {
        console.error('Error fetching contact lists:', listsError)
        const errorResponse: ErrorResponse = {
          success: false,
          error: `Failed to fetch contact lists: ${listsError.message}`,
          details: listsError
        }
        
        return new Response(
          JSON.stringify(errorResponse),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      if (!lists || lists.length === 0) {
        const successResponse: SuccessResponse = {
          success: true,
          data: []
        }

        return new Response(
          JSON.stringify(successResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get member counts for each list
      const listIds = lists.map(l => l.id)
      const { data: memberCounts, error: countsError } = await serviceSupabase
        .from('contact_list_members')
        .select('contact_list_id')
        .in('contact_list_id', listIds)

      if (countsError) {
        console.error('Error fetching member counts:', countsError)
        // Continue without counts rather than failing
      }

      // Count members per list
      const countsByList: { [listId: string]: number } = {}
      if (memberCounts) {
        memberCounts.forEach(member => {
          countsByList[member.contact_list_id] = (countsByList[member.contact_list_id] || 0) + 1
        })
      }

      const transformedLists = lists.map(list => ({
        id: list.id,
        name: list.list_name,
        description: list.description,
        contactCount: countsByList[list.id] || 0,
        createdDate: new Date(list.created_at).toISOString().split('T')[0]
      }))

      const successResponse: SuccessResponse = {
        success: true,
        data: transformedLists
      }

      return new Response(
        JSON.stringify(successResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET /contacts-operations/contacts/by-list/:listId - Get contacts by list ID
    if (req.method === 'GET' && pathname.includes('/contacts/by-list/')) {
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
      const search = searchParams.get('search')

      // Get contacts that are members of the specified list
      const { data: members, error: membersError } = await serviceSupabase
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
            last_contact,
            created_at
          )
        `)
        .eq('contact_list_id', listId)

      if (membersError) {
        console.error('Error fetching list members:', membersError)
        const errorResponse: ErrorResponse = {
          success: false,
          error: `Failed to fetch list members: ${membersError.message}`,
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

      let transformedContacts = members?.map(member => ({
        id: member.contacts.id,
        name: member.contacts.name,
        phone: member.contacts.phone_number,
        email: member.contacts.email,
        source: 'Database',
        date: new Date(member.contacts.created_at).toISOString().split('T')[0],
        lists: [],
        opted_in: member.contacts.opted_in,
        tags: member.contacts.tags,
        language: member.contacts.language,
        last_contact: member.contacts.last_contact
      })) || []

      // Apply search filter if provided
      if (search) {
        const searchLower = search.toLowerCase()
        transformedContacts = transformedContacts.filter(contact =>
          contact.name.toLowerCase().includes(searchLower) ||
          contact.phone.includes(search) ||
          (contact.email && contact.email.toLowerCase().includes(searchLower))
        )
      }

      const successResponse: SuccessResponse = {
        success: true,
        data: transformedContacts
      }

      return new Response(
        JSON.stringify(successResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /contacts-operations/contacts - Create new contact
    if (req.method === 'POST' && pathname.endsWith('/contacts')) {
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

      let contactData
      
      try {
        const requestText = await req.text()
        if (!requestText || requestText.trim() === '') {
          throw new Error('Request body is empty')
        }
        contactData = JSON.parse(requestText)
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

      // Get the default business ID
      const { data: business, error: businessError } = await serviceSupabase
        .from('businesses')
        .select('id')
        .eq('name', 'La Bella Noches')
        .single()

      if (businessError || !business) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'Could not find business to associate contact with'
        }
        
        return new Response(
          JSON.stringify(errorResponse),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const newContactData = {
        business_id: business.id,
        name: contactData.name,
        phone_number: contactData.phoneNumber,
        email: contactData.email,
        opted_in: contactData.smsOptIn || false,
        language: contactData.preferredLanguage || 'English',
        tags: contactData.tags || []
      }

      const { data: newContact, error } = await serviceSupabase
        .from('contacts')
        .insert(newContactData)
        .select()
        .single()

      if (error) {
        console.error('Error creating contact:', error)
        const errorResponse: ErrorResponse = {
          success: false,
          error: `Failed to create contact: ${error.message}`,
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
          id: newContact.id,
          name: newContact.name,
          phone: newContact.phone_number,
          email: newContact.email,
          source: 'Manual',
          date: new Date(newContact.created_at).toISOString().split('T')[0],
          lists: [],
          opted_in: newContact.opted_in,
          tags: newContact.tags,
          language: newContact.language
        }
      }

      return new Response(
        JSON.stringify(successResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PUT /contacts-operations/contacts/:id - Update contact
    if (req.method === 'PUT' && pathname.includes('/contacts/')) {
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
      const contactId = pathname.split('/').pop()
      
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

      const contactUpdateData = {
        name: updateData.name,
        phone_number: updateData.phoneNumber,
        email: updateData.email,
        opted_in: updateData.smsOptIn,
        language: updateData.preferredLanguage,
        tags: updateData.tags || []
      }

      const { data: updatedContact, error } = await serviceSupabase
        .from('contacts')
        .update(contactUpdateData)
        .eq('id', contactId)
        .select()
        .single()

      if (error) {
        console.error('Error updating contact:', error)
        const errorResponse: ErrorResponse = {
          success: false,
          error: `Failed to update contact: ${error.message}`,
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
          id: updatedContact.id,
          name: updatedContact.name,
          phone: updatedContact.phone_number,
          email: updatedContact.email,
          source: 'Database',
          date: new Date(updatedContact.created_at).toISOString().split('T')[0],
          lists: [],
          opted_in: updatedContact.opted_in,
          tags: updatedContact.tags,
          language: updatedContact.language
        }
      }

      return new Response(
        JSON.stringify(successResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DELETE /contacts-operations/contacts/:id - Delete contact
    if (req.method === 'DELETE' && pathname.includes('/contacts/')) {
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
      const contactId = pathname.split('/').pop()

      const { error } = await serviceSupabase
        .from('contacts')
        .delete()
        .eq('id', contactId)

      if (error) {
        console.error('Error deleting contact:', error)
        const errorResponse: ErrorResponse = {
          success: false,
          error: `Failed to delete contact: ${error.message}`,
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
        data: { message: 'Contact deleted successfully' }
      }

      return new Response(
        JSON.stringify(successResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /contacts-operations/contacts/bulk-delete - Bulk delete contacts
    if (req.method === 'POST' && pathname.endsWith('/bulk-delete')) {
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

      const { contactIds } = requestData

      if (!Array.isArray(contactIds) || contactIds.length === 0) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'contactIds must be a non-empty array'
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
        .from('contacts')
        .delete()
        .in('id', contactIds)

      if (error) {
        console.error('Error bulk deleting contacts:', error)
        const errorResponse: ErrorResponse = {
          success: false,
          error: `Failed to delete contacts: ${error.message}`,
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
        data: { message: `Successfully deleted ${contactIds.length} contacts` }
      }

      return new Response(
        JSON.stringify(successResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /contacts-operations/contacts/bulk-insert - Bulk insert contacts (for CSV upload)
    if (req.method === 'POST' && pathname.endsWith('/bulk-insert')) {
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

      const { contacts: contactsToInsert } = requestData

      if (!Array.isArray(contactsToInsert) || contactsToInsert.length === 0) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'contacts must be a non-empty array'
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
          error: 'Could not find business to associate contacts with'
        }
        
        return new Response(
          JSON.stringify(errorResponse),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Transform contacts for database insertion
      const contactsData = contactsToInsert.map(contact => ({
        business_id: business.id,
        name: contact.name,
        phone_number: contact.phone,
        email: contact.email || null,
        opted_in: false,
        language: 'English',
        tags: ['Imported']
      }))

      const { data: insertedContacts, error } = await serviceSupabase
        .from('contacts')
        .insert(contactsData)
        .select()

      if (error) {
        console.error('Error bulk inserting contacts:', error)
        const errorResponse: ErrorResponse = {
          success: false,
          error: `Failed to insert contacts: ${error.message}`,
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
          message: `Successfully inserted ${insertedContacts?.length || 0} contacts`,
          count: insertedContacts?.length || 0
        }
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
    console.error('Unexpected error in contacts operations:', error)
    
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