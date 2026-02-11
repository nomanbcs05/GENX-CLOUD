import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { toast } from 'sonner';
import { Loader2, X } from 'lucide-react';

interface StartDayModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onClose?: () => void;
  forceNewSession?: boolean;
}

const StartDayModal = ({ isOpen, onSuccess, onClose, forceNewSession = false }: StartDayModalProps) => {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const queryClient = useQueryClient();

  const startDayMutation = useMutation({
    mutationFn: async ({ amount, date }: { amount: number; date: string }) => {
      // If forcing a new session, we might want to close any existing open register first
      if (forceNewSession) {
        const openReg = await api.registers.getOpen();
        if (openReg) {
          await api.registers.close(openReg.id, 0, 'Automatically closed for new session');
        }
        // Clear history as requested
        await api.orders.deleteAllOrders();
      }
      
      // Convert date string to ISO string for the database
      const openedAt = new Date(date);
      openedAt.setHours(new Date().getHours(), new Date().getMinutes(), new Date().getSeconds());
      
      return api.registers.start(amount, openedAt.toISOString());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['open-register'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('New session started and history cleared');
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Failed to start day: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const startAmount = parseFloat(amount);
    if (isNaN(startAmount)) {
      toast.error('Please enter a valid amount');
      return;
    }
    startDayMutation.mutate({ amount: startAmount, date });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && onClose) onClose();
    }}>
      <DialogContent 
        className="sm:max-w-md" 
        hideCloseButton={!onClose}
        onPointerDownOutside={(e) => { if (!onClose) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (!onClose) e.preventDefault(); }}
      >
        <div className="flex justify-between items-center mb-2">
          <DialogHeader className="flex-1">
            <DialogTitle className="text-xl font-black font-heading uppercase tracking-tight">
              {forceNewSession ? 'Start New Session' : 'Start of Day'}
            </DialogTitle>
            <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
              {forceNewSession 
                ? 'Starting a new session will clear existing order history.' 
                : 'Please enter details to begin the shift.'}
            </DialogDescription>
          </DialogHeader>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div className="space-y-2">
            <Label htmlFor="date" className="text-[10px] font-black font-heading uppercase tracking-widest text-slate-500">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="h-11 rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 transition-all"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-[10px] font-black font-heading uppercase tracking-widest text-slate-500">Opening Balance (Rs)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="h-11 rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 transition-all font-bold text-lg"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black font-heading uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
            disabled={startDayMutation.isPending}
          >
            {startDayMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              forceNewSession ? 'Start New Session' : 'Start Day'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StartDayModal;
