/*
  # Fix User Synchronization and Schema
  
  1. Changes
    - Drop and recreate users table with all required columns
    - Add trigger for auth user changes
    - Add function to sync existing users
  
  2. Security
    - Maintain RLS policies
    - Functions run with SECURITY DEFINER
*/

-- Drop existing users table and recreate with all required columns
DROP TABLE IF EXISTS public.users CASCADE;

CREATE TABLE public.users (
    id uuid PRIMARY KEY REFERENCES auth.users,
    email text NOT NULL,
    is_admin boolean DEFAULT false,
    is_active boolean DEFAULT true,
    is_verified boolean DEFAULT false,
    first_name text DEFAULT '',
    last_name text DEFAULT '',
    department text DEFAULT '',
    last_login timestamptz,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies
CREATE POLICY "Users can view records"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR
    is_admin = true
  );

CREATE POLICY "Users can insert their own record"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid()
  );

CREATE POLICY "Users can update records"
  ON public.users FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid() OR
    is_admin = true
  )
  WITH CHECK (
    id = auth.uid() OR
    is_admin = true
  );

-- Function to handle auth user changes
CREATE OR REPLACE FUNCTION handle_auth_user_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    is_admin,
    is_active,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'is_admin')::boolean, false),
    true,
    COALESCE(NEW.created_at, now())
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email;
  
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
BEGIN
  INSERT INTO public.users (
    id,
    email,
    is_admin,
    is_active,
    created_at
  )
  SELECT 
    au.id,
    au.email,
    COALESCE((au.raw_user_meta_data->>'is_admin')::boolean, false),
    true,
    COALESCE(au.created_at, now())
  FROM auth.users au
  WHERE NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = au.id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run initial sync
SELECT sync_existing_users();