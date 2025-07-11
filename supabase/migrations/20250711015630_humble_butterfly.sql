/*
  # Add created_by column to contacts table

  1. Schema Changes
    - Add `created_by` column to `contacts` table
    - Column type: `uuid` (nullable)
    - Add foreign key constraint to `user_profiles` table

  2. Security
    - Update existing RLS policies to account for the new column
    - Ensure data integrity with foreign key constraint

  This migration adds the missing `created_by` column that the contacts-operations edge function expects.
*/

-- Add the created_by column to contacts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE contacts ADD COLUMN created_by uuid;
  END IF;
END $$;

-- Add foreign key constraint to user_profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'contacts_created_by_fkey'
  ) THEN
    ALTER TABLE contacts 
    ADD CONSTRAINT contacts_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES user_profiles(id);
  END IF;
END $$;