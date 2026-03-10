
-- 1. Enable RLS on all tenant-specific tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;

-- 2. Create the helper function to get current user's restaurant_id
CREATE OR REPLACE FUNCTION public.get_auth_restaurant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT restaurant_id
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create RLS Policies for each table (Example for Products)
DO $$
DECLARE
    table_name_var TEXT;
    tables_to_isolate TEXT[] := ARRAY['products', 'categories', 'orders', 'customers', 'daily_registers', 'restaurant_tables'];
BEGIN
    FOREACH table_name_var IN ARRAY tables_to_isolate
    LOOP
        -- Drop existing policies if any
        EXECUTE format('DROP POLICY IF EXISTS "Users can only access their own restaurant data" ON public.%I', table_name_var);
        
        -- Create the isolation policy
        EXECUTE format('
            CREATE POLICY "Users can only access their own restaurant data" 
            ON public.%I 
            FOR ALL 
            USING (restaurant_id = public.get_auth_restaurant_id())
            WITH CHECK (restaurant_id = public.get_auth_restaurant_id());
        ', table_name_var);
    END LOOP;
END $$;
