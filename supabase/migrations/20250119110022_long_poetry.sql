/*
  # Sync users with updated schema
  
  1. Changes
    - Create function to sync auth users to public users table
    - Create trigger for automatic user synchronization
  
  2. Security
    - Maintains existing RLS policies
    - Ensures data consistency
*/

-- Function to handle auth user changes
CREATE OR REPLACE FUNCTION handle_auth_user_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    is_admin,
    is_active,
    is_verified,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'is_admin')::boolean, false),
    true,
    false,
    COALESCE(NEW.created_at, now()),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    is_admin = COALESCE((NEW.raw_user_meta_data->>'is_admin')::boolean, users.is_admin),
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

-- Function to sync existing users
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
      created_at,
      updated_at
    )
    VALUES (
      auth_user.id,
      auth_user.email,
      COALESCE((auth_user.raw_user_meta_data->>'is_admin')::boolean, false),
      true,
      false,
      COALESCE(auth_user.created_at, now()),
      now()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
      email = EXCLUDED.email,
      updated_at = now();
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run sync to ensure all users are present
SELECT sync_existing_users();