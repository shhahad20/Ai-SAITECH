/*
  # Set Admin User

  1. Changes
    - Insert user record with admin privileges for the specified email
*/

INSERT INTO users (id, email, is_admin)
SELECT id, email, true
FROM auth.users
WHERE email = 'naifx2209@gmail.com'
ON CONFLICT (id) DO UPDATE
SET is_admin = true;