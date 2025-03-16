/*
  # Fix User Management View and Functions

  1. Changes
    - Create materialized view for user management
    - Add function to sync missing users
    - Add function to refresh the view
    - Add security definer function to access the view

  2. Security
    - Use security definer function to enforce admin-only access
    - Maintain data consistency between auth and public users
*/

-- Function to sync missing users
CREATE OR REPLACE FUNCTION sync_missing_users()
RETURNS void AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    is_admin,
    is_active,
    created_at,
    updated_at
  )
  SELECT 
    au.id,
    au.email,
    COALESCE((au.raw_user_meta_data->>'is_admin')::boolean, false),
    true,
    au.created_at,
    now()
  FROM auth.users au
  LEFT JOIN public.users u ON u.id = au.id
  WHERE u.id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create materialized view for user management
CREATE MATERIALIZED VIEW user_management_mv AS
SELECT 
  au.id,
  au.email,
  au.created_at,
  COALESCE(u.is_admin, false) as is_admin,
  COALESCE(u.is_active, true) as is_active,
  COALESCE(u.is_verified, false) as is_verified,
  COALESCE(u.first_name, '') as first_name,
  COALESCE(u.last_name, '') as last_name,
  COALESCE(u.department, '') as department,
  u.last_login,
  u.updated_at
FROM auth.users au
LEFT JOIN public.users u ON u.id = au.id;

-- Create index on the materialized view
CREATE UNIQUE INDEX ON user_management_mv (id);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_user_management_mv()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_management_mv;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all users (with admin check)
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS SETOF user_management_mv AS $$
BEGIN
  -- Check if the current user is an admin
  IF EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND is_admin = true
  ) THEN
    -- Return all users if admin
    RETURN QUERY SELECT * FROM user_management_mv ORDER BY created_at DESC;
  ELSE
    -- Return only the current user if not admin
    RETURN QUERY SELECT * FROM user_management_mv WHERE id = auth.uid();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION sync_missing_users() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_user_management_mv() TO authenticated;