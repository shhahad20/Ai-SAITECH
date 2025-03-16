/*
  # Governance System Update

  1. New Tables
    - `document_sections`
      - `id` (text, primary key)
      - `name` (text)
      - `description` (text)
      - `created_at` (timestamptz)
    
    - `document_categories`
      - `id` (text, primary key)
      - `section_id` (text, references document_sections)
      - `name` (text)
      - `description` (text)
      - `parent_id` (text, self-reference)
      - `created_at` (timestamptz)

  2. Changes
    - Add section and category references to documents table
    - Update RLS policies
    - Add admin-only controls

  3. Security
    - Enable RLS on new tables
    - Add policies for admin-only management
*/

-- Create document sections table
CREATE TABLE document_sections (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create document categories table
CREATE TABLE document_categories (
  id text PRIMARY KEY,
  section_id text REFERENCES document_sections NOT NULL,
  name text NOT NULL,
  description text,
  parent_id text REFERENCES document_categories(id),
  created_at timestamptz DEFAULT now()
);

-- Add new columns to documents table
ALTER TABLE documents
ADD COLUMN section_id text REFERENCES document_sections,
ADD COLUMN category_id text REFERENCES document_categories;

-- Enable RLS
ALTER TABLE document_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;

-- Policies for document sections
CREATE POLICY "Everyone can view document sections"
  ON document_sections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert document sections"
  ON document_sections FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

CREATE POLICY "Only admins can update document sections"
  ON document_sections FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Policies for document categories
CREATE POLICY "Everyone can view document categories"
  ON document_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert document categories"
  ON document_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

CREATE POLICY "Only admins can update document categories"
  ON document_categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Update document policies
DROP POLICY IF EXISTS "Users can insert documents" ON documents;
CREATE POLICY "Only admins can insert documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Insert default sections
INSERT INTO document_sections (id, name, description)
VALUES 
  ('fms-policies', 'FMS Policies & Procedures', 'Facility Management System policies and procedures documentation'),
  ('safety', 'Safety', 'Safety guidelines and protocols'),
  ('maintenance', 'Maintenance', 'Maintenance procedures and schedules'),
  ('commissioning', 'Commissioning & Testing', 'System commissioning and testing procedures'),
  ('standards', 'Standards', 'Industry standards and compliance documents'),
  ('templates', 'HMG''s Templates', 'Standard templates and forms'),
  ('knowledge', 'Knowledge Centre', 'Educational resources and best practices');

-- Create function to manage documents
CREATE OR REPLACE FUNCTION manage_document(
  p_action text,
  p_document_id uuid DEFAULT NULL,
  p_name text DEFAULT NULL,
  p_content text DEFAULT NULL,
  p_section_id text DEFAULT NULL,
  p_category_id text DEFAULT NULL,
  p_is_universal boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_is_admin boolean;
  v_result jsonb;
BEGIN
  -- Get current user info
  SELECT id, is_admin INTO v_user_id, v_is_admin
  FROM users
  WHERE id = auth.uid();

  -- Check admin status
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only administrators can manage documents';
  END IF;

  -- Perform requested action
  CASE p_action
    WHEN 'create' THEN
      INSERT INTO documents (
        name,
        content,
        section_id,
        category_id,
        is_universal,
        user_id,
        created_by,
        last_modified_by
      )
      VALUES (
        p_name,
        p_content,
        p_section_id,
        p_category_id,
        p_is_universal,
        v_user_id,
        v_user_id,
        v_user_id
      )
      RETURNING jsonb_build_object(
        'id', id,
        'name', name,
        'section_id', section_id,
        'category_id', category_id
      ) INTO v_result;

    WHEN 'update' THEN
      UPDATE documents
      SET
        name = COALESCE(p_name, name),
        content = COALESCE(p_content, content),
        section_id = COALESCE(p_section_id, section_id),
        category_id = COALESCE(p_category_id, category_id),
        last_modified_by = v_user_id,
        updated_at = now()
      WHERE id = p_document_id
      RETURNING jsonb_build_object(
        'id', id,
        'name', name,
        'section_id', section_id,
        'category_id', category_id
      ) INTO v_result;

    WHEN 'delete' THEN
      DELETE FROM documents
      WHERE id = p_document_id
      RETURNING jsonb_build_object(
        'id', id,
        'name', name
      ) INTO v_result;

    ELSE
      RAISE EXCEPTION 'Invalid action: %', p_action;
  END CASE;

  RETURN v_result;
END;
$$;