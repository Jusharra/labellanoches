-- Function to expand campaigns by contact list
CREATE OR REPLACE FUNCTION expand_campaign_by_list()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if target_contact_lists is provided and not empty
  IF NEW.target_contact_lists IS NULL OR 
     NEW.target_contact_lists = 'null'::jsonb OR 
     jsonb_array_length(NEW.target_contact_lists) = 0 THEN
    RETURN NEW; -- Don't expand if no lists specified
  END IF;

  -- Loop through each contact list ID in the JSONB array and create individual campaign rows
  INSERT INTO campaigns (
    business_id,
    title,
    message,
    channel,
    scheduled_time,
    status,
    created_by,
    from_number,
    sent_at,
    campaign_type,
    media_url,
    recipient_name,
    recipient_phone_number,
    recipient_whatsapp_number,
    recipient_email,
    webhook_url,
    message_template,
    airtable_record_id,
    target_contact_lists,
    "Personalized SMS Text",
    "Personalized WhatsApp Text"
  )
  SELECT
    NEW.business_id,
    NEW.title,
    NEW.message,
    NEW.channel,
    NEW.scheduled_time,
    NEW.status,
    NEW.created_by,
    NEW.from_number,
    NEW.sent_at,
    NEW.campaign_type,
    NEW.media_url,
    c.name, -- Contact name goes to recipient_name
    c.phone_number, -- Contact phone goes to recipient_phone_number
    c.whatsapp_number, -- Contact WhatsApp goes to recipient_whatsapp_number
    c.email, -- Contact email goes to recipient_email
    NEW.webhook_url,
    NEW.message_template,
    gen_random_uuid()::text, -- Generate unique Airtable record ID for each expanded campaign
    jsonb_build_array(list_id_text), -- Preserve the source list ID for traceability
    NEW."Personalized SMS Text", -- Copy personalized SMS text
    NEW."Personalized WhatsApp Text" -- Copy personalized WhatsApp text
  FROM jsonb_array_elements_text(NEW.target_contact_lists) AS list_id_text
  JOIN contact_list_members clm ON clm.contact_list_id = list_id_text::uuid
  JOIN contacts c ON c.id = clm.contact_id
  WHERE c.opted_in = true; -- Only include contacts who have opted in

  -- Delete the original "template" campaign row to avoid confusion
  -- This row was just used as a template to create the individual campaigns
  DELETE FROM campaigns WHERE id = NEW.id;

  -- Return NULL because we deleted the original row
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists to avoid conflicts
DROP TRIGGER IF EXISTS trg_expand_campaign_by_list ON campaigns;

-- Create the trigger that fires after campaign insertion
CREATE TRIGGER trg_expand_campaign_by_list
  AFTER INSERT ON campaigns
  FOR EACH ROW
  WHEN (NEW.target_contact_lists IS NOT NULL AND 
        NEW.target_contact_lists != 'null'::jsonb AND 
        jsonb_array_length(NEW.target_contact_lists) > 0)
  EXECUTE FUNCTION expand_campaign_by_list();

-- Add helpful comments to the database
COMMENT ON FUNCTION expand_campaign_by_list() IS 'Automatically expands campaigns by creating individual rows for each contact in the target contact lists. This enables Whalesync to sync personalized campaigns to Airtable.';

COMMENT ON TRIGGER trg_expand_campaign_by_list ON campaigns IS 'Triggers campaign expansion when a new campaign is inserted with target_contact_lists. Creates one campaign row per contact for personalized messaging.';