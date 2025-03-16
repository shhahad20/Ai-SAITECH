/*
  # Fix user synchronization and schema

  1. Changes
    - Add updated_at trigger function and trigger
    - Update handle_auth_user_changes function to properly handle all columns
    - Update sync_existing_users function with proper column handling
    - Ensure proper timestamp handling for all operations

  2. Security
    - Maintains existing RLS policies
    - Preserves data integrity
*/

-- Create or replace the updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace trigger
DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Function to handle auth user changes with proper column handling
CREATE OR REPLACE FUNCTION handle_auth_user_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    is_admin,
    is_active,
    is_verified,
    first_name,
    last_name,
    department,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'is_admin')::boolean, false),
    true,
    false,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'department', ''),
    COALESCE(NEW.created_at, now()),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    is_admin = COALESCE((NEW.raw_user_meta_data->>'is_admin')::boolean, users.is_admin),
    first_name = COALESCE(NEW.raw_user_meta_data->>'first_name', users.first_name),
    last_name = COALESCE(NEW.raw_user_meta_data->>'last_name', users.last_name),
    department = COALESCE(NEW.raw_user_meta_data->>'department', users.department),
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_changes ON auth.users;

-- Create trigger for both INSERT and UPDATE
CREATE TRIGGER on_auth_user_changes
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_auth_user_changes();

-- Function to sync existing users with proper column handling
CREATE OR REPLACE FUNCTION sync_existing_users()
RETURNS void AS $$
DECLARE
  auth_user RECORD;
BEGIN
  FOR auth_user IN 
    SELECT 
      id,
      email,
      raw_user_meta_data,
      created_at
    FROM auth.users
  LOOP
    INSERT INTO public.users (
      id,
      email,
      is_admin,
      is_active,
      is_verified,
      first_name,
      last_name,
      department,
      created_at,
      updated_at
    )
    VALUES (
      auth_user.id,
      auth_user.email,
      COALESCE((auth_user.raw_user_meta_data->>'is_admin')::boolean, false),
      true,
      false,
      COALESCE(auth_user.raw_user_meta_data->>'first_name', ''),
      COALESCE(auth_user.raw_user_meta_data->>'last_name', ''),
      COALESCE(auth_user.raw_user_meta_data->>'department', ''),
      COALESCE(auth_user.created_at, now()),
      now()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
      email = EXCLUDED.email,
      first_name = COALESCE(auth_user.raw_user_meta_data->>'first_name', users.first_name),
      last_name = COALESCE(auth_user.raw_user_meta_data->>'last_name', users.last_name),
      department = COALESCE(auth_user.raw_user_meta_data->>'department', users.department),
      updated_at = now();
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run sync to ensure all users are present
SELECT sync_existing_users();