/*
  # Update admin user status

  1. Changes
    - Set admin status for specific user email
  2. Security
    - Updates users table
*/

UPDATE users
SET is_admin = true
WHERE email = 'naifx2209@gmail.com';