-- Modify foreign key constraints to allow cascading deletes
ALTER TABLE user_activity_logs
DROP CONSTRAINT IF EXISTS user_activity_logs_user_id_fkey,
ADD CONSTRAINT user_activity_logs_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

-- Function to safely delete users
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

  -- Check if target user is admin
  SELECT is_admin, email INTO v_target_is_admin, v_email
  FROM public.users
  WHERE id = user_id;

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
        'deleted_by', auth.uid()
      )
    );

    -- Delete from public.users first
    DELETE FROM public.users
    WHERE id = user_id;

    -- Delete from auth.users
    DELETE FROM auth.users
    WHERE id = user_id;

    RETURN true;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to delete user: %', SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;