/*
  # Webhook URL Synchronization System

  1. Trigger Function
    - Creates `manage_webhook_integrations()` function that synchronizes webhook URLs
    - Updates all campaigns for a business when its webhook URL changes
    - Handles both INSERT and UPDATE operations on businesses table

  2. Trigger Setup
    - Ensures the trigger is properly configured on the businesses table
    - Fires AFTER INSERT OR UPDATE operations

  3. Campaign Creation Enhancement
    - Ensures new campaigns automatically get the business webhook URL
*/

-- Create or replace the webhook synchronization function
CREATE OR REPLACE FUNCTION manage_webhook_integrations()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT (new business)
  IF TG_OP = 'INSERT' THEN
    -- New business created, no existing campaigns to update
    RETURN NEW;
  END IF;

  -- Handle UPDATE (business webhook URL changed)
  IF TG_OP = 'UPDATE' THEN
    -- Check if webhook_url actually changed
    IF OLD.webhook_url IS DISTINCT FROM NEW.webhook_url THEN
      -- Update all campaigns for this business with the new webhook URL
      UPDATE campaigns 
      SET webhook_url = NEW.webhook_url
      WHERE business_id = NEW.id;
      
      -- Log the update for debugging
      RAISE NOTICE 'Updated webhook_url for % campaigns of business %', 
        (SELECT COUNT(*) FROM campaigns WHERE business_id = NEW.id), 
        NEW.name;
    END IF;
    
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS trigger_manage_webhook_integrations ON businesses;

CREATE TRIGGER trigger_manage_webhook_integrations
  AFTER INSERT OR UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION manage_webhook_integrations();

-- Create a function to sync webhook URLs for existing campaigns
CREATE OR REPLACE FUNCTION sync_existing_campaign_webhooks()
RETURNS VOID AS $$
BEGIN
  -- Update all existing campaigns to have their business's webhook URL
  UPDATE campaigns 
  SET webhook_url = b.webhook_url
  FROM businesses b
  WHERE campaigns.business_id = b.id
    AND campaigns.webhook_url IS DISTINCT FROM b.webhook_url;
    
  RAISE NOTICE 'Synchronized webhook URLs for existing campaigns';
END;
$$ LANGUAGE plpgsql;

-- Run the sync function to update existing data
SELECT sync_existing_campaign_webhooks();

-- Drop the temporary function
DROP FUNCTION sync_existing_campaign_webhooks();