import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import { api } from '@/services/api';
import { 
  Search, 
  Clock, 
  Utensils, 
  ShoppingBag, 
  Truck, 
  Printer, 
  Edit2, 
  X,
  CreditCard,
  History,
  CheckCircle2,
  MoreVertical
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from '@/components/ui/separator';

const OngoingOrdersPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch ongoing orders
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['ongoing-orders'],
    queryFn: api.orders.getOngoing,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      api.orders.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ongoing-orders'] });
      toast.success('Order status updated');
    },
    onError: (error: any) => {
      toast.error('Failed to update status: ' + error.message);
    }
  });

  const filteredOrders = useMemo(() => {
    let result = orders;
    
    // Filter by type tab
    if (activeTab !== 'all') {
      result = result.filter(order => order.order_type === activeTab);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(order => 
        order.id.toLowerCase().includes(query) ||
        order.customers?.name?.toLowerCase().includes(query) ||
        order.restaurant_tables?.table_number?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [orders, activeTab, searchQuery]);

  const selectedOrder = useMemo(() => 
    orders.find(o => o.id === selectedOrderId), 
  [orders, selectedOrderId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'preparing': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'ready': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getOrderTypeIcon = (type: string) => {
    switch (type) {
      case 'dine_in': return <Utensils className="h-4 w-4" />;
      case 'take_away': return <ShoppingBag className="h-4 w-4" />;
      case 'delivery': return <Truck className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <MainLayout>
      <div className="flex h-full bg-slate-50/50">
        {/* Left Side: Order List */}
        <div className="flex-1 flex flex-col min-w-0 border-r bg-white">
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-slate-900">Ongoing Orders</h1>
              <Badge variant="outline" className="px-3 py-1 text-sm font-medium bg-white shadow-sm">
                {orders.length} Active
              </Badge>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search for foods, tables, or customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 bg-slate-100/50 border-slate-200 focus:bg-white transition-all rounded-xl"
              />
            </div>

            {/* Filter Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-slate-100/80 p-1 h-11 rounded-xl w-full max-w-md">
                <TabsTrigger value="all" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">All</TabsTrigger>
                <TabsTrigger value="dine_in" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">Dine in</TabsTrigger>
                <TabsTrigger value="take_away" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">To go</TabsTrigger>
                <TabsTrigger value="delivery" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">Delivery</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <ScrollArea className="flex-1 px-6 pb-6">
            {isLoading ? (
              <div className="flex flex-col gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <History className="h-16 w-16 mb-4 opacity-20" />
                <p className="text-lg font-medium">No ongoing orders found</p>
                <p className="text-sm">New orders will appear here as they are created</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredOrders.map((order) => (
                  <Card 
                    key={order.id}
                    className={cn(
                      "group relative p-5 cursor-pointer transition-all duration-200 rounded-2xl border-slate-200 hover:shadow-lg hover:border-blue-200",
                      selectedOrderId === order.id ? "ring-2 ring-blue-500 border-transparent bg-blue-50/30" : "bg-white"
                    )}
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    <div className="flex flex-col h-full space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">
                              {order.order_type === 'dine_in' 
                                ? `Table No. ${order.restaurant_tables?.table_number || '?'}`
                                : order.order_type === 'take_away' ? 'Take Away' : 'Delivery'}
                            </span>
                            <Badge variant="outline" className={cn("text-[10px] uppercase font-bold px-2 py-0", getStatusColor(order.status))}>
                              {order.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 font-medium">
                            Name: {order.customers?.name || 'Walk-in Customer'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400 font-medium">#{order.id.slice(0, 8)}</p>
                          <p className="font-bold text-slate-900">Rs {order.total_amount.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-auto pt-2 border-t border-slate-100">
                        <Button 
                          size="sm" 
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg h-9 shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatusMutation.mutate({ id: order.id, status: 'completed' });
                          }}
                        >
                          Pay
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-lg h-9"
                          onClick={(e) => {
                            e.stopPropagation();
                            toast.info('Pay later feature coming soon');
                          }}
                        >
                          Pay later
                        </Button>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-red-500 rounded-lg">
                            <X className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-blue-500 rounded-lg">
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-blue-500 rounded-lg">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            order.order_type === 'dine_in' ? "bg-emerald-500" : 
                            order.order_type === 'take_away' ? "bg-orange-500" : "bg-blue-500"
                          )} />
                          {order.order_type.replace('_', ' ')}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {format(new Date(order.created_at), 'h:mm a')}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right Side: Order Detail */}
        <div className="w-[400px] flex flex-col bg-white border-l shadow-2xl z-10">
          {selectedOrder ? (
            <>
              <div className="p-6 border-b space-y-4 bg-slate-50/30">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-xl font-bold text-slate-900">
                      {selectedOrder.order_type === 'dine_in' 
                        ? `Table ${selectedOrder.restaurant_tables?.table_number || '?'}`
                        : 'Order Detail'}
                    </h2>
                    <p className="text-sm text-slate-500 font-medium">
                      {selectedOrder.customers?.name || 'Walk-in Customer'}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-xl">
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl">
                      <DropdownMenuItem className="py-2.5">Edit Order</DropdownMenuItem>
                      <DropdownMenuItem className="py-2.5">Transfer Table</DropdownMenuItem>
                      <DropdownMenuItem className="py-2.5 text-red-600">Cancel Order</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-blue-100 px-3 py-1 font-bold">
                    {getOrderTypeIcon(selectedOrder.order_type)}
                    <span className="ml-2 capitalize">{selectedOrder.order_type.replace('_', ' ')}</span>
                  </Badge>
                  {selectedOrder.status !== 'ready' && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="ml-auto bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 font-bold rounded-lg"
                      onClick={() => updateStatusMutation.mutate({ 
                        id: selectedOrder.id, 
                        status: selectedOrder.status === 'pending' ? 'preparing' : 'ready' 
                      })}
                    >
                      Mark as {selectedOrder.status === 'pending' ? 'Preparing' : 'Ready'}
                    </Button>
                  )}
                </div>
              </div>

              <ScrollArea className="flex-1 p-6">
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                      <span>Items</span>
                      <span>Qty / Price</span>
                    </div>
                    <div className="space-y-4">
                      {selectedOrder.order_items?.map((item: any) => (
                        <div key={item.id} className="group flex items-start gap-4">
                          <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-xl shadow-sm border border-slate-200/50">
                            {item.products?.image || '🍽️'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-bold text-slate-900 line-clamp-1">{item.products?.name}</p>
                              <div className="flex items-center gap-3">
                                <span className="flex items-center justify-center h-7 w-7 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold">
                                  {item.quantity}
                                </span>
                                <span className="text-sm font-bold text-slate-900 w-16 text-right">
                                  Rs {item.price.toLocaleString()}
                                </span>
                              </div>
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">UNIT: Rs {item.price.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator className="bg-slate-100" />

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm font-medium text-slate-500">
                      <span>Sub Total</span>
                      <span className="text-slate-900 font-bold">Rs {selectedOrder.total_amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium text-slate-500">
                      <span>Discount</span>
                      <span className="text-emerald-600 font-bold">-Rs 0</span>
                    </div>
                    <div className="flex justify-between text-lg font-black text-slate-900 pt-2 border-t border-dashed border-slate-200">
                      <span>Total Payment</span>
                      <span>Rs {selectedOrder.total_amount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <div className="p-6 border-t bg-slate-50/50 space-y-3">
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 h-12 font-bold border-slate-200 text-slate-600 rounded-xl">
                    Cancel
                  </Button>
                  <Button variant="outline" className="flex-1 h-12 font-bold border-slate-200 text-slate-600 rounded-xl">
                    Add Items
                  </Button>
                </div>
                <Button className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black text-lg shadow-lg shadow-blue-200 rounded-xl">
                  Pay Now
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400 bg-slate-50/20">
              <div className="w-20 h-20 rounded-3xl bg-white shadow-xl flex items-center justify-center mb-6">
                <ClipboardList className="h-10 w-10 text-slate-200" />
              </div>
              <p className="text-lg font-bold text-slate-900 mb-2">Select an Order</p>
              <p className="text-sm font-medium leading-relaxed">
                Click on any order card to see details, manage items, and process payments.
              </p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default OngoingOrdersPage;
