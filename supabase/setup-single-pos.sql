-- Comprehensive Single-Tenant POS Setup Script
-- This script ensures all necessary tables exist and removes any multi-tenancy restrictions.
-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Create Core POS Tables if missing (from schema.sql)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  price NUMERIC NOT NULL,
  cost NUMERIC NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  loyalty_points INTEGER DEFAULT 0,
  total_spent NUMERIC DEFAULT 0,
  visit_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  address TEXT
);

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id),
  total_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  payment_method TEXT NOT NULL,
  order_type TEXT NOT NULL DEFAULT 'dine_in',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  register_id UUID,
  server_name TEXT,
  customer_address TEXT,
  table_id TEXT
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID,
  quantity INTEGER NOT NULL,
  price NUMERIC NOT NULL,
  product_name TEXT,
  product_category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.daily_registers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  starting_amount NUMERIC DEFAULT 0,
  ending_amount NUMERIC,
  status TEXT DEFAULT 'open',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Ensure Profiles table exists for Auth
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  role TEXT DEFAULT 'cashier',
  restaurant_id TEXT, -- Keep as text to avoid foreign key issues
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Cleanup existing SaaS logic (if any exists)
DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY['products', 'categories', 'orders', 'order_items', 'customers', 'daily_registers', 'profiles'];
BEGIN
    -- Drop SaaS Triggers
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trigger_set_restaurant_id ON public.%I', t);
    END LOOP;

    -- Drop SaaS Functions
    DROP FUNCTION IF EXISTS public.set_restaurant_id();
    DROP FUNCTION IF EXISTS public.get_current_restaurant_id();
    DROP FUNCTION IF EXISTS public.get_auth_restaurant_id();

    -- Disable RLS then re-enable with "Allow All" policies
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation - %I" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Super Admin Override" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all for authenticated" ON public.%I', t);
        
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('CREATE POLICY "Allow all for authenticated" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;

-- 4. Seed categories if empty
INSERT INTO public.categories (name, icon) VALUES
('Burgers', 'Burger'),
('Rolls', 'Utensils'),
('Pizzas', 'Pizza'),
('Fries', 'Utensils'),
('ALA CART', 'UtensilsCrossed'),
('Beverages', 'Coffee'),
('Deals', 'Gift')
ON CONFLICT (name) DO NOTHING;

-- 5. Seed some initial products if table is empty
INSERT INTO public.products (name, sku, price, cost, stock, category, image)
SELECT 'Zinger Burger', 'PBH-BURG-1', 350, 0, 100, 'Burgers', '🍔'
WHERE NOT EXISTS (SELECT 1 FROM public.products LIMIT 1);
