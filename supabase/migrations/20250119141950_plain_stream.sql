/*
  # Update Users Table Schema

  1. Changes
    - Add new columns to users table
    - Update existing columns
    - Preserve existing data and dependencies
  
  2. Security
    - Maintain RLS policies
    - Update trigger functions
*/

-- Add new columns and modify existing ones safely
DO $$ 
BEGIN
  -- Add columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE users ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;

  -- Update existing columns
  ALTER TABLE users 
    ALTER COLUMN is_active SET DEFAULT true,
    ALTER COLUMN is_admin SET DEFAULT false;
END $$;

-- Enable RLS if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view records" ON users;
  DROP POLICY IF EXISTS "Users can insert their own record" ON users;
  DROP POLICY IF EXISTS "Users can update records" ON users;
END $$;

-- Recreate RLS policies
CREATE POLICY "Users can view records"
  ON users FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR
    is_admin = true
  );

CREATE POLICY "Users can insert their own record"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid()
  );

CREATE POLICY "Users can update records"
  ON users FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid() OR
    is_admin = true
  )
  WITH CHECK (
    id = auth.uid() OR
    is_admin = true
  );

-- Function to sync all auth users to public users
CREATE OR REPLACE FUNCTION sync_all_auth_users()
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
    COALESCE(au.created_at, now()),
    now()
  FROM auth.users au
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    updated_at = now();
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
    updated_at
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

-- Run sync to ensure all users are present
SELECT sync_all_auth_users();