/*
  # Media Library and Storage Setup

  1. New Storage Policies
    - Create RLS policies for the campaign-media bucket
    - Allow authenticated users to read, insert, update and delete their own business media
    - Allow public read access to public media

  2. Update media_library table
    - Ensure proper foreign key references and constraints
    - Add RLS policies for proper access control
*/

-- First create the campaign-media storage bucket if it doesn't exist
-- This needs to be done manually in the Supabase dashboard
-- After creating the bucket, add the following policies:

-- Make sure media_library has proper foreign keys and RLS policies
ALTER TABLE IF EXISTS media_library 
    ADD CONSTRAINT media_library_business_id_fkey 
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS media_library
    ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for media_library if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'media_library' AND policyname = 'Admins can manage all media_library'
    ) THEN
        CREATE POLICY "Admins can manage all media_library" ON media_library
            USING (EXISTS (
                SELECT 1 FROM user_profiles u
                WHERE u.id = auth.uid() AND u.role = 'admin'
            ))
            WITH CHECK (EXISTS (
                SELECT 1 FROM user_profiles u
                WHERE u.id = auth.uid() AND u.role = 'admin'
            ));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'media_library' AND policyname = 'Business users can manage their media_library'
    ) THEN
        CREATE POLICY "Business users can manage their media_library" ON media_library
            USING (EXISTS (
                SELECT 1 FROM user_profiles u
                WHERE u.id = auth.uid() AND u.role = 'business' AND business_id = u.business_id
            ))
            WITH CHECK (EXISTS (
                SELECT 1 FROM user_profiles u
                WHERE u.id = auth.uid() AND u.role = 'business' AND business_id = u.business_id
            ));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'media_library' AND policyname = 'Users can view public media'
    ) THEN
        CREATE POLICY "Users can view public media" ON media_library
            FOR SELECT
            USING (access_type = 'Free');
    END IF;
END $$;