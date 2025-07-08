/*
  # Fix Campaign Creation Infinite Recursion

  1. Function Updates
    - Update `expand_campaign_by_list()` function to prevent infinite recursion
    - Set `target_contact_lists` to empty array for expanded campaigns
    - Delete original campaign row after expansion

  2. Trigger Updates
    - Replace existing trigger with updated version
    - Ensure trigger only fires when `target_contact_lists` is not null and not empty

  3. Problem Solved
    - Prevents stack depth limit exceeded errors
    - Allows campaign creation to complete successfully
    - Maintains the campaign expansion functionality
*/

-- Drop existing trigger first
DROP TRIGGER IF EXISTS trg_expand_campaign_by_list ON campaigns;

-- Create or replace the expand_campaign_by_list function with recursion fix
CREATE OR REPLACE FUNCTION expand_campaign_by_list()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert individual campaign rows for each contact in the target lists
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
    target_contact_lists  -- Set to empty array to prevent recursion
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
    c.name,
    c.phone_number,
    c.whatsapp_number,
    c.email,
    NEW.webhook_url,
    NEW.message_template,
    gen_random_uuid()::text,
    '[]'::jsonb  -- CRITICAL: Empty array prevents recursive trigger firing
  FROM unnest(NEW.target_contact_lists) AS list_id
  JOIN contact_list_members clm ON clm.contact_list_id = list_id::uuid
  JOIN contacts c ON c.id = clm.contact_id;

  -- Delete the original "template" campaign row to avoid duplication
  DELETE FROM campaigns WHERE id = NEW.id;

  -- Return null since we're deleting the original row
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger with the updated function
CREATE TRIGGER trg_expand_campaign_by_list
  AFTER INSERT ON campaigns
  FOR EACH ROW
  WHEN (
    NEW.target_contact_lists IS NOT NULL 
    AND NEW.target_contact_lists <> 'null'::jsonb 
    AND jsonb_array_length(NEW.target_contact_lists) > 0
  )
  EXECUTE FUNCTION expand_campaign_by_list();