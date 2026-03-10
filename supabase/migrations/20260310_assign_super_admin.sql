
-- Run this in your Supabase SQL Editor to make yourself a Super Admin
-- Replace 'noman21cs@gmail.com' with your actual admin email if different

UPDATE public.profiles 
SET role = 'super-admin' 
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'noman53000@gmail.com'
);

-- Also ensure the default restaurant exists for everyone else
INSERT INTO public.restaurants (name, slug, subscription_status)
VALUES ('Gen XCloud POS Default', 'default-restaurant', 'active')
ON CONFLICT (slug) DO NOTHING;

-- Link any existing users without a restaurant to the default one
UPDATE public.profiles
SET restaurant_id = (SELECT id FROM public.restaurants WHERE slug = 'default-restaurant')
WHERE restaurant_id IS NULL AND role != 'super-admin';
