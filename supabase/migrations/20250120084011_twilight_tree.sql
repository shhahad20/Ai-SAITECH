/*
  # Fix Documents RLS Policies

  1. Changes
    - Drop existing document policies
    - Create new policies that properly handle universal documents
    - Add policies for authenticated users to manage their documents
    - Add policies for admins to manage universal documents

  2. Security
    - Enable RLS on documents table
    - Ensure proper access control for both regular and universal documents
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own or universal documents" ON documents;
DROP POLICY IF EXISTS "Users can insert documents" ON documents;
DROP POLICY IF EXISTS "Users can update documents" ON documents;
DROP POLICY IF EXISTS "Users can delete documents" ON documents;

-- Create new policies
CREATE POLICY "Users can view their own or universal documents"
  ON documents FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR is_universal = true
  );

CREATE POLICY "Users can insert their own documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    (user_id = auth.uid() AND NOT is_universal)
    OR 
    (is_universal AND EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    ))
  );

CREATE POLICY "Users can update their own documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    (user_id = auth.uid() AND NOT is_universal)
    OR 
    (is_universal AND EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    ))
  )
  WITH CHECK (
    (user_id = auth.uid() AND NOT is_universal)
    OR 
    (is_universal AND EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    ))
  );

CREATE POLICY "Users can delete their own documents"
  ON documents FOR DELETE
  TO authenticated
  USING (
    (user_id = auth.uid() AND NOT is_universal)
    OR 
    (is_universal AND EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    ))
  );