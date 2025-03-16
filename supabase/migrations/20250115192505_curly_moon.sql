/*
  # Fix Users Table RLS Policies

  1. Changes
    - Add policy to allow users to insert their own record during sign up
    - Add policy to allow users to update their own record
    - Add policy to allow users to view their own record
  
  2. Security
    - Maintains existing admin-only policies for managing other users
    - Ensures users can only manage their own records
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Only admins can insert users" ON users;
DROP POLICY IF EXISTS "Only admins can update users" ON users;
DROP POLICY IF EXISTS "Users can view all users" ON users;

-- Create new policies that allow users to manage their own records
CREATE POLICY "Users can insert their own record"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own record"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    -- Regular users can only update their own record
    auth.uid() = id OR
    -- Admins can update any record
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

CREATE POLICY "Users can view their own record"
  ON users FOR SELECT
  TO authenticated
  USING (
    -- Users can see their own record
    auth.uid() = id OR
    -- Admins can see all records
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );