import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useMultiTenant } from "@/hooks/useMultiTenant";

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const { session, profile, isLoading, isAdmin } = useMultiTenant();
  const location = useLocation();

  if (isLoading) {
    return null; // Don't show anything while loading to prevent flashes or infinite loops
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
