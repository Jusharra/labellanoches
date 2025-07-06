/*
  # Add Twilio Number column to businesses table

  1. Changes
    - Add `twilio_number` column to `businesses` table if it doesn't exist
    - Column type: text, nullable
    - This will store the Twilio phone number for SMS operations

  Note: This migration checks if the column exists before adding it to avoid conflicts.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'twilio_number'
  ) THEN
    ALTER TABLE businesses ADD COLUMN twilio_number text;
  END IF;
END $$;