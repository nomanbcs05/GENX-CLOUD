-- FINAL REPAIR SCRIPT: Fix 500 errors and completely remove SaaS/Multi-tenancy
-- This script will clean up all broken policies, missing functions, and incorrect constraints.
-- RUN THIS IN THE SUPABASE SQL EDITOR

-- 1. Create Core Tables (Ensuring columns expected by the frontend exist)
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS public.generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL,
  report_date TIMESTAMP WITH TIME ZONE NOT NULL,
  report_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  role TEXT DEFAULT 'cashier',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Cleanup profiles from restaurant foreign keys (This is where the user's error likely came from)
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_restaurant_id_fkey;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS restaurant_id TEXT;

-- 3. Cleanup ALL RLS policies (The cause of 500 errors)
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('products', 'categories', 'orders', 'order_items', 'customers', 'daily_registers', 'profiles', 'generated_reports', 'restaurants')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 4. Cleanup Triggers and Functions
DO $$
DECLARE
    trig RECORD;
BEGIN
    FOR trig IN 
        SELECT trigger_name, event_object_table 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public' 
        AND trigger_name = 'trigger_set_restaurant_id'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', trig.trigger_name, trig.event_object_table);
    END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.set_restaurant_id();
DROP FUNCTION IF EXISTS public.get_current_restaurant_id();
DROP FUNCTION IF EXISTS public.get_auth_restaurant_id();

-- 5. Finalize RLS and grant full access to authenticated users
DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY['products', 'categories', 'orders', 'order_items', 'customers', 'daily_registers', 'profiles', 'generated_reports'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('CREATE POLICY "Allow all for authenticated" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;

-- 6. Seed categories if table is empty
INSERT INTO public.categories (name, icon) VALUES
('Burgers', 'Burger'), ('Rolls', 'Utensils'), ('Pizzas', 'Pizza'), ('Fries', 'Utensils'),
('ALA CART', 'UtensilsCrossed'), ('Beverages', 'Coffee'), ('Deals', 'Gift')
ON CONFLICT (name) DO NOTHING;
