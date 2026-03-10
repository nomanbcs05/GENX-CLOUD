
-- 1. Create 'restaurants' table
CREATE TABLE IF NOT EXISTS public.restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL, -- Used for possible subdomains or URLs
    owner_id UUID REFERENCES auth.users(id),
    subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled')),
    license_expiry TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create 'profiles' table to link users to restaurants
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    full_name TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'cashier', 'super-admin')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS on new tables
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Initial policies for 'restaurants'
CREATE POLICY "Users can see their own restaurant"
    ON public.restaurants FOR SELECT
    USING (id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can update their own restaurant"
    ON public.restaurants FOR UPDATE
    USING (id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 5. Initial policies for 'profiles'
CREATE POLICY "Users can see their own profile"
    ON public.profiles FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Admins can see profiles in their restaurant"
    ON public.profiles FOR SELECT
    USING (restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 6. Helper function to create a profile on signup (Trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (new.id, 'admin', new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run the function when a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Create a 'Default Restaurant' for existing data
DO $$
DECLARE
    default_restaurant_id UUID;
BEGIN
    -- Only create if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM public.restaurants WHERE slug = 'default-restaurant') THEN
        INSERT INTO public.restaurants (name, slug, subscription_status)
        VALUES ('Gen XCloud POS Default', 'default-restaurant', 'active')
        RETURNING id INTO default_restaurant_id;

        -- Link existing users to this default restaurant
        -- (Optional: You might want to do this manually if you have multiple users already)
        -- INSERT INTO public.profiles (id, restaurant_id, role)
        -- SELECT id, default_restaurant_id, 'admin' FROM auth.users;
    END IF;
END $$;
