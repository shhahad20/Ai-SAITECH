/*
  # Fix document table and policies

  1. Changes
    - Make user_id nullable to support universal documents
    - Update RLS policies to handle universal documents correctly
    - Add validation check for user_id and is_universal combination

  2. Security
    - Maintain RLS protection
    - Ensure only admins can create universal documents
    - Regular users can only create their own documents
*/

-- Modify documents table to allow null user_id
ALTER TABLE documents
ALTER COLUMN user_id DROP NOT NULL;

-- Add check constraint to ensure valid combinations
ALTER TABLE documents
ADD CONSTRAINT valid_document_type CHECK (
  (is_universal = true AND user_id IS NULL) OR
  (is_universal = false AND user_id IS NOT NULL)
);

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own or universal documents" ON documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON documents;

-- Create new policies
CREATE POLICY "Users can view their own or universal documents"
  ON documents FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR is_universal = true
  );

CREATE POLICY "Users can insert documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    (is_universal = false AND user_id = auth.uid())
    OR 
    (is_universal = true AND EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    ))
  );

CREATE POLICY "Users can update documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    (is_universal = false AND user_id = auth.uid())
    OR 
    (is_universal = true AND EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    ))
  )
  WITH CHECK (
    (is_universal = false AND user_id = auth.uid())
    OR 
    (is_universal = true AND EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    ))
  );

CREATE POLICY "Users can delete documents"
  ON documents FOR DELETE
  TO authenticated
  USING (
    (is_universal = false AND user_id = auth.uid())
    OR 
    (is_universal = true AND EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    ))
  );