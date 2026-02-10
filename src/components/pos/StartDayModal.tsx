import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface StartDayModalProps {
  isOpen: boolean;
  onSuccess: () => void;
}

const StartDayModal = ({ isOpen, onSuccess }: StartDayModalProps) => {
  const [amount, setAmount] = useState('');
  const queryClient = useQueryClient();

  const startDayMutation = useMutation({
    mutationFn: api.registers.start,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['open-register'] });
      toast.success('Day started successfully');
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
    startDayMutation.mutate(startAmount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md" 
        hideCloseButton 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Start of Day</DialogTitle>
          <DialogDescription>
            Please enter the starting cash amount (float) to begin the shift.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Starting Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground">Rs</span>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-9"
                required
                autoFocus
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={startDayMutation.isPending}>
            {startDayMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting Day...
              </>
            ) : (
              'Start Day'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StartDayModal;
