import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface Profile {
  id: string;
  full_name: string | null;
  role: 'admin' | 'cashier';
  email?: string;
  restaurant_id?: string;
}

export const useMultiTenant = () => {
  const [session, setSession] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    // Initial session fetch
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log("useMultiTenant: getSession finished", { hasSession: !!session });
      setSession(session);
      setSessionLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log("useMultiTenant: onAuthStateChange", { event, hasSession: !!newSession });
      setSession(newSession);
      setSessionLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      console.log("useMultiTenant: fetching profile for", session.user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error("useMultiTenant: profile error", error);
        return null;
      }
      return data as Profile;
    },
    enabled: !!session?.user?.id,
    staleTime: 1000 * 60 * 5, // Cache profile for 5 mins
  });

  return useMemo(() => {
    const isAdmin = profile?.email === 'thepizzaandburgerhouse@gmail.com' || profile?.role === 'admin';
    const isCashier = profile?.role === 'cashier' || 
                     profile?.email === 'syedabuzarzaidi07@gmail.com' || 
                     (profile && profile.email !== 'thepizzaandburgerhouse@gmail.com');

    return {
      session,
      profile,
      isLoading: sessionLoading || profileLoading,
      isAdmin,
      isCashier,
      isSuperAdmin: false, // SaaS disabled
      restaurant: { 
        id: "the-pizza-burger-house-id",
        name: "THE pizza&burger HOUSE",
        logo_url: "/pbh-logo.png",
        address: "Near Lasani Chicken Broast, Gol Wala Complex",
        city: "Nawabshah",
        phone: "+92 332 2822654",
        tax_id: null,
        website: null,
        email: null,
        receipt_footer: "Powered By: GENX CLOUD +92 334 2826675",
        bill_footer: "!!!!FOR THE LOVE OF FOOD !!!!"
      } // Static config for single tenant
    };
  }, [session, profile, sessionLoading, profileLoading]);
};
