import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/stores/cartStore';
import { toast } from 'sonner';
import { User, Bike, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

interface RiderSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RIDERS = [
  { id: 1, name: 'Ayaz' },
  { id: 2, name: 'Mumtaz' },
  { id: 3, name: 'Abuzar' },
  { id: 4, name: 'Zafar' },
];

const RiderSelectionModal = ({ isOpen, onClose }: RiderSelectionModalProps) => {
  const { setRider, setCustomerAddress } = useCartStore();
  const [selectedRider, setSelectedRider] = useState<any>(null);
  const [address, setAddress] = useState('');
  
  const handleSelectRider = (rider: any) => {
    setSelectedRider(rider);
  };

  const handleConfirm = () => {
    if (!address.trim()) {
      toast.error('Please enter customer address');
      return;
    }
    setRider({ name: selectedRider.name });
    setCustomerAddress(address);
    toast.success(`Rider ${selectedRider.name} assigned with delivery address`);
    onClose();
    // Reset state for next time
    setSelectedRider(null);
    setAddress('');
  };

  const handleBack = () => {
    setSelectedRider(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setSelectedRider(null);
        setAddress('');
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-[500px] p-6 bg-background">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl font-bold text-center">
            {selectedRider ? 'Customer Address' : 'Select Rider'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {selectedRider ? 'Provide delivery details for the selected rider.' : 'Choose a rider to assign this delivery order.'}
          </DialogDescription>
        </DialogHeader>
        
        {!selectedRider ? (
          <div className="grid grid-cols-2 gap-4">
            {RIDERS.map((rider) => (
              <motion.button
                key={rider.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelectRider(rider)}
                className="p-6 rounded-xl border-2 border-muted hover:border-primary hover:bg-primary/5 bg-card transition-all flex flex-col items-center justify-center gap-2 h-32"
              >
                <User className="h-8 w-8 text-muted-foreground" />
                <h3 className="font-bold text-lg">{rider.name}</h3>
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <Bike className="h-6 w-6 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Selected Rider</p>
                <p className="font-bold">{selectedRider.name}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Delivery Address
              </label>
              <textarea
                autoFocus
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter complete customer address..."
                className="w-full min-h-[100px] p-3 rounded-lg border-2 border-muted focus:border-primary focus:ring-0 bg-background text-foreground resize-none transition-all placeholder:text-muted-foreground block"
              />
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={handleBack}
                className="flex-1"
              >
                Back
              </Button>
              <Button 
                onClick={handleConfirm}
                className="flex-[2]"
              >
                Confirm Order
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RiderSelectionModal;
