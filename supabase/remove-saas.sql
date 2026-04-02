-- Script to Remove SaaS Multi-Tenancy and revert to Single-Tenant POS

-- 1. Disable RLS on all tables
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_registers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants DISABLE ROW LEVEL SECURITY;

-- 2. Drop RLS Policies
DROP POLICY IF EXISTS "Tenant Isolation - Products" ON public.products;
DROP POLICY IF EXISTS "Tenant Isolation - Categories" ON public.categories;
DROP POLICY IF EXISTS "Tenant Isolation - Customers" ON public.customers;
DROP POLICY IF EXISTS "Tenant Isolation - Orders" ON public.orders;
DROP POLICY IF EXISTS "Tenant Isolation - Order Items" ON public.order_items;
DROP POLICY IF EXISTS "Tenant Isolation - Tables" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Tenant Isolation - Registers" ON public.daily_registers;

-- 3. Drop Triggers and Functions
DROP TRIGGER IF EXISTS trigger_set_restaurant_id ON public.products;
DROP TRIGGER IF EXISTS trigger_set_restaurant_id ON public.categories;
DROP TRIGGER IF EXISTS trigger_set_restaurant_id ON public.customers;
DROP TRIGGER IF EXISTS trigger_set_restaurant_id ON public.orders;
DROP TRIGGER IF EXISTS trigger_set_restaurant_id ON public.order_items;
DROP TRIGGER IF EXISTS trigger_set_restaurant_id ON public.restaurant_tables;
DROP TRIGGER IF EXISTS trigger_set_restaurant_id ON public.daily_registers;

DROP FUNCTION IF EXISTS public.set_restaurant_id();
DROP FUNCTION IF EXISTS public.get_current_restaurant_id();
DROP FUNCTION IF EXISTS public.get_auth_restaurant_id();

-- 3.5 Drop extra policies from other migrations
DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY['products', 'categories', 'orders', 'customers', 'daily_registers', 'restaurant_tables'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Super Admin Override" ON public.%I', t);
    END LOOP;
END $$;

-- 4. Clean up columns (Optional but cleaner)
-- If you want to keep the data but remove the column:
-- ALTER TABLE public.products DROP COLUMN IF EXISTS restaurant_id;
-- ... repeat for other tables

-- 5. Create a default restaurant if none exists (for compatibility)
INSERT INTO public.restaurants (id, name, slug)
VALUES ('the-pizza-burger-house-id', 'THE pizza&burger HOUSE', 'the-pizza-burger-house')
ON CONFLICT (id) DO NOTHING;

-- 6. Link all profiles to the default restaurant
UPDATE public.profiles SET restaurant_id = 'the-pizza-burger-house-id' WHERE restaurant_id IS NULL;

-- 7. Grant access to authenticated users for everything
CREATE POLICY "Allow all for authenticated" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.restaurant_tables FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.daily_registers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Re-enable RLS but with "Allow All" policy to satisfy Supabase security best practices while effectively disabling multi-tenancy
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
