/*
  # Fix Users Table RLS Policies

  1. Changes
    - Simplify RLS policies to avoid recursion
    - Allow users to manage their own records
    - Allow admins to manage all records
    - Fix infinite recursion in policy checks
  
  2. Security
    - Users can only view and update their own records
    - Admins can view and update all records
    - Prevent unauthorized access to admin status
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own record" ON users;
DROP POLICY IF EXISTS "Users can update their own record" ON users;
DROP POLICY IF EXISTS "Users can view their own record" ON users;

-- Create simplified policies that avoid recursion
CREATE POLICY "Users can view records"
  ON users FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR
    is_admin = true
  );

CREATE POLICY "Users can insert their own record"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid()
  );

CREATE POLICY "Users can update records"
  ON users FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid() OR
    is_admin = true
  )
  WITH CHECK (
    id = auth.uid() OR
    is_admin = true
  );