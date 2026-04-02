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
  const [state, setState] = useState<AuthContextType>({
    session: null,
    sessionLoading: true,
  });

  useEffect(() => {
    let mounted = true;

    // Initial session fetch
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setState({ session, sessionLoading: false });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (mounted) {
        setState(prev => {
          // Deep compare simple session fields to prevent loop
          const isSameUser = prev.session?.user?.id === newSession?.user?.id;
          const isSameToken = prev.session?.access_token === newSession?.access_token;
          
          if (isSameUser && isSameToken && prev.sessionLoading === false) {
            return prev;
          }
          return { session: newSession, sessionLoading: false };
        });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => state, [state.session?.user?.id, state.session?.access_token, state.sessionLoading]);

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
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (error) {
          console.warn('Profile fetch error (could be expected if profile table is missing):', error);
          return null;
        }
        return data as Profile;
      } catch (err) {
        console.warn('Profile query exception:', err);
        return null;
      }
    },
    enabled: !!session?.user?.id,
    staleTime: 1000 * 60 * 5,
  });

  return useMemo(() => {
    const isSuperAdmin = profile?.email === 'thepizzaandburgerhouse@gmail.com';
    const isAdmin = isSuperAdmin || profile?.role === 'admin';
    const isCashier = profile?.role === 'cashier' || 
                     profile?.email === 'syedabuzarzaidi07@gmail.com' ||
                     (!isSuperAdmin && profile && profile.email !== 'thepizzaandburgerhouse@gmail.com');

    return {
      session,
      profile,
      isLoading: sessionLoading || profileLoading,
      isAdmin,
      isCashier,
      isSuperAdmin,
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
