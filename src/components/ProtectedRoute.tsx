import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useMultiTenant } from "@/hooks/useMultiTenant";

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const { session, profile, isLoading, isAdmin } = useMultiTenant();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-900 text-white flex-col gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        <div className="text-center">
          <h2 className="text-xl font-black tracking-widest uppercase">Verifying Access</h2>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Checking session & permissions...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
