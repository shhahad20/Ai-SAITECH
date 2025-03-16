/*
  # Add updated_at column and trigger
  
  1. Changes
    - Add updated_at column to users table if it doesn't exist
    - Create trigger to automatically update timestamp
  
  2. Security
    - Maintains existing RLS policies
*/

-- Add updated_at column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();