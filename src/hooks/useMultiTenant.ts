
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export interface Profile {
  id: string;
  restaurant_id: string | null;
  full_name: string | null;
  role: 'admin' | 'cashier' | 'super-admin';
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  subscription_status: 'trial' | 'active' | 'expired' | 'cancelled';
  license_expiry: string | null;
}

export const useMultiTenant = () => {
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data as Profile;
    },
    enabled: !!session?.user?.id,
  });

  const { data: restaurant, isLoading: restaurantLoading } = useQuery({
    queryKey: ['restaurant', profile?.restaurant_id],
    queryFn: async () => {
      if (!profile?.restaurant_id) return null;
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', profile.restaurant_id)
        .single();
      
      if (error) {
        console.error('Error fetching restaurant:', error);
        return null;
      }
      return data as Restaurant;
    },
    enabled: !!profile?.restaurant_id,
  });

  return {
    session,
    profile,
    restaurant,
    isLoading: profileLoading || restaurantLoading,
    isSuperAdmin: profile?.role === 'super-admin',
    isAdmin: profile?.role === 'admin' || profile?.role === 'super-admin',
  };
};
