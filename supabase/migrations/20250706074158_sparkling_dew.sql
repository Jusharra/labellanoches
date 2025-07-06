/*
  # Add webhook_url column to campaigns table

  1. Schema Changes
    - Add `webhook_url` column to `campaigns` table
    - Column is nullable text type to store Make.com webhook URLs
    
  2. Purpose
    - Each campaign will store its webhook URL for triggering Make.com automations
    - URL will be populated from business settings when campaigns are created
*/

-- Add webhook_url column to campaigns table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'campaigns' AND column_name = 'webhook_url'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN webhook_url text;
  END IF;
END $$;