/*
  # Set admin privileges for specific user

  1. Changes
    - Sets is_admin = true for user with email 'naifx2209@gmail.com'
*/

UPDATE users
SET is_admin = true
WHERE email = 'naifx2209@gmail.com';