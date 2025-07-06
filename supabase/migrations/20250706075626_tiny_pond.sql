/*
  # Add missing columns to businesses table

  1. New Columns
    - `address` (text, nullable) - Business physical address
    - `website` (text, nullable) - Business website URL
  
  2. Changes
    - Adding missing columns that the settings page expects to update
    - These columns are nullable since they are optional business information
*/

-- Add missing address column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'address'
  ) THEN
    ALTER TABLE businesses ADD COLUMN address text;
  END IF;
END $$;

-- Add missing website column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'website'
  ) THEN
    ALTER TABLE businesses ADD COLUMN website text;
  END IF;
END $$;