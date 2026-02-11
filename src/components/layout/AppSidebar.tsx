import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  LayoutGrid, 
  ClipboardList, 
  Package, 
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
import StartDayModal from '@/components/pos/StartDayModal';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutGrid },
  { name: 'Ongoing Orders', href: '/ongoing-orders', icon: Clock },
  { name: 'Orders', href: '/orders', icon: ClipboardList },
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
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  
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

  return (
    <aside className="w-[180px] bg-sidebar text-sidebar-foreground flex flex-col h-full">
      {/* Logo */}
      <div className="p-3 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Coffee className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-xs">Gen XCloud POS</h1>
            <p className="text-[10px] text-sidebar-foreground/70">POS System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        <button
          onClick={() => setShowNewOrderModal(true)}
          className="w-full flex items-center gap-2 px-2 py-3 mb-2 rounded-lg text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
        >
          <PlusCircle className="h-5 w-5" />
          <span>New Order</span>
        </button>

        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
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
      <div className="p-2 border-t border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-sidebar-accent/30">
          <div className="w-7 h-7 rounded-full bg-sidebar-primary flex items-center justify-center">
            <span className="text-[10px] font-bold text-sidebar-primary-foreground">
              {(userName || "US").substring(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{userName}</p>
            <p className="text-[10px] text-sidebar-foreground/60">{userRole}</p>
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          className="w-full mt-2 flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-destructive transition-colors"
        >
          <LogOut className="h-3 w-3" />
          <span>Log out</span>
        </button>
      </div>

      <StartDayModal 
        isOpen={showNewOrderModal} 
        onSuccess={() => {
          setShowNewOrderModal(false);
          navigate('/');
        }} 
        onClose={() => setShowNewOrderModal(false)}
        forceNewSession={true}
      />
    </aside>
  );
};

export default AppSidebar;
