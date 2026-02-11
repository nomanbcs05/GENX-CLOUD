import { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, Trash2, User, Search, X, Printer, CreditCard, Banknote, Wallet, Utensils, ShoppingBag, Truck, Tag, Percent, ChefHat, FileText } from 'lucide-react';
import Fuse from 'fuse.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCartStore, Customer } from '@/stores/cartStore';
import Receipt from './Receipt';
import KOT from './KOT';
import Bill from './Bill';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { api } from '@/services/api';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';

import TableSelectionModal from './TableSelectionModal';

const CartPanel = () => {
  const { 
    items, 
    customer, 
    subtotal, 
    taxAmount, 
    discountAmount, 
    total, 
    updateQuantity, 
    removeItem, 
    setCustomer, 
    orderType, 
    setOrderType, 
    clearCart, 
    discount, 
    discountType, 
    setDiscount, 
    deliveryFee, 
    tableId, 
    setTableId, 
    rider, 
    setRider,
    customerAddress,
    setCustomerAddress
  } = useCartStore();
  
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'wallet'>('cash');
  const [discountInput, setDiscountInput] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [showKOT, setShowKOT] = useState(false);
  const [showBill, setShowBill] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [cashierName, setCashierName] = useState('Anas');
  const receiptRef = useRef<HTMLDivElement>(null);
  const kotRef = useRef<HTMLDivElement>(null);
  const billRef = useRef<HTMLDivElement>(null);
  
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

  // Fetch tables to display selected table number
  const { data: tables = [] } = useQuery({
    queryKey: ['tables'],
    queryFn: api.tables.getAll,
  });

  // Fetch customers
  const { data: dbCustomers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: api.customers.getAll,
  });

  const customers = useMemo(() => {
    return dbCustomers.map((c: any) => ({
      id: c.customer_id.toString(),
      name: c.name,
      phone: c.phone,
      email: c.email,
      loyaltyPoints: c.loyalty_points || 0,
      totalSpent: Number(c.total_spent) || 0,
      visitCount: c.total_orders || 0
    }));
  }, [dbCustomers]);

  const selectedTable = useMemo(() => 
    tables.find((t: any) => t.table_id === tableId),
    [tables, tableId]
  );

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return api.orders.create(orderData.order, orderData.items);
    },
    onSuccess: (newOrder) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      // Update the local lastOrder with the ID from the server if needed, 
      // but we already constructed a rich object for printing.
      // We keep our generated orderNumber (Daily ID)
      setLastOrder((prev: any) => ({ ...prev, id: newOrder.id }));
      
      setShowReceipt(true);
      
      // Small delay to allow dialog to open, then print
      setTimeout(() => {
        handlePrint();
        clearCart();
        toast.success(`Order completed!`);
      }, 300);
    },
    onError: (error: any) => {
      console.error('Order creation failed:', error);
      // Supabase errors are objects with a message property, not necessarily Error instances
      const errorMessage = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
      toast.error(`Failed to save order: ${errorMessage}`);
    }
  });

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Receipt-${lastOrder?.orderNumber}`,
    onAfterPrint: () => {
      toast.success('Receipt printed successfully');
      setShowReceipt(false);
    },
  });

  const handlePrintKOT = useReactToPrint({
    contentRef: kotRef,
    documentTitle: `KOT-${Date.now()}`,
    onAfterPrint: () => {
      toast.success('KOT printed successfully');
      setShowKOT(false);
    },
  });

  const handlePrintBill = useReactToPrint({
    contentRef: billRef,
    documentTitle: `Bill-${Date.now()}`,
    onAfterPrint: () => {
      toast.success('Bill printed successfully');
      setShowBill(false);
    },
  });

  const prepareOrderData = async () => {
    const count = await api.orders.getDailyCount();
    const dailyId = (count + 1).toString().padStart(2, '0');
    
    return {
      orderNumber: dailyId,
      items: [...items],
      customer,
      rider, // Include rider
      customerAddress, // Include address
      orderType,
      subtotal,
      taxAmount,
      discountAmount,
      deliveryFee,
      total,
      paymentMethod,
      createdAt: new Date(),
      cashierName, // Use real cashier name
    };
  };

  const handleShowKOT = async () => {
    if (items.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    const orderData = await prepareOrderData();
    setLastOrder(orderData);
    setShowKOT(true);
  };

  const handleShowBill = async () => {
    if (items.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    const orderData = await prepareOrderData();
    setLastOrder(orderData);
    setShowBill(true);
  };

  const handleCompleteSale = async () => {
    if (items.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    const orderInsert = {
      customer_id: customer?.id || null,
      total_amount: total,
      status: 'completed',
      payment_method: paymentMethod,
      order_type: orderType,
      subtotal: subtotal,
      tax: taxAmount,
      discount: discountAmount,
      delivery_fee: deliveryFee
    };

    const orderItemsInsert = items.map(item => ({
      product_id: item.product.id,
      quantity: item.quantity,
      price: item.product.price
    }));

    // Prepare local object for receipt
    const localOrder = await prepareOrderData();
    setLastOrder(localOrder);
    
    const toastId = toast.loading('Processing order...');
    createOrderMutation.mutate({ order: orderInsert, items: orderItemsInsert }, {
      onSettled: () => {
        toast.dismiss(toastId);
      }
    });
  };

  const handleClearCart = () => {
    if (items.length === 0) return;
    clearCart();
    toast.info('Cart cleared');
  };

  return (
    <div className="flex flex-col h-full bg-card border-l">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Current Order</h2>
        <p className="text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </p>
      </div>

      {/* Customer Selection */}
      <div className="p-4 border-b space-y-4">
        <CustomerSelector 
          selectedCustomer={customer} 
          onSelect={setCustomer}
          customers={customers}
        />

        {orderType === 'dine_in' && (
          <div 
            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border cursor-pointer hover:bg-muted/70 transition-colors"
            onClick={() => setShowTableModal(true)}
          >
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs",
                selectedTable ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-500 border border-gray-200"
              )}>
                {selectedTable ? selectedTable.table_number : "?"}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {selectedTable ? `Table ${selectedTable.table_number}` : 'No Table Selected'}
                </span>
                {selectedTable && (
                  <span className="text-xs text-muted-foreground capitalize">
                    {selectedTable.section} • {selectedTable.capacity} Seats
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cart Items */}
      <ScrollArea className="flex-1 p-4">
        <AnimatePresence mode="popLayout">
          {items.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 text-muted-foreground"
            >
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Wallet className="h-8 w-8" />
              </div>
              <p className="font-medium">Cart is empty</p>
              <p className="text-sm">Add items to start a sale</p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center gap-3 p-3 bg-background rounded-lg border"
                >
                  <div className="h-10 w-10 rounded overflow-hidden bg-secondary flex items-center justify-center shrink-0">
                    {item.product.image?.startsWith('http') ? (
                      <img src={item.product.image} alt={item.product.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xl">{item.product.image}</span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Rs {item.product.price.toLocaleString()} each
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    
                    <span className="w-8 text-center font-medium text-sm">
                      {item.quantity}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <div className="text-right min-w-[60px]">
                    <p className="font-semibold text-sm">Rs {item.lineTotal.toLocaleString()}</p>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem(item.product.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </ScrollArea>

      {/* Payment Section */}
      <div className="border-t p-4 space-y-4 bg-muted/30">
        {/* Totals */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>Rs {subtotal.toLocaleString()}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Discount</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="h-5 w-5 rounded-full">
                    <Tag className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-4" align="start">
                  <div className="space-y-4">
                    <h4 className="font-medium leading-none">Set Discount</h4>
                    <Tabs defaultValue={discountType} onValueChange={(v) => {
                      setDiscount(0, v as 'percentage' | 'fixed');
                      setDiscountInput('');
                    }}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="percentage">% Percent</TabsTrigger>
                        <TabsTrigger value="fixed">Rs Fixed</TabsTrigger>
                      </TabsList>
                      <div className="pt-4">
                        <div className="flex gap-2">
                          <Input 
                            type="number" 
                            placeholder={discountType === 'percentage' ? "Percentage (0-100)" : "Amount (Rs)"}
                            value={discountInput}
                            onChange={(e) => {
                              setDiscountInput(e.target.value);
                              setDiscount(Number(e.target.value), discountType);
                            }}
                          />
                        </div>
                      </div>
                    </Tabs>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        setDiscount(0, 'percentage');
                        setDiscountInput('');
                      }}
                    >
                      Remove Discount
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <span className={discountAmount > 0 ? "text-success font-medium" : ""}>
              {discountAmount > 0 ? `-Rs ${discountAmount.toLocaleString()}` : '-'}
            </span>
          </div>

          {deliveryFee > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery Fee</span>
              <span>Rs {deliveryFee.toLocaleString()}</span>
            </div>
          )}

          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>Rs {total.toLocaleString()}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
             <Button variant="outline" className="flex-1" onClick={handleShowKOT} disabled={items.length === 0}>
               <ChefHat className="h-4 w-4 mr-2" />
               KOT
             </Button>
             <Button variant="outline" className="flex-1" onClick={handleShowBill} disabled={items.length === 0}>
               <FileText className="h-4 w-4 mr-2" />
               Bill
             </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClearCart}
              disabled={items.length === 0}
            >
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
            <Button
              className="flex-[2] btn-success"
              onClick={handleCompleteSale}
              disabled={items.length === 0}
            >
              <Printer className="h-4 w-4 mr-2" />
              Complete Sale
            </Button>
          </div>
        </div>
      </div>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Receipt Preview</DialogTitle>
            <DialogDescription className="sr-only">Order Receipt</DialogDescription>
          </DialogHeader>
          {lastOrder && (
            <div className="max-h-[70vh] overflow-auto">
              <Receipt ref={receiptRef} order={lastOrder} />
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setShowReceipt(false)}>
              Close
            </Button>
            <Button className="flex-1" onClick={() => handlePrint()}>
              <Printer className="h-4 w-4 mr-2" />
              Print Again
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* KOT Dialog */}
      <Dialog open={showKOT} onOpenChange={setShowKOT}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>KOT Preview</DialogTitle>
            <DialogDescription className="sr-only">Kitchen Order Ticket</DialogDescription>
          </DialogHeader>
          {lastOrder && (
            <div className="max-h-[70vh] overflow-auto">
              <KOT ref={kotRef} order={lastOrder} />
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setShowKOT(false)}>
              Close
            </Button>
            <Button className="flex-1" onClick={() => handlePrintKOT()}>
              <Printer className="h-4 w-4 mr-2" />
              Print KOT
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bill Dialog */}
      <Dialog open={showBill} onOpenChange={setShowBill}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bill Preview</DialogTitle>
            <DialogDescription className="sr-only">Order Bill</DialogDescription>
          </DialogHeader>
          {lastOrder && (
            <div className="max-h-[70vh] overflow-auto">
              <Bill ref={billRef} order={lastOrder} />
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setShowBill(false)}>
              Close
            </Button>
            <Button className="flex-1" onClick={() => handlePrintBill()}>
              <Printer className="h-4 w-4 mr-2" />
              Print Bill
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <TableSelectionModal 
        isOpen={showTableModal} 
        onClose={() => setShowTableModal(false)} 
      />
    </div>
  );
};

interface CustomerSelectorProps {
  selectedCustomer: Customer | null;
  onSelect: (customer: Customer | null) => void;
  customers: Customer[];
}

const CustomerSelector = ({ selectedCustomer, onSelect, customers }: CustomerSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fuse = useMemo(() => new Fuse(customers, {
    keys: ['name', 'phone', 'email'],
    threshold: 0.3,
  }), [customers]);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers.slice(0, 50); // Show first 50 by default
    return fuse.search(searchQuery).slice(0, 50).map(r => r.item);
  }, [searchQuery, fuse, customers]);

  const handleSelect = (customer: Customer) => {
    onSelect(customer);
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start h-12 text-base shadow-sm border-2">
          <User className="h-5 w-5 mr-3 text-muted-foreground" />
          {selectedCustomer ? (
            <span className="truncate font-medium">{selectedCustomer.name}</span>
          ) : (
            <span className="text-muted-foreground">Select Customer</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
        </div>
        
        <ScrollArea className="h-64">
          <div className="p-2">
            {selectedCustomer && (
              <Button
                variant="ghost"
                className="w-full justify-start mb-2 text-muted-foreground"
                onClick={() => {
                  onSelect(null);
                  setOpen(false);
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Clear Selection
              </Button>
            )}
            
            {filteredCustomers.map((customer) => (
              <Button
                key={customer.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start mb-1",
                  selectedCustomer?.id === customer.id && "bg-primary/10"
                )}
                onClick={() => handleSelect(customer)}
              >
                <div className="flex flex-col items-start text-left">
                  <span className="font-medium">{customer.name}</span>
                  <span className="text-xs text-muted-foreground">{customer.phone}</span>
                </div>
              </Button>
            ))}
            
            {filteredCustomers.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No customers found
              </div>
            )}
          </div>
        </ScrollArea>
        
        <div className="p-2 border-t text-xs text-center text-muted-foreground">
          Showing {filteredCustomers.length} of {customers.length} customers
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default CartPanel;
