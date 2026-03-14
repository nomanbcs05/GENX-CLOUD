
-- 1. Add restaurant_id to all tenant-specific tables
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id);
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id);
ALTER TABLE public.daily_registers ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id);
ALTER TABLE public.restaurant_tables ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id);
ALTER TABLE public.delivery_addresses ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id);
ALTER TABLE public.delivery_zones ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id);
ALTER TABLE public.delivery_drivers ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id);

-- 2. Link existing data to the Default Restaurant
DO $$
DECLARE
    default_restaurant_id UUID;
BEGIN
    SELECT id INTO default_restaurant_id FROM public.restaurants WHERE slug = 'default-restaurant' LIMIT 1;

    IF default_restaurant_id IS NOT NULL THEN
        UPDATE public.products SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
        UPDATE public.categories SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
        UPDATE public.orders SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
        UPDATE public.customers SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
        UPDATE public.daily_registers SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
        UPDATE public.restaurant_tables SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
        UPDATE public.order_items SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
        UPDATE public.delivery_addresses SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
        UPDATE public.delivery_zones SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
        UPDATE public.delivery_drivers SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
    END IF;
END $$;

-- 3. Make restaurant_id NOT NULL for future data
-- (Wait to do this until after existing data is migrated if running on production)
-- ALTER TABLE public.products ALTER COLUMN restaurant_id SET NOT NULL;
-- ALTER TABLE public.categories ALTER COLUMN restaurant_id SET NOT NULL;
-- ALTER TABLE public.orders ALTER COLUMN restaurant_id SET NOT NULL;
-- ALTER TABLE public.customers ALTER COLUMN restaurant_id SET NOT NULL;
-- ALTER TABLE public.daily_registers ALTER COLUMN restaurant_id SET NOT NULL;
-- ALTER TABLE public.restaurant_tables ALTER COLUMN restaurant_id SET NOT NULL;
