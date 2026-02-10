
import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { licenseService, LicenseData } from "@/services/licenseService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const LicenseGate = ({ children }: { children?: React.ReactNode }) => {
  const [isValid, setIsValid] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(true);
  const [licenseKey, setLicenseKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [licenseData, setLicenseData] = useState<LicenseData | null>(null);

  useEffect(() => {
    checkLicense();
  }, []);

  const checkLicense = () => {
    const storedKey = licenseService.getLicense();
    if (!storedKey) {
      setIsValid(false);
      setChecking(false);
      return;
    }

    const result = licenseService.validateLicense(storedKey);
    if (result.valid) {
      setIsValid(true);
      setLicenseData(result.data!);
    } else {
      setIsValid(false);
      setError(result.error || "Invalid license");
    }
    setChecking(false);
  };

  const handleActivate = () => {
    setError(null);
    const result = licenseService.validateLicense(licenseKey);
    
    if (result.valid) {
      licenseService.saveLicense(licenseKey);
      setIsValid(true);
      setLicenseData(result.data!);
      toast.success("License activated successfully!");
    } else {
      setError(result.error || "Invalid license key");
      toast.error("Activation failed");
    }
  };

  if (checking) {
    return <div className="h-screen flex items-center justify-center">Checking license...</div>;
  }

  if (isValid) {
    return <>{children || <Outlet />}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <Card className="w-full max-w-md border-red-500/50 shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto bg-red-100 p-3 rounded-full w-fit mb-4">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Activation Required</CardTitle>
          <CardDescription>
            This secure POS system requires a valid monthly rental license.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-medium">License Key</label>
            <Input 
              placeholder="Paste your license key here..." 
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          <Button onClick={handleActivate} className="w-full bg-red-600 hover:bg-red-700">
            Activate License
          </Button>

          <div className="text-center text-xs text-muted-foreground mt-4">
            Contact support to renew your subscription.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
