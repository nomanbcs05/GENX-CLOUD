
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { supabaseSignup } from '@/integrations/supabase/supabaseAdmin';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Users, Building2, Calendar, ShieldCheck, Mail, Lock, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const SuperAdminDashboard = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [newRestaurantName, setNewRestaurantName] = useState('');
  const [newRestaurantSlug, setNewRestaurantSlug] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerFullName, setOwnerFullName] = useState('');

  const { data: restaurants = [], isLoading } = useQuery({
    queryKey: ['super-admin-restaurants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createAccountMutation = useMutation({
    mutationFn: async ({ name, slug, email, password, fullName }: { 
      name: string; slug: string; email: string; password: string; fullName: string;
    }) => {
      // Step 1: Create the Auth user using the isolated client (won't log out Super Admin)
      const { data: authData, error: authError } = await supabaseSignup.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (authError) throw new Error(`Auth Error: ${authError.message}`);
      if (!authData.user) throw new Error('User creation returned no data. Email may already be registered.');

      const userId = authData.user.id;

      // Step 2: Create the restaurant record (using main admin client)
      const { data: restaurant, error: restError } = await supabase
        .from('restaurants')
        .insert([{
          name,
          slug: slug.toLowerCase().replace(/\s+/g, '-'),
          owner_id: userId,
          subscription_status: 'trial',
          license_expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30-day trial
        }])
        .select()
        .single();

      if (restError) throw new Error(`Restaurant Error: ${restError.message}`);

      // Step 3: Create/update the profile to link user → restaurant as admin
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          restaurant_id: restaurant.id,
          full_name: fullName,
          email: email,
          role: 'admin',
        });

      if (profileError) throw new Error(`Profile Error: ${profileError.message}`);

      return restaurant;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-restaurants'] });
      setNewRestaurantName('');
      setNewRestaurantSlug('');
      setOwnerEmail('');
      setOwnerPassword('');
      setOwnerFullName('');
      toast.success(`Restaurant "${data.name}" created with owner account!`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create restaurant account');
    }
  });

  const viewDataMutation = useMutation({
    mutationFn: async (restaurantId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error("No session found");
      
      const { error } = await supabase
        .from('profiles')
        .update({ restaurant_id: restaurantId })
        .eq('id', session.user.id);
        
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      toast.success('Successfully switched to restaurant context');
      window.location.href = '/';
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to switch context');
    }
  });

  const isFormValid = newRestaurantName && newRestaurantSlug && ownerEmail && ownerPassword.length >= 6 && ownerFullName;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="h-full flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8 space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black font-heading uppercase tracking-tight text-slate-900">Super Admin Dashboard</h1>
            <p className="text-slate-500 font-medium">Manage all restaurants and subscriptions</p>
          </div>
          <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full font-bold text-sm">
            <ShieldCheck className="h-4 w-4" />
            Global Access Enabled
          </div>
        </div>

        {/* Register New Restaurant + Owner Account */}
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-900 text-white">
            <CardTitle className="text-lg font-black font-heading uppercase tracking-tight flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-400" />
              Register New Restaurant Account
            </CardTitle>
            <p className="text-slate-400 text-xs font-medium mt-1">Create a restaurant with an owner login — they can sign in immediately</p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Owner Details */}
              <div className="space-y-2">
                <label className="text-xs font-black font-heading uppercase tracking-widest text-slate-500">Owner Full Name</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="e.g., Ahmed Khan" 
                    value={ownerFullName}
                    onChange={(e) => setOwnerFullName(e.target.value)}
                    className="pl-10 rounded-xl border-slate-200 h-11"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black font-heading uppercase tracking-widest text-slate-500">Owner Email (Login)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    type="email"
                    placeholder="owner@restaurant.com" 
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    className="pl-10 rounded-xl border-slate-200 h-11"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black font-heading uppercase tracking-widest text-slate-500">Password (min 6 chars)</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    type="password"
                    placeholder="••••••••" 
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    className="pl-10 rounded-xl border-slate-200 h-11"
                  />
                </div>
              </div>

              {/* Restaurant Details */}
              <div className="space-y-2">
                <label className="text-xs font-black font-heading uppercase tracking-widest text-slate-500">Restaurant Name</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="e.g., Downtown Bistro" 
                    value={newRestaurantName}
                    onChange={(e) => setNewRestaurantName(e.target.value)}
                    className="pl-10 rounded-xl border-slate-200 h-11"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black font-heading uppercase tracking-widest text-slate-500">Unique Slug (URL)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">@</span>
                  <Input 
                    placeholder="downtown-bistro" 
                    value={newRestaurantSlug}
                    onChange={(e) => setNewRestaurantSlug(e.target.value)}
                    className="pl-10 rounded-xl border-slate-200 h-11"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <Button 
                  className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 font-black font-heading uppercase tracking-widest h-11 shadow-lg shadow-blue-500/20"
                  onClick={() => createAccountMutation.mutate({ 
                    name: newRestaurantName, 
                    slug: newRestaurantSlug, 
                    email: ownerEmail, 
                    password: ownerPassword, 
                    fullName: ownerFullName 
                  })}
                  disabled={!isFormValid || createAccountMutation.isPending}
                >
                  {createAccountMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Account'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Restaurants List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {restaurants.map((restaurant: any) => (
            <Card key={restaurant.id} className="border-none shadow-lg hover:shadow-xl transition-all rounded-3xl overflow-hidden group">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-slate-100 rounded-2xl group-hover:bg-blue-50 transition-colors">
                    <Building2 className="h-6 w-6 text-slate-600 group-hover:text-blue-600" />
                  </div>
                  <Badge className={
                    restaurant.subscription_status === 'active' 
                    ? "bg-emerald-100 text-emerald-700 border-none px-3 py-1 rounded-full font-bold uppercase text-[10px]"
                    : "bg-red-100 text-red-700 border-none px-3 py-1 rounded-full font-bold uppercase text-[10px]"
                  }>
                    {restaurant.subscription_status}
                  </Badge>
                </div>
                <CardTitle className="mt-4 text-xl font-black font-heading uppercase tracking-tight text-slate-900">
                  {restaurant.name}
                </CardTitle>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">{restaurant.slug}.pos.cloud</p>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                  <Calendar className="h-4 w-4" />
                  Created: {format(new Date(restaurant.created_at), 'MMM dd, yyyy')}
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                  <Users className="h-4 w-4" />
                  Tenant ID: <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded">{restaurant.id.substring(0, 8)}...</span>
                </div>
                <div className="pt-2 border-t flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 rounded-xl text-[10px] font-black font-heading uppercase tracking-widest"
                    onClick={() => navigate('/license-manager', { state: { storeName: restaurant.name } })}
                  >
                    Manage Sub
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 rounded-xl text-[10px] font-black font-heading uppercase tracking-widest"
                    onClick={() => viewDataMutation.mutate(restaurant.id)}
                    disabled={viewDataMutation.isPending}
                  >
                    {viewDataMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'View Data'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default SuperAdminDashboard;
