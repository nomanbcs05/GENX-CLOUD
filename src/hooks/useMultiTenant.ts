import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface Profile {
  id: string;
  full_name: string | null;
  role: 'admin' | 'cashier';
}

export const useMultiTenant = () => {
  const [session, setSession] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      setSession(session);
      setSessionLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setSessionLoading(false);
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

      if (error) return null;
      return data as Profile;
    },
    enabled: !!session?.user?.id,
  });

  return {
    session,
    profile,
    isLoading: sessionLoading || profileLoading,
    isAdmin: profile?.role === 'admin',
    isSuperAdmin: false, // SaaS disabled
    restaurant: {
      name: "THE pizza&burger HOUSE",
      logo_url: "/pbh-logo.jpeg"
    } // Static name for single tenant
  };
};
