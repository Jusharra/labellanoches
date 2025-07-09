/*
  # Fix campaigns table RLS policies for Clerk JWT authentication

  1. Policy Updates
    - Drop existing admin policies that incorrectly check role() = 'authenticated'
    - Create new admin policies that properly check JWT role claim
    - Ensure policies work with Clerk JWT template containing role claim

  2. Changes Made
    - Updated admin DELETE policy to check JWT role claim
    - Updated admin INSERT policies to check JWT role claim  
    - Updated admin SELECT policy to check JWT role claim
    - Updated admin UPDATE policy to check JWT role claim

  3. Authentication Flow
    - Clerk JWT template must include: {"role": "{{user.public_metadata.role}}"}
    - Policies now check: (jwt() ->> 'role'::text) = 'admin'::text
    - User must have role = 'admin' in their Clerk public metadata
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
  USING ((jwt() ->> 'role'::text) = 'admin'::text);

CREATE POLICY "Admin can INSERT all campaigns"
  ON campaigns
  FOR INSERT
  TO authenticated
  WITH CHECK ((jwt() ->> 'role'::text) = 'admin'::text);

CREATE POLICY "Admin can SELECT all campaigns"
  ON campaigns
  FOR SELECT
  TO authenticated
  USING ((jwt() ->> 'role'::text) = 'admin'::text);

CREATE POLICY "Admin can UPDATE all campaigns"
  ON campaigns
  FOR UPDATE
  TO authenticated
  USING ((jwt() ->> 'role'::text) = 'admin'::text)
  WITH CHECK ((jwt() ->> 'role'::text) = 'admin'::text);

-- Business users can still manage their own campaigns (keep existing policies)
-- These policies remain unchanged and work correctly