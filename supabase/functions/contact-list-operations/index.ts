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

    // Handle function invocation with body parameters
    let requestBody: any = null
    if (req.method === 'POST') {
      try {
        requestBody = await req.json()
        console.log('📦 Request body:', requestBody)
      } catch (e) {
        console.log('No request body or invalid JSON')
      }
    }

    // Handle actions from function invoke
    if (requestBody?.action) {
      console.log('🎯 Handling action:', requestBody.action)
      
      switch (requestBody.action) {
        case 'get_lists':
          return await handleGetLists(supabase, searchParams)
        case 'create_list':
          return await handleCreateList(supabase, requestBody)
        case 'update_list':
          return await handleUpdateList(supabase, requestBody)
        case 'delete_list':
          return await handleDeleteList(supabase, requestBody)
        case 'get_members':
          return await handleGetMembers(supabase, requestBody)
        case 'add_members':
          return await handleAddMembers(supabase, requestBody)
        case 'remove_members':
          return await handleRemoveMembers(supabase, requestBody)
        case 'update_membership':
          return await handleUpdateMembership(supabase, requestBody)
        default:
          console.log('❌ Unknown action:', requestBody.action)
          const errorResponse: ErrorResponse = {
            success: false,
            error: `Unknown action: ${requestBody.action}`
          }
          return new Response(
            JSON.stringify(errorResponse),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
      }
    }

    // Handle direct HTTP requests (for backwards compatibility)
    
    // GET /contact-list-operations/lists - Get all contact lists
    if (req.method === 'GET' && pathname.endsWith('/lists')) {
      return await handleGetLists(supabase, searchParams)
    }

    // POST /contact-list-operations/lists - Create new contact list
    if (req.method === 'POST' && pathname.endsWith('/lists')) {
      return await handleCreateList(supabase, requestBody)
    }

    // PUT /contact-list-operations/lists/:id - Update contact list
    if (req.method === 'PUT' && pathname.includes('/lists/') && !pathname.includes('/update-membership/')) {
      const listId = pathname.split('/').pop()
      return await handleUpdateList(supabase, { ...requestBody, list_id: listId })
    }

    // DELETE /contact-list-operations/lists/:id - Delete contact list
    if (req.method === 'DELETE' && pathname.includes('/lists/')) {
      const listId = pathname.split('/').pop()
      return await handleDeleteList(supabase, { list_id: listId })
    }

    // GET /contact-list-operations/members/:listId - Get members of a specific list
    if (req.method === 'GET' && pathname.includes('/members/')) {
      const listId = pathname.split('/').pop()
      return await handleGetMembers(supabase, { list_id: listId })
    }

    // POST /contact-list-operations/add-members - Add contacts to lists
    if (req.method === 'POST' && pathname.endsWith('/add-members')) {
      return await handleAddMembers(supabase, requestBody)
    }

    // DELETE /contact-list-operations/remove-members - Remove contacts from lists
    if (req.method === 'DELETE' && pathname.endsWith('/remove-members')) {
      return await handleRemoveMembers(supabase, requestBody)
    }

    // PUT /contact-list-operations/update-membership/:listId - Update membership for entire list
    if (req.method === 'PUT' && pathname.includes('/update-membership/')) {
      const listId = pathname.split('/').pop()
      return await handleUpdateMembership(supabase, { ...requestBody, list_id: listId })
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

// Handler functions
async function handleGetLists(supabase: any, searchParams: URLSearchParams) {
  console.log('🔍 Fetching contact lists...')
  
  const businessId = searchParams.get('business_id')

  // Step 1: Fetch contact lists without member counts
  let query = supabase
    .from('contact_lists')
    .select(`
      id,
      list_name,
      description,
      created_at,
      business_id
    `)

  if (businessId) {
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

  if (!lists || lists.length === 0) {
    console.log('✅ No contact lists found')
    const successResponse: SuccessResponse = {
      success: true,
      data: []
    }

    return new Response(
      JSON.stringify(successResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Step 2: Get member counts for all lists
  const listIds = lists.map(list => list.id)
  const { data: memberCounts, error: countsError } = await supabase
    .from('contact_list_members')
    .select('contact_list_id')
    .in('contact_list_id', listIds)

  if (countsError) {
    console.error('Error fetching member counts:', countsError)
    // Continue without counts rather than failing completely
  }

  // Step 3: Create a map of list ID to member count
  const countsByListId: { [listId: string]: number } = {}
  if (memberCounts) {
    memberCounts.forEach(member => {
      countsByListId[member.contact_list_id] = (countsByListId[member.contact_list_id] || 0) + 1
    })
  }

  // Step 4: Transform lists with member counts
  const transformedLists = lists.map(list => ({
    id: list.id,
    name: list.list_name,
    description: list.description,
    contactCount: countsByListId[list.id] || 0,
    createdDate: new Date(list.created_at).toISOString().split('T')[0]
  }))

  console.log('✅ Successfully fetched contact lists:', transformedLists.length)

  const successResponse: SuccessResponse = {
    success: true,
    data: transformedLists
  }

  return new Response(
    JSON.stringify(successResponse),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleCreateList(supabase: any, requestData: any) {
  console.log('📝 Creating contact list...')
  
  if (!requestData) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Request data is required'
    }
    
    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  // Get the default business ID (La Bella Noches)
  const { data: business, error: businessError } = await supabase
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

  const { data: newList, error } = await supabase
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

  console.log('✅ Successfully created contact list:', newList.id)

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

async function handleUpdateList(supabase: any, requestData: any) {
  console.log('✏️ Updating contact list...')
  
  if (!requestData || !requestData.list_id) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'List ID is required'
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

  const { data: updatedList, error } = await supabase
    .from('contact_lists')
    .update(updateData)
    .eq('id', requestData.list_id)
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

  console.log('✅ Successfully updated contact list:', updatedList.id)

  const successResponse: SuccessResponse = {
    success: true,
    data: {
      id: updatedList.id,
      name: updatedList.list_name,
      description: updatedList.description,
      contactCount: 0, // Would need a separate query to get current count
      createdDate: new Date(updatedList.created_at).toISOString().split('T')[0]
    }
  }

  return new Response(
    JSON.stringify(successResponse),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleDeleteList(supabase: any, requestData: any) {
  console.log('🗑️ Deleting contact list...')
  
  if (!requestData || !requestData.list_id) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'List ID is required'
    }
    
    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  // First, remove all members from the list
  const { error: membersError } = await supabase
    .from('contact_list_members')
    .delete()
    .eq('contact_list_id', requestData.list_id)

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
  const { error: listError } = await supabase
    .from('contact_lists')
    .delete()
    .eq('id', requestData.list_id)

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

  console.log('✅ Successfully deleted contact list:', requestData.list_id)

  const successResponse: SuccessResponse = {
    success: true,
    data: { message: 'Contact list deleted successfully' }
  }

  return new Response(
    JSON.stringify(successResponse),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleGetMembers(supabase: any, requestData: any) {
  console.log('👥 Fetching list members...')
  
  if (!requestData || !requestData.list_id) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'List ID is required'
    }
    
    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  const { data: members, error } = await supabase
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
    .eq('contact_list_id', requestData.list_id)

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

  console.log('✅ Successfully fetched list members:', transformedMembers.length)

  const successResponse: SuccessResponse = {
    success: true,
    data: transformedMembers
  }

  return new Response(
    JSON.stringify(successResponse),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleAddMembers(supabase: any, requestData: any) {
  console.log('➕ Adding members to lists...')
  
  if (!requestData || !requestData.contactIds || !requestData.listIds) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'contactIds and listIds are required'
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

  // Use upsert to avoid conflicts with existing memberships
  const { data: insertedMemberships, error } = await supabase
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

  console.log('✅ Successfully added members to lists:', insertedMemberships?.length || 0)

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

async function handleRemoveMembers(supabase: any, requestData: any) {
  console.log('➖ Removing members from lists...')
  
  if (!requestData || !requestData.contactIds || !requestData.listId) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'contactIds and listId are required'
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

  const { error } = await supabase
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

  console.log('✅ Successfully removed members from list:', contactIds.length)

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

async function handleUpdateMembership(supabase: any, requestData: any) {
  console.log('🔄 Updating membership...')
  
  if (!requestData || !requestData.list_id || !requestData.membershipData) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'list_id and membershipData are required'
    }
    
    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  const { list_id, membershipData } = requestData

  if (typeof membershipData !== 'object') {
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
  const { data: currentMembers, error: fetchError } = await supabase
    .from('contact_list_members')
    .select('contact_id')
    .eq('contact_list_id', list_id)

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
      contact_list_id: list_id
    }))

    const { error: addError } = await supabase
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
    const { error: removeError } = await supabase
      .from('contact_list_members')
      .delete()
      .eq('contact_list_id', list_id)
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

  console.log('✅ Successfully updated membership:', { addedCount, removedCount })

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