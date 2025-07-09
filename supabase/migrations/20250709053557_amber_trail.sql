/*
  # Fix RLS policies and JWT helper functions

  1. Security
    - Drop all existing JWT-based policies that depend on functions
    - Drop and recreate helper functions for JWT claims
    - Create comprehensive RLS policies for all tables
    - Enable RLS on all tables
  
  2. Changes
    - Replaces inconsistent policy names with standardized ones
    - Ensures all tables have proper admin and business user access
    - Fixes JWT function dependencies
*/

-- First, drop all existing JWT policies that depend on the functions
DROP POLICY IF EXISTS "jwt_admins_can_manage_all_user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "jwt_admins_can_manage_all_businesses" ON businesses;
DROP POLICY IF EXISTS "jwt_admins_can_manage_all_contacts" ON contacts;
DROP POLICY IF EXISTS "jwt_admins_can_manage_all_contact_lists" ON contact_lists;
DROP POLICY IF EXISTS "jwt_admins_can_manage_all_contact_list_members" ON contact_list_members;
DROP POLICY IF EXISTS "jwt_admins_can_manage_all_campaigns" ON campaigns;
DROP POLICY IF EXISTS "jwt_admins_can_manage_all_campaign_logs" ON campaign_logs;
DROP POLICY IF EXISTS "jwt_admins_can_manage_all_sms_logs" ON sms_logs;
DROP POLICY IF EXISTS "jwt_admins_can_manage_all_menu_items" ON menu_items;
DROP POLICY IF EXISTS "jwt_admins_can_manage_all_menu_orders" ON menu_orders;
DROP POLICY IF EXISTS "jwt_admins_can_manage_all_bookings" ON bookings;
DROP POLICY IF EXISTS "jwt_admins_can_manage_all_orders" ON orders;
DROP POLICY IF EXISTS "jwt_admins_can_manage_all_payments" ON payments;
DROP POLICY IF EXISTS "jwt_admins_can_manage_all_subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "jwt_admins_can_manage_all_availability" ON availability;
DROP POLICY IF EXISTS "jwt_admins_can_manage_all_loyalty_programs" ON loyalty_programs;
DROP POLICY IF EXISTS "jwt_admins_can_manage_all_loyalty_cards" ON loyalty_cards;
DROP POLICY IF EXISTS "jwt_admins_can_manage_all_media_library" ON media_library;
DROP POLICY IF EXISTS "jwt_admins_can_manage_all_media_assets" ON media_assets;
DROP POLICY IF EXISTS "jwt_admins_can_manage_all_webhook_integrations" ON webhook_integrations;
DROP POLICY IF EXISTS "jwt_admins_can_manage_all_sms_sequences" ON sms_sequences;
DROP POLICY IF EXISTS "jwt_admins_can_manage_all_sms_sequence_steps" ON sms_sequence_steps;
DROP POLICY IF EXISTS "jwt_admins_can_manage_all_redemptions" ON redemptions;
DROP POLICY IF EXISTS "jwt_admins_can_manage_all_call_reports" ON call_reports;

-- Drop other policies that might depend on the functions
DROP POLICY IF EXISTS "jwt_business_users_can_view_their_business" ON businesses;
DROP POLICY IF EXISTS "jwt_business_users_can_update_their_business" ON businesses;
DROP POLICY IF EXISTS "jwt_business_users_can_manage_their_contacts" ON contacts;
DROP POLICY IF EXISTS "jwt_business_users_can_manage_their_contact_lists" ON contact_lists;
DROP POLICY IF EXISTS "jwt_business_users_can_manage_their_contact_list_members" ON contact_list_members;
DROP POLICY IF EXISTS "jwt_business_users_can_manage_their_campaigns" ON campaigns;
DROP POLICY IF EXISTS "jwt_business_users_can_view_their_campaign_logs" ON campaign_logs;
DROP POLICY IF EXISTS "jwt_business_users_can_view_their_sms_logs" ON sms_logs;
DROP POLICY IF EXISTS "jwt_business_users_can_manage_their_menu_items" ON menu_items;
DROP POLICY IF EXISTS "jwt_business_users_can_manage_menu_orders" ON menu_orders;
DROP POLICY IF EXISTS "jwt_business_users_can_manage_their_bookings" ON bookings;
DROP POLICY IF EXISTS "jwt_business_users_can_manage_their_orders" ON orders;
DROP POLICY IF EXISTS "jwt_business_users_can_manage_their_payments" ON payments;
DROP POLICY IF EXISTS "jwt_business_users_can_manage_their_subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "jwt_business_users_can_manage_their_availability" ON availability;
DROP POLICY IF EXISTS "jwt_business_users_can_manage_their_loyalty_programs" ON loyalty_programs;
DROP POLICY IF EXISTS "jwt_business_users_can_manage_their_loyalty_cards" ON loyalty_cards;
DROP POLICY IF EXISTS "jwt_business_users_can_manage_their_media_library" ON media_library;
DROP POLICY IF EXISTS "jwt_business_users_can_manage_their_media_assets" ON media_assets;
DROP POLICY IF EXISTS "jwt_business_users_can_manage_their_webhook_integrations" ON webhook_integrations;
DROP POLICY IF EXISTS "jwt_business_users_can_manage_their_sms_sequences" ON sms_sequences;
DROP POLICY IF EXISTS "jwt_business_users_can_manage_their_sms_sequence_steps" ON sms_sequence_steps;
DROP POLICY IF EXISTS "jwt_business_users_can_view_redemptions_for_their_campaigns" ON redemptions;
DROP POLICY IF EXISTS "jwt_business_users_can_view_their_call_reports" ON call_reports;

-- Drop other JWT policies
DROP POLICY IF EXISTS "jwt_users_can_view_their_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "jwt_users_can_update_their_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "jwt_public_can_create_contacts_for_opt_in" ON contacts;
DROP POLICY IF EXISTS "jwt_public_can_view_active_menu_items" ON menu_items;
DROP POLICY IF EXISTS "jwt_public_can_create_menu_orders" ON menu_orders;

-- Now drop the functions that were causing dependency issues
DROP FUNCTION IF EXISTS auth.email();
DROP FUNCTION IF EXISTS auth.role();
DROP FUNCTION IF EXISTS get_user_role();
DROP FUNCTION IF EXISTS is_admin();
DROP FUNCTION IF EXISTS is_business_user();
DROP FUNCTION IF EXISTS get_user_business_id();

-- Create helper functions for JWT claims
CREATE OR REPLACE FUNCTION auth.email() 
RETURNS TEXT AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'email',
    (current_setting('request.jwt.claims', true)::json ->> 'email')::text
  )
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION auth.role() 
RETURNS TEXT AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'role',
    (current_setting('request.jwt.claims', true)::json ->> 'role')::text
  )
$$ LANGUAGE SQL STABLE;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role() 
RETURNS TEXT AS $$
  SELECT auth.role()
$$ LANGUAGE SQL STABLE;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin() 
RETURNS BOOLEAN AS $$
  SELECT auth.role() = 'admin'
$$ LANGUAGE SQL STABLE;

-- Helper function to check if user is business user
CREATE OR REPLACE FUNCTION is_business_user() 
RETURNS BOOLEAN AS $$
  SELECT auth.role() = 'business'
$$ LANGUAGE SQL STABLE;

-- Helper function to get user's business ID
CREATE OR REPLACE FUNCTION get_user_business_id() 
RETURNS UUID AS $$
  SELECT business_id FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE;

-- Ensure all tables have RLS enabled
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage all businesses" ON businesses;
DROP POLICY IF EXISTS "Business users can view their business" ON businesses;
DROP POLICY IF EXISTS "Business users can update their business" ON businesses;
DROP POLICY IF EXISTS "Business admins can view assigned businesses" ON businesses;
DROP POLICY IF EXISTS "Business can SELECT their own business" ON businesses;
DROP POLICY IF EXISTS "Business can UPDATE their own business" ON businesses;
DROP POLICY IF EXISTS "Business can INSERT their own business" ON businesses;

-- USER PROFILES policies
CREATE POLICY "jwt_admins_can_manage_all_user_profiles"
ON user_profiles FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "jwt_users_can_view_their_own_profile"
ON user_profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "jwt_users_can_update_their_own_profile"
ON user_profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- BUSINESSES policies
CREATE POLICY "jwt_admins_can_manage_all_businesses"
ON businesses FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "jwt_business_users_can_view_their_business"
ON businesses FOR SELECT
TO authenticated
USING (
  is_business_user() AND 
  id = get_user_business_id()
);

CREATE POLICY "jwt_business_users_can_update_their_business"
ON businesses FOR UPDATE
TO authenticated
USING (
  is_business_user() AND 
  id = get_user_business_id()
)
WITH CHECK (
  is_business_user() AND 
  id = get_user_business_id()
);

-- CONTACTS policies
CREATE POLICY "jwt_admins_can_manage_all_contacts"
ON contacts FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "jwt_business_users_can_manage_their_contacts"
ON contacts FOR ALL
TO authenticated
USING (
  is_business_user() AND 
  business_id = get_user_business_id()
)
WITH CHECK (
  is_business_user() AND 
  business_id = get_user_business_id()
);

-- Allow public contact creation for SMS opt-in
CREATE POLICY "jwt_public_can_create_contacts_for_opt_in"
ON contacts FOR INSERT
TO anon
WITH CHECK (true);

-- CONTACT LISTS policies
CREATE POLICY "jwt_admins_can_manage_all_contact_lists"
ON contact_lists FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "jwt_business_users_can_manage_their_contact_lists"
ON contact_lists FOR ALL
TO authenticated
USING (
  is_business_user() AND 
  business_id = get_user_business_id()
)
WITH CHECK (
  is_business_user() AND 
  business_id = get_user_business_id()
);

-- CONTACT LIST MEMBERS policies
CREATE POLICY "jwt_admins_can_manage_all_contact_list_members"
ON contact_list_members FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "jwt_business_users_can_manage_their_contact_list_members"
ON contact_list_members FOR ALL
TO authenticated
USING (
  is_business_user() AND 
  EXISTS (
    SELECT 1 FROM contact_lists cl 
    WHERE cl.id = contact_list_members.contact_list_id 
    AND cl.business_id = get_user_business_id()
  )
)
WITH CHECK (
  is_business_user() AND 
  EXISTS (
    SELECT 1 FROM contact_lists cl 
    WHERE cl.id = contact_list_members.contact_list_id 
    AND cl.business_id = get_user_business_id()
  )
);

-- CAMPAIGNS policies
CREATE POLICY "jwt_admins_can_manage_all_campaigns"
ON campaigns FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "jwt_business_users_can_manage_their_campaigns"
ON campaigns FOR ALL
TO authenticated
USING (
  is_business_user() AND 
  business_id = get_user_business_id()
)
WITH CHECK (
  is_business_user() AND 
  business_id = get_user_business_id()
);

-- CAMPAIGN LOGS policies
CREATE POLICY "jwt_admins_can_manage_all_campaign_logs"
ON campaign_logs FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "jwt_business_users_can_view_their_campaign_logs"
ON campaign_logs FOR SELECT
TO authenticated
USING (
  is_business_user() AND 
  EXISTS (
    SELECT 1 FROM campaigns c 
    WHERE c.id = campaign_logs.campaign_id 
    AND c.business_id = get_user_business_id()
  )
);

-- SMS LOGS policies
CREATE POLICY "jwt_admins_can_manage_all_sms_logs"
ON sms_logs FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "jwt_business_users_can_view_their_sms_logs"
ON sms_logs FOR SELECT
TO authenticated
USING (
  is_business_user() AND 
  business_id = get_user_business_id()
);

-- MENU ITEMS policies
CREATE POLICY "jwt_admins_can_manage_all_menu_items"
ON menu_items FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "jwt_business_users_can_manage_their_menu_items"
ON menu_items FOR ALL
TO authenticated
USING (
  is_business_user() AND 
  business_id = get_user_business_id()
)
WITH CHECK (
  is_business_user() AND 
  business_id = get_user_business_id()
);

-- Allow public to view active menu items
CREATE POLICY "jwt_public_can_view_active_menu_items"
ON menu_items FOR SELECT
TO anon
USING (is_active = true);

-- MENU ORDERS policies
CREATE POLICY "jwt_admins_can_manage_all_menu_orders"
ON menu_orders FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "jwt_business_users_can_manage_menu_orders"
ON menu_orders FOR ALL
TO authenticated
USING (is_business_user())
WITH CHECK (is_business_user());

-- Allow public to create orders (for SMS/WhatsApp ordering)
CREATE POLICY "jwt_public_can_create_menu_orders"
ON menu_orders FOR INSERT
TO anon
WITH CHECK (true);

-- BOOKINGS policies
CREATE POLICY "jwt_admins_can_manage_all_bookings"
ON bookings FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "jwt_business_users_can_manage_their_bookings"
ON bookings FOR ALL
TO authenticated
USING (
  is_business_user() AND 
  business_id = get_user_business_id()
)
WITH CHECK (
  is_business_user() AND 
  business_id = get_user_business_id()
);

-- ORDERS policies
CREATE POLICY "jwt_admins_can_manage_all_orders"
ON orders FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "jwt_business_users_can_manage_their_orders"
ON orders FOR ALL
TO authenticated
USING (
  is_business_user() AND 
  business_id = get_user_business_id()
)
WITH CHECK (
  is_business_user() AND 
  business_id = get_user_business_id()
);

-- PAYMENTS policies
CREATE POLICY "jwt_admins_can_manage_all_payments"
ON payments FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "jwt_business_users_can_manage_their_payments"
ON payments FOR ALL
TO authenticated
USING (
  is_business_user() AND 
  business_id = get_user_business_id()
)
WITH CHECK (
  is_business_user() AND 
  business_id = get_user_business_id()
);

-- SUBSCRIPTIONS policies
CREATE POLICY "jwt_admins_can_manage_all_subscriptions"
ON subscriptions FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "jwt_business_users_can_manage_their_subscriptions"
ON subscriptions FOR ALL
TO authenticated
USING (
  is_business_user() AND 
  business_id = get_user_business_id()
)
WITH CHECK (
  is_business_user() AND 
  business_id = get_user_business_id()
);

-- AVAILABILITY policies
CREATE POLICY "jwt_admins_can_manage_all_availability"
ON availability FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "jwt_business_users_can_manage_their_availability"
ON availability FOR ALL
TO authenticated
USING (
  is_business_user() AND 
  business_id = get_user_business_id()
)
WITH CHECK (
  is_business_user() AND 
  business_id = get_user_business_id()
);

-- LOYALTY PROGRAMS policies
CREATE POLICY "jwt_admins_can_manage_all_loyalty_programs"
ON loyalty_programs FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "jwt_business_users_can_manage_their_loyalty_programs"
ON loyalty_programs FOR ALL
TO authenticated
USING (
  is_business_user() AND 
  business_id = get_user_business_id()
)
WITH CHECK (
  is_business_user() AND 
  business_id = get_user_business_id()
);

-- LOYALTY CARDS policies
CREATE POLICY "jwt_admins_can_manage_all_loyalty_cards"
ON loyalty_cards FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "jwt_business_users_can_manage_their_loyalty_cards"
ON loyalty_cards FOR ALL
TO authenticated
USING (
  is_business_user() AND 
  EXISTS (
    SELECT 1 FROM loyalty_programs lp 
    WHERE lp.id = loyalty_cards.program_id 
    AND lp.business_id = get_user_business_id()
  )
)
WITH CHECK (
  is_business_user() AND 
  EXISTS (
    SELECT 1 FROM loyalty_programs lp 
    WHERE lp.id = loyalty_cards.program_id 
    AND lp.business_id = get_user_business_id()
  )
);

-- MEDIA LIBRARY policies
CREATE POLICY "jwt_admins_can_manage_all_media_library"
ON media_library FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "jwt_business_users_can_manage_their_media_library"
ON media_library FOR ALL
TO authenticated
USING (
  is_business_user() AND 
  business_id = get_user_business_id()
)
WITH CHECK (
  is_business_user() AND 
  business_id = get_user_business_id()
);

-- MEDIA ASSETS policies
CREATE POLICY "jwt_admins_can_manage_all_media_assets"
ON media_assets FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "jwt_business_users_can_manage_their_media_assets"
ON media_assets FOR ALL
TO authenticated
USING (
  is_business_user() AND 
  business_id = get_user_business_id()
)
WITH CHECK (
  is_business_user() AND 
  business_id = get_user_business_id()
);

-- WEBHOOK INTEGRATIONS policies
CREATE POLICY "jwt_admins_can_manage_all_webhook_integrations"
ON webhook_integrations FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "jwt_business_users_can_manage_their_webhook_integrations"
ON webhook_integrations FOR ALL
TO authenticated
USING (
  is_business_user() AND 
  business_id = get_user_business_id()
)
WITH CHECK (
  is_business_user() AND 
  business_id = get_user_business_id()
);

-- SMS SEQUENCES policies
CREATE POLICY "jwt_admins_can_manage_all_sms_sequences"
ON sms_sequences FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "jwt_business_users_can_manage_their_sms_sequences"
ON sms_sequences FOR ALL
TO authenticated
USING (
  is_business_user() AND 
  business_id = get_user_business_id()
)
WITH CHECK (
  is_business_user() AND 
  business_id = get_user_business_id()
);

-- SMS SEQUENCE STEPS policies
CREATE POLICY "jwt_admins_can_manage_all_sms_sequence_steps"
ON sms_sequence_steps FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "jwt_business_users_can_manage_their_sms_sequence_steps"
ON sms_sequence_steps FOR ALL
TO authenticated
USING (
  is_business_user() AND 
  EXISTS (
    SELECT 1 FROM sms_sequences ss 
    WHERE ss.id = sms_sequence_steps.sequence_id 
    AND ss.business_id = get_user_business_id()
  )
)
WITH CHECK (
  is_business_user() AND 
  EXISTS (
    SELECT 1 FROM sms_sequences ss 
    WHERE ss.id = sms_sequence_steps.sequence_id 
    AND ss.business_id = get_user_business_id()
  )
);

-- REDEMPTIONS policies
CREATE POLICY "jwt_admins_can_manage_all_redemptions"
ON redemptions FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "jwt_business_users_can_view_redemptions_for_their_campaigns"
ON redemptions FOR SELECT
TO authenticated
USING (
  is_business_user() AND 
  EXISTS (
    SELECT 1 FROM campaigns c 
    WHERE c.id = redemptions.campaign_id 
    AND c.business_id = get_user_business_id()
  )
);

-- CALL REPORTS policies
CREATE POLICY "jwt_admins_can_manage_all_call_reports"
ON call_reports FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "jwt_business_users_can_view_their_call_reports"
ON call_reports FOR SELECT
TO authenticated
USING (
  is_business_user() AND 
  business_id = get_user_business_id()
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth.email() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth.role() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_business_user() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_business_id() TO authenticated, anon;