import { useEffect, useState, useMemo, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export interface Profile {
  id: string;
  full_name: string | null;
  role: 'admin' | 'cashier';
  email?: string;
  restaurant_id?: string;
}

interface AuthContextType {
  session: any;
  sessionLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    // Initial session fetch
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSessionLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setSessionLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ session, sessionLoading }), [session, sessionLoading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useMultiTenant = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useMultiTenant must be used within an AuthProvider');
  }

  const { session, sessionLoading } = context;

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) return null;
      return data as Profile;
    },
    enabled: !!session?.user?.id,
    staleTime: 1000 * 60 * 5,
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
      isSuperAdmin: false,
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
      }
    };
  }, [session, profile, sessionLoading, profileLoading]);
};
