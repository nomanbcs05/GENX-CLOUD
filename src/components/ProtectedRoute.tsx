
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useMultiTenant } from "@/hooks/useMultiTenant";

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const { session, profile, isLoading, isAdmin } = useMultiTenant();
  const location = useLocation();

  console.log("ProtectedRoute State:", { 
    path: location.pathname, 
    isLoading, 
    hasSession: !!session, 
    hasProfile: !!profile, 
    isAdmin,
    restaurantId: profile?.restaurant_id 
  });

  if (isLoading) {
    console.log("ProtectedRoute: Loading session/profile...");
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    console.log("ProtectedRoute: No session found, redirecting to /auth");
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
