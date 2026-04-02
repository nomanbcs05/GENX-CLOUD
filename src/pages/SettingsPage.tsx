import { Store, Receipt, Users, CreditCard, Bell, Shield, Lock, Trash2, Edit, Image as ImageIcon, Upload, Plus, Loader2 } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMultiTenant } from '@/hooks/useMultiTenant';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { toast } from 'sonner';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const SettingsPage = () => {
  const { profile, restaurant, isAdmin } = useMultiTenant();
  const queryClient = useQueryClient();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [lockPassword, setLockPassword] = useState('');

  const [businessName, setBusinessName] = useState(restaurant?.name || '');
  const [phone, setPhone] = useState(restaurant?.phone || '');
  const [address, setAddress] = useState(restaurant?.address || '');
  const [city, setCity] = useState(restaurant?.city || '');
  const [taxId, setTaxId] = useState(restaurant?.tax_id || '');
  const [website, setWebsite] = useState(restaurant?.website || '');
  const [email, setEmail] = useState(restaurant?.email || '');
  const [logoUrl, setLogoUrl] = useState(restaurant?.logo_url || '');
  const [receiptFooter, setReceiptFooter] = useState(restaurant?.receipt_footer || 'Thank you for your visit! Come back soon!');
  const [billFooter, setBillFooter] = useState(restaurant?.bill_footer || '!!!!FOR THE LOVE OF FOOD !!!!');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // New staff form state
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [isAddingStaff, setIsAddingStaff] = useState(false);

  useEffect(() => {
    if (restaurant) {
      setBusinessName(restaurant.name || '');
      setPhone(restaurant.phone || '');
      setAddress(restaurant.address || '');
      setCity(restaurant.city || '');
      setTaxId(restaurant.tax_id || '');
      setWebsite(restaurant.website || '');
      setEmail(restaurant.email || '');
      setLogoUrl(restaurant.logo_url || '');
      setReceiptFooter(restaurant.receipt_footer || 'Thank you for your visit! Come back soon!');
      setBillFooter(restaurant.bill_footer || '!!!!FOR THE LOVE OF FOOD !!!!');
    }
  }, [restaurant]);

  const { data: staffMembers = [], isLoading: isLoadingStaff } = useQuery({
    queryKey: ['staff', restaurant?.id],
    queryFn: () => api.profiles.getByRestaurant(restaurant!.id),
    enabled: !!restaurant?.id && isAdmin,
  });

  const changePasswordMutation = useMutation({
    mutationFn: (pwd: string) => api.profiles.changePassword(pwd),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to change password');
    }
  });

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    changePasswordMutation.mutate(newPassword);
  };

  const createStaffMutation = useMutation({
    mutationFn: (data: any) => api.profiles.createStaff(data),
    onSuccess: () => {
      toast.success('Staff account created successfully');
      setNewStaffEmail('');
      setNewStaffPassword('');
      setNewStaffName('');
      setIsAddingStaff(false);
      queryClient.invalidateQueries({ queryKey: ['staff', restaurant?.id] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create staff account');
    }
  });

  const handleCreateStaff = () => {
    if (!newStaffEmail || !newStaffPassword || !newStaffName) {
      toast.error('Please fill in all fields');
      return;
    }
    if (newStaffPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (!restaurant?.id) {
      toast.error('Restaurant ID not found');
      return;
    }

    createStaffMutation.mutate({
      email: newStaffEmail,
      password: newStaffPassword,
      full_name: newStaffName,
      role: 'cashier',
    });
  };

  const updateRestaurantMutation = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      if (!restaurant?.id) throw new Error('No restaurant selected');
      const { error } = await supabase
        .from('restaurants')
        .update(payload)
        .eq('id', restaurant.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Restaurant settings updated');
      if (restaurant?.id) {
        queryClient.invalidateQueries({ queryKey: ['restaurant', restaurant.id] });
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update restaurant settings');
    },
  });

  const handleLogoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!restaurant?.id) {
      toast.error('No restaurant selected');
      return;
    }

    try {
      setIsUploadingLogo(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${restaurant.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('restaurant-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error('Logo upload error:', uploadError);
        toast.error('Failed to upload logo');
        return;
      }

      const { data } = supabase.storage.from('restaurant-logos').getPublicUrl(filePath);
      if (!data?.publicUrl) {
        toast.error('Could not get logo URL');
        return;
      }

      setLogoUrl(data.publicUrl);
      updateRestaurantMutation.mutate({ logo_url: data.publicUrl });
    } catch (error: any) {
      console.error('Logo upload exception:', error);
      toast.error(error.message || 'Unexpected error while uploading logo');
    } finally {
      setIsUploadingLogo(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const [staffList, setStaffList] = useState([
    { id: 'admin', name: 'ADMIN', role: 'Administrator' },
    { id: 'cashier', name: 'ALI HYDER', role: 'Cashier' },
    { id: 'cashier2', name: 'CASHIER 2', role: 'Secondary Cashier' }
  ]);

  // Server and Rider management state
  const [serverList, setServerList] = useState<string[]>([]);
  const [riderList, setRiderList] = useState<string[]>([]);
  const [newServerName, setNewServerName] = useState('');
  const [newRiderName, setNewRiderName] = useState('');

  useEffect(() => {
    const savedStaff = localStorage.getItem('pos_staff_names');
    if (savedStaff) {
      setStaffList(JSON.parse(savedStaff));
    }

    const savedServers = localStorage.getItem('pos_server_names');
    if (savedServers) {
      setServerList(JSON.parse(savedServers));
    } else {
      setServerList(['Babar', 'Touheed', 'Nasrullah']); // Defaults
    }

    const savedRiders = localStorage.getItem('pos_rider_names');
    if (savedRiders) {
      setRiderList(JSON.parse(savedRiders));
    } else {
      setRiderList(['Ayaz', 'Mumtaz', 'Abuzar', 'Zafar']); // Defaults
    }

    const savedLockPassword = localStorage.getItem('pos_lock_password');
    if (savedLockPassword) {
      setLockPassword(savedLockPassword);
    }
  }, []);

  const handleUpdateStaffName = (id: string, newName: string) => {
    const updated = staffList.map(s => s.id === id ? { ...s, name: newName } : s);
    setStaffList(updated);
    localStorage.setItem('pos_staff_names', JSON.stringify(updated));
    
    // If the updated staff is the current user, update their active session name
    const activeRole = localStorage.getItem('active_role');
    if (activeRole === id) {
      localStorage.setItem('active_staff_name', newName);
      // Dispatch event to notify sidebar/other components
      window.dispatchEvent(new Event('active-staff-name-changed'));
    }
    
    toast.success(`${id.charAt(0).toUpperCase() + id.slice(1)} display name updated`);
  };

  const handleAddServer = () => {
    if (!newServerName.trim()) return;
    const updated = [...serverList, newServerName.trim()];
    setServerList(updated);
    localStorage.setItem('pos_server_names', JSON.stringify(updated));
    setNewServerName('');
    toast.success('Server added successfully');
  };

  const handleDeleteServer = (name: string) => {
    const updated = serverList.filter(s => s !== name);
    setServerList(updated);
    localStorage.setItem('pos_server_names', JSON.stringify(updated));
    toast.success('Server removed');
  };

  const handleAddRider = () => {
    if (!newRiderName.trim()) return;
    const updated = [...riderList, newRiderName.trim()];
    setRiderList(updated);
    localStorage.setItem('pos_rider_names', JSON.stringify(updated));
    setNewRiderName('');
    toast.success('Rider added successfully');
  };

  const handleDeleteRider = (name: string) => {
    const updated = riderList.filter(r => r !== name);
    setRiderList(updated);
    localStorage.setItem('pos_rider_names', JSON.stringify(updated));
    toast.success('Rider removed');
  };

  const handleSaveLockPassword = () => {
    localStorage.setItem('pos_lock_password', lockPassword);
    toast.success('POS Lock password updated successfully');
  };

  return (
    <MainLayout>
      <ScrollArea className="h-full">
        <div className="p-6 max-w-4xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage your POS system configuration</p>
          </div>

          <Tabs defaultValue="business" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="business">Business</TabsTrigger>
              <TabsTrigger value="receipt">Receipt</TabsTrigger>
              <TabsTrigger value="tax">Tax & Payment</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="staff">Staff & Servers</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            <TabsContent value="business">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    Business Information
                  </CardTitle>
                  <CardDescription>
                    Update your restaurant details that appear on receipts
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="businessName">Business Name</Label>
                      <Input
                        id="businessName"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City & State</Label>
                      <Input
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taxId">Tax ID</Label>
                      <Input
                        id="taxId"
                        value={taxId}
                        onChange={(e) => setTaxId(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <Button
                      onClick={() =>
                        updateRestaurantMutation.mutate({
                          name: businessName,
                          phone,
                          address,
                          city,
                          tax_id: taxId,
                          website,
                          email,
                        })
                      }
                      disabled={updateRestaurantMutation.isPending}
                    >
                      {updateRestaurantMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="receipt">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Receipt Settings
                  </CardTitle>
                  <CardDescription>
                    Customize how your receipts look and print
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="logoUrl" className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Logo URL
                      </Label>
                      <Input
                        id="logoUrl"
                        placeholder="https://your-cdn.com/logo.png"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        This image will appear on printed bills and receipts. You can also upload a file.
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingLogo}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {isUploadingLogo ? 'Uploading…' : 'Upload Logo'}
                        </Button>
                        {logoUrl && (
                          <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                            {logoUrl}
                          </span>
                        )}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoFileChange}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Auto-print receipts</p>
                        <p className="text-sm text-muted-foreground">
                          Automatically print when order is completed
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Show QR code</p>
                        <p className="text-sm text-muted-foreground">
                          Display QR code for digital receipt
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Include customer info</p>
                        <p className="text-sm text-muted-foreground">
                          Print customer name and phone on receipt
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Footer Message</Label>
                    <Input
                      value={receiptFooter}
                      onChange={(e) => setReceiptFooter(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Bill Footer (Kitchen / 80mm)</Label>
                    <Input
                      value={billFooter}
                      onChange={(e) => setBillFooter(e.target.value)}
                    />
                  </div>
                  
                  <div className="pt-4">
                    <Button
                      onClick={() =>
                        updateRestaurantMutation.mutate({
                          logo_url: logoUrl || null,
                          receipt_footer: receiptFooter,
                          bill_footer: billFooter,
                        })
                      }
                      disabled={updateRestaurantMutation.isPending}
                    >
                      {updateRestaurantMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tax">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Tax & Payment Settings
                  </CardTitle>
                  <CardDescription>
                    Configure tax rates and payment methods
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="taxRate">Tax Rate (%)</Label>
                      <Input id="taxRate" type="number" defaultValue="10" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taxName">Tax Name</Label>
                      <Input id="taxName" defaultValue="Sales Tax" />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="font-medium">Enabled Payment Methods</h3>
                    
                    <div className="flex items-center justify-between">
                      <p>Cash</p>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <p>Credit/Debit Card</p>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <p>Digital Wallet (Apple Pay, Google Pay)</p>
                      <Switch defaultChecked />
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <Button>Save Changes</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notification Settings
                  </CardTitle>
                  <CardDescription>
                    Configure alerts and notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Low stock alerts</p>
                        <p className="text-sm text-muted-foreground">
                          Get notified when products are running low
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Daily sales summary</p>
                        <p className="text-sm text-muted-foreground">
                          Receive daily sales report via email
                        </p>
                      </div>
                      <Switch />
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Sound notifications</p>
                        <p className="text-sm text-muted-foreground">
                          Play sounds for order completions
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
                    <Input id="lowStockThreshold" type="number" defaultValue="10" />
                    <p className="text-sm text-muted-foreground">
                      Alert when stock falls below this number
                    </p>
                  </div>
                  
                  <div className="pt-4">
                    <Button>Save Changes</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="staff">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Staff & Service Management
                    </CardTitle>
                    <CardDescription>
                      Manage cashiers, servers, and riders for your restaurant
                    </CardDescription>
                  </div>
                  {isAdmin && (
                    <Button 
                      onClick={() => setIsAddingStaff(!isAddingStaff)}
                      variant={isAddingStaff ? "outline" : "default"}
                    >
                      {isAddingStaff ? 'Cancel' : 'Add New Staff'}
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {isAddingStaff && isAdmin && (
                    <div className="mb-8 p-6 border-2 border-primary/20 rounded-2xl bg-primary/5 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                      <h3 className="font-bold text-lg">Create New Staff Account</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="staffName">Full Name</Label>
                          <Input 
                            id="staffName" 
                            placeholder="e.g. John Doe" 
                            value={newStaffName}
                            onChange={(e) => setNewStaffName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="staffEmail">Email (Gmail)</Label>
                          <Input 
                            id="staffEmail" 
                            type="email" 
                            placeholder="staff@gmail.com" 
                            value={newStaffEmail}
                            onChange={(e) => setNewStaffEmail(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="staffPassword">Password</Label>
                          <Input 
                            id="staffPassword" 
                            type="password" 
                            placeholder="Min. 6 characters" 
                            value={newStaffPassword}
                            onChange={(e) => setNewStaffPassword(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end pt-2">
                        <Button 
                          onClick={handleCreateStaff} 
                          disabled={createStaffMutation.isPending}
                          className="bg-slate-900 text-white px-8"
                        >
                          {createStaffMutation.isPending ? 'Creating...' : 'Create Account'}
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-900">Active Staff Members</h3>
                    <div className="grid gap-4">
                      {isLoadingStaff ? (
                        <div className="flex items-center justify-center p-8">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : !isAdmin ? (
                        <div className="text-sm text-muted-foreground p-4 bg-slate-50 rounded-xl border border-dashed">
                          Contact Administrator to manage permanent staff accounts.
                        </div>
                      ) : staffMembers.length === 0 ? (
                        <div className="text-center p-8 border-2 border-dashed rounded-2xl text-slate-400 font-medium">
                          No staff accounts found. Create one above.
                        </div>
                      ) : (
                        staffMembers.map((staff: any) => (
                          <div key={staff.id} className="flex items-center justify-between p-4 border rounded-xl bg-slate-50/50 hover:border-primary/30 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                {staff.full_name?.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{staff.full_name}</p>
                                <p className="text-xs text-slate-500">{staff.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className={cn(
                                "capitalize font-bold",
                                staff.role === 'admin' ? "bg-purple-50 text-purple-600 border-purple-200" : "bg-blue-50 text-blue-600 border-blue-200"
                              )}>
                                {staff.role}
                              </Badge>
                              {isAdmin && staff.id !== profile?.id && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete ${staff.full_name}?`)) {
                                      api.profiles.delete(staff.id).then(() => {
                                        toast.success('Staff deleted');
                                        queryClient.invalidateQueries({ queryKey: ['staff', restaurant?.id] });
                                      });
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <Separator className="my-8" />

                  <div className="space-y-6">
                    <h3 className="font-bold text-slate-900">Display Settings</h3>
                    <p className="text-sm text-muted-foreground -mt-4">Change how roles appear on the welcome screen</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {staffList.map((staff) => (
                        <div key={staff.id} className="flex flex-col gap-2 p-4 border rounded-xl bg-slate-50/50">
                          <Label htmlFor={`staff-${staff.id}`} className="text-xs font-bold text-slate-500 uppercase tracking-wider">{staff.role} Display Name</Label>
                          <div className="flex gap-2">
                            <Input
                              id={`staff-${staff.id}`}
                              value={staff.name}
                              onChange={(e) => {
                                const updated = staffList.map(s => s.id === staff.id ? { ...s, name: e.target.value } : s);
                                setStaffList(updated);
                              }}
                              className="bg-white font-bold"
                            />
                            <Button 
                              onClick={() => handleUpdateStaffName(staff.id, staff.name)}
                              size="sm"
                              className="bg-slate-900 text-white font-bold px-4"
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator className="my-8" />

                  <div className="space-y-6">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-bold text-slate-900">Servers Management</h3>
                      <p className="text-sm text-muted-foreground">Add or remove servers for Dine-In orders</p>
                    </div>
                    
                    <div className="flex gap-2 max-w-md">
                      <Input 
                        placeholder="Enter new server name" 
                        value={newServerName}
                        onChange={(e) => setNewServerName(e.target.value)}
                        className="bg-white font-bold"
                      />
                      <Button onClick={handleAddServer} className="bg-slate-900 text-white font-bold px-6 shrink-0">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Server
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {serverList.map((name) => (
                        <div key={name} className="flex items-center justify-between p-3 border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow group">
                          <span className="font-bold text-slate-700 ml-2">{name}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-300 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDeleteServer(name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator className="my-8" />

                  <div className="space-y-6">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-bold text-slate-900">Rider Management</h3>
                      <p className="text-sm text-muted-foreground">Add or remove riders for Delivery orders</p>
                    </div>
                    
                    <div className="flex gap-2 max-w-md">
                      <Input 
                        placeholder="Enter new rider name" 
                        value={newRiderName}
                        onChange={(e) => setNewRiderName(e.target.value)}
                        className="bg-white font-bold"
                      />
                      <Button onClick={handleAddRider} className="bg-slate-900 text-white font-bold px-6 shrink-0">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Rider
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {riderList.map((name) => (
                        <div key={name} className="flex items-center justify-between p-3 border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow group">
                          <span className="font-bold text-slate-700 ml-2">{name}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-300 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDeleteRider(name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Security Settings
                  </CardTitle>
                  <CardDescription>
                    Keep your account secure by changing your password regularly
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input 
                      id="newPassword" 
                      type="password" 
                      placeholder="Min. 6 characters" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input 
                      id="confirmPassword" 
                      type="password" 
                      placeholder="Repeat new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  <div className="pt-4">
                    <Button 
                      onClick={handleChangePassword}
                      disabled={changePasswordMutation.isPending || !newPassword || !confirmPassword}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {changePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
                    </Button>
                  </div>

                  <Separator className="my-6" />

                  <div className="space-y-4 pt-4">
                    <div className="flex items-center gap-2">
                      <Lock className="h-5 w-5 text-primary" />
                      <div>
                        <h3 className="text-lg font-bold">POS Lock Screen Password</h3>
                        <p className="text-sm text-muted-foreground">Set a password to quickly lock the POS terminal</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 max-w-sm">
                      <Label htmlFor="lockPassword">Lock Password (PIN)</Label>
                      <div className="flex gap-2">
                        <Input 
                          id="lockPassword" 
                          type="password" 
                          placeholder="Enter lock PIN/Password" 
                          value={lockPassword}
                          onChange={(e) => setLockPassword(e.target.value)}
                        />
                        <Button onClick={handleSaveLockPassword}>Save PIN</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </MainLayout>
  );
};

export default SettingsPage;
