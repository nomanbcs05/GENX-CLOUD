import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
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
  MoreVertical,
  ClipboardList,
  Trash2,
  Plus,
  Minus
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useReactToPrint } from 'react-to-print';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from '@/components/ui/separator';
import Bill from '@/components/pos/Bill';
import { supabase } from '@/integrations/supabase/client';
import { useCartStore } from '@/stores/cartStore';

const OngoingOrdersPage = () => {
  const navigate = useNavigate();
  const loadOrder = useCartStore(state => state.loadOrder);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedItems, setEditedItems] = useState<any[]>([]);
  const [showBill, setShowBill] = useState(false);
  const [billOrder, setBillOrder] = useState<any>(null);
  const billRef = useRef<HTMLDivElement>(null);
  const [cashierName, setCashierName] = useState('Cashier');
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setCashierName(user.user_metadata?.name || user.email.split('@')[0]);
      }
    };
    fetchUser();
  }, []);

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

  // Clear all mutation
  const clearAllMutation = useMutation({
    mutationFn: api.orders.clearAllToday,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ongoing-orders'] });
      toast.success('All today\'s orders cleared');
      setSelectedOrderId(null);
    },
    onError: (error: any) => {
      toast.error('Failed to clear orders: ' + error.message);
    }
  });

  // Update order items mutation
  const updateOrderItemsMutation = useMutation({
    mutationFn: async ({ orderId, items }: { orderId: string; items: any[] }) => {
      // Delete existing items
      const { error: deleteError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);
      
      if (deleteError) throw deleteError;

      // Insert new items
      const itemsToInsert = items.map(item => ({
        order_id: orderId,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price
      }));

      const { error: insertError } = await supabase
        .from('order_items')
        .insert(itemsToInsert);
      
      if (insertError) throw insertError;

      // Update order total
      const newTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const { error: updateError } = await supabase
        .from('orders')
        .update({ total_amount: newTotal })
        .eq('id', orderId);
      
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ongoing-orders'] });
      setIsEditing(false);
      toast.success('Order updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update order: ' + error.message);
    }
  });

  // Pay order mutation
  const payOrderMutation = useMutation({
    mutationFn: async ({ orderId, paymentMethod }: { orderId: string; paymentMethod: string }) => {
      return api.orders.updateStatus(orderId, 'completed');
    },
    onSuccess: (updatedOrder) => {
      queryClient.invalidateQueries({ queryKey: ['ongoing-orders'] });
      
      // Prepare bill data
      const order = selectedOrder;
      if (order) {
        const billData = {
          orderNumber: order.id.slice(0, 8).toUpperCase(),
          items: order.order_items?.map((item: any) => ({
            product: {
              id: item.product_id,
              name: item.products?.name || item.product_name || 'Item',
              price: item.price,
              image: item.products?.image || '🍽️'
            },
            quantity: item.quantity,
            lineTotal: item.price * item.quantity
          })) || [],
          customer: order.customers ? {
            id: order.customer_id?.toString() || '',
            name: order.customers.name,
            phone: order.customers.phone || ''
          } : null,
          subtotal: order.total_amount,
          taxAmount: 0,
          discountAmount: 0,
          deliveryFee: 0,
          total: order.total_amount,
          paymentMethod: 'cash',
          orderType: order.order_type,
          createdAt: new Date(order.created_at),
          cashierName
        };
        setBillOrder(billData);
        setShowBill(true);
      }
    },
    onError: (error: any) => {
      toast.error('Failed to process payment: ' + error.message);
    }
  });

  const handlePrintBill = useReactToPrint({
    contentRef: billRef,
    documentTitle: `Bill-${billOrder?.orderNumber || Date.now()}`,
    onAfterPrint: () => {
      toast.success('Bill printed successfully');
      setShowBill(false);
      setBillOrder(null);
    },
  });

  const handleEditOrder = () => {
    if (selectedOrder) {
      loadOrder(selectedOrder);
      navigate('/');
    }
  };

  const handleSaveEdit = () => {
    if (selectedOrderId) {
      updateOrderItemsMutation.mutate({
        orderId: selectedOrderId,
        items: editedItems
      });
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedItems([]);
  };

  const handleUpdateItemQuantity = (index: number, delta: number) => {
    const newItems = [...editedItems];
    newItems[index].quantity = Math.max(1, newItems[index].quantity + delta);
    setEditedItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = editedItems.filter((_, i) => i !== index);
    setEditedItems(newItems);
  };

  const handlePayNow = () => {
    if (selectedOrderId) {
      payOrderMutation.mutate({ orderId: selectedOrderId, paymentMethod: 'cash' });
    }
  };

  useEffect(() => {
    if (showBill && billOrder) {
      setTimeout(() => {
        handlePrintBill();
      }, 500);
    }
  }, [showBill, billOrder]);

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
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-red-600 border-red-200 hover:bg-red-50 font-bold"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to clear all of today\'s orders?')) {
                      clearAllMutation.mutate();
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
                <Badge variant="outline" className="px-3 py-1 text-sm font-medium bg-white shadow-sm">
                  {orders.length} Active
                </Badge>
              </div>
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
                            <span className="font-black text-slate-900">
                              {order.order_type === 'dine_in' 
                                ? (order.restaurant_tables?.table_number ? `Table ${order.restaurant_tables.table_number}` : 'Table N/A')
                                : order.order_type === 'take_away' ? 'Take Away' : 'Delivery'}
                            </span>
                            <Badge variant="outline" className={cn("text-[10px] uppercase font-black px-2 py-0 border-2", getStatusColor(order.status))}>
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
                            setSelectedOrderId(order.id);
                            setTimeout(() => {
                              handlePayNow();
                            }, 100);
                          }}
                          disabled={order.status === 'completed'}
                        >
                          {order.status === 'completed' ? 'Paid' : 'Pay'}
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
                    <h2 className="text-xl font-black text-slate-900">
                      {selectedOrder.order_type === 'dine_in' 
                        ? (selectedOrder.restaurant_tables?.table_number 
                            ? `Table ${selectedOrder.restaurant_tables.table_number}` 
                            : 'Table N/A')
                        : selectedOrder.order_type === 'take_away' ? 'Take Away' : 'Delivery'}
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
                      <DropdownMenuItem className="py-2.5" onClick={handleEditOrder}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit Order
                      </DropdownMenuItem>
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
                      {(isEditing ? editedItems : selectedOrder.order_items)?.map((item: any, index: number) => (
                        <div key={item.id || index} className="group flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-white flex items-center justify-center text-xl shadow-sm overflow-hidden border border-slate-200">
                            {item.products?.image?.startsWith('http') ? (
                              <img src={item.products.image} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span>{item.products?.image || '🍽️'}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{item.products?.name || item.product_name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Unit: Rs {item.price.toLocaleString()}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            {isEditing ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7 rounded-lg"
                                  onClick={() => handleUpdateItemQuantity(index, -1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="flex items-center justify-center h-8 w-8 bg-blue-100 text-blue-700 rounded-lg text-xs font-black min-w-[32px]">
                                  {item.quantity}
                                </span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7 rounded-lg"
                                  onClick={() => handleUpdateItemQuantity(index, 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-red-500 hover:text-red-600"
                                  onClick={() => handleRemoveItem(index)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </>
                            ) : (
                              <span className="flex items-center justify-center h-8 w-8 bg-blue-100 text-blue-700 rounded-lg text-xs font-black">
                                x{item.quantity}
                              </span>
                            )}
                            <span className="text-sm font-black text-slate-900 min-w-[70px] text-right">
                              Rs {(item.price * item.quantity).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator className="bg-slate-100" />

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm font-medium text-slate-500">
                      <span>Sub Total</span>
                      <span className="text-slate-900 font-bold">
                        Rs {isEditing 
                          ? editedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()
                          : selectedOrder.total_amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-medium text-slate-500">
                      <span>Discount</span>
                      <span className="text-emerald-600 font-bold">-Rs 0</span>
                    </div>
                    <div className="flex justify-between text-lg font-black text-slate-900 pt-2 border-t border-dashed border-slate-200">
                      <span>Total Payment</span>
                      <span>
                        Rs {isEditing 
                          ? editedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()
                          : selectedOrder.total_amount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <div className="p-6 border-t bg-slate-50/50 space-y-3">
                {isEditing ? (
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      className="flex-1 h-12 font-bold border-slate-200 text-slate-600 rounded-xl"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </Button>
                    <Button 
                      className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
                      onClick={handleSaveEdit}
                      disabled={updateOrderItemsMutation.isPending}
                    >
                      {updateOrderItemsMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-3">
                      <Button 
                        variant="outline" 
                        className="flex-1 h-12 font-bold border-slate-200 text-slate-600 rounded-xl"
                        onClick={() => navigate('/')}
                      >
                        Back to POS
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1 h-12 font-bold border-slate-200 text-slate-600 rounded-xl"
                        onClick={handleEditOrder}
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit Order
                      </Button>
                    </div>
                    <Button 
                      className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black text-lg shadow-lg shadow-blue-200 rounded-xl"
                      onClick={handlePayNow}
                      disabled={payOrderMutation.isPending || selectedOrder.status === 'completed'}
                    >
                      {payOrderMutation.isPending ? 'Processing...' : selectedOrder.status === 'completed' ? 'Paid' : 'Pay Now'}
                    </Button>
                  </>
                )}
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

      {/* Bill Print Dialog */}
      <Dialog open={showBill} onOpenChange={setShowBill}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bill Preview</DialogTitle>
          </DialogHeader>
          <div className="max-h-[80vh] overflow-auto">
            {billOrder && (
              <Bill ref={billRef} order={billOrder} />
            )}
          </div>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setShowBill(false)}>
              Close
            </Button>
            <Button className="flex-1" onClick={() => handlePrintBill()}>
              Print Bill
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default OngoingOrdersPage;
