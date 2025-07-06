/*
  # Update Campaign Trigger for Bulk Sending

  This migration updates the `send_campaign_status_to_make` trigger function to properly
  send campaigns to ALL contacts in the selected contact lists, not just one contact.

  ## Changes Made:
  1. **Bulk Contact Processing**: Function now iterates through ALL contacts in target_contact_lists
  2. **Personalized Messages**: Replaces {{Name}}, {{Phone}}, {{Email}} placeholders for each contact
  3. **Individual Webhook Calls**: Sends separate HTTP POST request for each contact
  4. **Campaign Logging**: Records each sent message in campaign_logs table
  5. **Channel Support**: Handles both SMS and WhatsApp channels with appropriate phone numbers
  6. **Error Handling**: Graceful handling of missing webhook URLs and contact data

  ## Function Behavior:
  - Triggers when campaign status changes to 'sending'
  - Fetches all contacts from target_contact_lists via contact_list_members join
  - Sends personalized messages to each contact through Make.com webhook
  - Logs each successful send in campaign_logs table
*/

CREATE OR REPLACE FUNCTION public.send_campaign_status_to_make()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    contact_record RECORD;
    campaign_message TEXT;
    campaign_channel TEXT;
    campaign_webhook_url TEXT;
    campaign_media_url TEXT;
    personalized_sms_text TEXT;
    personalized_whatsapp_text TEXT;
    business_twilio_number TEXT;
    business_whatsapp_number TEXT;
    message_to_send TEXT;
    recipient_phone TEXT;
    contacts_processed INTEGER := 0;
BEGIN
    -- Only proceed if the status is being updated to 'sending'
    IF NEW.status = 'sending' THEN
        RAISE NOTICE 'Campaign % (%) is being set to sending status', NEW.title, NEW.id;
        
        -- Get campaign details
        campaign_message := NEW.message;
        campaign_channel := NEW.channel;
        campaign_webhook_url := NEW.webhook_url;
        campaign_media_url := NEW.media_url;
        personalized_sms_text := NEW."Personalized SMS Text";
        personalized_whatsapp_text := NEW."Personalized WhatsApp Text";

        -- Get business Twilio and WhatsApp numbers
        SELECT twilio_number, whatsapp_number INTO business_twilio_number, business_whatsapp_number
        FROM public.businesses
        WHERE id = NEW.business_id;

        RAISE NOTICE 'Business numbers - Twilio: %, WhatsApp: %', business_twilio_number, business_whatsapp_number;

        -- Check if webhook URL exists
        IF campaign_webhook_url IS NULL OR campaign_webhook_url = '' THEN
            RAISE WARNING 'Campaign % (ID: %) is in "sending" status but has no webhook_url. Skipping sending.', NEW.title, NEW.id;
            RETURN NEW;
        END IF;

        RAISE NOTICE 'Using webhook URL: %', campaign_webhook_url;

        -- Check if target_contact_lists exists and is not empty
        IF NEW.target_contact_lists IS NULL OR jsonb_array_length(NEW.target_contact_lists) = 0 THEN
            RAISE WARNING 'Campaign % (ID: %) has no target contact lists. Skipping sending.', NEW.title, NEW.id;
            RETURN NEW;
        END IF;

        RAISE NOTICE 'Target contact lists: %', NEW.target_contact_lists;

        -- Iterate over contacts in the target contact lists
        FOR contact_record IN
            SELECT DISTINCT
                c.id AS contact_id,
                c.name AS contact_name,
                c.phone_number AS contact_phone_number,
                c.whatsapp_number AS contact_whatsapp_number,
                c.email AS contact_email
            FROM
                public.contacts c
            JOIN
                public.contact_list_members clm ON c.id = clm.contact_id
            WHERE
                clm.contact_list_id = ANY(
                    SELECT jsonb_array_elements_text(NEW.target_contact_lists)::uuid
                )
                AND c.opted_in = true  -- Only send to opted-in contacts
        LOOP
            contacts_processed := contacts_processed + 1;
            
            RAISE NOTICE 'Processing contact % (%): %', contacts_processed, contact_record.contact_id, contact_record.contact_name;

            -- Determine message content and recipient phone based on channel
            IF campaign_channel = 'whatsapp' THEN
                message_to_send := COALESCE(personalized_whatsapp_text, campaign_message);
                recipient_phone := COALESCE(contact_record.contact_whatsapp_number, contact_record.contact_phone_number);
            ELSE -- 'sms' or 'both' - default to SMS
                message_to_send := COALESCE(personalized_sms_text, campaign_message);
                recipient_phone := contact_record.contact_phone_number;
            END IF;

            -- Skip if no phone number available
            IF recipient_phone IS NULL OR recipient_phone = '' THEN
                RAISE WARNING 'Skipping contact % - no phone number available', contact_record.contact_name;
                CONTINUE;
            END IF;

            -- Replace placeholders in the message with actual contact data
            message_to_send := REPLACE(message_to_send, '{{Name}}', COALESCE(contact_record.contact_name, ''));
            message_to_send := REPLACE(message_to_send, '{{Phone}}', COALESCE(contact_record.contact_phone_number, ''));
            message_to_send := REPLACE(message_to_send, '{{Email}}', COALESCE(contact_record.contact_email, ''));

            RAISE NOTICE 'Sending to %: %', recipient_phone, LEFT(message_to_send, 50) || '...';

            -- Send HTTP POST request to Make.com webhook for each contact
            BEGIN
                PERFORM net.http_post(
                    campaign_webhook_url,
                    jsonb_build_object(
                        'campaign_id', NEW.id,
                        'campaign_title', NEW.title,
                        'message', message_to_send,
                        'channel', campaign_channel,
                        'media_url', campaign_media_url,
                        'recipient_id', contact_record.contact_id,
                        'recipient_name', contact_record.contact_name,
                        'recipient_phone_number', recipient_phone,
                        'recipient_whatsapp_number', contact_record.contact_whatsapp_number,
                        'recipient_email', contact_record.contact_email,
                        'from_number', CASE
                                        WHEN campaign_channel = 'whatsapp' THEN business_whatsapp_number
                                        ELSE business_twilio_number
                                       END,
                        'business_id', NEW.business_id
                    )
                );

                -- Log the sent message in campaign_logs
                INSERT INTO public.campaign_logs (campaign_id, contact_id, message, channel, status, timestamp)
                VALUES (NEW.id, contact_record.contact_id, message_to_send, campaign_channel, 'sent', NOW());

                RAISE NOTICE 'Successfully sent message to contact % via webhook', contact_record.contact_name;

            EXCEPTION WHEN OTHERS THEN
                -- Log failed send attempt
                INSERT INTO public.campaign_logs (campaign_id, contact_id, message, channel, status, timestamp)
                VALUES (NEW.id, contact_record.contact_id, message_to_send, campaign_channel, 'failed', NOW());
                
                RAISE WARNING 'Failed to send message to contact % (ID: %): %', contact_record.contact_name, contact_record.contact_id, SQLERRM;
            END;
        END LOOP;

        RAISE NOTICE 'Campaign % processing complete. Processed % contacts.', NEW.title, contacts_processed;
        
        -- If no contacts were processed, log a warning
        IF contacts_processed = 0 THEN
            RAISE WARNING 'Campaign % (ID: %) had no eligible contacts to send to. Check target lists and opt-in status.', NEW.title, NEW.id;
        END IF;

    END IF;
    
    RETURN NEW;
END;
$function$;

-- Ensure the trigger is properly configured
-- (The trigger should already exist, but this ensures it's correctly set up)
DROP TRIGGER IF EXISTS "Local SMS Engine" ON public.campaigns;

CREATE TRIGGER "Local SMS Engine"
    AFTER UPDATE OF status ON public.campaigns
    FOR EACH ROW
    EXECUTE FUNCTION public.send_campaign_status_to_make();

-- Add a comment to document the trigger
COMMENT ON TRIGGER "Local SMS Engine" ON public.campaigns IS 
'Triggers bulk SMS/WhatsApp sending when campaign status changes to "sending". Sends personalized messages to all contacts in target_contact_lists via Make.com webhook.';