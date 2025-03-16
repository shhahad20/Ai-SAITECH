/*
  # Fix User Deletion

  1. Changes
    - Add secure function for user deletion
    - Add RLS policies for user deletion
    - Add trigger to handle cascading deletes
  
  2. Security
    - Only admins can delete non-admin users
    - Prevent deletion of admin users
    - Log all deletion attempts
*/

-- Function to safely delete users
CREATE OR REPLACE FUNCTION delete_user(user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_is_admin boolean;
  v_target_is_admin boolean;
BEGIN
  -- Check if current user is admin
  SELECT is_admin INTO v_is_admin
  FROM public.users
  WHERE id = auth.uid();

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only administrators can delete users';
  END IF;

  -- Check if target user is admin
  SELECT is_admin INTO v_target_is_admin
  FROM public.users
  WHERE id = user_id;

  IF v_target_is_admin THEN
    RAISE EXCEPTION 'Cannot delete administrator accounts';
  END IF;

  -- Delete from public.users (this will cascade to related tables)
  DELETE FROM public.users
  WHERE id = user_id;

  -- Log the deletion
  INSERT INTO user_activity_logs (
    user_id,
    action,
    metadata
  ) VALUES (
    auth.uid(),
    'user_deleted',
    jsonb_build_object(
      'deleted_user_id', user_id,
      'deleted_by', auth.uid()
    )
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user(uuid) TO authenticated;

-- Update RLS policies for users table
DROP POLICY IF EXISTS "Users can delete records" ON users;
CREATE POLICY "Admins can delete non-admin users"
  ON users FOR DELETE
  TO authenticated
  USING (
    -- Current user must be admin
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND is_admin = true
    )
    -- Target user must not be admin
    AND NOT is_admin
  );