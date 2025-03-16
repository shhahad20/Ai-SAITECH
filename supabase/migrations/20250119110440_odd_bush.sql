-- Drop and recreate users table with all required columns
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
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
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

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at trigger
DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

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

-- Drop and recreate auth user changes trigger
DROP TRIGGER IF EXISTS on_auth_user_changes ON auth.users;
CREATE TRIGGER on_auth_user_changes
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_auth_user_changes();

-- Function to verify and sync existing users
CREATE OR REPLACE FUNCTION verify_and_sync_users()
RETURNS TABLE (
  status text,
  details jsonb
) AS $$
DECLARE
  auth_count integer;
  users_count integer;
  sync_count integer;
  user_record record;
BEGIN
  -- Get counts
  SELECT COUNT(*) INTO auth_count FROM auth.users;
  SELECT COUNT(*) INTO users_count FROM public.users;
  
  -- Sync missing users
  sync_count := 0;
  
  FOR user_record IN 
    SELECT 
      au.id,
      au.email,
      au.raw_user_meta_data,
      au.created_at
    FROM auth.users au
    LEFT JOIN public.users u ON u.id = au.id
    WHERE u.id IS NULL
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
      user_record.id,
      user_record.email,
      COALESCE((user_record.raw_user_meta_data->>'is_admin')::boolean, false),
      true,
      false,
      COALESCE(user_record.raw_user_meta_data->>'first_name', ''),
      COALESCE(user_record.raw_user_meta_data->>'last_name', ''),
      COALESCE(user_record.raw_user_meta_data->>'department', ''),
      COALESCE(user_record.created_at, now()),
      now()
    );
    
    sync_count := sync_count + 1;
  END LOOP;

  RETURN QUERY SELECT 
    'success'::text as status,
    jsonb_build_object(
      'auth_users', auth_count,
      'public_users', users_count,
      'synced_users', sync_count
    ) as details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run verification and sync
SELECT * FROM verify_and_sync_users();

-- Verify triggers
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
ORDER BY trigger_name;

-- Test update trigger
UPDATE public.users
SET first_name = 'Test Update'
WHERE email = 'naifx2209@gmail.com'
RETURNING email, first_name, updated_at;