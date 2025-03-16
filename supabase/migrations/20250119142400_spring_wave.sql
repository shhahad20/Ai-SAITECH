/*
  # Set Permanent Admin Account
  
  1. Changes
    - Set specific email as permanent admin
    - Create function to maintain admin status
    - Create trigger to prevent admin removal
*/

-- Update the specific user to be admin
UPDATE users
SET is_admin = true
WHERE email = 'naifx2209@gmail.com';

-- Create function to maintain admin status for specific email
CREATE OR REPLACE FUNCTION maintain_permanent_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is the permanent admin account, ensure admin status remains true
  IF NEW.email = 'naifx2209@gmail.com' THEN
    NEW.is_admin = true;
    NEW.is_active = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to maintain admin status
DROP TRIGGER IF EXISTS maintain_permanent_admin_trigger ON users;
CREATE TRIGGER maintain_permanent_admin_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION maintain_permanent_admin();

-- Create function to prevent admin deletion
CREATE OR REPLACE FUNCTION prevent_admin_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.email = 'naifx2209@gmail.com' THEN
    RAISE EXCEPTION 'Cannot delete permanent admin account';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent admin deletion
DROP TRIGGER IF EXISTS prevent_admin_deletion_trigger ON users;
CREATE TRIGGER prevent_admin_deletion_trigger
  BEFORE DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_admin_deletion();