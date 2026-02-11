import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCartStore } from '@/stores/cartStore';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, User, Phone } from 'lucide-react';

interface CustomerSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CustomerSelectionModal = ({ isOpen, onClose }: CustomerSelectionModalProps) => {
  const { setCustomer } = useCartStore();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setPhone('');
      setName('');
    }
  }, [isOpen]);

  const handlePhoneSearch = async () => {
    if (!phone.trim()) return;
    
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', phone)
        .single();

      if (data) {
        setName(data.name);
        toast.success("Customer found!");
      } else if (error && error.code !== 'PGRST116') {
        // PGRST116 is "Row not found" which is fine
        console.error(error);
      }
    } catch (error) {
      console.error("Error searching customer:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !phone.trim()) {
      toast.error("Please enter both Name and Phone Number");
      return;
    }

    setIsLoading(true);

    try {
      // Check if customer exists first
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', phone)
        .single();

      let customerData;

      if (existingCustomer) {
        // Update name if changed
        if (existingCustomer.name !== name) {
          const idToUpdate = (existingCustomer as any).customer_id || existingCustomer.id;
          const { data, error } = await (supabase
            .from('customers') as any)
            .update({ name })
            .eq('customer_id', idToUpdate)
            .select()
            .single();
            
          if (error) throw error;
          customerData = data;
        } else {
          customerData = existingCustomer;
        }
      } else {
        // Create new customer
        const { data, error } = await supabase
          .from('customers')
          .insert({
            name,
            phone,
            loyalty_points: 0,
            total_spent: 0,
            total_orders: 1
          } as any)
          .select()
          .single();

        if (error) throw error;
        customerData = data;
      }

      // Map to Store Customer type (camelCase)
      const storeCustomer = {
        id: customerData.id || (customerData as any).customer_id?.toString(),
        name: customerData.name,
        phone: customerData.phone || '',
        email: customerData.email || '',
        loyaltyPoints: customerData.loyalty_points || 0,
        totalSpent: customerData.total_spent || 0,
        visitCount: (customerData as any).total_orders || (customerData as any).visit_count || 0
      };

      setCustomer(storeCustomer);
      toast.success(`Customer ${name} attached to order`);
      onClose();
      
    } catch (error: any) {
      console.error("Error saving customer:", error);
      toast.error(error.message || "Failed to save customer");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Customer Information</DialogTitle>
          <DialogDescription>
            Enter customer details or search by phone number.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  placeholder="Enter phone number"
                  className="pl-9"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={handlePhoneSearch} // Auto-search on blur
                  autoFocus
                />
              </div>
              <Button 
                type="button" 
                variant="outline" 
                size="icon"
                onClick={handlePhoneSearch}
                disabled={isSearching}
              >
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="name">Customer Name</Label>
            <div className="relative">
              <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="name"
                placeholder="Enter customer name"
                className="pl-9"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm & Continue
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerSelectionModal;
