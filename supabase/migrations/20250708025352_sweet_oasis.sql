/*
  # Fix Recursive Database Triggers

  This migration addresses the "stack depth limit exceeded" error by fixing recursive triggers
  on the campaigns table that were causing infinite loops during campaign creation.

  ## Changes Made
  1. **Updated expand_campaign_by_list function** - Added guard conditions to prevent infinite recursion
  2. **Updated sync_campaign_contact_details function** - Added checks to prevent unnecessary re-triggering
  3. **Updated manage_webhook_integrations function** - Added conditions to prevent loops

  ## Security
  - Maintains existing RLS policies
  - Preserves all existing functionality while preventing recursion
*/

-- Fix the expand_campaign_by_list function to prevent infinite recursion
CREATE OR REPLACE FUNCTION expand_campaign_by_list()
RETURNS TRIGGER AS $$
DECLARE
    contact_record RECORD;
    list_id UUID;
    contact_count INTEGER := 0;
BEGIN
    -- Only proceed if this is a new campaign with target_contact_lists
    -- and it doesn't already have recipient details (to prevent recursion)
    IF NEW.target_contact_lists IS NOT NULL 
       AND NEW.target_contact_lists != 'null'::jsonb 
       AND jsonb_array_length(NEW.target_contact_lists) > 0
       AND NEW.recipient_phone_number IS NULL
       AND NEW.recipient_name IS NULL THEN
        
        -- Iterate through each contact list
        FOR list_id IN SELECT jsonb_array_elements_text(NEW.target_contact_lists)::UUID
        LOOP
            -- Get contacts from this list
            FOR contact_record IN 
                SELECT c.* 
                FROM contacts c
                JOIN contact_list_members clm ON c.id = clm.contact_id
                WHERE clm.contact_list_id = list_id
                  AND c.business_id = NEW.business_id
            LOOP
                contact_count := contact_count + 1;
                
                -- Only create individual campaigns if this is not the first contact
                -- (keep the original campaign for the first contact)
                IF contact_count > 1 THEN
                    INSERT INTO campaigns (
                        business_id,
                        title,
                        message,
                        channel,
                        scheduled_time,
                        status,
                        created_by,
                        campaign_type,
                        media_url,
                        target_contact_lists,
                        recipient_phone_number,
                        recipient_whatsapp_number,
                        recipient_name,
                        recipient_email,
                        message_template,
                        webhook_url
                    ) VALUES (
                        NEW.business_id,
                        NEW.title,
                        NEW.message,
                        NEW.channel,
                        NEW.scheduled_time,
                        NEW.status,
                        NEW.created_by,
                        NEW.campaign_type,
                        NEW.media_url,
                        jsonb_build_array(list_id::text), -- Single list for this contact
                        contact_record.phone_number,
                        contact_record.whatsapp_number,
                        contact_record.name,
                        contact_record.email,
                        NEW.message_template,
                        NEW.webhook_url
                    );
                ELSE
                    -- Update the original campaign with the first contact's details
                    UPDATE campaigns SET
                        recipient_phone_number = contact_record.phone_number,
                        recipient_whatsapp_number = contact_record.whatsapp_number,
                        recipient_name = contact_record.name,
                        recipient_email = contact_record.email
                    WHERE id = NEW.id;
                END IF;
            END LOOP;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix the sync_campaign_contact_details function to prevent recursion
CREATE OR REPLACE FUNCTION sync_campaign_contact_details()
RETURNS TRIGGER AS $$
DECLARE
    first_contact_record RECORD;
    first_list_id UUID;
BEGIN
    -- Only sync if target_contact_lists exists and recipient details are not already set
    IF NEW.target_contact_lists IS NOT NULL 
       AND NEW.target_contact_lists != 'null'::jsonb 
       AND jsonb_array_length(NEW.target_contact_lists) > 0
       AND (NEW.recipient_phone_number IS NULL OR NEW.recipient_name IS NULL OR NEW.recipient_email IS NULL) THEN
        
        -- Get the first list ID
        first_list_id := (NEW.target_contact_lists->0)::text::UUID;
        
        -- Get the first contact from the first list
        SELECT c.* INTO first_contact_record
        FROM contacts c
        JOIN contact_list_members clm ON c.id = clm.contact_id
        WHERE clm.contact_list_id = first_list_id
          AND c.business_id = NEW.business_id
        LIMIT 1;
        
        -- Update NEW record directly (this is a BEFORE trigger)
        IF first_contact_record IS NOT NULL THEN
            IF NEW.recipient_phone_number IS NULL THEN
                NEW.recipient_phone_number := first_contact_record.phone_number;
            END IF;
            IF NEW.recipient_whatsapp_number IS NULL THEN
                NEW.recipient_whatsapp_number := first_contact_record.whatsapp_number;
            END IF;
            IF NEW.recipient_name IS NULL THEN
                NEW.recipient_name := first_contact_record.name;
            END IF;
            IF NEW.recipient_email IS NULL THEN
                NEW.recipient_email := first_contact_record.email;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix the manage_webhook_integrations function to prevent recursion
CREATE OR REPLACE FUNCTION manage_webhook_integrations()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if webhook_url actually changed
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.webhook_url IS DISTINCT FROM OLD.webhook_url) THEN
        -- Update existing campaigns only if their webhook_url is different
        UPDATE campaigns 
        SET webhook_url = NEW.webhook_url
        WHERE business_id = NEW.id 
          AND (webhook_url IS DISTINCT FROM NEW.webhook_url);
          
        -- Handle webhook integrations
        IF NEW.webhook_url IS NOT NULL AND NEW.webhook_url != '' THEN
            INSERT INTO webhook_integrations (
                business_id,
                integration_type,
                webhook_url,
                status,
                metadata
            ) VALUES (
                NEW.id,
                'campaign',
                NEW.webhook_url,
                'active',
                '{}'::jsonb
            )
            ON CONFLICT (business_id, integration_type, webhook_url) 
            DO UPDATE SET 
                status = 'active',
                updated_at = now();
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the triggers to ensure they use the updated functions
DROP TRIGGER IF EXISTS trg_expand_campaign_by_list ON campaigns;
DROP TRIGGER IF EXISTS trigger_sync_campaign_contact_details ON campaigns;
DROP TRIGGER IF EXISTS trigger_manage_webhook_integrations ON businesses;

-- Recreate the triggers
CREATE TRIGGER trg_expand_campaign_by_list 
    AFTER INSERT ON campaigns 
    FOR EACH ROW 
    WHEN (NEW.target_contact_lists IS NOT NULL 
          AND NEW.target_contact_lists <> 'null'::jsonb 
          AND jsonb_array_length(NEW.target_contact_lists) > 0)
    EXECUTE FUNCTION expand_campaign_by_list();

CREATE TRIGGER trigger_sync_campaign_contact_details 
    BEFORE INSERT OR UPDATE ON campaigns 
    FOR EACH ROW 
    EXECUTE FUNCTION sync_campaign_contact_details();

CREATE TRIGGER trigger_manage_webhook_integrations 
    AFTER INSERT OR UPDATE ON businesses 
    FOR EACH ROW 
    EXECUTE FUNCTION manage_webhook_integrations();