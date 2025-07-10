/*
  # Fix Campaign Storage and Database Issues

  1. Storage
    - Create campaign-media bucket for media uploads
    - Set up proper RLS policies for authenticated users
    - Enable public read access for media files

  2. Database
    - Fix target_contact_lists column configuration
    - Recreate triggers to prevent "key" column errors
    - Ensure proper JSON handling for campaign lists
*/

-- Create storage bucket for campaign media if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-media', 'campaign-media', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can upload campaign media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view campaign media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their campaign media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their campaign media" ON storage.objects;
DROP POLICY IF EXISTS "Public can view campaign media" ON storage.objects;

-- Set up RLS policies for the campaign-media bucket
CREATE POLICY "Authenticated users can upload campaign media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'campaign-media');

CREATE POLICY "Authenticated users can view campaign media"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'campaign-media');

CREATE POLICY "Authenticated users can update their campaign media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'campaign-media');

CREATE POLICY "Authenticated users can delete their campaign media"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'campaign-media');

-- Public access for viewing campaign media
CREATE POLICY "Public can view campaign media"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'campaign-media');

-- Ensure the target_contact_lists column is properly configured as JSONB
DO $$
BEGIN
  -- Check if the column exists and is the right type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'campaigns' 
    AND column_name = 'target_contact_lists' 
    AND data_type = 'jsonb'
  ) THEN
    -- If column doesn't exist as jsonb, alter it
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'campaigns' 
      AND column_name = 'target_contact_lists'
    ) THEN
      -- Column exists but wrong type, alter it
      ALTER TABLE campaigns ALTER COLUMN target_contact_lists TYPE jsonb USING target_contact_lists::jsonb;
      ALTER TABLE campaigns ALTER COLUMN target_contact_lists SET DEFAULT '{}'::jsonb;
    ELSE
      -- Column doesn't exist, add it
      ALTER TABLE campaigns ADD COLUMN target_contact_lists jsonb DEFAULT '{}'::jsonb;
    END IF;
  END IF;
END $$;

-- Drop and recreate any problematic triggers that might be causing "key" column errors
DROP TRIGGER IF EXISTS "trg_validate_target_contact_lists" ON campaigns;
DROP TRIGGER IF EXISTS "trg_expand_campaign_by_list" ON campaigns;

-- Recreate the target_contact_lists validation trigger with proper error handling
CREATE OR REPLACE FUNCTION validate_target_contact_lists()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure target_contact_lists is a valid JSON object
  IF NEW.target_contact_lists IS NOT NULL THEN
    -- Validate that it's proper JSON
    BEGIN
      PERFORM NEW.target_contact_lists::jsonb;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'target_contact_lists must be valid JSON';
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_target_contact_lists
  BEFORE INSERT OR UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION validate_target_contact_lists();

-- Recreate the campaign expansion trigger with proper JSON handling
CREATE OR REPLACE FUNCTION expand_campaign_by_list()
RETURNS TRIGGER AS $$
DECLARE
  list_id uuid;
  list_name text;
  contact_record RECORD;
BEGIN
  -- Only process if target_contact_lists is not empty and is an object
  IF NEW.target_contact_lists IS NOT NULL 
     AND jsonb_typeof(NEW.target_contact_lists) = 'object' 
     AND NEW.target_contact_lists != '{}'::jsonb THEN
    
    -- Iterate through each list in the target_contact_lists object
    FOR list_id, list_name IN 
      SELECT (jsonb_each_text(NEW.target_contact_lists)).key::uuid, (jsonb_each_text(NEW.target_contact_lists)).value
    LOOP
      -- Get all contacts from this list and create individual campaign records
      FOR contact_record IN
        SELECT c.id, c.name, c.phone_number, c.whatsapp_number, c.email
        FROM contacts c
        JOIN contact_list_members clm ON c.id = clm.contact_id
        WHERE clm.contact_list_id = list_id
      LOOP
        -- Insert individual campaign record for this contact
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
          message_template,
          webhook_url,
          from_number,
          recipient_phone_number,
          recipient_whatsapp_number,
          recipient_name,
          recipient_email,
          target_contact_lists
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
          NEW.message_template,
          NEW.webhook_url,
          NEW.from_number,
          contact_record.phone_number,
          contact_record.whatsapp_number,
          contact_record.name,
          contact_record.email,
          jsonb_build_object(list_id::text, list_name)
        );
      END LOOP;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_expand_campaign_by_list
  AFTER INSERT ON campaigns
  FOR EACH ROW
  WHEN (NEW.target_contact_lists IS NOT NULL 
        AND jsonb_typeof(NEW.target_contact_lists) = 'object' 
        AND NEW.target_contact_lists != '{}'::jsonb)
  EXECUTE FUNCTION expand_campaign_by_list();

-- Ensure storage RLS is enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;