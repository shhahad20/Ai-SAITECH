/*
  # Add Universal Documents Support

  1. Changes
    - Add `is_universal` column to documents table
    - Add version tracking columns
    - Add audit logging table
    - Add admin user tracking
    - Update RLS policies

  2. Security
    - Enable RLS on new tables
    - Add policies for universal document access
    - Add policies for audit logs
*/

-- Add new columns to documents table
DO $$ 
BEGIN
  ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS is_universal boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS version integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users,
  ADD COLUMN IF NOT EXISTS last_modified_by uuid REFERENCES auth.users;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

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

-- Update documents policies for universal documents
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'documents' 
    AND policyname = 'Users can view universal documents'
  ) THEN
    CREATE POLICY "Users can view universal documents"
      ON documents FOR SELECT
      TO authenticated
      USING (is_universal = true);
  END IF;
END $$;

-- Policies for users table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
    AND policyname = 'Only admins can insert users'
  ) THEN
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
  END IF;
END $$;

-- Policies for audit logs
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'document_audit_logs' 
    AND policyname = 'Users can view audit logs for their documents'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'document_audit_logs' 
    AND policyname = 'System can insert audit logs'
  ) THEN
    CREATE POLICY "System can insert audit logs"
      ON document_audit_logs FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- Add trigger to update last_modified_by
CREATE OR REPLACE FUNCTION update_last_modified_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_modified_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS documents_last_modified ON documents;

-- Create trigger
CREATE TRIGGER documents_last_modified
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_last_modified_by();