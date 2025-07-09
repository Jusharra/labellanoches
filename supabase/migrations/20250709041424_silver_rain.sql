/*
  # Fix RLS policies for campaigns table to work with Clerk authentication

  1. Security Changes
    - Update admin policies to use correct JWT claims access
    - Fix authentication check to use current_setting instead of jwt() function
    - Ensure proper role-based access control for campaign management

  2. Policy Updates
    - Admin users can perform all CRUD operations on campaigns
    - Business users can manage their own campaigns (existing policies remain)
    - Use Clerk's JWT template format for role checking
*/

-- Drop existing admin policies that use incorrect authentication check
DROP POLICY IF EXISTS "Admin can DELETE all campaigns" ON campaigns;
DROP POLICY IF EXISTS "Admin can INSERT all campaigns" ON campaigns;
DROP POLICY IF EXISTS "Admin can INSERT campaigns for any business" ON campaigns;
DROP POLICY IF EXISTS "Admin can SELECT all campaigns" ON campaigns;
DROP POLICY IF EXISTS "Admin can UPDATE all campaigns" ON campaigns;

-- Create new admin policies that properly check JWT role claim
CREATE POLICY "Admin can DELETE all campaigns"
  ON campaigns
  FOR DELETE
  TO authenticated
  USING (current_setting('request.jwt.claims.role'::text, true) = 'admin'::text);

CREATE POLICY "Admin can INSERT all campaigns"
  ON campaigns
  FOR INSERT
  TO authenticated
  WITH CHECK (current_setting('request.jwt.claims.role'::text, true) = 'admin'::text);

CREATE POLICY "Admin can SELECT all campaigns"
  ON campaigns
  FOR SELECT
  TO authenticated
  USING (current_setting('request.jwt.claims.role'::text, true) = 'admin'::text);

CREATE POLICY "Admin can UPDATE all campaigns"
  ON campaigns
  FOR UPDATE
  TO authenticated
  USING (current_setting('request.jwt.claims.role'::text, true) = 'admin'::text)
  WITH CHECK (current_setting('request.jwt.claims.role'::text, true) = 'admin'::text);

-- Business users can still manage their own campaigns (keep existing policies)
-- These policies remain unchanged and work correctly