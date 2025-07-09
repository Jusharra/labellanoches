/*
  # Fix businesses table INSERT policy

  1. Security
    - Add INSERT policy for authenticated users to create business records
    - Allow admins to insert any business record
    - Allow business users to insert records where they are the creator
*/

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "jwt_authenticated_users_can_insert_businesses" ON businesses;

-- Create INSERT policy for authenticated users
CREATE POLICY "jwt_authenticated_users_can_insert_businesses"
  ON businesses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if user is admin
    is_admin() 
    OR 
    -- Allow if user is creating a business and they are the creator
    (auth.uid() = created_by)
  );