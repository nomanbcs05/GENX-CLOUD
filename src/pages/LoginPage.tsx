import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, ArrowRight, User, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Role = "admin" | "cashier" | "cashier2";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const role = (location.state?.role as Role) || "cashier"; 

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedUsers, setSavedUsers] = useState<Record<string, string>>({});

  useEffect(() => {
    const saved = localStorage.getItem("pos_saved_users");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSavedUsers(parsed);
        if (parsed[role]) setEmail(parsed[role]);
      } catch (e) {
        console.error("Failed to parse saved users", e);
      }
    }
  }, [role]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Try Supabase Login
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      // Success
      const newSavedUsers = { ...savedUsers, [role]: email };
      localStorage.setItem("pos_saved_users", JSON.stringify(newSavedUsers));

      toast.success(`Welcome back!`);
      navigate("/");
    } catch (error: any) {
      console.error("Login error:", error);
      
      // If login fails (e.g. invalid login or rate limit or email not confirmed), fall back to local mode if requested
      // For now, let's allow a fallback if the user is stuck
      if (error.message?.includes("Email not confirmed")) {
         const shouldBypass = window.confirm("Email not confirmed. Would you like to enter Offline Mode?");
         if (shouldBypass) {
            const localUser = {
                name: email.split('@')[0],
                email,
                role
            };
            localStorage.setItem("pos_local_user", JSON.stringify(localUser));
            toast.success("Entered Offline Mode");
            navigate("/");
            return;
         }
      }

      toast.error(error.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = () => {
    switch (role) {
      case "admin": return Shield;
      case "cashier": return User;
      case "cashier2": return Users;
      default: return User;
    }
  };

  const RoleIcon = getRoleIcon();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Button 
          variant="ghost" 
          className="mb-6 hover:bg-transparent hover:text-primary pl-0"
          onClick={() => navigate("/auth")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Roles
        </Button>

        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <RoleIcon className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-xl">Login as {role === 'cashier2' ? 'Cashier 2' : role.charAt(0).toUpperCase() + role.slice(1)}</CardTitle>
                <CardDescription>Enter your credentials</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white/50"
                />
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Access Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default LoginPage;
