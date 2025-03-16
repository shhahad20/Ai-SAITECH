/*
  # Improve user synchronization and management

  1. Changes
    - Add is_active and is_verified columns
    - Create sync function for auth users
    - Add trigger for user changes
    - Add last_modified tracking

  2. Security
    - Functions run with SECURITY DEFINER
    - Maintain existing RLS policies
*/

-- Add required columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE users ADD COLUMN is_active boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'is_verified'
  ) THEN
    ALTER TABLE users ADD COLUMN is_verified boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'last_modified'
  ) THEN
    ALTER TABLE users ADD COLUMN last_modified timestamptz DEFAULT now();
  END IF;
END $$;

-- Function to sync auth users to public users
CREATE OR REPLACE FUNCTION sync_auth_users()
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
      created_at,
      last_modified
    )
    VALUES (
      auth_user.id,
      auth_user.email,
      COALESCE((auth_user.raw_user_meta_data->>'is_admin')::boolean, false),
      true,
      COALESCE(auth_user.created_at, now()),
      now()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
      email = EXCLUDED.email,
      last_modified = now();
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle auth user changes
CREATE OR REPLACE FUNCTION handle_auth_user_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    is_admin,
    is_active,
    created_at,
    last_modified
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'is_admin')::boolean, false),
    true,
    COALESCE(NEW.created_at, now()),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    last_modified = now();
  
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

-- Run sync to ensure all users are present
SELECT sync_auth_users();