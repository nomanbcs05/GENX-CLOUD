-- RUN THIS IN YOUR SUPABASE SQL EDITOR
-- This script safely elevates zeesh4n17@gmail.com to Super Admin

UPDATE public.profiles
SET role = 'super-admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'zeesh4n17@gmail.com'
);
