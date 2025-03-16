/*
  # Add Universal Documents Support

  1. Document Table Updates
    - Add `is_universal` flag
    - Add `version` tracking
    - Add `created_by` and `last_modified_by` fields
    - Update RLS policies

  2. New Tables
    - `document_audit_logs` for version history
    - `users` for admin tracking

  3. Security
    - Add RLS policies for universal documents
    - Add admin-only policies
*/

-- Add new columns to documents table
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS is_universal boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS version integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users,
ADD COLUMN IF NOT EXISTS last_modified_by uuid REFERENCES auth.users;

-- Create users table for admin tracking
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users,
  email text NOT NULL,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create audit logs table
CREATE TABLE IF NOT EXISTS document_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents ON DELETE CASCADE,
  action text NOT NULL,
  user_id uuid REFERENCES auth.users,
  version integer NOT NULL,
  changes text NOT NULL,
  timestamp timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_audit_logs ENABLE ROW LEVEL SECURITY;

-- Update documents policies
DROP POLICY IF EXISTS "Users can view their own documents" ON documents;
CREATE POLICY "Users can view their own or universal documents"
  ON documents FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR is_universal = true
  );

DROP POLICY IF EXISTS "Users can insert their own documents" ON documents;
CREATE POLICY "Users can insert documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    (NOT is_universal AND user_id = auth.uid()) OR
    (is_universal AND EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    ))
  );

DROP POLICY IF EXISTS "Users can update their own documents" ON documents;
CREATE POLICY "Users can update documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    (NOT is_universal AND user_id = auth.uid()) OR
    (is_universal AND EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    ))
  )
  WITH CHECK (
    (NOT is_universal AND user_id = auth.uid()) OR
    (is_universal AND EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    ))
  );

DROP POLICY IF EXISTS "Users can delete their own documents" ON documents;
CREATE POLICY "Users can delete documents"
  ON documents FOR DELETE
  TO authenticated
  USING (
    (NOT is_universal AND user_id = auth.uid()) OR
    (is_universal AND EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    ))
  );

-- Policies for users table
CREATE POLICY "Users can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

CREATE POLICY "Only admins can update users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Policies for audit logs
CREATE POLICY "Users can view audit logs for their documents"
  ON document_audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_id
      AND (documents.user_id = auth.uid() OR documents.is_universal = true)
    )
  );

CREATE POLICY "System can insert audit logs"
  ON document_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add trigger to update last_modified_by
CREATE OR REPLACE FUNCTION update_last_modified_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_modified_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_last_modified
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_last_modified_by();