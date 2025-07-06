/*
  # Add created_at column to contacts table

  1. Schema Changes
    - Add `created_at` column to `contacts` table
    - Set default value to `now()` for automatic timestamp recording
    - Set type as `timestamp with time zone` for consistency with other tables

  2. Data Migration  
    - For existing contacts without created_at, set to current timestamp
    - This ensures all existing data has valid timestamps

  3. Notes
    - This resolves the "column contacts.created_at does not exist" error
    - The edge function expects this column for sorting and data transformation
    - New contacts will automatically get timestamps on creation
*/

-- Add the created_at column to the contacts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE contacts ADD COLUMN created_at timestamp with time zone DEFAULT now();
  END IF;
END $$;

-- Update existing contacts to have a created_at timestamp if they don't already have one
UPDATE contacts 
SET created_at = now() 
WHERE created_at IS NULL;