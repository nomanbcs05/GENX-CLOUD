
-- 1. Function to automatically set restaurant_id from the user's profile
CREATE OR REPLACE FUNCTION public.set_restaurant_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set it if it's currently NULL
  IF NEW.restaurant_id IS NULL THEN
    NEW.restaurant_id := public.get_auth_restaurant_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Apply this trigger to all tenant-specific tables
DO $$
DECLARE
    table_name_var TEXT;
    tables_to_auto_attribute TEXT[] := ARRAY['products', 'categories', 'orders', 'customers', 'daily_registers', 'restaurant_tables', 'order_items', 'delivery_addresses', 'delivery_zones', 'delivery_drivers'];
BEGIN
    FOREACH table_name_var IN ARRAY tables_to_auto_attribute
    LOOP
        -- Drop existing trigger if any
        EXECUTE format('DROP TRIGGER IF EXISTS trigger_set_restaurant_id ON public.%I', table_name_var);
        
        -- Create the BEFORE INSERT trigger
        EXECUTE format('
            CREATE TRIGGER trigger_set_restaurant_id
            BEFORE INSERT ON public.%I
            FOR EACH ROW
            EXECUTE FUNCTION public.set_restaurant_id();
        ', table_name_var);
    END LOOP;
END $$;

-- 3. Update existing RLS policies to allow Super Admins to see EVERYTHING
DO $$
DECLARE
    table_name_var TEXT;
    tables_to_fix TEXT[] := ARRAY['products', 'categories', 'orders', 'customers', 'daily_registers', 'restaurant_tables', 'order_items', 'restaurants', 'profiles'];
BEGIN
    FOREACH table_name_var IN ARRAY tables_to_fix
    LOOP
        -- Drop existing policy
        EXECUTE format('DROP POLICY IF EXISTS "Super Admins can access everything" ON public.%I', table_name_var);
        
        -- Create Super Admin override policy
        EXECUTE format('
            CREATE POLICY "Super Admins can access everything" 
            ON public.%I 
            FOR ALL 
            USING (
                (SELECT role FROM public.profiles WHERE id = auth.uid()) = ''super-admin''
            )
            WITH CHECK (
                (SELECT role FROM public.profiles WHERE id = auth.uid()) = ''super-admin''
            );
        ', table_name_var);
    END LOOP;
END $$;
