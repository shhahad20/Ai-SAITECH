/*
  # Fix Document Management Function

  1. Changes
    - Drop old function
    - Create new function with simplified parameters
    - Add proper validation

  2. Security
    - Maintain admin-only access
    - Add section validation
*/

-- Drop existing function to avoid conflicts
DROP FUNCTION IF EXISTS manage_document(text, uuid, text, text, text, text, boolean);
DROP FUNCTION IF EXISTS manage_document(text, uuid, text, text, text, boolean);

-- Create new function with simplified parameters
CREATE OR REPLACE FUNCTION manage_document(
  p_action text,
  p_document_id uuid DEFAULT NULL,
  p_name text DEFAULT NULL,
  p_content text DEFAULT NULL,
  p_section_id text DEFAULT NULL,
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
  v_section_exists boolean;
BEGIN
  -- Get current user info
  SELECT id, is_admin INTO v_user_id, v_is_admin
  FROM users
  WHERE id = auth.uid();

  -- Check admin status
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only administrators can manage documents';
  END IF;

  -- Validate section_id
  IF p_section_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM document_sections WHERE id = p_section_id
    ) INTO v_section_exists;

    IF NOT v_section_exists THEN
      RAISE EXCEPTION 'Invalid section ID: %', p_section_id;
    END IF;
  END IF;

  -- Perform requested action
  CASE p_action
    WHEN 'create' THEN
      INSERT INTO documents (
        name,
        content,
        section_id,
        is_universal,
        user_id,
        created_by,
        last_modified_by,
        version,
        metadata
      )
      VALUES (
        p_name,
        p_content,
        p_section_id,
        p_is_universal,
        v_user_id,
        v_user_id,
        v_user_id,
        1,
        jsonb_build_object(
          'topics', ARRAY[]::text[],
          'concepts', ARRAY[]::text[],
          'tags', ARRAY[]::text[],
          'summary', '',
          'lastUpdated', now(),
          'section', p_section_id
        )
      )
      RETURNING jsonb_build_object(
        'id', id,
        'name', name,
        'section_id', section_id
      ) INTO v_result;

    WHEN 'update' THEN
      UPDATE documents
      SET
        name = COALESCE(p_name, name),
        content = COALESCE(p_content, content),
        section_id = COALESCE(p_section_id, section_id),
        last_modified_by = v_user_id,
        updated_at = now()
      WHERE id = p_document_id
      RETURNING jsonb_build_object(
        'id', id,
        'name', name,
        'section_id', section_id
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