/*
  # Configure Clerk JWT Integration

  1. Helper Functions
    - Create custom helper functions for JWT claims
    - Work with existing Supabase auth functions
    - Add business role checking functions

  2. RLS Policies
    - Update all tables to use JWT-based authentication
    - Implement admin and business user role separation
    - Add public access where appropriate

  3. Security
    - Enable RLS on all tables
    - Create comprehensive policies for all operations
    - Grant proper permissions
*/

-- Drop existing custom functions if they exist
DROP FUNCTION IF EXISTS auth.email();
DROP FUNCTION IF EXISTS auth.role();
DROP FUNCTION IF EXISTS get_user_role();
DROP FUNCTION IF EXISTS is_admin();
DROP FUNCTION IF EXISTS is_business_user();
DROP FUNCTION IF EXISTS get_user_business_id();

-- Create helper functions for JWT claims (using different names to avoid conflicts)
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

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- USER PROFILES policies
CREATE POLICY "Admins can manage all user profiles"
ON user_profiles FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Users can view their own profile"
ON user_profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON user_profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- BUSINESSES policies (update existing)
DROP POLICY IF EXISTS "Admins can manage all businesses" ON businesses;
DROP POLICY IF EXISTS "Business users can view their business" ON businesses;
DROP POLICY IF EXISTS "Business admins can view assigned businesses" ON businesses;
DROP POLICY IF EXISTS "Business can SELECT their own business" ON businesses;
DROP POLICY IF EXISTS "Business can UPDATE their own business" ON businesses;
DROP POLICY IF EXISTS "Business can INSERT their own business" ON businesses;

CREATE POLICY "Admins can manage all businesses"
ON businesses FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Business users can view their business"
ON businesses FOR SELECT
TO authenticated
USING (
  is_business_user() AND 
  id = get_user_business_id()
);

CREATE POLICY "Business users can update their business"
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

-- CONTACTS policies (update existing)
DROP POLICY IF EXISTS "Admins can manage all contacts" ON contacts;
DROP POLICY IF EXISTS "Business users can manage their contacts" ON contacts;
DROP POLICY IF EXISTS "Business can SELECT their own contacts" ON contacts;
DROP POLICY IF EXISTS "Business can INSERT contacts for their own business" ON contacts;
DROP POLICY IF EXISTS "Business can UPDATE their own contacts" ON contacts;
DROP POLICY IF EXISTS "Business can DELETE their own contacts" ON contacts;
DROP POLICY IF EXISTS "Admins can insert contacts" ON contacts;

CREATE POLICY "Admins can manage all contacts"
ON contacts FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Business users can manage their contacts"
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
CREATE POLICY "Public can create contacts for opt-in"
ON contacts FOR INSERT
TO anon
WITH CHECK (true);

-- CONTACT LISTS policies (update existing)
DROP POLICY IF EXISTS "Admins can manage all contact_lists" ON contact_lists;
DROP POLICY IF EXISTS "Business can manage own contact_lists" ON contact_lists;
DROP POLICY IF EXISTS "Users can create contact lists" ON contact_lists;
DROP POLICY IF EXISTS "Users can view contact lists" ON contact_lists;
DROP POLICY IF EXISTS "Users can update contact lists" ON contact_lists;
DROP POLICY IF EXISTS "Users can delete contact lists" ON contact_lists;
DROP POLICY IF EXISTS "Admins can delete contact_lists" ON contact_lists;
DROP POLICY IF EXISTS "Admins can insert contact_lists" ON contact_lists;
DROP POLICY IF EXISTS "Admins can update contact_lists" ON contact_lists;

CREATE POLICY "Admins can manage all contact lists"
ON contact_lists FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Business users can manage their contact lists"
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

-- CONTACT LIST MEMBERS policies (update existing)
DROP POLICY IF EXISTS "Admins can manage all contact_list_members" ON contact_list_members;
DROP POLICY IF EXISTS "Business can manage own contact_list_members" ON contact_list_members;
DROP POLICY IF EXISTS "Users can add contacts to their business lists" ON contact_list_members;
DROP POLICY IF EXISTS "Users can remove contacts from their business lists" ON contact_list_members;
DROP POLICY IF EXISTS "Users can view contact list members for their business" ON contact_list_members;
DROP POLICY IF EXISTS "Admins can delete contact_list_members" ON contact_list_members;
DROP POLICY IF EXISTS "Admins can insert contact_list_members" ON contact_list_members;
DROP POLICY IF EXISTS "Admins can update contact_list_members" ON contact_list_members;

CREATE POLICY "Admins can manage all contact list members"
ON contact_list_members FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Business users can manage their contact list members"
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

-- CAMPAIGNS policies (update existing)
DROP POLICY IF EXISTS "Admin can SELECT all campaigns" ON campaigns;
DROP POLICY IF EXISTS "Admin can INSERT all campaigns" ON campaigns;
DROP POLICY IF EXISTS "Admin can UPDATE all campaigns" ON campaigns;
DROP POLICY IF EXISTS "Admin can DELETE all campaigns" ON campaigns;
DROP POLICY IF EXISTS "Business can SELECT own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Business can INSERT campaigns for own business" ON campaigns;
DROP POLICY IF EXISTS "Business can UPDATE own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Business can DELETE own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Business users can manage their campaigns" ON campaigns;
DROP POLICY IF EXISTS "allow_admin_update_sent_at" ON campaigns;

CREATE POLICY "Admins can manage all campaigns"
ON campaigns FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Business users can manage their campaigns"
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

-- CAMPAIGN LOGS policies (update existing)
DROP POLICY IF EXISTS "Admin can SELECT all campaign logs" ON campaign_logs;
DROP POLICY IF EXISTS "Admin can INSERT all campaign logs" ON campaign_logs;
DROP POLICY IF EXISTS "Admin can UPDATE all campaign logs" ON campaign_logs;
DROP POLICY IF EXISTS "Admin can DELETE all campaign logs" ON campaign_logs;

CREATE POLICY "Admins can manage all campaign logs"
ON campaign_logs FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Business users can view their campaign logs"
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

-- SMS LOGS policies (update existing)
DROP POLICY IF EXISTS "Admins can SELECT sms logs" ON sms_logs;
DROP POLICY IF EXISTS "Admins can INSERT sms logs" ON sms_logs;
DROP POLICY IF EXISTS "Admins can UPDATE sms logs" ON sms_logs;
DROP POLICY IF EXISTS "Admins can DELETE sms logs" ON sms_logs;
DROP POLICY IF EXISTS "Businesses can SELECT their own SMS logs" ON sms_logs;

CREATE POLICY "Admins can manage all sms logs"
ON sms_logs FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Business users can view their sms logs"
ON sms_logs FOR SELECT
TO authenticated
USING (
  is_business_user() AND 
  business_id = get_user_business_id()
);

-- MENU ITEMS policies (update existing)
DROP POLICY IF EXISTS "Admins can manage all menu_items" ON menu_items;
DROP POLICY IF EXISTS "Business can manage own menu_items" ON menu_items;

CREATE POLICY "Admins can manage all menu items"
ON menu_items FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Business users can manage their menu items"
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
CREATE POLICY "Public can view active menu items"
ON menu_items FOR SELECT
TO anon
USING (is_active = true);

-- MENU ORDERS policies (tighten existing broad policies)
DROP POLICY IF EXISTS "Authenticated can read all menu orders" ON menu_orders;
DROP POLICY IF EXISTS "Public can create menu orders" ON menu_orders;
DROP POLICY IF EXISTS "Authenticated can update menu orders" ON menu_orders;
DROP POLICY IF EXISTS "Authenticated can delete menu orders" ON menu_orders;

CREATE POLICY "Admins can manage all menu orders"
ON menu_orders FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Business users can manage menu orders"
ON menu_orders FOR ALL
TO authenticated
USING (is_business_user())
WITH CHECK (is_business_user());

-- Allow public to create orders (for SMS/WhatsApp ordering)
CREATE POLICY "Public can create menu orders"
ON menu_orders FOR INSERT
TO anon
WITH CHECK (true);

-- BOOKINGS policies (update existing)
DROP POLICY IF EXISTS "Admin can SELECT all bookings" ON bookings;
DROP POLICY IF EXISTS "Admin can INSERT all bookings" ON bookings;
DROP POLICY IF EXISTS "Admin can UPDATE all bookings" ON bookings;
DROP POLICY IF EXISTS "Admin can DELETE all bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can manage all bookings" ON bookings;
DROP POLICY IF EXISTS "Business can SELECT their bookings" ON bookings;
DROP POLICY IF EXISTS "Business can INSERT their bookings" ON bookings;
DROP POLICY IF EXISTS "Business can UPDATE their bookings" ON bookings;
DROP POLICY IF EXISTS "Business can DELETE their bookings" ON bookings;

CREATE POLICY "Admins can manage all bookings"
ON bookings FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Business users can manage their bookings"
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

-- ORDERS policies (update existing)
DROP POLICY IF EXISTS "Admins can SELECT all orders" ON orders;
DROP POLICY IF EXISTS "Admins can INSERT all orders" ON orders;
DROP POLICY IF EXISTS "Admins can UPDATE all orders" ON orders;
DROP POLICY IF EXISTS "Admins can DELETE all orders" ON orders;
DROP POLICY IF EXISTS "Business can SELECT their own orders" ON orders;
DROP POLICY IF EXISTS "Business can INSERT their own orders" ON orders;
DROP POLICY IF EXISTS "Business can UPDATE their own orders" ON orders;

CREATE POLICY "Admins can manage all orders"
ON orders FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Business users can manage their orders"
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

-- PAYMENTS policies (update existing)
DROP POLICY IF EXISTS "Admins can manage payments" ON payments;
DROP POLICY IF EXISTS "Business can manage own payments" ON payments;

CREATE POLICY "Admins can manage all payments"
ON payments FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Business users can manage their payments"
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

-- SUBSCRIPTIONS policies (update existing)
DROP POLICY IF EXISTS "Admins can manage subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Business can manage own subscriptions" ON subscriptions;

CREATE POLICY "Admins can manage all subscriptions"
ON subscriptions FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Business users can manage their subscriptions"
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

-- AVAILABILITY policies (update existing)
DROP POLICY IF EXISTS "Admin can SELECT all availability" ON availability;
DROP POLICY IF EXISTS "Admin can INSERT all availability" ON availability;
DROP POLICY IF EXISTS "Admin can UPDATE all availability" ON availability;
DROP POLICY IF EXISTS "Admin can DELETE all availability" ON availability;
DROP POLICY IF EXISTS "Business can SELECT their availability" ON availability;
DROP POLICY IF EXISTS "Business can INSERT their availability" ON availability;
DROP POLICY IF EXISTS "Business can UPDATE their availability" ON availability;
DROP POLICY IF EXISTS "Business can DELETE their availability" ON availability;

CREATE POLICY "Admins can manage all availability"
ON availability FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Business users can manage their availability"
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

-- LOYALTY PROGRAMS policies (update existing)
DROP POLICY IF EXISTS "Admins can manage all loyalty_programs" ON loyalty_programs;
DROP POLICY IF EXISTS "Businesses can manage own loyalty_programs" ON loyalty_programs;

CREATE POLICY "Admins can manage all loyalty programs"
ON loyalty_programs FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Business users can manage their loyalty programs"
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

-- LOYALTY CARDS policies (update existing)
DROP POLICY IF EXISTS "Admins can manage all loyalty_cards" ON loyalty_cards;
DROP POLICY IF EXISTS "Businesses can manage own loyalty_cards" ON loyalty_cards;

CREATE POLICY "Admins can manage all loyalty cards"
ON loyalty_cards FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Business users can manage their loyalty cards"
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

-- MEDIA LIBRARY policies (update existing)
DROP POLICY IF EXISTS "Admins can manage all media_library" ON media_library;
DROP POLICY IF EXISTS "Businesses can manage their own media_library" ON media_library;

CREATE POLICY "Admins can manage all media library"
ON media_library FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Business users can manage their media library"
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

-- MEDIA ASSETS policies (update existing)
DROP POLICY IF EXISTS "Admins can manage media_assets" ON media_assets;
DROP POLICY IF EXISTS "Business can manage own media_assets" ON media_assets;

CREATE POLICY "Admins can manage all media assets"
ON media_assets FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Business users can manage their media assets"
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

-- WEBHOOK INTEGRATIONS policies (update existing)
DROP POLICY IF EXISTS "Admins can manage all webhook_integrations" ON webhook_integrations;
DROP POLICY IF EXISTS "Business can manage own webhook_integrations" ON webhook_integrations;

CREATE POLICY "Admins can manage all webhook integrations"
ON webhook_integrations FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Business users can manage their webhook integrations"
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

-- SMS SEQUENCES policies (update existing)
DROP POLICY IF EXISTS "Admins can manage all sms_sequences" ON sms_sequences;
DROP POLICY IF EXISTS "Business can manage own sms_sequences" ON sms_sequences;

CREATE POLICY "Admins can manage all sms sequences"
ON sms_sequences FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Business users can manage their sms sequences"
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

-- SMS SEQUENCE STEPS policies (update existing)
DROP POLICY IF EXISTS "Admins can manage all sms_sequence_steps" ON sms_sequence_steps;
DROP POLICY IF EXISTS "Business can manage own sms_sequence_steps" ON sms_sequence_steps;

CREATE POLICY "Admins can manage all sms sequence steps"
ON sms_sequence_steps FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Business users can manage their sms sequence steps"
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

-- REDEMPTIONS policies (was missing)
CREATE POLICY "Admins can manage all redemptions"
ON redemptions FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Business users can view redemptions for their campaigns"
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

-- CALL REPORTS policies (update existing)
DROP POLICY IF EXISTS "Admins can SELECT call reports" ON call_reports;
DROP POLICY IF EXISTS "Admins can INSERT call reports" ON call_reports;
DROP POLICY IF EXISTS "Admins can UPDATE call reports" ON call_reports;
DROP POLICY IF EXISTS "Admins can DELETE call reports" ON call_reports;
DROP POLICY IF EXISTS "Businesses can SELECT their own call reports" ON call_reports;

CREATE POLICY "Admins can manage all call reports"
ON call_reports FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Business users can view their call reports"
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