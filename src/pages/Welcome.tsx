import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

type Role = "admin" | "cashier" | "cashier2";

const Welcome = () => {
  const navigate = useNavigate();

  const handleRoleSelect = (role: Role) => {
    navigate("/login", { state: { role } });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-12 text-center space-y-2"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4 shadow-lg shadow-primary/20">
          <span className="text-3xl font-bold text-primary-foreground">G</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Gen XCloud POS</h1>
        <p className="text-slate-500 text-lg">Select your role to continue</p>
      </motion.div>

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
        {/* Admin Card */}
        <RoleCard
          title="Administrator"
          icon={Shield}
          description="Full access to all settings and reports"
          onSelect={() => handleRoleSelect("admin")}
        />

        {/* Cashier Card */}
        <RoleCard
          title="Cashier"
          icon={User}
          description="Process orders and manage payments"
          onSelect={() => handleRoleSelect("cashier")}
        />

        {/* Cashier 2 Card */}
        <RoleCard
          title="Cashier 2"
          icon={Users}
          description="Secondary station for peak hours"
          onSelect={() => handleRoleSelect("cashier2")}
        />
      </div>

      <div className="mt-12 text-slate-400 text-sm">
        © 2024 Gen XCloud POS. All rights reserved.
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
          <h3 className="font-bold text-lg text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500 mt-1">{description}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default Welcome;
