/*
  # Fix malformed target_contact_lists in campaigns table

  1. Problem
    - `target_contact_lists` column contains UUIDs with extra quotes
    - Example: `["\"03511f4b-e9a7-46d7-8ae6-5bd0132ddb3e\""]` 
    - Should be: `["03511f4b-e9a7-46d7-8ae6-5bd0132ddb3e"]`

  2. Solution
    - Iterate through all campaigns with target_contact_lists arrays
    - Remove extra quotes and escape characters from UUID strings
    - Update the cleaned data back to the database

  3. Safety
    - Only processes campaigns where target_contact_lists is a non-empty array
    - Only processes entries that contain malformed quoted strings
    - Uses transaction-safe operations
*/

DO $$
DECLARE
    campaign_record RECORD;
    cleaned_lists JSONB;
    list_item TEXT;
    temp_array TEXT[];
    cleaned_item TEXT;
    processed_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting cleanup of malformed target_contact_lists...';
    
    -- Iterate over campaigns where target_contact_lists is a non-empty array
    -- and contains elements that look like they have extra quotes
    FOR campaign_record IN
        SELECT id, target_contact_lists, title
        FROM public.campaigns
        WHERE jsonb_typeof(target_contact_lists) = 'array'
          AND jsonb_array_length(target_contact_lists) > 0
          AND EXISTS (
                SELECT 1
                FROM jsonb_array_elements_text(target_contact_lists) AS elem
                WHERE elem LIKE '\"%' AND elem LIKE '%\"' -- Check for strings that start and end with escaped quotes
              )
    LOOP
        temp_array := ARRAY[]::TEXT[];
        
        -- Process each list item in the array
        FOR list_item IN SELECT * FROM jsonb_array_elements_text(campaign_record.target_contact_lists)
        LOOP
            -- Clean up the UUID string:
            -- 1. Remove leading and trailing quotes
            -- 2. Remove escaped quotes (\")
            -- 3. Ensure we have a clean UUID string
            cleaned_item := list_item;
            
            -- Remove escaped quotes first
            cleaned_item := REPLACE(cleaned_item, '\"', '');
            
            -- Remove any remaining leading/trailing quotes
            cleaned_item := TRIM(BOTH '"' FROM cleaned_item);
            
            -- Only add if it looks like a valid UUID (basic validation)
            IF cleaned_item ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
                temp_array := array_append(temp_array, cleaned_item);
            ELSE
                RAISE NOTICE 'Skipping invalid UUID format in campaign %: %', campaign_record.title, cleaned_item;
            END IF;
        END LOOP;

        -- Convert the cleaned text array back to a JSONB array
        cleaned_lists := to_jsonb(temp_array);

        -- Update the campaign with cleaned data
        UPDATE public.campaigns
        SET target_contact_lists = cleaned_lists
        WHERE id = campaign_record.id;
        
        processed_count := processed_count + 1;
        RAISE NOTICE 'Cleaned campaign "%" (ID: %) - Lists: % -> %', 
                     campaign_record.title, 
                     campaign_record.id, 
                     campaign_record.target_contact_lists, 
                     cleaned_lists;
    END LOOP;
    
    RAISE NOTICE 'Cleanup completed. Processed % campaigns.', processed_count;
    
    -- Verify the cleanup worked
    PERFORM (
        SELECT COUNT(*)
        FROM public.campaigns
        WHERE jsonb_typeof(target_contact_lists) = 'array'
          AND jsonb_array_length(target_contact_lists) > 0
          AND EXISTS (
                SELECT 1
                FROM jsonb_array_elements_text(target_contact_lists) AS elem
                WHERE elem LIKE '\"%' AND elem LIKE '%\"'
              )
    );
    
    IF FOUND THEN
        RAISE NOTICE 'Warning: Some campaigns may still have malformed target_contact_lists';
    ELSE
        RAISE NOTICE 'Success: All target_contact_lists have been cleaned up';
    END IF;
    
END $$;

-- Add a comment to track this migration
COMMENT ON TABLE public.campaigns IS 'Updated 2025-01-08: Fixed malformed target_contact_lists with extra quotes around UUIDs';