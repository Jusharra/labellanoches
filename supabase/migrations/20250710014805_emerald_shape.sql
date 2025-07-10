/*
  # Fix user_profiles RLS policies to prevent infinite recursion

  1. Problem
    - Several RLS policies on user_profiles table are causing infinite recursion
    - Policies that check `role = 'admin'::text` create circular dependency
    - When fetching user role, policies try to check the same table they're protecting

  2. Solution
    - Drop existing problematic policies
    - Create new policies that avoid circular dependency
    - Ensure users can read their own profile without role checks
    - Use auth.uid() for user identification instead of role-based checks

  3. New Policies
    - Users can read their own profile data
    - Users can update their own profile data
    - Service role can manage all profiles (for admin operations)
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "delete_user_profiles_admin" ON user_profiles;
DROP POLICY IF EXISTS "insert_user_profiles_admin" ON user_profiles;
DROP POLICY IF EXISTS "jwt_admins_can_manage_all_user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "jwt_users_can_update_their_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "jwt_users_can_view_their_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "select_user_profiles_admin" ON user_profiles;
DROP POLICY IF EXISTS "update_user_profiles_admin" ON user_profiles;

-- Create new policies that avoid circular dependency

-- Allow users to read their own profile (no role check needed)
CREATE POLICY "users_can_read_own_profile" ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to update their own profile (no role check needed)
CREATE POLICY "users_can_update_own_profile" ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow service role to manage all profiles (for admin operations)
CREATE POLICY "service_role_can_manage_all_profiles" ON user_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to insert their own profile during signup
CREATE POLICY "users_can_insert_own_profile" ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow public access for profile creation during signup process
CREATE POLICY "public_can_insert_profiles" ON user_profiles
  FOR INSERT
  TO public
  WITH CHECK (true);