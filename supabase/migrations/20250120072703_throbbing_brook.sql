-- Create or replace the online users view with security barrier
CREATE OR REPLACE VIEW public.online_users 
WITH (security_barrier = true)
AS
SELECT 
  id,
  email,
  first_name,
  last_name,
  department,
  is_admin,
  is_active,
  last_login,
  updated_at
FROM public.users
WHERE is_active = true
AND (
  -- Only allow admins to see all users
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.is_admin = true
  )
  -- Or users can see their own record
  OR id = auth.uid()
);

-- Grant select permission to authenticated users
GRANT SELECT ON public.online_users TO authenticated;