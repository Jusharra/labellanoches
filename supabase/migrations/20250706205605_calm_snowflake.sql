/*
  # Campaign Contact Details Synchronization

  1. New Function
    - `sync_campaign_contact_details()` - PL/pgSQL function that syncs contact details from the first contact in the first target contact list to campaign recipient fields

  2. New Trigger
    - `trigger_sync_campaign_contact_details` - Trigger that executes the sync function before INSERT or UPDATE on campaigns table

  3. Functionality
    - Automatically populates recipient_name, recipient_phone_number, recipient_whatsapp_number, and recipient_email
    - Uses the first contact from the first contact list in target_contact_lists
    - Handles empty lists and missing contacts gracefully
*/

-- Create the function to sync campaign contact details
CREATE OR REPLACE FUNCTION public.sync_campaign_contact_details()
RETURNS TRIGGER AS $$
DECLARE
    first_contact_list_id UUID;
    first_contact_id UUID;
    contact_record RECORD;
BEGIN
    -- Check if target_contact_lists is not empty and is a valid JSON array
    IF NEW.target_contact_lists IS NOT NULL AND jsonb_array_length(NEW.target_contact_lists) > 0 THEN
        
        -- Extract the first contact list ID from the JSON array
        BEGIN
            first_contact_list_id := (NEW.target_contact_lists ->> 0)::uuid;
        EXCEPTION WHEN OTHERS THEN
            -- If conversion fails, set recipient columns to NULL
            NEW.recipient_name = NULL;
            NEW.recipient_phone_number = NULL;
            NEW.recipient_whatsapp_number = NULL;
            NEW.recipient_email = NULL;
            RETURN NEW;
        END;

        -- Find the first contact_id from the first contact list
        SELECT clm.contact_id
        INTO first_contact_id
        FROM public.contact_list_members clm
        WHERE clm.contact_list_id = first_contact_list_id
        LIMIT 1;

        -- If a contact is found, fetch its details
        IF first_contact_id IS NOT NULL THEN
            SELECT c.name, c.phone_number, c.email
            INTO contact_record
            FROM public.contacts c
            WHERE c.id = first_contact_id;

            -- Populate the recipient columns
            NEW.recipient_name = contact_record.name;
            NEW.recipient_phone_number = contact_record.phone_number;
            -- Assuming whatsapp_number is the same as phone_number from contacts table
            NEW.recipient_whatsapp_number = contact_record.phone_number;
            NEW.recipient_email = contact_record.email;
            
            -- Log the sync for debugging (optional)
            RAISE NOTICE 'Campaign % synced with contact details from contact %', NEW.id, first_contact_id;
        ELSE
            -- If no contact found in the list, set recipient columns to NULL
            NEW.recipient_name = NULL;
            NEW.recipient_phone_number = NULL;
            NEW.recipient_whatsapp_number = NULL;
            NEW.recipient_email = NULL;
            
            RAISE NOTICE 'Campaign % has no contacts in the first target list %', NEW.id, first_contact_list_id;
        END IF;
    ELSE
        -- If target_contact_lists is empty or NULL, set recipient columns to NULL
        NEW.recipient_name = NULL;
        NEW.recipient_phone_number = NULL;
        NEW.recipient_whatsapp_number = NULL;
        NEW.recipient_email = NULL;
        
        RAISE NOTICE 'Campaign % has no target contact lists', NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger that executes before INSERT or UPDATE on campaigns
DROP TRIGGER IF EXISTS trigger_sync_campaign_contact_details ON public.campaigns;

CREATE TRIGGER trigger_sync_campaign_contact_details
    BEFORE INSERT OR UPDATE ON public.campaigns
    FOR EACH ROW 
    EXECUTE FUNCTION public.sync_campaign_contact_details();

-- Add a comment to document the trigger
COMMENT ON TRIGGER trigger_sync_campaign_contact_details ON public.campaigns IS 
'Automatically syncs contact details from the first contact in the first target contact list to campaign recipient fields';

-- Add comments to document the function
COMMENT ON FUNCTION public.sync_campaign_contact_details() IS 
'Syncs contact details (name, phone, email) from the first contact in the first target_contact_lists entry to the campaign recipient fields';