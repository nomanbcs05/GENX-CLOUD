import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TrendingUp, DollarSign, ShoppingCart, Users, Package, ArrowUpRight, ArrowDownRight, Loader2, Printer, PrinterCheck, LogOut, Trash2 } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useState, useMemo, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { DailyReport } from '@/components/pos/DailyReport';
import DailySummary from '@/components/pos/DailySummary';
import ProductSalesSummary from '@/components/pos/ProductSalesSummary';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  startOfDay, 
  startOfWeek, 
  startOfMonth, 
  isAfter, 
  format, 
  subDays, 
  subWeeks, 
  subMonths,
  parseISO, 
  isWithinInterval,
  endOfDay,
  isToday
} from 'date-fns';
import { toast } from 'sonner';

const ReportsPage = () => {
    // --- Clear Orders Mutations ---
    const deleteTodayMutation = useMutation({
      mutationFn: api.orders.deleteTodayOrders,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['reports-data'] });
        toast.success("Today's orders cleared successfully");
      },
      onError: (error) => {
        toast.error(`Failed to clear orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    const deleteAllMutation = useMutation({
      mutationFn: api.orders.deleteAllOrders,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['reports-data'] });
        toast.success("All order history cleared successfully");
      },
      onError: (error) => {
        toast.error(`Failed to clear history: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('month');
  const [productOrdersWithItems, setProductOrdersWithItems] = useState<any[]>([]);
  const summaryRef = useRef<HTMLDivElement>(null);
  const productSummaryRef = useRef<HTMLDivElement>(null);

  const { data, isLoading: isReportsLoading, isError, error } = useQuery({
    queryKey: ['reports-data'],
    queryFn: api.reports.getDashboardStats,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: api.categories.getAll,
  });

  const { data: openRegister } = useQuery({
    queryKey: ['open-register'],
    queryFn: api.registers.getOpen,
  });

  const closeRegisterMutation = useMutation({
    mutationFn: async ({ id, amount }: { id: string, amount: number }) => 
      api.registers.close(id, amount, 'Shift ended by cashier'),
    onSuccess: async () => {
      toast.success('Shift ended successfully');
      // Clear local state and log out
      localStorage.removeItem("pos_local_user");
      await supabase.auth.signOut();
      navigate("/auth");
    },
    onError: (err: any) => {
      toast.error('Failed to end shift: ' + err.message);
    }
  });

  const handleEndShift = () => {
    if (!openRegister) {
      toast.error('No active shift found');
      return;
    }

    if (window.confirm('Are you sure you want to end your shift? This will log you out and close the register.')) {
      // For simplicity, we use the current total revenue as ending amount
      // In a real app, you might ask for a manual count
      const currentRevenue = stats?.revenue || 0;
      closeRegisterMutation.mutate({ 
        id: openRegister.id, 
        amount: openRegister.starting_amount + currentRevenue 
      });
    }
  };

  const handlePrintSummary = useReactToPrint({
    contentRef: summaryRef,
    documentTitle: `Daily-Summary-${format(new Date(), 'yyyy-MM-dd')}`,
    onAfterPrint: () => {
      toast.success('Daily summary printed successfully');
    },
  });

  const handlePrintProductSummary = useReactToPrint({
    contentRef: productSummaryRef,
    documentTitle: `Product-Summary-${format(new Date(), 'yyyy-MM-dd')}`,
    onAfterPrint: () => {
      toast.success('Product sales summary printed successfully');
    },
  });

  const onPrintProductSummary = async () => {
    try {
      if (!data?.orders || data.orders.length === 0) {
        toast.info('No orders found for summary');
        return;
      }

      const today = startOfDay(new Date());
      const dayOrders = data.orders.filter((o: any) => {
        const d = parseISO(o.created_at);
        return d >= today && o.status === 'completed';
      });

      if (dayOrders.length === 0) {
        toast.info('No completed orders for today');
        return;
      }

      const toastId = toast.loading('Preparing product summary...');
      const fullOrders = await Promise.all(
        dayOrders.map(async (o: any) => {
          try {
            return await api.orders.getByIdWithItems(o.id);
          } catch {
            return null;
          }
        })
      );
      toast.dismiss(toastId);

      const valid = fullOrders.filter(Boolean) as any[];
      if (valid.length === 0) {
        toast.error('Failed to load order items for summary');
        return;
      }

      setProductOrdersWithItems(valid);
      setTimeout(() => handlePrintProductSummary(), 100);
    } catch (e) {
      console.error(e);
      toast.error('Error preparing product summary');
    }
  };

  const stats = useMemo(() => {
    if (!data?.orders || !data?.customers) return null;

    const now = new Date();
    let startDate = startOfMonth(now);
    let previousStartDate = startOfMonth(subMonths(now, 1));
    let previousEndDate = subMonths(now, 1); // Approximation

    if (timeRange === 'today') {
      startDate = startOfDay(now);
      previousStartDate = startOfDay(subDays(now, 1));
      previousEndDate = endOfDay(subDays(now, 1));
    } else if (timeRange === 'week') {
      startDate = startOfWeek(now);
      previousStartDate = startOfWeek(subWeeks(now, 1));
      previousEndDate = subWeeks(now, 1);
    }

    // Filter current period orders
    const currentOrders = data.orders.filter(order => 
      isAfter(parseISO(order.created_at), startDate)
    );

    // Filter previous period orders (for comparison)
    const previousOrders = data.orders.filter(order => 
      isWithinInterval(parseISO(order.created_at), { start: previousStartDate, end: previousEndDate })
    );

    // Calculate metrics
    const currentRevenue = currentOrders.reduce((sum, order) => sum + Number(order.total_amount), 0);
    const previousRevenue = previousOrders.reduce((sum, order) => sum + Number(order.total_amount), 0);
    
    const currentOrdersCount = currentOrders.length;
    const previousOrdersCount = previousOrders.length;

    const currentAvgOrderValue = currentOrdersCount > 0 ? currentRevenue / currentOrdersCount : 0;
    const previousAvgOrderValue = previousOrdersCount > 0 ? previousRevenue / previousOrdersCount : 0;

    // New Customers
    const newCustomers = data.customers.filter(customer => 
      customer.created_at && isAfter(parseISO(customer.created_at), startDate)
    ).length;
    
    const previousNewCustomers = data.customers.filter(customer => 
      customer.created_at && isWithinInterval(parseISO(customer.created_at), { start: previousStartDate, end: previousEndDate })
    ).length;

    // Calculate growth percentages
    const calculateGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const revenueGrowth = calculateGrowth(currentRevenue, previousRevenue);
    const ordersGrowth = calculateGrowth(currentOrdersCount, previousOrdersCount);
    const avgOrderValueGrowth = calculateGrowth(currentAvgOrderValue, previousAvgOrderValue);
    const customersGrowth = calculateGrowth(newCustomers, previousNewCustomers);

    // Prepare Chart Data
    // Sales Chart
    const salesDataMap = new Map<string, number>();
    currentOrders.forEach(order => {
      const dateKey = format(parseISO(order.created_at), timeRange === 'today' ? 'HH:00' : 'EEE');
      salesDataMap.set(dateKey, (salesDataMap.get(dateKey) || 0) + Number(order.total_amount));
    });

    const salesData = Array.from(salesDataMap.entries()).map(([name, sales]) => ({ name, sales }));
    
    // Category Data
    const categoryMap = new Map<string, number>();
    currentOrders.forEach(order => {
      if (order.order_items) {
        order.order_items.forEach((item: any) => {
          const categoryId = item.products?.category || item.product_category;
          const categoryName = categories.find((c: any) => c.id === categoryId)?.name || categoryId || 'Unknown';
          const value = Number(item.price) * item.quantity;
          categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + value);
        });
      }
    });

    const categoryColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    const categoryData = Array.from(categoryMap.entries()).map(([name, value], index) => ({
      name,
      value: Number(value.toFixed(2)),
      color: categoryColors[index % categoryColors.length]
    }));

    // Top Products
    const productMap = new Map<string, { sold: number, revenue: number }>();
    currentOrders.forEach(order => {
      if (order.order_items) {
        order.order_items.forEach((item: any) => {
          const name = item.products?.name || item.product_name || 'Unknown';
          const existing = productMap.get(name) || { sold: 0, revenue: 0 };
          productMap.set(name, {
            sold: existing.sold + item.quantity,
            revenue: existing.revenue + (Number(item.price) * item.quantity)
          });
        });
      }
    });

    const topProducts = Array.from(productMap.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      revenue: currentRevenue,
      revenueGrowth,
      orders: currentOrdersCount,
      ordersGrowth,
      avgOrderValue: currentAvgOrderValue,
      avgOrderValueGrowth,
      newCustomers,
      customersGrowth,
      salesData,
      categoryData,
      topProducts
    };
  }, [data, timeRange, categories]);

  if (isError) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-4">
            <p className="text-destructive font-medium">Failed to load reports</p>
            <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : 'Unknown error'}</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (isReportsLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <ScrollArea className="h-full">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold">Reports & Analytics</h1>
              <p className="text-muted-foreground">Business performance overview</p>
            </div>
            <div className="flex flex-wrap gap-2 md:gap-3">
              <Button
                onClick={() => handlePrintSummary()}
                variant="default"
                className="bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-lg shadow-indigo-500/20"
                disabled={!data?.orders || data.orders.length === 0}
              >
                <PrinterCheck className="h-4 w-4 mr-2" />
                Print Today's Summary
              </Button>
              <Button
                variant="default"
                className="bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-lg shadow-emerald-500/20"
                onClick={onPrintProductSummary}
                disabled={!data?.orders || data.orders.length === 0}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Product Summary
              </Button>

              <Separator orientation="vertical" className="h-10 mx-2 hidden md:block" />
              
              <Button 
                variant={timeRange === 'today' ? 'default' : 'outline'}
                onClick={() => setTimeRange('today')}
              >
                Today
              </Button>
              <Button 
                variant={timeRange === 'week' ? 'default' : 'outline'}
                onClick={() => setTimeRange('week')}
              >
                This Week
              </Button>
              <Button 
                variant={timeRange === 'month' ? 'default' : 'outline'}
                onClick={() => setTimeRange('month')}
              >
                This Month
              </Button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold">Rs {stats?.revenue.toLocaleString()}</p>
                    <div className={`flex items-center gap-1 text-sm ${stats?.revenueGrowth && stats.revenueGrowth >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {stats?.revenueGrowth && stats.revenueGrowth >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                      <span>{Math.abs(stats?.revenueGrowth || 0).toFixed(1)}% vs last period</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                    <p className="text-2xl font-bold">{stats?.orders}</p>
                    <div className={`flex items-center gap-1 text-sm ${stats?.ordersGrowth && stats.ordersGrowth >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {stats?.ordersGrowth && stats.ordersGrowth >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                      <span>{Math.abs(stats?.ordersGrowth || 0).toFixed(1)}% vs last period</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                    <ShoppingCart className="h-6 w-6 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Order Value</p>
                    <p className="text-2xl font-bold">Rs {stats?.avgOrderValue.toLocaleString()}</p>
                    <div className={`flex items-center gap-1 text-sm ${stats?.avgOrderValueGrowth && stats.avgOrderValueGrowth >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {stats?.avgOrderValueGrowth && stats.avgOrderValueGrowth >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                      <span>{Math.abs(stats?.avgOrderValueGrowth || 0).toFixed(1)}% vs last period</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-warning" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">New Customers</p>
                    <p className="text-2xl font-bold">{stats?.newCustomers}</p>
                    <div className={`flex items-center gap-1 text-sm ${stats?.customersGrowth && stats.customersGrowth >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {stats?.customersGrowth && stats.customersGrowth >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                      <span>{Math.abs(stats?.customersGrowth || 0).toFixed(1)}% vs last period</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-purple-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sales Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats?.salesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Category Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sales by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-8">
                  <ResponsiveContainer width="50%" height={250}>
                    <PieChart>
                      <Pie
                        data={stats?.categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {stats?.categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-3">
                    {stats?.categoryData.map((category) => (
                      <div key={category.name} className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="text-sm">{category.name}</span>
                        <span className="text-sm font-semibold ml-auto">{((category.value / (stats?.revenue || 1)) * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                Top Selling Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.topProducts.map((product, index) => (
                  <div key={product.name} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.sold} units sold</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">Rs {product.revenue.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Revenue</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <div className="pt-12 pb-6">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Danger Zone</h3>
            <div className="flex flex-wrap gap-4 p-6 border-2 border-dashed border-red-100 rounded-2xl bg-red-50/30">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-600 hover:text-white transition-all font-bold">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Today's Orders
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all orders created today. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteTodayMutation.mutate()} className="bg-red-600 hover:bg-red-700">
                      Delete Today's Orders
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-red-700 border-red-300 hover:bg-red-700 hover:text-white transition-all font-black">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Reset All History
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete ALL order history from the database. This is a complete reset.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteAllMutation.mutate()} className="bg-red-700 hover:bg-red-800">
                      Reset All History
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <div className="flex-1" />

              <Button
                variant="destructive"
                className="bg-red-600 hover:bg-red-700 font-bold px-8 h-10 shadow-lg shadow-red-500/20"
                onClick={handleEndShift}
                disabled={closeRegisterMutation.isPending}
              >
                <LogOut className="h-4 w-4 mr-2" />
                End Shift & Logout
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Debug: Show productOrdersWithItems for troubleshooting */}
      <div style={{ background: '#fffbe6', color: '#b45309', padding: 8, margin: 8, border: '1px solid #fde68a', borderRadius: 4 }}>
        <strong>Debug Product Orders With Items:</strong>
        <pre style={{ maxHeight: 200, overflow: 'auto', fontSize: 12 }}>{JSON.stringify(productOrdersWithItems, null, 2)}</pre>
      </div>
      {/* Hidden print components */}
      <div className="sr-only">
        <div ref={summaryRef}>
          <DailySummary 
            orders={data?.orders?.filter(o => isToday(parseISO(o.created_at))) || []} 
            date={new Date()}
          />
        </div>
        <div ref={productSummaryRef}>
          <ProductSalesSummary 
            orders={productOrdersWithItems} 
            date={new Date()}
            query=""
          />
        </div>
      </div>
    </MainLayout>
  );
};

export default ReportsPage;
