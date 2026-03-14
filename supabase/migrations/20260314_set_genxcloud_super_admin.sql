
-- Migration: Set genxcloudpos@gmail.com as Super Admin
-- Created at: 2026-03-14

UPDATE public.profiles 
SET role = 'super-admin' 
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'genxcloudpos@gmail.com'
);
