/*
# Add recipient count to campaigns table

1. New Columns
  - `total_recipients_count` (integer, default 0) - stores the number of recipients targeted by a campaign

2. Changes
  - Adds column to track total number of recipients for each campaign
  - Sets default value to 0 for existing records
*/

-- Add total_recipients_count column to campaigns table
ALTER TABLE IF EXISTS public.campaigns 
ADD COLUMN IF NOT EXISTS total_recipients_count integer DEFAULT 0;