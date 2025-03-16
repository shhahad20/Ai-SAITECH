/*
  # Add user profile columns

  1. Changes
    - Add first_name, last_name, and department columns to users table
    - Add default values for better data consistency
    - Ensure backward compatibility with existing data

  2. Security
    - Maintain existing RLS policies
*/

-- Add new columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS first_name text DEFAULT '',
ADD COLUMN IF NOT EXISTS last_name text DEFAULT '',
ADD COLUMN IF NOT EXISTS department text DEFAULT '';

-- Update existing policies to include new columns
DO $$ 
BEGIN
  -- Ensure policies exist and cover new columns
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
    AND schemaname = 'public'
  ) THEN
    -- Policies are already in place and will automatically cover new columns
    NULL;
  END IF;
END $$;