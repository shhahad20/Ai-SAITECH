/*
  # Maintain admin status
  
  1. Changes
    - Add trigger to maintain admin status across sessions
    - Add function to handle admin status persistence
  
  2. Security
    - Only affects users table
    - Preserves existing admin status
*/

-- Function to maintain admin status
CREATE OR REPLACE FUNCTION maintain_admin_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user exists and was previously an admin
  IF EXISTS (
    SELECT 1 FROM users 
    WHERE id = NEW.id 
    AND is_admin = true
  ) THEN
    -- Maintain admin status
    NEW.is_admin := true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS maintain_admin_status_trigger ON users;

-- Create trigger
CREATE TRIGGER maintain_admin_status_trigger
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION maintain_admin_status();