import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Shield, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMultiTenant } from "@/hooks/useMultiTenant";

const Welcome = () => {
  const navigate = useNavigate();
  const { restaurant, isLoading: loadingTenant } = useMultiTenant();

  const { data: staff = [], isLoading: loadingStaff } = useQuery({
    queryKey: ['welcome-staff', restaurant?.id],
    queryFn: async () => {
      if (!restaurant?.id) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .neq('role', 'super-admin')
        .order('role', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!restaurant?.id,
  });

  const handleRoleSelect = (email: string) => {
    navigate("/login", { state: { email } });
  };

  if (loadingTenant || (restaurant?.id && loadingStaff)) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-900">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 font-sans overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/restaurant-hero.jpg?v=1'), url('/restaurant-luxury.png?v=2')" }}
      />
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 mb-8 text-center space-y-2 text-white"
      >
        <div className="mx-auto inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/85 mb-4 shadow-lg ring-2 ring-white/30 overflow-hidden backdrop-blur">
          <img
            src="/gx.png"
            alt="GX"
            className="object-contain w-16 h-16"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
        <h1 className="text-5xl font-black tracking-tighter font-heading uppercase drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
          {restaurant?.name || 'Gen XCloud POS'}
        </h1>
        <p className="text-white/80 text-lg font-medium">Select your account to continue</p>
      </motion.div>

      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
        {staff.length > 0 ? (
          staff.map((member) => (
            <RoleCard
              key={member.id}
              title={member.full_name || 'Staff Member'}
              icon={member.role === 'admin' ? Shield : User}
              description={member.role === 'admin' ? "Full management access" : "Process orders and payments"}
              onSelect={() => handleRoleSelect(member.email || '')}
            />
          ))
        ) : (
          <div className="col-span-full flex justify-center">
            <RoleCard
              title="Standard Login"
              icon={Users}
              description="Sign in with your email and password"
              onSelect={() => navigate("/login")}
            />
          </div>
        )}
      </div>

      <div className="absolute bottom-6 right-6 z-10 text-white/80 text-sm">
        © 2026 Gen XCloud POS. All rights reserved.
      </div>
    </div>
  );
};

interface RoleCardProps {
  title: string;
  icon: any;
  description: string;
  onSelect: () => void;
}

const RoleCard = ({ title, icon: Icon, description, onSelect }: RoleCardProps) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="cursor-pointer relative overflow-hidden rounded-xl border-2 border-slate-200 bg-white transition-all duration-200 hover:border-primary/50 hover:shadow-md"
      onClick={onSelect}
    >
      <div className="p-6 flex flex-col items-center text-center space-y-4">
        <div className="p-4 rounded-full bg-slate-100 text-slate-600 group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="w-8 h-8" />
        </div>
        <div>
          <h3 className="font-black text-xl text-slate-900 font-heading uppercase tracking-tight">{title}</h3>
          <p className="text-sm text-slate-500 mt-1 font-medium">{description}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default Welcome;
