/*
  # User Deletion Improvements

  1. Changes
    - Add ON DELETE CASCADE to verification_requests foreign key
    - Add ON DELETE CASCADE to verification_logs foreign key
    - Update delete_user function to handle all dependencies

  2. Security
    - Maintain admin-only deletion
    - Prevent admin account deletion
    - Ensure proper cleanup of all user data
*/

-- Modify foreign key constraints for verification tables
ALTER TABLE verification_requests
DROP CONSTRAINT IF EXISTS verification_requests_user_id_fkey,
ADD CONSTRAINT verification_requests_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

ALTER TABLE verification_logs
DROP CONSTRAINT IF EXISTS verification_logs_admin_id_fkey,
ADD CONSTRAINT verification_logs_admin_id_fkey
  FOREIGN KEY (admin_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

-- Function to safely delete users with complete cleanup
CREATE OR REPLACE FUNCTION delete_user(user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_is_admin boolean;
  v_target_is_admin boolean;
  v_email text;
BEGIN
  -- Check if current user is admin
  SELECT is_admin INTO v_is_admin
  FROM public.users
  WHERE id = auth.uid();

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only administrators can delete users';
  END IF;

  -- Check if target user exists and get their info
  SELECT is_admin, email INTO v_target_is_admin, v_email
  FROM public.users
  WHERE id = user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF v_target_is_admin THEN
    RAISE EXCEPTION 'Cannot delete administrator accounts';
  END IF;

  -- Start transaction
  BEGIN
    -- Log the deletion first (while we still have the user's email)
    INSERT INTO user_activity_logs (
      user_id,
      action,
      metadata
    ) VALUES (
      auth.uid(),
      'user_deleted',
      jsonb_build_object(
        'deleted_user_id', user_id,
        'deleted_email', v_email,
        'deleted_by', auth.uid(),
        'deleted_at', now()
      )
    );

    -- Delete from public.users first (this will cascade to related tables)
    DELETE FROM public.users
    WHERE id = user_id;

    -- Delete from auth.users (this will cascade to all auth-related tables)
    DELETE FROM auth.users
    WHERE id = user_id;

    -- Refresh materialized view to reflect changes
    PERFORM refresh_user_management_mv();

    RETURN true;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to delete user: %', SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;