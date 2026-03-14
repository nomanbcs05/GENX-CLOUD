-- RUN THIS IN YOUR SUPABASE SQL EDITOR
-- This script safely elevates admins to Super Admin

UPDATE public.profiles
SET role = 'super-admin'
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email IN ('zeesh4n17@gmail.com', 'genxcloudpos@gmail.com')
);
