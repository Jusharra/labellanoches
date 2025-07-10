/*
  # Campaign Target Contact Lists JSON Object Migration
  
  1. Changes
     - Alter target_contact_lists default value from array to object
     - Update trigger functions to handle JSON objects instead of arrays
     - Recreate triggers with updated object validation
  
  2. Updated Functions
     - expand_campaign_by_list: Handle JSON object iteration
     - validate_target_contact_lists: Validate UUID keys in object
     - sync_campaign_contact_details: Extract first list from object keys
  
  3. Notes
     - Replaced jsonb_object_length with simple object comparison
     - Functions now expect target_contact_lists as {"uuid": "name"} format
*/

-- Step 1: Alter the default value of target_contact_lists to an empty JSON object
ALTER TABLE public.campaigns
ALTER COLUMN target_contact_lists SET DEFAULT '{}'::jsonb;

-- Step 2: Recreate the trigger function `expand_campaign_by_list`
-- This function needs to be updated to handle target_contact_lists as a JSON object.
-- The original function checks jsonb_array_length, which is not suitable for objects.
-- We need to iterate over the keys of the JSON object.

-- Drop the existing trigger first if it exists
DROP TRIGGER IF EXISTS trg_expand_campaign_by_list ON public.campaigns;

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS public.expand_campaign_by_list();

-- Create or replace the function to handle JSON objects
CREATE OR REPLACE FUNCTION public.expand_campaign_by_list()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    contact_list_id_val uuid;
    list_name_val text;
    campaign_row record;
BEGIN
    -- Only proceed if target_contact_lists is a JSON object and not empty
    IF NEW.target_contact_lists IS NOT NULL 
       AND jsonb_typeof(NEW.target_contact_lists) = 'object' 
       AND NEW.target_contact_lists != '{}'::jsonb THEN
        -- Iterate over the keys (contact_list_ids) and values (list_names) in the target_contact_lists JSON object
        FOR contact_list_id_val, list_name_val IN SELECT key::uuid, value::text FROM jsonb_each_text(NEW.target_contact_lists)
        LOOP
            -- Fetch contacts for the current contact_list_id
            FOR campaign_row IN SELECT c.id AS contact_id, c.name AS contact_name, c.phone_number AS contact_phone_number, c.email AS contact_email, c.whatsapp_number AS contact_whatsapp_number
                                FROM public.contacts c
                                JOIN public.contact_list_members clm ON c.id = clm.contact_id
                                WHERE clm.contact_list_id = contact_list_id_val
            LOOP
                -- Insert a new campaign row for each contact
                INSERT INTO public.campaigns (
                    business_id,
                    title,
                    message,
                    channel,
                    scheduled_time,
                    status,
                    created_by,
                    from_number,
                    sent_at,
                    target_contact_lists, -- Keep the original object for reference if needed
                    airtable_record_id,
                    campaign_type,
                    media_url,
                    "Personalized SMS Text",
                    "Personalized WhatsApp Text",
                    recipient_phone_number,
                    webhook_url,
                    recipient_whatsapp_number,
                    recipient_name,
                    recipient_email,
                    message_template
                ) VALUES (
                    NEW.business_id,
                    NEW.title,
                    NEW.message,
                    NEW.channel,
                    NEW.scheduled_time,
                    NEW.status,
                    NEW.created_by,
                    NEW.from_number,
                    NEW.sent_at,
                    NEW.target_contact_lists, -- Store the original object
                    NEW.airtable_record_id,
                    NEW.campaign_type,
                    NEW.media_url,
                    REPLACE(NEW.message, '{{Name}}', COALESCE(campaign_row.contact_name, '')), -- Personalized SMS
                    REPLACE(NEW.message, '{{Name}}', COALESCE(campaign_row.contact_name, '')), -- Personalized WhatsApp
                    campaign_row.contact_phone_number,
                    NEW.webhook_url,
                    campaign_row.contact_whatsapp_number,
                    campaign_row.contact_name,
                    campaign_row.contact_email,
                    NEW.message_template
                );
            END LOOP;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$function$;

-- Recreate the trigger `trg_expand_campaign_by_list`
-- The WHEN clause needs to be updated to check for a non-empty JSON object
CREATE TRIGGER trg_expand_campaign_by_list
AFTER INSERT ON public.campaigns
FOR EACH ROW
WHEN (NEW.target_contact_lists IS NOT NULL 
      AND jsonb_typeof(NEW.target_contact_lists) = 'object' 
      AND NEW.target_contact_lists != '{}'::jsonb)
EXECUTE FUNCTION public.expand_campaign_by_list();


-- Step 3: Recreate the trigger function `validate_target_contact_lists`
-- This function needs to be updated to iterate over the keys of the JSON object.

-- Drop the existing trigger first if it exists
DROP TRIGGER IF EXISTS trg_validate_target_contact_lists ON public.campaigns;

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS public.validate_target_contact_lists();

-- Create or replace the function to handle JSON objects
CREATE OR REPLACE FUNCTION public.validate_target_contact_lists()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    list_id uuid;
    list_exists boolean;
BEGIN
    -- Only validate if target_contact_lists is a JSON object and not empty
    IF NEW.target_contact_lists IS NOT NULL 
       AND jsonb_typeof(NEW.target_contact_lists) = 'object' 
       AND NEW.target_contact_lists != '{}'::jsonb THEN
        FOR list_id IN SELECT key::uuid FROM jsonb_each(NEW.target_contact_lists)
        LOOP
            SELECT EXISTS (SELECT 1 FROM public.contact_lists WHERE id = list_id) INTO list_exists;
            IF NOT list_exists THEN
                RAISE EXCEPTION 'Contact list ID % in target_contact_lists does not exist.', list_id;
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$function$;

-- Recreate the trigger `trg_validate_target_contact_lists`
CREATE TRIGGER trg_validate_target_contact_lists
BEFORE INSERT OR UPDATE ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.validate_target_contact_lists();


-- Step 4: Recreate the trigger function `sync_campaign_contact_details`
-- This function also needs to be updated to handle target_contact_lists as a JSON object.
-- It should pick the first contact from the first list (key) in the object.

-- Drop the existing trigger first if it exists
DROP TRIGGER IF EXISTS trigger_sync_campaign_contact_details ON public.campaigns;

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS public.sync_campaign_contact_details();

-- Create or replace the function to handle JSON objects
CREATE OR REPLACE FUNCTION public.sync_campaign_contact_details()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    first_list_id uuid;
    first_contact_id uuid;
    contact_details record;
BEGIN
    -- Check if target_contact_lists is a non-empty JSON object
    IF NEW.target_contact_lists IS NOT NULL 
       AND jsonb_typeof(NEW.target_contact_lists) = 'object' 
       AND NEW.target_contact_lists != '{}'::jsonb THEN
        -- Get the first key (contact_list_id) from the JSON object
        SELECT key::uuid INTO first_list_id FROM jsonb_object_keys(NEW.target_contact_lists) LIMIT 1;

        -- Find the first contact in that list
        SELECT contact_id INTO first_contact_id
        FROM public.contact_list_members
        WHERE contact_list_id = first_list_id
        LIMIT 1;

        IF first_contact_id IS NOT NULL THEN
            -- Fetch contact details
            SELECT name, phone_number, whatsapp_number, email
            INTO contact_details
            FROM public.contacts
            WHERE id = first_contact_id;

            -- Update campaign fields
            NEW.recipient_name := contact_details.name;
            NEW.recipient_phone_number := contact_details.phone_number;
            NEW.recipient_whatsapp_number := contact_details.whatsapp_number;
            NEW.recipient_email := contact_details.email;
        END IF;
    ELSE
        -- If target_contact_lists is empty or not an object, clear recipient details
        NEW.recipient_name := NULL;
        NEW.recipient_phone_number := NULL;
        NEW.recipient_whatsapp_number := NULL;
        NEW.recipient_email := NULL;
    END IF;

    RETURN NEW;
END;
$function$;

-- Recreate the trigger `trigger_sync_campaign_contact_details`
CREATE TRIGGER trigger_sync_campaign_contact_details
BEFORE INSERT OR UPDATE ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.sync_campaign_contact_details();