/*
  # Admin Dashboard Tables

  1. New Tables
    - verification_requests
    - verification_logs
    - user_activity_logs

  2. Updates
    - Add new columns to users table
    - Add verification and activity tracking

  3. Security
    - Enable RLS on all new tables
    - Add policies for admin access
*/

-- Add new columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_login timestamptz;

-- Create verification requests table
CREATE TABLE IF NOT EXISTS verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  user_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  verification_data jsonb,
  admin_note text,
  created_at timestamptz DEFAULT now(),
  verified_at timestamptz,
  CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Create verification logs table
CREATE TABLE IF NOT EXISTS verification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES verification_requests ON DELETE CASCADE,
  admin_id uuid REFERENCES auth.users,
  status text NOT NULL,
  note text,
  created_at timestamptz DEFAULT now()
);

-- Create user activity logs table
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users,
  action text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies for verification requests
CREATE POLICY "Admins can view all verification requests"
  ON verification_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

CREATE POLICY "Users can view their own verification requests"
  ON verification_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create verification requests"
  ON verification_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update verification requests"
  ON verification_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Policies for verification logs
CREATE POLICY "Admins can view all verification logs"
  ON verification_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

CREATE POLICY "Admins can create verification logs"
  ON verification_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Policies for user activity logs
CREATE POLICY "Admins can view all activity logs"
  ON user_activity_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

CREATE POLICY "Users can view their own activity logs"
  ON user_activity_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create activity logs"
  ON user_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to update last login
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS trigger AS $$
BEGIN
  UPDATE users
  SET last_login = now()
  WHERE id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for last login update
CREATE TRIGGER update_last_login_trigger
  AFTER INSERT ON user_activity_logs
  FOR EACH ROW
  WHEN (NEW.action = 'login')
  EXECUTE FUNCTION update_last_login();