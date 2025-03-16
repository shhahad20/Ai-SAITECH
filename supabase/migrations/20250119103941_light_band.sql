/*
  # Fix user persistence and management

  1. Changes
    - Add trigger to automatically create user records
    - Add trigger to prevent admin user deletion
    - Add trigger to maintain admin privileges
    - Add function to sync auth users with users table

  2. Security
    - Maintain RLS policies
    - Ensure admin privileges are preserved
*/

-- Function to automatically create user records
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, is_admin, is_active, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'is_admin', 'false')::boolean,
    true,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      is_admin = COALESCE(NEW.raw_user_meta_data->>'is_admin', users.is_admin::text)::boolean,
      updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user records
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to prevent admin user deletion
CREATE OR REPLACE FUNCTION prevent_admin_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM users
    WHERE id = OLD.id AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Cannot delete admin user';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent admin deletion
DROP TRIGGER IF EXISTS prevent_admin_deletion_trigger ON users;
CREATE TRIGGER prevent_admin_deletion_trigger
  BEFORE DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_admin_deletion();

-- Function to sync existing auth users
CREATE OR REPLACE FUNCTION sync_auth_users()
RETURNS void AS $$
BEGIN
  INSERT INTO public.users (id, email, is_admin, is_active, created_at)
  SELECT 
    au.id,
    au.email,
    COALESCE((au.raw_user_meta_data->>'is_admin')::boolean, false),
    true,
    COALESCE(au.created_at, NOW())
  FROM auth.users au
  LEFT JOIN public.users u ON u.id = au.id
  WHERE u.id IS NULL
  ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run initial sync
SELECT sync_auth_users();