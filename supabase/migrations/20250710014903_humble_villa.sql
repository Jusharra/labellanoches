/*
  # Fix infinite recursion in user_profiles RLS policies

  1. Problem
    - Admin policies on user_profiles table create infinite recursion
    - Policies query user_profiles table to check if user is admin
    - This creates circular dependency when accessing user_profiles

  2. Solution
    - Drop problematic admin policies that cause recursion
    - Create simplified policies that don't create circular dependencies
    - Use auth.uid() for basic access control
    - Allow service_role to manage all profiles for admin operations

  3. Security
    - Users can only access their own profile
    - Service role can manage all profiles (for admin operations)
    - Public can insert profiles (for registration)
*/

-- Drop all existing policies on user_profiles table
DROP POLICY IF EXISTS "Admins can DELETE user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can INSERT user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can SELECT user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can UPDATE user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage all user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can SELECT their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can UPDATE their own profile" ON user_profiles;
DROP POLICY IF EXISTS "public_can_insert_profiles" ON user_profiles;
DROP POLICY IF EXISTS "service_role_can_manage_all_profiles" ON user_profiles;
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "users_can_read_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON user_profiles;

-- Create new simplified policies without circular dependencies
CREATE POLICY "Users can read their own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Public can insert profiles during registration"
  ON user_profiles
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Service role can manage all profiles"
  ON user_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create a helper function for admin checks that doesn't cause recursion
CREATE OR REPLACE FUNCTION public.is_admin_user(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = user_id 
    AND role = 'admin'
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin_user TO authenticated;