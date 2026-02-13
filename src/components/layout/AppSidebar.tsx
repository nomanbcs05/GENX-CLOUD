import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  LayoutGrid, 
  Clock,
  ClipboardList, 
  Package, 
  Settings2,
  Users, 
  BarChart3, 
  Settings, 
  LogOut,
  Coffee,
  PlusCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { useQueryClient } from '@tanstack/react-query';
import StartDayModal from '@/components/pos/StartDayModal';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutGrid },
  { name: 'Ongoing Orders', href: '/ongoing-orders', icon: Clock },
  { name: 'Orders', href: '/orders', icon: ClipboardList },
  { name: 'Manage Products', href: '/manage-products', icon: Settings2 },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [userName, setUserName] = useState("Loading...");
  const [userRole, setUserRole] = useState("Staff");
  const [showStartSessionModal, setShowStartSessionModal] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      // Check local dev mode first
      const localUser = localStorage.getItem('pos_local_user');
      if (localUser) {
        try {
          const parsed = JSON.parse(localUser);
          setUserName(parsed.name || parsed.email || "User");
          setUserRole(parsed.role || 'Cashier');
        } catch (e) {
          console.error("Error parsing local user:", e);
          setUserName("User");
        }
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fallback mapping for specific emails if metadata is missing
        let role = user.user_metadata?.role;
        if (!role) {
          if (user.email === 'noman21cs@gmail.com') role = 'admin';
          else if (user.email === 'syedabuzarzaidi07@gmail.com') role = 'cashier';
          else role = 'Cashier';
        }
        
        setUserName(user.user_metadata?.name || user.email?.split('@')[0] || "User");
        setUserRole(role);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      localStorage.removeItem("pos_local_user"); // Clear local dev session
      await supabase.auth.signOut();
      toast.success("Logged out successfully");
      navigate("/auth");
    } catch (error) {
      toast.error("Error logging out");
    }
  };

  const handleStartSessionSuccess = () => {
    setShowStartSessionModal(false);
    queryClient.invalidateQueries({ queryKey: ['registers'] }); // Refresh registers data
  };

  return (
    <aside className="w-[180px] bg-sidebar text-sidebar-foreground flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sidebar-primary flex items-center justify-center shadow-lg shadow-sidebar-primary/20">
            <Coffee className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="font-black font-heading text-sm tracking-tight uppercase leading-none">Gen XCloud</h1>
            <p className="text-[10px] font-bold text-sidebar-foreground/50 uppercase tracking-widest mt-1">POS System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold font-heading uppercase tracking-wider transition-all",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
              
              {/* Keyboard shortcut hints */}
              {item.name === 'Dashboard' && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-sidebar-border text-sidebar-foreground/50">
                  F1
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-sidebar-accent/30 border border-sidebar-border/50">
          <div className="w-8 h-8 rounded-full bg-sidebar-primary flex items-center justify-center shadow-md">
            <span className="text-[10px] font-black font-heading text-sidebar-primary-foreground">
              {(userName || "US").substring(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black font-heading truncate leading-tight tracking-tight uppercase">{userName}</p>
            <p className="text-[10px] font-black text-sidebar-foreground/40 uppercase tracking-widest mt-0.5">{userRole}</p>
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          className="w-full mt-3 flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold font-heading uppercase tracking-widest text-sidebar-foreground/50 hover:bg-destructive/10 hover:text-destructive transition-all"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Log out</span>
        </button>
      </div>

      <StartDayModal
        isOpen={showStartSessionModal}
        onClose={() => setShowStartSessionModal(false)}
        onSuccess={handleStartSessionSuccess}
      />
    </aside>
  );
};

export default AppSidebar;
