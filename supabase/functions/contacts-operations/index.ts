import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
};

// Helper function to strip leading and trailing quotes (both single and double)
function stripQuotes(str: string): string {
  return str.replace(/^["']+|["']+$/g, '');
}

// Utility function to sanitize UUID arrays by removing invalid or badly formatted UUIDs
function sanitizeUUIDArray(input: any): string[] {
  if (!input || !Array.isArray(input)) return [];

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
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

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', 
    {
      auth: {
        persistSession: false,
      },
    },
  );

  let action: string | null = null;
  let payload: any = {};
  let pathSegments: string[] = [];

  try {
    const url = new URL(req.url);
    pathSegments = url.pathname.split('/').filter(segment => segment); // e.g., ["functions", "v1", "contacts-operations", "contacts"]

    // Determine action based on path and method
    if (pathSegments.includes('contacts')) {
      if (req.method === 'POST') {
        action = 'create_contact';
        payload = await req.json();
      } else if (req.method === 'GET') {
        action = 'get_contacts';
        payload = Object.fromEntries(url.searchParams.entries()); // Get query params
      } else if (req.method === 'PUT' || req.method === 'PATCH') {
        // For /contacts/{id}
        const contactId = pathSegments[pathSegments.indexOf('contacts') + 1];
        if (contactId) {
          action = 'update_contact';
          payload = { contactId: sanitizeUUID(contactId), ...(await req.json()) };
        }
      } else if (req.method === 'DELETE') {
        // For /contacts/{id}
        const contactId = pathSegments[pathSegments.indexOf('contacts') + 1];
        if (contactId) {
          action = 'delete_contact';
          payload = { contactId: sanitizeUUID(contactId) };
        }
      }
    } else if (pathSegments.includes('lists')) {
      if (req.method === 'POST') {
        action = 'create_list';
        payload = await req.json();
      } else if (req.method === 'GET') {
        action = 'get_lists';
        payload = Object.fromEntries(url.searchParams.entries());
      } else if (req.method === 'PUT' || req.method === 'PATCH') {
        // For /lists/{id}
        const listId = pathSegments[pathSegments.indexOf('lists') + 1];
        if (listId) {
          action = 'update_list';
          payload = { listId: sanitizeUUID(listId), ...(await req.json()) };
        }
      } else if (req.method === 'DELETE') {
        // For /lists/{id}
        const listId = pathSegments[pathSegments.indexOf('lists') + 1];
        if (listId) {
          action = 'delete_list';
          payload = { listId: sanitizeUUID(listId) };
        }
      }
    } else if (pathSegments.includes('contact-list-members')) {
      if (req.method === 'POST') {
        action = 'add_contact_to_list';
        payload = await req.json();
      } else if (req.method === 'DELETE') {
        // For /contact-list-members/{contactId}/{listId}
        const contactId = pathSegments[pathSegments.indexOf('contact-list-members') + 1];
        const listId = pathSegments[pathSegments.indexOf('contact-list-members') + 2];
        if (contactId && listId) {
          action = 'remove_contact_from_list';
          payload = { contactId: sanitizeUUID(contactId), listId: sanitizeUUID(listId) };
        }
      }
    }

    if (!action) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid action or endpoint' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      );
    }

    switch (action) {
      case 'create_contact': {
        const { name, phoneNumber, email, smsOptIn, preferredLanguage, tags, contactListIds, businessId, createdBy } = payload;

        if (!phoneNumber) {
          return new Response(
            JSON.stringify({ success: false, error: 'Phone number is required' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
          );
        }

        // Ensure businessId and createdBy are valid UUIDs
        const cleanBusinessId = sanitizeUUID(businessId);
        const cleanCreatedBy = sanitizeUUID(createdBy);

        // Define a default business_id if none provided (for public opt-ins)
        let finalBusinessId = cleanBusinessId;
        let finalCreatedBy = cleanCreatedBy;

        if (!finalBusinessId) {
          console.log("No business_id provided. Attempting to find default business...");
          // For public opt-ins, try to find La Bella Noches business
          const { data: defaultBusiness, error: businessError } = await supabaseClient
            .from('businesses')
            .select('id')
            .eq('name', 'La Bella Noches')
            .limit(1);
            
          if (businessError) {
            console.error("Error finding default business:", businessError);
          } else if (defaultBusiness && defaultBusiness.length > 0) {
            console.log("Found default business:", defaultBusiness[0].id);
            finalBusinessId = defaultBusiness[0].id;
          }
          
          // If still no business_id, try to find any business
          if (!finalBusinessId) {
            const { data: anyBusiness, error: anyBusinessError } = await supabaseClient
              .from('businesses')
              .select('id')
              .limit(1);
              
            if (anyBusinessError) {
              console.error("Error finding any business:", anyBusinessError);
            } else if (anyBusiness && anyBusiness.length > 0) {
              console.log("Using first available business:", anyBusiness[0].id);
              finalBusinessId = anyBusiness[0].id;
            }
          }
        }

        // For public opt-ins, if we still don't have a businessId, we can't proceed
        if (!finalBusinessId) {
          console.error("No business_id could be determined for contact creation");
          return new Response(
            JSON.stringify({ success: false, error: 'Could not determine business ID. Please contact support.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
          );
        }

        // For createdBy, it's optional for public opt-ins
        // If not provided, it will be NULL in the database

        // Check for existing contact with the same phone number for the same business
        const { data: existingContact, error: existingContactError } = await supabaseClient
          .from('contacts')
          .select('id')
          .eq('phone_number', phoneNumber)
          .eq('business_id', finalBusinessId)
          .single();

        if (existingContactError && existingContactError.code !== 'PGRST116') { // PGRST116 means "no rows found"
          console.error('Error checking for existing contact:', existingContactError);
          throw new Error(`Database error: ${existingContactError.message}`);
        }

        if (existingContact) {
          return new Response(
            JSON.stringify({ success: false, error: 'Contact with this phone number already exists for this business.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }, // Conflict
          );
        }

        const { data: newContact, error: insertError } = await supabaseClient
          .from('contacts')
          .insert({
            name: name || null,
            phone_number: phoneNumber, 
            whatsapp_number: payload.whatsappNumber || null,
            email: email || null,
            opted_in: smsOptIn || false,
            language: preferredLanguage || 'English',
            tags: tags || [],
            business_id: finalBusinessId,
            created_by: finalCreatedBy || null, // Allow null for public opt-ins
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating contact:', insertError);
          throw new Error(`Failed to create contact: ${insertError.message}`);
        }

        // Add contact to specified lists if provided
        if (contactListIds && Array.isArray(contactListIds) && contactListIds.length > 0) {
          const membersToInsert = sanitizeUUIDArray(contactListIds).map(listId => ({
            contact_id: newContact.id,
            contact_list_id: listId,
          }));

          if (membersToInsert.length > 0) {
            const { error: membersInsertError } = await supabaseClient
              .from('contact_list_members')
              .upsert(membersToInsert, {
                onConflict: 'contact_id,contact_list_id',
                ignoreDuplicates: true
              });

            if (membersInsertError) {
              console.error('Error adding contact to lists:', membersInsertError);
              console.log('Attempt to add contact to lists failed:', membersInsertError.message);
              console.log('Contact list members payload:', membersToInsert);
            } else {
              console.log(`Successfully added contact to ${membersToInsert.length} list(s)`);
            }
          }
        }

        return new Response(
          JSON.stringify({ success: true, data: newContact }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 },
        );
      }

      case 'get_contacts': {
        const { listId, searchQuery, businessId } = payload;

        const cleanBusinessId = sanitizeUUID(businessId);
        if (!cleanBusinessId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Business ID is required to fetch contacts.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
          );
        }

        let query = supabaseClient
          .from('contacts')
          .select('*')
          .eq('business_id', cleanBusinessId);

        if (listId) {
          const cleanListId = sanitizeUUID(listId);
          if (cleanListId) {
            query = supabaseClient
              .from('contact_list_members')
              .select('contacts(*)')
              .eq('contact_list_id', cleanListId)
              .eq('contacts.business_id', cleanBusinessId); // Ensure contacts belong to the business
          }
        }

        if (searchQuery) {
          query = query.or(`name.ilike.%${searchQuery}%,phone_number.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
        }

        const { data: contacts, error } = await query;

        if (error) {
          console.error('Error fetching contacts:', error);
          throw new Error(`Failed to fetch contacts: ${error.message}`);
        }

        // If filtering by listId, the structure is { contacts: { ... } }
        const formattedContacts = listId ? contacts.map((item: any) => item.contacts) : contacts;

        return new Response(
          JSON.stringify({ success: true, data: formattedContacts }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
        );
      }

      case 'update_contact': {
        const { contactId, name, phoneNumber, email, smsOptIn, preferredLanguage, tags, contactListIds } = payload;

        if (!contactId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Contact ID is required for update.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
          );
        }

        const updates: any = {};
        if (name !== undefined) updates.name = name;
        if (phoneNumber !== undefined) updates.phone_number = phoneNumber;
        if (email !== undefined) updates.email = email;
        if (smsOptIn !== undefined) updates.opted_in = smsOptIn;
        if (preferredLanguage !== undefined) updates.language = preferredLanguage;
        if (tags !== undefined) updates.tags = tags;

        const { data: updatedContact, error: updateError } = await supabaseClient
          .from('contacts')
          .update(updates)
          .eq('id', contactId)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating contact:', updateError);
          throw new Error(`Failed to update contact: ${updateError.message}`);
        }

        // Update contact list associations
        if (contactListIds !== undefined) {
          // Delete existing associations
          const { error: deleteMembersError } = await supabaseClient
            .from('contact_list_members')
            .delete()
            .eq('contact_id', contactId);

          if (deleteMembersError) {
            console.error('Error deleting old contact list members:', deleteMembersError);
            // Log error but continue
          }

          // Insert new associations
          if (Array.isArray(contactListIds) && contactListIds.length > 0) {
            const membersToInsert = sanitizeUUIDArray(contactListIds).map(listId => ({
              contact_id: contactId,
              contact_list_id: listId,
            }));

            if (membersToInsert.length > 0) {
              const { error: insertMembersError } = await supabaseClient
                .from('contact_list_members')
                .upsert(membersToInsert, {
                  onConflict: 'contact_id,contact_list_id',
                  ignoreDuplicates: true
                });

              if (insertMembersError) {
                console.error('Error inserting new contact list members:', insertMembersError);
                // Log error but continue
              }
            }
          }
        }

        return new Response(
          JSON.stringify({ success: true, data: updatedContact }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
        );
      }

      case 'delete_contact': {
        const { contactId } = payload;

        if (!contactId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Contact ID is required for deletion.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
          );
        }

        // Delete from contact_list_members first due to foreign key constraints
        const { error: deleteMembersError } = await supabaseClient
          .from('contact_list_members')
          .delete()
          .eq('contact_id', contactId);

        if (deleteMembersError) {
          console.error('Error deleting contact list members:', deleteMembersError);
          throw new Error(`Failed to delete contact list members: ${deleteMembersError.message}`);
        }

        const { error: deleteContactError } = await supabaseClient
          .from('contacts')
          .delete()
          .eq('id', contactId);

        if (deleteContactError) {
          console.error('Error deleting contact:', deleteContactError);
          throw new Error(`Failed to delete contact: ${deleteContactError.message}`);
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Contact deleted successfully.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
        );
      }

      case 'create_list': {
        const { name, description, businessId, createdBy } = payload;

        if (!name) {
          return new Response(
            JSON.stringify({ success: false, error: 'List name is required.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
          );
        }

        const cleanBusinessId = sanitizeUUID(businessId);
        const cleanCreatedBy = sanitizeUUID(createdBy);

        if (!cleanBusinessId || !cleanCreatedBy) {
          // Attempt to derive business_id and created_by from auth if not provided or invalid
          const { data: { user } } = await supabaseClient.auth.getUser();
          if (user) {
            const { data: profile, error: profileError } = await supabaseClient
              .from('user_profiles')
              .select('business_id')
              .eq('id', user.id)
              .single();
            if (profile && !profileError) {
              payload.businessId = profile.business_id;
              payload.createdBy = user.id;
            }
          }
        }

        const finalBusinessId = sanitizeUUID(payload.businessId);
        const finalCreatedBy = sanitizeUUID(payload.createdBy);

        if (!finalBusinessId || !finalCreatedBy) {
          return new Response(
            JSON.stringify({ success: false, error: 'Business ID or Created By user ID is missing or invalid.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
          );
        }

        const { data: newList, error: insertError } = await supabaseClient
          .from('contact_lists')
          .insert({
            list_name: name,
            description: description || null,
            business_id: finalBusinessId,
            created_by: finalCreatedBy,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating contact list:', insertError);
          throw new Error(`Failed to create contact list: ${insertError.message}`);
        }

        return new Response(
          JSON.stringify({ success: true, data: newList }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 },
        );
      }

      case 'get_lists': {
        const { businessId } = payload;

        const cleanBusinessId = sanitizeUUID(businessId);
        if (!cleanBusinessId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Business ID is required to fetch contact lists.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
          );
        }

        const { data: lists, error: fetchError } = await supabaseClient
          .from('contact_lists')
          .select('*')
          .eq('business_id', cleanBusinessId)
          .order('created_at', { ascending: false });

        if (fetchError) {
          console.error('Error fetching contact lists:', fetchError);
          throw new Error(`Failed to fetch contact lists: ${fetchError.message}`);
        }

        // Fetch contact counts for each list
        const { data: members, error: membersError } = await supabaseClient
          .from('contact_list_members')
          .select('contact_list_id');

        if (membersError) {
          console.error('Error fetching contact list members for counts:', membersError);
          // Continue without counts if there's an error
        }

        const contactCounts = new Map<string, number>();
        if (members) {
          members.forEach(member => {
            const cleanListId = sanitizeUUID(member.contact_list_id);
            if (cleanListId) {
              contactCounts.set(cleanListId, (contactCounts.get(cleanListId) || 0) + 1);
            }
          });
        }

        const formattedLists = lists.map(list => ({
          id: list.id,
          name: list.list_name,
          description: list.description || '',
          contactCount: contactCounts.get(list.id) || 0,
          createdDate: new Date(list.created_at).toLocaleDateString(),
        }));

        return new Response(
          JSON.stringify({ success: true, data: formattedLists }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
        );
      }

      case 'update_list': {
        const { listId, name, description } = payload;

        if (!listId) {
          return new Response(
            JSON.stringify({ success: false, error: 'List ID is required for update.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
          );
        }

        const updates: any = {};
        if (name !== undefined) updates.list_name = name;
        if (description !== undefined) updates.description = description;

        const { data: updatedList, error: updateError } = await supabaseClient
          .from('contact_lists')
          .update(updates)
          .eq('id', listId)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating contact list:', updateError);
          throw new Error(`Failed to update contact list: ${updateError.message}`);
        }

        return new Response(
          JSON.stringify({ success: true, data: updatedList }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
        );
      }

      case 'delete_list': {
        const { listId } = payload;

        if (!listId) {
          return new Response(
            JSON.stringify({ success: false, error: 'List ID is required for deletion.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
          );
        }

        // Delete from contact_list_members first due to foreign key constraints
        const { error: deleteMembersError } = await supabaseClient
          .from('contact_list_members')
          .delete()
          .eq('contact_list_id', listId);

        if (deleteMembersError) {
          console.error('Error deleting contact list members:', deleteMembersError);
          throw new Error(`Failed to delete contact list members: ${deleteMembersError.message}`);
        }

        const { error: deleteListError } = await supabaseClient
          .from('contact_lists')
          .delete()
          .eq('id', listId);

        if (deleteListError) {
          console.error('Error deleting contact list:', deleteListError);
          throw new Error(`Failed to delete contact list: ${deleteListError.message}`);
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Contact list deleted successfully.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
        );
      }

      case 'add_contact_to_list': {
        const { contactId, listId } = payload;

        if (!contactId || !listId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Contact ID and List ID are required.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
          );
        }

        const cleanContactId = sanitizeUUID(contactId);
        const cleanListId = sanitizeUUID(listId);

        if (!cleanContactId || !cleanListId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Invalid Contact ID or List ID format.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
          );
        }

        // Check if already exists to prevent duplicate inserts
        const { data: existingMember, error: checkError } = await supabaseClient
          .from('contact_list_members')
          .select('contact_id, contact_list_id')
          .eq('contact_id', cleanContactId)
          .eq('contact_list_id', cleanListId)
          .maybeSingle();

        if (checkError) { 
          console.error('Error checking for existing contact list member:', checkError);
          throw new Error(`Database error: ${checkError.message}`);
        }

        if (existingMember) {
          console.log(`Contact ${cleanContactId} is already in list ${cleanListId}. Skipping insert.`);
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Contact is already in this list.',
              data: existingMember 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
          );
        }

        const { data: newMember, error: insertError } = await supabaseClient
          .from('contact_list_members')
          .insert({
            contact_id: cleanContactId,
            contact_list_id: cleanListId,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error adding contact to list:', insertError);
          throw new Error(`Failed to add contact to list: ${insertError.message}`);
        } else {
          console.log(`Contact ${cleanContactId} successfully added to list ${cleanListId}`);
        }

        return new Response(
          JSON.stringify({ success: true, data: newMember }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 },
        );
      }

      case 'remove_contact_from_list': {
        const { contactId, listId } = payload;

        if (!contactId || !listId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Contact ID and List ID are required.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
          );
        }

        const cleanContactId = sanitizeUUID(contactId);
        const cleanListId = sanitizeUUID(listId);

        if (!cleanContactId || !cleanListId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Invalid Contact ID or List ID format.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
          );
        }

        const { error: deleteError } = await supabaseClient
          .from('contact_list_members')
          .delete()
          .eq('contact_id', cleanContactId)
          .eq('contact_list_id', cleanListId);

        if (deleteError) {
          console.error('Error removing contact from list:', deleteError);
          throw new Error(`Failed to remove contact from list: ${deleteError.message}`);
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Contact removed from list successfully.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Unknown action' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
        );
    }
  } catch (error) {
    console.error('Unhandled error in contacts-operations:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'An unexpected error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});